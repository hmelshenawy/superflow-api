import { Injectable } from '@nestjs/common';
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
    userAgent?: string | null;
  }) {
    // Central audit entry point — all sensitive actions (status transitions,
    // portal decisions, inspection submit/reopen) write through here.
    return this.prisma.audit_logs.create({
      data: {
        id: uuid(),
        user_id: params.userId || null,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        action: params.action,
        old_values: params.oldValues !== undefined ? JSON.stringify(params.oldValues) : null,
        new_values: params.newValues !== undefined ? JSON.stringify(params.newValues) : null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      },
    });
  }

  async findAll(
    pagination: PaginationDto,
    filters?: { entityType?: string; userId?: string; action?: string; entityId?: string },
  ) {
    const skip = (pagination.page - 1) * pagination.limit;
    const where: any = {};

    if (filters?.entityType) where.entity_type = filters.entityType;
    if (filters?.userId) where.user_id = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.entityId) where.entity_id = filters.entityId;

    const [items, total] = await Promise.all([
      this.prisma.audit_logs.findMany({
        skip,
        take: pagination.limit,
        where,
        include: { users: { select: { id: true, name: true, email: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.audit_logs.count({ where }),
    ]);

    return { items, total, page: pagination.page, limit: pagination.limit };
  }
}
