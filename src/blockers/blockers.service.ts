import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlockerDto, ResolveBlockerDto } from './dto/create-blocker.dto';

@Injectable()
export class BlockersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { status?: string; job_id?: string; type?: string; severity?: string }, page = 1, limit = 50) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.job_id) where.job_id = filters.job_id;
    if (filters.type) where.type = filters.type;
    if (filters.severity) where.severity = filters.severity;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.tenant.blockers.findMany({
        skip,
        take: limit,
        where,
        include: {
          jobs: { select: { id: true, job_number: true, status: true, customer_concern: true, customer_id: true, vehicle_id: true } },
          users_blocked_by: { select: { id: true, name: true } },
          users_resolved_by: { select: { id: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.blockers.count({ where }),
    ]);

    const data = items.map((b: any) => ({
      ...b,
      job: b.jobs,
      blocked_by_user: b.users_blocked_by,
      resolved_by_user: b.users_resolved_by,
    }));

    return { items: data, data, total, page, limit };
  }

  async findOne(id: string) {
    const blocker = await this.prisma.tenant.blockers.findUnique({
      where: { id },
      include: {
        jobs: { select: { id: true, job_number: true, status: true, customer_concern: true, customer_id: true, vehicle_id: true } },
        users_blocked_by: { select: { id: true, name: true } },
        users_resolved_by: { select: { id: true, name: true } },
      },
    });
    if (!blocker) throw new NotFoundException('Blocker not found');
    return {
      ...blocker,
      job: blocker.jobs,
      blocked_by_user: blocker.users_blocked_by,
      resolved_by_user: blocker.users_resolved_by,
    };
  }

  async create(dto: CreateBlockerDto, userId: string) {
    const job = await this.prisma.tenant.jobs.findUnique({ where: { id: dto.job_id } });
    if (!job) throw new NotFoundException('Job not found');

    return this.prisma.tenant.blockers.create({
      data: {
        id: uuid(),
        job_id: dto.job_id,
        type: dto.type as any,
        description: dto.description,
        severity: (dto.severity || 'medium') as any,
        status: 'active',
        blocked_by: userId,
      },
    });
  }

  async resolve(id: string, userId: string, dto: ResolveBlockerDto) {
    const blocker = await this.prisma.tenant.blockers.findUnique({ where: { id } });
    if (!blocker) throw new NotFoundException('Blocker not found');
    if (blocker.status !== 'active') throw new ForbiddenException('Blocker is not active');

    return this.prisma.tenant.blockers.update({
      where: { id },
      data: {
        status: 'resolved',
        resolved_by: userId,
        resolved_at: new Date(),
        resolution_note: dto.resolution_note || null,
        updated_at: new Date(),
      },
    });
  }

  async dismiss(id: string) {
    const blocker = await this.prisma.tenant.blockers.findUnique({ where: { id } });
    if (!blocker) throw new NotFoundException('Blocker not found');
    if (blocker.status !== 'active') throw new ForbiddenException('Blocker is not active');

    return this.prisma.tenant.blockers.update({
      where: { id },
      data: {
        status: 'dismissed',
        updated_at: new Date(),
      },
    });
  }

  async getBlockedJobsSummary() {
    const activeBlockers = await this.prisma.tenant.blockers.findMany({
      where: { status: 'active' },
      include: {
        jobs: {
          select: {
            id: true,
            job_number: true,
            status: true,
            customer_concern: true,
            advisor_id: true,
            vehicles: { select: { id: true, make: true, model: true, plate: true } },
            customers: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const summary = {
      totalBlocked: activeBlockers.length,
      bySeverity: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      jobs: [] as any[],
    };

    const jobMap = new Map<string, any>();
    for (const b of activeBlockers) {
      summary.bySeverity[b.severity] = (summary.bySeverity[b.severity] || 0) + 1;
      summary.byType[b.type] = (summary.byType[b.type] || 0) + 1;

      if (!jobMap.has(b.job_id)) {
        jobMap.set(b.job_id, { ...b.jobs, blockers: [] });
      }
      jobMap.get(b.job_id).blockers.push({
        id: b.id,
        type: b.type,
        severity: b.severity,
        description: b.description,
        created_at: b.created_at,
      });
    }

    summary.jobs = [...jobMap.values()];
    return summary;
  }
}