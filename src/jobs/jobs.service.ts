import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { getWorkshopContext } from '../prisma/workshop-context';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { canTransition } from './jobs.state-machine';
import { UsageService } from '../common/plan-features/usage.service';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private usageService: UsageService,
  ) {}

  private async assertTenantCustomer(customerId: string) {
    const customer = await this.prisma.tenant.customers.findUnique({ where: { id: customerId } });
    if (!customer || customer.is_active === false) {
      throw new BadRequestException('Customer not found in selected workshop');
    }
  }

  private async assertTenantVehicle(vehicleId: string, customerId?: string) {
    const vehicle = await this.prisma.tenant.vehicles.findUnique({ where: { id: vehicleId } });
    if (!vehicle || vehicle.is_deleted === true) {
      throw new BadRequestException('Vehicle not found in selected workshop');
    }
    if (customerId && vehicle.customer_id && vehicle.customer_id !== customerId) {
      throw new BadRequestException('Vehicle does not belong to the selected customer');
    }
  }

  private async assertWorkshopUser(userId: string, label: string) {
    const { workshopId } = getWorkshopContext();
    const user = await this.prisma.raw.users.findUnique({ where: { id: userId } });
    if (!user || !user.is_active) throw new BadRequestException(`${label} not found or inactive`);
    if (!workshopId) return;

    const access = await this.prisma.raw.user_workshop_access.findUnique({
      where: { user_id_workshop_id: { user_id: userId, workshop_id: workshopId } },
    });
    if (!access) throw new BadRequestException(`${label} is not assigned to the selected workshop`);
  }

  private async assertJobRelations(dto: Pick<CreateJobDto, 'customer_id' | 'vehicle_id' | 'advisor_id' | 'technician_id'>) {
    await this.assertTenantCustomer(dto.customer_id);
    await this.assertTenantVehicle(dto.vehicle_id, dto.customer_id);
    if (dto.advisor_id) await this.assertWorkshopUser(dto.advisor_id, 'Advisor');
    if (dto.technician_id) await this.assertWorkshopUser(dto.technician_id, 'Technician');
  }

  async create(dto: CreateJobDto, userId: string) {
    // Job numbers are derived from a base-36 timestamp so they are short,
    // unique, and human-readable without needing a separate sequence.
    await this.assertJobRelations(dto);
    if (!dto.advisor_id) await this.assertWorkshopUser(userId, 'Advisor');

    const jobNumber = `SF-${Date.now().toString(36).toUpperCase()}`;
    const jobId = uuid();
    const [job] = await this.prisma.$transaction([
      this.prisma.tenant.jobs.create({
        data: {
          id: jobId,
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
      }),
      this.prisma.tenant.job_status_history.create({
        data: {
          id: uuid(),
          job_id: jobId,
          from_status: null,
          to_status: 'booked',
          changed_by: userId,
          reason: 'Job created',
        },
      }),
    ]);

    const { workshopId } = getWorkshopContext();
    if (workshopId) {
      this.usageService.increment(workshopId, 'jobs').catch(() => {});
    }

    return job;
  }

  async findAll(pagination: ListJobsDto, status?: string, search?: string, userId?: string, role?: string) {
    const skip = (pagination.page - 1) * pagination.limit;
    const where: any = { is_deleted: false };

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
      const { workshopId } = getWorkshopContext();
      const matches = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT j.id
        FROM jobs j
        LEFT JOIN customers c ON c.id = j.customer_id
        LEFT JOIN vehicles v ON v.id = j.vehicle_id
        WHERE j.is_deleted = 0
        AND j.workshop_id = ${workshopId}
        AND (
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
      this.prisma.tenant.jobs.findMany({
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
      this.prisma.tenant.jobs.count({ where }),
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
    const job = await this.prisma.tenant.jobs.findFirst({
      where: { id, is_deleted: false },
      include: {
        customers: { select: { id: true, name: true, phone: true, email: true } },
        vehicles: { select: { id: true, make: true, model: true, plate: true, vin: true, year: true, color: true } },
        users_jobs_advisor_idTousers: { select: { id: true, name: true, email: true } },
        users_jobs_technician_idTousers: { select: { id: true, name: true, email: true } },
        estimate_lines: { include: { quote_groups: true, job_concerns: true } },
        job_concerns: { include: { media_files: { where: { is_deleted: false }, orderBy: { uploaded_at: 'desc' } } }, orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }] },
        customer_portal_snapshots: { orderBy: { version: 'desc' }, take: 1 },
        inspections: { include: { inspection_responses: { select: { id: true, item_id: true, value: true, urgency: true, tech_notes: true, media_count: true, recorded_at: true } } } },
        media_files: { where: { is_deleted: false } },
        approval_tokens: { include: { authorisation_decisions: true } },
        job_status_history: {
          orderBy: { changed_at: 'desc' },
          include: { users: { select: { id: true, name: true, email: true } } },
        },
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
      estimate_lines: (job.estimate_lines ?? []).map((l: any) => ({ ...l, quote_group: l.quote_groups, concern: l.job_concerns })),
      latest_portal_snapshot: job.customer_portal_snapshots?.[0] ?? null,
    };
  }


  async createConcern(jobId: string, dto: any) {
    await this.findOne(jobId);
    const count = await this.prisma.tenant.job_concerns.count({ where: { job_id: jobId } }).catch(() => 0);
    return this.prisma.tenant.job_concerns.create({
      data: {
        id: uuid(),
        job_id: jobId,
        code: dto.code || `C${count + 1}`,
        title: dto.title || 'Customer concern',
        description: dto.description || null,
        status: dto.status || 'reviewing',
        technician_finding: dto.technician_finding || null,
        work_note: dto.work_note || null,
        qc_note: dto.qc_note || null,
        sort_order: dto.sort_order ?? count,
        inspection_response_id: dto.inspection_response_id || null,
      },
    });
  }

  async updateConcern(jobId: string, concernId: string, dto: any) {
    await this.findOne(jobId);
    const existing = await this.prisma.tenant.job_concerns.findFirst({ where: { id: concernId, job_id: jobId } });
    if (!existing) throw new NotFoundException('Concern not found');
    const data: any = { ...dto };
    if (data.description === '') data.description = null;
    if (data.technician_finding === '') data.technician_finding = null;
    if (data.work_note === '') data.work_note = null;
    if (data.qc_note === '') data.qc_note = null;
    if (data.inspection_response_id === '') data.inspection_response_id = null;
    return this.prisma.tenant.job_concerns.update({ where: { id: concernId }, data });
  }

  async removeConcern(jobId: string, concernId: string) {
    await this.findOne(jobId);
    const existing = await this.prisma.tenant.job_concerns.findFirst({ where: { id: concernId, job_id: jobId } });
    if (!existing) throw new NotFoundException('Concern not found');
    await this.prisma.tenant.estimate_lines.updateMany({ where: { concern_id: concernId }, data: { concern_id: null } });
    return this.prisma.tenant.job_concerns.delete({ where: { id: concernId } });
  }

  async update(id: string, dto: UpdateJobDto, userId?: string) {
    const job = await this.findOne(id);

    // If status is being changed, it must follow the state machine.
    // Direct status mutations via PATCH bypass the /status endpoint at
    // the operator's own risk — but invalid transitions are still rejected.
    if (dto.status && dto.status !== job.status) {
      if (!canTransition(job.status as any, dto.status as any)) {
        throw new BadRequestException(`Cannot transition from ${job.status} to ${dto.status}. Use PATCH /jobs/:id/status for valid transitions.`);
      }
    }

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
      const effectiveStatus = data.status || job.status;
      if (effectiveStatus === 'ready' || effectiveStatus === 'quality_check') {
        data.is_customer_waiting = false;
      }
    }
    // Allow clearing optional fields by sending empty string → null
    if (data.advisor_id === '') data.advisor_id = null;
    if (data.technician_id === '') data.technician_id = null;
    if (data.advisor_id) await this.assertWorkshopUser(data.advisor_id, 'Advisor');
    if (data.technician_id) await this.assertWorkshopUser(data.technician_id, 'Technician');
    if (data.status && data.status !== job.status) {
      const [updated] = await this.prisma.$transaction([
        this.prisma.tenant.jobs.update({ where: { id }, data }),
        this.prisma.tenant.job_status_history.create({
          data: {
            id: uuid(),
            job_id: id,
            from_status: job.status,
            to_status: data.status,
            changed_by: userId || null,
            reason: 'Status changed from job update',
          },
        }),
      ]);
      return updated;
    }

    return this.prisma.tenant.jobs.update({ where: { id }, data });
  }

  async transition(id: string, dto: TransitionStatusDto, userId: string) {
    const job = await this.findOne(id);
    if (job.status === dto.to_status) return job;
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
      this.prisma.tenant.jobs.update({
        where: { id },
        data: transitionData,
      }),
      this.prisma.tenant.job_status_history.create({
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
      return this.prisma.tenant.jobs.update({
        where: { id },
        data: { technician_id: null, workshop_stage: job.status === 'in_progress' ? 'waiting_technician' : job.workshop_stage },
      });
    }
    await this.assertWorkshopUser(technicianId, 'Technician');

    return this.prisma.tenant.jobs.update({
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
    return this.prisma.tenant.jobs.update({
      where: { id },
      data: { archived_at: new Date() },
    });
  }

  async unarchiveJob(id: string) {
    const job = await this.prisma.tenant.jobs.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if (!job.archived_at) throw new BadRequestException('Job is not archived');
    return this.prisma.tenant.jobs.update({
      where: { id },
      data: { archived_at: null },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.jobs.update({ where: { id }, data: { is_deleted: true } });
  }

  async removeAll(): Promise<{ deleted: number }> {
    const { count } = await this.prisma.tenant.jobs.updateMany({
      where: { status: 'booked', is_deleted: false },
      data: { is_deleted: true },
    });
    return { deleted: count };
  }

  async archiveOldClosedJobs(): Promise<number> {
    // This method is also called by the scheduler service for daily archive.
    // The 24h guard here is intentionally stricter than the scheduler's
    // catch-up which archives all closed+unarchived jobs regardless of age.
    const result = await this.prisma.tenant.jobs.updateMany({
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
