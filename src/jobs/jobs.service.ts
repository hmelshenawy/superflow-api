import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
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

  async findAll(pagination: PaginationDto, status?: string) {
    const skip = (pagination.page - 1) * pagination.limit;
    const where = status ? { status: status as any } : {};
    const [items, total] = await Promise.all([
      this.prisma.jobs.findMany({
        skip, take: pagination.limit, where,
        include: { customers: { select: { id: true, name: true, phone: true } }, vehicles: { select: { id: true, make: true, model: true, plate: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.jobs.count({ where }),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const job = await this.prisma.jobs.findUnique({
      where: { id },
      include: {
        customers: true, vehicles: true,
        estimate_lines: true, inspections: { include: { inspection_responses: true } },
        media_files: true, approval_tokens: { include: { authorisation_decisions: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(id: string, dto: UpdateJobDto) {
    await this.findOne(id);
    return this.prisma.jobs.update({ where: { id }, data: dto });
  }

  async transition(id: string, dto: TransitionStatusDto, userId: string) {
    const job = await this.findOne(id);
    if (!canTransition(job.status as any, dto.to_status as any)) {
      throw new BadRequestException(`Cannot transition from ${job.status} to ${dto.to_status}`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.jobs.update({
        where: { id },
        data: { status: dto.to_status as any, completed_at: dto.to_status === 'completed' ? new Date() : null },
      }),
      this.prisma.job_status_history.create({
        data: { id: uuid(), job_id: id, from_status: job.status, to_status: dto.to_status, changed_by: userId, reason: dto.reason },
      }),
    ]);
    return updated;
  }
}