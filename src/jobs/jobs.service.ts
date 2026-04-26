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
    const jobNumber = `SF-${Date.now().toString(36).toUpperCase()}`;
    return this.prisma.jobs.create({
      data: {
        id: uuid(),
        job_number: jobNumber,
        customer_id: dto.customer_id,
        vehicle_id: dto.vehicle_id,
        advisor_id: dto.advisor_id || userId,
        technician_id: dto.technician_id,
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

    // By default, exclude archived jobs unless explicitly requested
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
    if (dto.to_status === 'ready') transitionData.completed_at = new Date();
    if (dto.to_status === 'closed') transitionData.invoiced_at = new Date();

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

  async assignTechnician(id: string, technicianId: string) {
    await this.findOne(id);
    const technician = await this.prisma.users.findUnique({ where: { id: technicianId } });
    if (!technician || !technician.is_active) throw new BadRequestException('Technician not found or inactive');

    return this.prisma.jobs.update({
      where: { id },
      data: { technician_id: technicianId },
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

  async archiveOldClosedJobs(): Promise<number> {
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
