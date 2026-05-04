import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { canTransition } from './jobs.state-machine';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateJobDto, userId: string) {
    // Job numbers are derived from a base-36 timestamp so they are short,
    // unique, and human-readable without needing a separate sequence.
    const jobNumber = `SF-${Date.now().toString(36).toUpperCase()}`;
    return this.prisma.jobs.create({
      data: {
        id: uuid(),
        job_number: jobNumber,
        customer_id: dto.customer_id,
        vehicle_id: dto.vehicle_id,
        advisor_id: dto.advisor_id || userId,
        owner_code: dto.owner_code || null,
        technician_id: dto.technician_id,
        workshop_stage: null,
        parts_status: 'no_parts',
        is_customer_waiting: false,
        customer_sensitivity: 'normal',
        customer_concern: dto.customer_concern,
        odometer_in: dto.odometer_in,
        promised_at: dto.promised_at ? new Date(dto.promised_at) : null,
        dms_ro_number: dto.dms_ro_number,
      },
    });
  }

  async findAll(pagination: ListJobsDto, status?: string, search?: string, userId?: string, role?: string) {
    const skip = (pagination.page - 1) * pagination.limit;
    const where: any = {};

    // By default, exclude archived jobs unless explicitly requested.
    // `archived=all` shows everything; `archived=true` shows only archived.
    const showArchived = (pagination as any).archived === 'true' || (pagination as any).archived === true;
    if (showArchived) {
      where.archived_at = { not: null };
    } else if ((pagination as any).archived !== 'all') {
      where.archived_at = null;
    }

    if (status) where.status = status;

    if (search?.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      const matches = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT j.id
        FROM jobs j
        LEFT JOIN customers c ON c.id = j.customer_id
        LEFT JOIN vehicles v ON v.id = j.vehicle_id
        WHERE (
          LOWER(COALESCE(j.job_number, '')) LIKE ${term}
          OR LOWER(COALESCE(j.customer_concern, '')) LIKE ${term}
          OR LOWER(COALESCE(c.name, '')) LIKE ${term}
          OR LOWER(COALESCE(v.make, '')) LIKE ${term}
          OR LOWER(COALESCE(v.model, '')) LIKE ${term}
          OR LOWER(COALESCE(v.plate, '')) LIKE ${term}
        )
      `;

      if (!matches.length) {
        return { items: [], total: 0, page: pagination.page, limit: pagination.limit };
      }

      where.id = { in: matches.map((row: (typeof matches)[number]) => row.id) };
    }

    // Role-based row filtering ensures service advisors only see their own
    // jobs and technicians only see jobs assigned to them.
    if (role === 'service_advisor') where.advisor_id = userId;
    if (role === 'technician') where.technician_id = userId;

    const [items, total] = await Promise.all([
      this.prisma.jobs.findMany({
        skip,
        take: pagination.limit,
        where,
        include: {
          customers: { select: { id: true, name: true, phone: true, email: true } },
          vehicles: { select: { id: true, make: true, model: true, plate: true, vin: true, year: true } },
          users_jobs_advisor_idTousers: { select: { id: true, name: true, email: true } },
          users_jobs_technician_idTousers: { select: { id: true, name: true, email: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.jobs.count({ where }),
    ]);
    const data = items.map((item: (typeof items)[number]) => ({
      ...item,
      // Rename Prisma relation aliases to simpler keys so the frontend does not
      // need to know about Prisma naming conventions.
      customer: item.customers,
      vehicle: item.vehicles,
      advisor: item.users_jobs_advisor_idTousers,
      technician: item.users_jobs_technician_idTousers,
    }));
    return { items: data, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const job = await this.prisma.jobs.findUnique({
      where: { id },
      include: {
        customers: true,
        vehicles: true,
        users_jobs_advisor_idTousers: { select: { id: true, name: true, email: true } },
        users_jobs_technician_idTousers: { select: { id: true, name: true, email: true } },
        estimate_lines: true,
        inspections: { include: { inspection_responses: true } },
        media_files: { where: { is_deleted: false } },
        approval_tokens: { include: { authorisation_decisions: true } },
        job_status_history: { orderBy: { changed_at: 'desc' } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return {
      ...job,
      customer: job.customers,
      vehicle: job.vehicles,
      advisor: job.users_jobs_advisor_idTousers,
      technician: job.users_jobs_technician_idTousers,
      inspection: job.inspections ? { ...job.inspections, responses: job.inspections.inspection_responses } : null,
    };
  }

  async update(id: string, dto: UpdateJobDto) {
    await this.findOne(id);
    const data: any = {
      ...dto,
      promised_at: dto.promised_at ? new Date(dto.promised_at) : undefined,
    };
    // Keep Workshop view stage movement aligned with the Overall board.
    // Active workshop stages should appear as In Progress overall; QC/Ready keep their own overall lanes.
    if (dto.workshop_stage === 'quality_check') data.status = 'quality_check';
    else if (dto.workshop_stage === 'ready_handover') data.status = 'ready';
    else if ([
      'waiting_technician',
      'received',
      'diagnosis',
      'estimate_prep',
      'customer_approval',
      'work_in_progress',
      'final_test',
    ].includes(String(dto.workshop_stage))) data.status = 'in_progress';
    // When parts arrive (parts_ready), put the car back into the workshop
    // queue so it can be picked up by a technician again.
    if (dto.parts_status === 'parts_ready') {
      data.workshop_stage = 'waiting_technician';
    }
    // When advisor marks customer as informed on a Ready job,
    // the urgency factors (promise risk, customer waiting, stage urgency)
    // are zeroed in the priority calc on the frontend. On the backend we
    // record the flag so the frontend can apply the logic.
    // Additionally: if job was ready and customer is informed, no need to
    // keep is_customer_waiting flagged.
    if (dto.customer_informed === true && (data.status === 'ready' || data.status === undefined)) {
      // Look up current status if not already changed in this update
      const job = await this.findOne(id);
      const effectiveStatus = data.status || job.status;
      if (effectiveStatus === 'ready' || effectiveStatus === 'quality_check') {
        data.is_customer_waiting = false;
      }
    }
    // Allow clearing optional fields by sending empty string → null
    if (data.advisor_id === '') data.advisor_id = null;
    if (data.technician_id === '') data.technician_id = null;
    return this.prisma.jobs.update({ where: { id }, data });
  }

  async transition(id: string, dto: TransitionStatusDto, userId: string) {
    const job = await this.findOne(id);
    if (!canTransition(job.status as any, dto.to_status as any)) {
      throw new BadRequestException(`Cannot transition from ${job.status} to ${dto.to_status}`);
    }

    const transitionData: any = {
      status: dto.to_status as any,
    };
    // Certain statuses carry timestamp semantics that downstream flows
    // (invoicing, archiving) depend on, so they are set atomically here.
    if (dto.to_status === 'booked') transitionData.workshop_stage = null;
    if (dto.to_status === 'no_show') transitionData.workshop_stage = null;
    if (dto.to_status === 'checking') {
      transitionData.workshop_stage = null;
      if (!job.arrived_at) transitionData.arrived_at = new Date();
    }
    if (dto.to_status === 'estimate_sent') transitionData.workshop_stage = null;
    if (dto.to_status === 'approved') transitionData.workshop_stage = null;
    if (dto.to_status === 'waiting_parts') {
      transitionData.workshop_stage = null;
      if (!job.parts_status || job.parts_status === 'no_parts' || job.parts_status === 'parts_ready') transitionData.parts_status = 'order_parts';
    }
    if (dto.to_status === 'in_progress') {
      transitionData.workshop_stage = 'waiting_technician';
      if (job.parts_status === 'parts_ready') transitionData.parts_status = 'no_parts';
    }
    if (dto.to_status === 'quality_check') transitionData.workshop_stage = 'quality_check';
    if (dto.to_status === 'ready') transitionData.workshop_stage = 'ready_handover';
    if (dto.to_status === 'closed') transitionData.workshop_stage = null;

    if (dto.to_status === 'ready') transitionData.completed_at = new Date();
    if (dto.to_status === 'closed') transitionData.invoiced_at = new Date();
    if (dto.to_status === 'booked') transitionData.arrived_at = null;
    // Moving away from closed clears invoiced_at and archived_at so a
    // reopened job does not get accidentally re-archived by the scheduler.
    if (job.status === 'closed' && dto.to_status !== 'closed') {
      transitionData.invoiced_at = null;
      transitionData.archived_at = null;
    }
    // If moving away from ready back to earlier stage, clear completed_at
    // If moving away from ready back to earlier stage, clear completed_at
    // so the job does not appear as completed in reporting.
    if (job.status === 'ready' && dto.to_status !== 'ready' && dto.to_status !== 'closed') {
      transitionData.completed_at = null;
    }

    // Status transition is written atomically alongside its history row
    // so the trail never drifts from the actual transition.
    const [updated] = await this.prisma.$transaction([
      this.prisma.jobs.update({
        where: { id },
        data: transitionData,
      }),
      this.prisma.job_status_history.create({
        data: {
          id: uuid(),
          job_id: id,
          from_status: job.status,
          to_status: dto.to_status,
          changed_by: userId,
          reason: dto.reason,
        },
      }),
    ]);
    return updated;
  }

  async assignTechnician(id: string, technicianId: string | null) {
    const job = await this.findOne(id);
    if (!technicianId) {
      return this.prisma.jobs.update({
        where: { id },
        data: { technician_id: null, workshop_stage: job.status === 'in_progress' ? 'waiting_technician' : job.workshop_stage },
      });
    }
    const technician = await this.prisma.users.findUnique({ where: { id: technicianId } });
    if (!technician || !technician.is_active) throw new BadRequestException('Technician not found or inactive');

    return this.prisma.jobs.update({
      where: { id },
      data: {
        technician_id: technicianId,
        workshop_stage: job.workshop_stage,
      },
    });
  }

  async archiveJob(id: string) {
    const job = await this.findOne(id);
    if (job.status !== 'closed') throw new BadRequestException('Only closed jobs can be archived');
    return this.prisma.jobs.update({
      where: { id },
      data: { archived_at: new Date() },
    });
  }

  async unarchiveJob(id: string) {
    const job = await this.prisma.jobs.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if (!job.archived_at) throw new BadRequestException('Job is not archived');
    return this.prisma.jobs.update({
      where: { id },
      data: { archived_at: null },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.jobs.delete({ where: { id } });
  }

  async removeAll(): Promise<{ deleted: number }> {
    // Only delete jobs still in 'booked' status (still on the booking column)
    // Jobs that have progressed past booking are protected
    const result = await this.prisma.$transaction(async (tx: any) => {
      // Find all booked job IDs first
      const bookedJobs = await tx.jobs.findMany({
        where: { status: 'booked' },
        select: { id: true },
      });
      const jobIds = bookedJobs.map((j: any) => j.id);

      if (jobIds.length === 0) return 0;

      // Delete dependent records for those jobs only
      await tx.estimate_lines.deleteMany({
        where: { job_id: { in: jobIds } },
      });
      await tx.estimate_line_history.deleteMany({
        where: { estimate_lines: { job_id: { in: jobIds } } },
      });
      await tx.authorisation_decisions.deleteMany({
        where: { estimate_lines: { job_id: { in: jobIds } } },
      });
      await tx.approval_tokens.deleteMany({
        where: { job_id: { in: jobIds } },
      });
      await tx.inspection_responses.deleteMany({
        where: { inspections: { job_id: { in: jobIds } } },
      });
      await tx.media_files.deleteMany({
        where: { job_id: { in: jobIds } },
      });
      await tx.job_status_history.deleteMany({
        where: { job_id: { in: jobIds } },
      });
      await tx.inspections.deleteMany({
        where: { job_id: { in: jobIds } },
      });
      await tx.notifications.deleteMany({
        where: { job_id: { in: jobIds } },
      });
      await tx.deferred_work.deleteMany({
        where: { original_job_id: { in: jobIds } },
      });

      // Delete the jobs themselves
      const { count } = await tx.jobs.deleteMany({
        where: { id: { in: jobIds } },
      });
      return count;
    });
    return { deleted: result };
  }

  async archiveOldClosedJobs(): Promise<number> {
    // This method is also called by the scheduler service for daily archive.
    // The 24h guard here is intentionally stricter than the scheduler's
    // catch-up which archives all closed+unarchived jobs regardless of age.
    const result = await this.prisma.jobs.updateMany({
      where: {
        status: 'closed',
        archived_at: null,
        updated_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      data: { archived_at: new Date() },
    });
    return result.count;
  }
}
