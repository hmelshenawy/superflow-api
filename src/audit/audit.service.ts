import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async createLog(params: {
    userId?: string | null;
    entityType: string;
    entityId?: string | null;
    action: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string | null;
  }) {
    // Central audit entry point — all sensitive actions (status transitions,
    // portal decisions, inspection submit/reopen) write through here.
    return this.prisma.tenant.audit_logs.create({
      data: {
        id: uuid(),
        user_id: params.userId || null,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        action: params.action,
        old_values: params.oldValues !== undefined ? JSON.stringify(params.oldValues) : null,
        new_values: params.newValues !== undefined ? JSON.stringify(params.newValues) : null,
        ip_address: params.ipAddress || null,
      },
    });
  }

  async findAllPlatform(
    pagination: PaginationDto,
    filters?: { entityType?: string; userId?: string; action?: string; entityId?: string; workshopId?: string; dateFrom?: string; dateTo?: string },
  ) {
    const page = Number.isFinite(Number(pagination.page)) && Number(pagination.page) > 0 ? Number(pagination.page) : 1;
    const limit = Math.min(Math.max(Number(pagination.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters?.entityType) where.entity_type = filters.entityType;
    if (filters?.userId) where.user_id = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityId) where.entity_id = filters.entityId;
    if (filters?.workshopId) where.workshop_id = filters.workshopId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.created_at = {};
      if (filters.dateFrom) where.created_at.gte = this.parseDateFilter(filters.dateFrom, 'dateFrom');
      if (filters.dateTo) where.created_at.lte = this.parseDateFilter(filters.dateTo, 'dateTo');
    }

    const [items, total] = await Promise.all([
      this.prisma.raw.audit_logs.findMany({
        skip,
        take: limit,
        where,
        include: {
          users: { select: { id: true, name: true, email: true } },
          workshops: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.raw.audit_logs.count({ where }),
    ]);

    return {
      items: items.map((item: any) => ({
        ...item,
        old_values: this.parseJsonField(item.old_values),
        new_values: this.parseJsonField(item.new_values),
      })),
      total,
      page,
      limit,
    };
  }

  private parseJsonField(value?: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private parseDateFilter(value: string, field: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return parsed;
  }
}
