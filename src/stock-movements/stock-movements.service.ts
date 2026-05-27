import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListMovementsDto } from './dto/list-movements.dto';

@Injectable()
export class StockMovementsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ListMovementsDto) {
    const where: any = {};
    if (query.part_id) where.part_id = query.part_id;
    if (query.warehouse_id) where.warehouse_id = query.warehouse_id;
    if (query.type) where.type = query.type;
    if (query.reference_type) where.reference_type = query.reference_type;
    if (query.date_from || query.date_to) {
      where.created_at = {};
      if (query.date_from) where.created_at.gte = new Date(query.date_from);
      if (query.date_to) where.created_at.lte = new Date(query.date_to);
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.tenant.stock_movements.findMany({
        where,
        skip,
        take: query.limit,
        include: { parts: true, warehouses: true, users: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.stock_movements.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getByPart(partId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.tenant.stock_movements.findMany({
        where: { part_id: partId },
        skip,
        take: limit,
        include: { warehouses: true, users: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.stock_movements.count({ where: { part_id: partId } }),
    ]);

    return { items, total, page, limit };
  }

  async getByReference(referenceType: string, referenceId: string) {
    return this.prisma.tenant.stock_movements.findMany({
      where: { reference_type: referenceType, reference_id: referenceId },
      include: { parts: true, warehouses: true, users: true },
      orderBy: { created_at: 'desc' },
    });
  }
}