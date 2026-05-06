import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLineDto } from './dto/create-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class EstimatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLineDto, userId: string) {
    // The backend always recomputes money fields so the client cannot drift from
    // server-side totals just by sending pre-calculated values.
    const qty = dto.quantity ?? 1;
    const unitPrice = dto.unit_price ?? 0;
    const discount = dto.discount_pct ?? 0;
    const taxRate = dto.tax_rate_pct ?? 0;
    const lineTotal = qty * unitPrice * (1 - discount / 100);
    const taxAmount = lineTotal * (taxRate / 100);

    // Ensure quote group exists before referencing it
    if (dto.quote_group_id) {
      const group = await this.prisma.tenant.quote_groups.findUnique({ where: { id: dto.quote_group_id } });
      if (!group) throw new NotFoundException('Quote group not found');
    }

    return this.prisma.tenant.estimate_lines.create({
      data: {
        id: uuid(), job_id: dto.job_id, type: dto.type as any, description: dto.description,
        part_number: dto.part_number, quantity: qty, unit_price: unitPrice,
        discount_pct: discount, tax_rate_pct: taxRate, line_total: lineTotal,
        tax_amount: taxAmount, is_recommended: dto.is_recommended ?? false,
        inspection_response_id: dto.inspection_response_id,
        quote_group_id: dto.quote_group_id,
        added_by: userId,
      },
    });
  }

  async findByJob(jobId: string) {
    return this.prisma.tenant.estimate_lines.findMany({
      where: { job_id: jobId },
      include: { quote_groups: true },
      orderBy: { sort_order: 'asc' },
    });
  }

  async getDefaults() {
    // Quote builder defaults come from admin-managed settings first, then fall
    // back to active labour-rate data so the UI can still function with minimal setup.
    const [settings, labourRates] = await Promise.all([
      this.prisma.tenant.settings.findMany({
        where: { key: { in: ['default_tax_rate', 'tax_rate', 'currency'] } },
      }),
      this.prisma.tenant.labour_rates.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const byKey = new Map(settings.map((row: (typeof settings)[number]) => [row.key, row.value]));
    const standardRate =
      labourRates.find((rate: (typeof labourRates)[number]) => (rate.name || '').toLowerCase() === 'standard') ||
      labourRates[0] ||
      null;

    return {
      default_tax_rate: Number(byKey.get('default_tax_rate') ?? byKey.get('tax_rate') ?? 0),
      currency: byKey.get('currency') ?? standardRate?.currency ?? 'AED',
      standard_labour_rate: Number(standardRate?.rate_per_hour ?? 0),
      standard_labour_rate_name: standardRate?.name ?? 'Standard',
      labour_rates: labourRates.map((rate: (typeof labourRates)[number]) => ({
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
      this.prisma.tenant.estimate_lines.findMany({ skip, take: pagination.limit, orderBy: { created_at: 'desc' } }),
      this.prisma.tenant.estimate_lines.count(),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const line = await this.prisma.tenant.estimate_lines.findUnique({ where: { id } });
    if (!line) throw new NotFoundException('Estimate line not found');
    return line;
  }

  async update(id: string, dto: UpdateLineDto, userId: string) {
    const existing = await this.findOne(id);

    // Save snapshot to estimate_line_history before updating.
    // This is why old estimate rows cannot always be hard-deleted later.
    await this.prisma.tenant.estimate_line_history.create({
      data: { id: uuid(), line_id: id, snapshot: JSON.stringify(existing), changed_by: userId },
    });

    const qty = dto.quantity ?? existing.quantity;
    const unitPrice = dto.unit_price ?? existing.unit_price;
    const discount = dto.discount_pct ?? existing.discount_pct;
    const taxRate = dto.tax_rate_pct ?? existing.tax_rate_pct;
    const lineTotal = Number(qty) * Number(unitPrice) * (1 - Number(discount) / 100);
    const taxAmount = lineTotal * (Number(taxRate) / 100);

    return this.prisma.tenant.estimate_lines.update({
      where: { id },
      data: { ...dto, line_total: lineTotal, tax_amount: taxAmount },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.estimate_lines.delete({ where: { id } });
  }

  /**
   * Bulk save estimate lines for a job.
   * Updates existing lines in place, creates new ones, and only deletes stale
   * lines when they are not referenced elsewhere.
   */
  async bulkReplace(jobId: string, lines: Array<Record<string, any>>, userId: string) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.estimate_lines.findMany({ where: { job_id: jobId } });
      const existingIds = new Set(existing.map((line: (typeof existing)[number]) => line.id));
      const incomingIds = new Set(
        lines
          .map((line) => line.id)
          .filter((id: string | null | undefined) => Boolean(id)),
      );

      // Ensure any new quote groups exist before referencing them
      const groupIds = [...new Set(lines.map((l) => l.quote_group_id).filter(Boolean))] as string[];
      for (const gid of groupIds) {
        const existingGroup = await tx.quote_groups.findUnique({ where: { id: gid } });
        if (!existingGroup) {
          const representativeLine = lines.find((l) => l.quote_group_id === gid);
          await tx.quote_groups.create({
            data: { id: gid, job_id: jobId, title: 'New group', sort_order: 0 },
          });
        }
      }

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
          quote_group_id: l.quote_group_id || null,
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

      const staleLines = existing.filter((line: (typeof existing)[number]) => !incomingIds.has(line.id));
      // Preserved stale lines are moved after active lines so historical rows do
      // not interfere with the visible quote ordering for the current job.
      let preservedSortOrder = lines.length;

      for (const stale of staleLines) {
        const [approvalCount, deferredCount, historyCount] = await Promise.all([
          tx.authorisation_decisions.count({ where: { estimate_line_id: stale.id } }),
          tx.deferred_work.count({ where: { estimate_line_id: stale.id } }),
          tx.estimate_line_history.count({ where: { line_id: stale.id } }),
        ]);

        const hasReferences = approvalCount > 0 || deferredCount > 0 || historyCount > 0;

        if (hasReferences) {
          // Referenced lines are detached instead of deleted so customer decisions,
          // deferred-work links, and edit history never point at missing rows.
          await tx.estimate_lines.update({
            where: { id: stale.id },
            data: {
              job_id: null,
              inspection_response_id: null,
              quote_group_id: null,
              sort_order: preservedSortOrder++,
            },
          });
        } else {
          // Truly orphaned lines can be deleted safely because nothing else in the
          // system still depends on them.
          await tx.estimate_lines.delete({ where: { id: stale.id } });
        }
      }

      return tx.estimate_lines.findMany({
        where: { job_id: jobId },
        include: { quote_groups: true },
        orderBy: { sort_order: 'asc' },
      });
    });
  }

  // ─── Quote Groups ─────────────────────────────────────────
  async createGroup(jobId: string, title: string) {
    return this.prisma.tenant.quote_groups.create({
      data: { id: uuid(), job_id: jobId, title: title || 'New group', sort_order: 0 },
    });
  }

  async renameGroup(groupId: string, title: string) {
    const group = await this.prisma.tenant.quote_groups.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Quote group not found');
    return this.prisma.tenant.quote_groups.update({ where: { id: groupId }, data: { title } });
  }

  async deleteGroup(groupId: string) {
    const group = await this.prisma.tenant.quote_groups.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Quote group not found');
    // Nullify quote_group_id on all lines in this group (detaches, does not delete lines)
    await this.prisma.tenant.estimate_lines.updateMany({
      where: { quote_group_id: groupId },
      data: { quote_group_id: null },
    });
    return this.prisma.tenant.quote_groups.delete({ where: { id: groupId } });
  }
}