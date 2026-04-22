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

  async getDefaults() {
    const [settings, labourRates] = await Promise.all([
      this.prisma.settings.findMany({
        where: { key: { in: ['default_tax_rate', 'tax_rate', 'currency'] } },
      }),
      this.prisma.labour_rates.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const byKey = new Map(settings.map((row) => [row.key, row.value]));
    const standardRate =
      labourRates.find((rate) => (rate.name || '').toLowerCase() === 'standard') ||
      labourRates[0] ||
      null;

    return {
      default_tax_rate: Number(byKey.get('default_tax_rate') ?? byKey.get('tax_rate') ?? 0),
      currency: byKey.get('currency') ?? standardRate?.currency ?? 'AED',
      standard_labour_rate: Number(standardRate?.rate_per_hour ?? 0),
      standard_labour_rate_name: standardRate?.name ?? 'Standard',
      labour_rates: labourRates.map((rate) => ({
        id: rate.id,
        name: rate.name,
        rate_per_hour: Number(rate.rate_per_hour ?? 0),
        currency: rate.currency ?? 'AED',
      })),
    };
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

  /**
   * Bulk save estimate lines for a job.
   * Updates existing lines in place, creates new ones, and only deletes stale
   * lines when they are not referenced elsewhere.
   */
  async bulkReplace(jobId: string, lines: any[], userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.estimate_lines.findMany({ where: { job_id: jobId } });
      const existingIds = new Set(existing.map((line) => line.id));
      const incomingIds = new Set(
        lines
          .map((line) => line.id)
          .filter((id: string | null | undefined) => Boolean(id)),
      );

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const qty = Number(l.quantity ?? 1);
        const unitPrice = Number(l.unit_price ?? 0);
        const discount = Number(l.discount_pct ?? 0);
        const taxRate = Number(l.tax_rate_pct ?? 5);
        const lineTotal = qty * unitPrice * (1 - discount / 100);
        const taxAmount = lineTotal * (taxRate / 100);

        const data = {
          job_id: jobId,
          type: l.type || 'labour',
          description: l.description || '',
          part_number: l.part_number || null,
          quantity: qty,
          unit_price: unitPrice,
          discount_pct: discount,
          tax_rate_pct: taxRate,
          line_total: lineTotal,
          tax_amount: taxAmount,
          is_recommended: l.is_recommended ?? false,
          sort_order: i,
          added_by: userId,
          inspection_response_id: l.inspection_response_id || null,
        };

        if (l.id && existingIds.has(l.id)) {
          await tx.estimate_lines.update({
            where: { id: l.id },
            data,
          });
        } else {
          await tx.estimate_lines.create({
            data: {
              id: l.id || uuid(),
              ...data,
            },
          });
        }
      }

      const staleLines = existing.filter((line) => !incomingIds.has(line.id));
      let preservedSortOrder = lines.length;

      for (const stale of staleLines) {
        const [approvalCount, deferredCount, historyCount] = await Promise.all([
          tx.authorisation_decisions.count({ where: { estimate_line_id: stale.id } }),
          tx.deferred_work.count({ where: { estimate_line_id: stale.id } }),
          tx.estimate_line_history.count({ where: { line_id: stale.id } }),
        ]);

        const hasReferences = approvalCount > 0 || deferredCount > 0 || historyCount > 0;

        if (hasReferences) {
          await tx.estimate_lines.update({
            where: { id: stale.id },
            data: { sort_order: preservedSortOrder++ },
          });
        } else {
          await tx.estimate_lines.delete({ where: { id: stale.id } });
        }
      }

      return tx.estimate_lines.findMany({
        where: { job_id: jobId },
        orderBy: { sort_order: 'asc' },
      });
    });
  }
}