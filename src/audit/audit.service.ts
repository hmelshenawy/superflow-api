import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(pagination: PaginationDto, entityType?: string, userId?: string) {
    const skip = (pagination.page - 1) * pagination.limit;
    const where: any = {};
    if (entityType) where.entity_type = entityType;
    if (userId) where.user_id = userId;

    const [items, total] = await Promise.all([
      this.prisma.audit_logs.findMany({ skip, take: pagination.limit, where, orderBy: { created_at: 'desc' } }),
      this.prisma.audit_logs.count({ where }),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }
}