import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLineDto } from './dto/create-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class EstimatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLineDto, userId: string) {
    const qty = dto.quantity ?? 1;
    const unitPrice = dto.unit_price ?? 0;
    const discount = dto.discount_pct ?? 0;
    const taxRate = dto.tax_rate_pct ?? 0;
    const lineTotal = qty * unitPrice * (1 - discount / 100);
    const taxAmount = lineTotal * (taxRate / 100);

    return this.prisma.estimate_lines.create({
      data: {
        id: uuid(), job_id: dto.job_id, type: dto.type as any, description: dto.description,
        part_number: dto.part_number, quantity: qty, unit_price: unitPrice,
        discount_pct: discount, tax_rate_pct: taxRate, line_total: lineTotal,
        tax_amount: taxAmount, is_recommended: dto.is_recommended ?? false,
        inspection_response_id: dto.inspection_response_id, added_by: userId,
      },
    });
  }

  async findByJob(jobId: string) {
    return this.prisma.estimate_lines.findMany({
      where: { job_id: jobId },
      orderBy: { sort_order: 'asc' },
    });
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.estimate_lines.findMany({ skip, take: pagination.limit, orderBy: { created_at: 'desc' } }),
      this.prisma.estimate_lines.count(),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const line = await this.prisma.estimate_lines.findUnique({ where: { id } });
    if (!line) throw new NotFoundException('Estimate line not found');
    return line;
  }

  async update(id: string, dto: UpdateLineDto, userId: string) {
    const existing = await this.findOne(id);

    // Save snapshot to estimate_line_history before updating
    await this.prisma.estimate_line_history.create({
      data: { id: uuid(), line_id: id, snapshot: JSON.stringify(existing), changed_by: userId },
    });

    const qty = dto.quantity ?? existing.quantity;
    const unitPrice = dto.unit_price ?? existing.unit_price;
    const discount = dto.discount_pct ?? existing.discount_pct;
    const taxRate = dto.tax_rate_pct ?? existing.tax_rate_pct;
    const lineTotal = Number(qty) * Number(unitPrice) * (1 - Number(discount) / 100);
    const taxAmount = lineTotal * (Number(taxRate) / 100);

    return this.prisma.estimate_lines.update({
      where: { id },
      data: { ...dto, line_total: lineTotal, tax_amount: taxAmount },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.estimate_lines.delete({ where: { id } });
  }
}