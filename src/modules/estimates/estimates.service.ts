import { BadRequestException, HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '@prisma/prisma.service';
import { getWorkshopContext } from '@prisma/workshop-context';
import { CreateLineDto } from './dto/create-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { PaginationDto } from '@common/dto/pagination.dto';

type BulkEstimateLineInput = {
  id?: string | null;
  type: 'labour' | 'part' | 'sublet';
  description: string;
  part_number: string | null;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_rate_pct: number | null;
  is_recommended: boolean;
  inspection_response_id: string | null;
  quote_group_id: string | null;
  concern_id: string | null;
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (error: any) {
    return `[unserializable: ${error?.message ?? String(error)}]`;
  }
}

@Injectable()
export class EstimatesService {
  private readonly logger = new Logger(EstimatesService.name);

  constructor(private prisma: PrismaService) {}

  private parseSettingNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async getDefaultTaxRate(): Promise<number> {
    const settings = await this.prisma.tenant.settings.findMany({
      where: { key: { in: ['default_tax_rate', 'tax_rate'] } },
    });
    const byKey = new Map(settings.map((row: (typeof settings)[number]) => [row.key, row.value]));
    return this.parseSettingNumber(byKey.get('default_tax_rate'))
      ?? this.parseSettingNumber(byKey.get('tax_rate'))
      ?? 5;
  }

  private blankToNull(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
  }

  private finiteNumber(value: unknown, field: string, index: number, fallback: number): number {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`lines[${index}].${field} must be a number`);
    }
    return parsed;
  }

  private normalizeBulkLines(lines: Array<Record<string, any>>, defaultTaxRate: number): BulkEstimateLineInput[] {
    if (!Array.isArray(lines)) {
      throw new BadRequestException('lines must be an array');
    }

    const seenIds = new Set<string>();
    return lines.map((line, index) => {
      if (!line || typeof line !== 'object') {
        throw new BadRequestException(`lines[${index}] must be an object`);
      }

      const id = this.blankToNull(line.id);
      if (id) {
        if (seenIds.has(id)) throw new BadRequestException(`Duplicate estimate line id in payload: ${id}`);
        seenIds.add(id);
      }

      const type = line.type || 'labour';
      if (!['labour', 'part', 'sublet'].includes(type)) {
        throw new BadRequestException(`lines[${index}].type must be labour, part, or sublet`);
      }

      const quantity = this.finiteNumber(line.quantity, 'quantity', index, 1);
      const unitPrice = this.finiteNumber(line.unit_price, 'unit_price', index, 0);
      const discountPct = this.finiteNumber(line.discount_pct, 'discount_pct', index, 0);
      const rawTaxRate = this.finiteNumber(line.tax_rate_pct, 'tax_rate_pct', index, defaultTaxRate);

      if (quantity < 0) throw new BadRequestException(`lines[${index}].quantity cannot be negative`);
      if (unitPrice < 0) throw new BadRequestException(`lines[${index}].unit_price cannot be negative`);
      if (discountPct < 0 || discountPct > 100) {
        throw new BadRequestException(`lines[${index}].discount_pct must be between 0 and 100`);
      }
      if (rawTaxRate < 0) throw new BadRequestException(`lines[${index}].tax_rate_pct cannot be negative`);

      return {
        id,
        type,
        description: String(line.description ?? ''),
        part_number: this.blankToNull(line.part_number),
        quantity,
        unit_price: unitPrice,
        discount_pct: discountPct,
        tax_rate_pct: rawTaxRate,
        is_recommended: Boolean(line.is_recommended),
        inspection_response_id: this.blankToNull(line.inspection_response_id),
        quote_group_id: this.blankToNull(line.quote_group_id),
        concern_id: this.blankToNull(line.concern_id),
      } as BulkEstimateLineInput;
    });
  }

  private toBadRequestFromPrisma(error: any): BadRequestException | null {
    if (error?.code === 'P2002') return new BadRequestException('Duplicate estimate line or quote group id');
    if (error?.code === 'P2003') return new BadRequestException('Estimate payload references a missing job, quote group, inspection response, or concern');
    if (error?.code === 'P2011') return new BadRequestException('Estimate payload is missing a required value');
    if (error?.code === 'P2025') return new BadRequestException('Estimate payload references a record that no longer exists');
    if (error?.code === 'P2028') return new BadRequestException('Estimate save transaction timed out. Please retry.');
    return null;
  }

  private traceBulk(step: string, payload: Record<string, unknown>) {
    this.logger.log(`ESTIMATE_BULK_FIX_ACTIVE_V2 service ${step} ${safeJson(payload)}`);
  }

  private decorateLines(lines: any[]) {
    const groupKeyFor = (line: any) => line.concern_id
      ? `concern:${line.concern_id}`
      : line.inspection_response_id
        ? `response:${line.inspection_response_id}`
        : line.quote_group_id
          ? `quote:${line.quote_group_id}`
          : 'general';
    const decisionsByGroup = new Map<string, string[]>();
    for (const line of lines) {
      const decisions = (line.authorisation_decisions ?? []).map((decision: any) => decision.decision).filter(Boolean);
      if (!decisionsByGroup.has(groupKeyFor(line))) decisionsByGroup.set(groupKeyFor(line), []);
      decisionsByGroup.get(groupKeyFor(line))!.push(...decisions);
    }
    const summaryFor = (line: any) => {
      const decisions = decisionsByGroup.get(groupKeyFor(line)) ?? [];
      const unique = [...new Set(decisions)];
      if (!unique.length) return 'pending';
      if (unique.length > 1) return 'mixed';
      return unique[0];
    };
    return lines.map((line: any) => ({
      ...line,
      quote_group: line.quote_groups,
      concern: line.job_concerns,
      is_recommended: Boolean(line.inspection_response_id) || Boolean(line.is_recommended),
      is_actionable: !line.authorisation_decisions?.length,
      group_decision_summary: summaryFor(line),
    }));
  }

  async create(dto: CreateLineDto, userId: string) {
    // The backend always recomputes money fields so the client cannot drift from
    // server-side totals just by sending pre-calculated values.
    const defaultTaxRate = await this.getDefaultTaxRate();
    const qty = dto.quantity ?? 1;
    const unitPrice = dto.unit_price ?? 0;
    const discount = dto.discount_pct ?? 0;
    const taxRate = dto.tax_rate_pct ?? defaultTaxRate;
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
        tax_amount: taxAmount, is_recommended: dto.is_recommended ?? Boolean(dto.inspection_response_id),
        inspection_response_id: dto.inspection_response_id,
        quote_group_id: dto.quote_group_id,
        concern_id: dto.concern_id,
        added_by: userId,
      },
    });
  }

  async findByJob(jobId: string) {
    const lines = await this.prisma.tenant.estimate_lines.findMany({
      where: { job_id: jobId },
      include: { quote_groups: true, job_concerns: true, authorisation_decisions: true },
      orderBy: { sort_order: 'asc' },
    });
    return this.decorateLines(lines);
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
    const defaultTaxRate = this.parseSettingNumber(byKey.get('default_tax_rate'))
      ?? this.parseSettingNumber(byKey.get('tax_rate'))
      ?? 5;
    const standardRate =
      labourRates.find((rate: (typeof labourRates)[number]) => (rate.name || '').toLowerCase() === 'standard') ||
      labourRates[0] ||
      null;

    return {
      default_tax_rate: defaultTaxRate,
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
    const { workshopId } = getWorkshopContext();
    this.traceBulk('start', { jobId, userId, workshopId, rawLineCount: Array.isArray(lines) ? lines.length : null });
    if (!workshopId) throw new BadRequestException('Workshop context required');

    const defaultTaxRate = await this.getDefaultTaxRate();
    const normalizedLines = this.normalizeBulkLines(lines, defaultTaxRate);
    this.traceBulk('after payload validation', {
      jobId,
      userId,
      workshopId,
      defaultTaxRate,
      normalizedLineCount: normalizedLines.length,
      normalizedLines,
    });

    this.traceBulk('before job lookup', { jobId, workshopId });
    const job = await this.prisma.tenant.jobs.findFirst({
      where: { id: jobId, is_deleted: false },
      select: { id: true, workshop_id: true },
    });
    this.traceBulk('after job lookup', { jobId, workshopId, found: Boolean(job), job });
    if (!job) throw new NotFoundException('Job not found');

    try {
      this.traceBulk('before transaction', { jobId, userId, workshopId, lineCount: normalizedLines.length });
      const result = await (this.prisma.raw as any).$transaction(async (tx: Prisma.TransactionClient) => {
      this.traceBulk('inside transaction before existing lookup', { jobId, workshopId });
      const existing = await tx.estimate_lines.findMany({ where: { job_id: jobId, workshop_id: workshopId } });
      this.traceBulk('inside transaction after existing lookup', {
        jobId,
        workshopId,
        existingCount: existing.length,
        existingIds: existing.map((line: (typeof existing)[number]) => line.id),
      });
      const existingIds = new Set(existing.map((line: (typeof existing)[number]) => line.id));
      const existingById = new Map<string, (typeof existing)[number]>(existing.map((line: (typeof existing)[number]) => [line.id, line]));
      const incomingIds = new Set(
        normalizedLines
          .map((line) => line.id)
          .filter((id: string | null | undefined) => Boolean(id)),
      );

      for (const line of normalizedLines) {
        if (!line.id) continue;
        const existingLine = existingById.get(line.id);
        if (!existingLine) {
          const lineInAnotherJob = await tx.estimate_lines.findUnique({ where: { id: line.id } });
          if (lineInAnotherJob) {
            throw new BadRequestException(`Estimate line ${line.id} does not belong to this job`);
          }
        }
      }

      this.traceBulk('before relation validation', {
        jobId,
        workshopId,
        quoteGroupIds: [...new Set(normalizedLines.map((l) => l.quote_group_id).filter(Boolean))],
        concernIds: [...new Set(normalizedLines.map((l) => l.concern_id).filter(Boolean))],
        responseIds: [...new Set(normalizedLines.map((l) => l.inspection_response_id).filter(Boolean))],
      });

      // Ensure any new quote groups exist before referencing them
      const groupIds = [...new Set(normalizedLines.map((l) => l.quote_group_id).filter(Boolean))] as string[];
      for (const gid of groupIds) {
        this.traceBulk('relation validation quote group', { jobId, workshopId, quoteGroupId: gid });
        const existingGroup = await tx.quote_groups.findUnique({ where: { id: gid } });
        if (existingGroup && existingGroup.job_id !== jobId) {
          throw new BadRequestException(`Quote group ${gid} does not belong to this job`);
        }
        if (!existingGroup) {
          await tx.quote_groups.create({
            data: { id: gid, job_id: jobId, workshop_id: workshopId, title: 'New group', sort_order: 0 },
          });
        }
      }

      const concernIds = [...new Set(normalizedLines.map((l) => l.concern_id).filter(Boolean))] as string[];
      if (concernIds.length) {
        this.traceBulk('relation validation concerns', { jobId, workshopId, concernIds });
        const concerns = await tx.job_concerns.findMany({
          where: { id: { in: concernIds }, job_id: jobId, workshop_id: workshopId },
          select: { id: true },
        });
        const found = new Set(concerns.map((concern) => concern.id));
        const missing = concernIds.find((id) => !found.has(id));
        if (missing) throw new BadRequestException(`Concern ${missing} does not belong to this job`);
      }

      const responseIds = [...new Set(normalizedLines.map((l) => l.inspection_response_id).filter(Boolean))] as string[];
      if (responseIds.length) {
        this.traceBulk('relation validation responses', { jobId, workshopId, responseIds });
        const responses = await tx.inspection_responses.findMany({
          where: { id: { in: responseIds }, workshop_id: workshopId, inspections: { is: { job_id: jobId } } },
          select: { id: true },
        });
        const found = new Set(responses.map((response) => response.id));
        const missing = responseIds.find((id) => !found.has(id));
        if (missing) throw new BadRequestException(`Inspection response ${missing} was not found for this workshop`);
      }
      this.traceBulk('after relation validation', { jobId, workshopId });

      for (let i = 0; i < normalizedLines.length; i++) {
        const l = normalizedLines[i];
        const qty = l.quantity;
        const unitPrice = l.unit_price;
        const discount = l.discount_pct;
        const existingLine = l.id ? existingById.get(l.id) : null;
        // Bug fix: new quote lines should inherit workshop VAT even if the UI
        // accidentally sends 0 while defaults are loading.
        const taxRate = existingLine
          ? (l.tax_rate_pct ?? Number(existingLine.tax_rate_pct ?? defaultTaxRate))
          : (l.tax_rate_pct && l.tax_rate_pct > 0 ? l.tax_rate_pct : defaultTaxRate);
        const lineTotal = qty * unitPrice * (1 - discount / 100);
        const taxAmount = lineTotal * (taxRate / 100);

        const data = {
          job_id: jobId,
          workshop_id: workshopId,
          type: l.type,
          description: l.description,
          part_number: l.part_number,
          quantity: qty,
          unit_price: unitPrice,
          discount_pct: discount,
          tax_rate_pct: taxRate,
          line_total: lineTotal,
          tax_amount: taxAmount,
          is_recommended: Boolean(l.inspection_response_id) || Boolean(l.is_recommended),
          sort_order: i,
          added_by: userId,
          inspection_response_id: l.inspection_response_id,
          quote_group_id: l.quote_group_id,
          concern_id: l.concern_id,
        };

        if (l.id && existingIds.has(l.id)) {
          this.traceBulk('inside transaction before update', { jobId, workshopId, index: i, id: l.id, data });
          await tx.estimate_lines.update({
            where: { id: l.id },
            data,
          });
          this.traceBulk('inside transaction after update', { jobId, workshopId, index: i, id: l.id });
        } else {
          this.traceBulk('inside transaction before create', { jobId, workshopId, index: i, id: l.id ?? null, data });
          await tx.estimate_lines.create({
            data: {
              id: l.id ?? uuid(),
              ...data,
            },
          });
          this.traceBulk('inside transaction after create', { jobId, workshopId, index: i, id: l.id ?? null });
        }
      }

      const staleLines = existing.filter((line: (typeof existing)[number]) => !incomingIds.has(line.id));
      this.traceBulk('inside transaction before delete', {
        jobId,
        workshopId,
        staleCount: staleLines.length,
        staleIds: staleLines.map((line: (typeof staleLines)[number]) => line.id),
      });
      // Preserved stale lines are moved after active lines so historical rows do
      // not interfere with the visible quote ordering for the current job.
      let preservedSortOrder = normalizedLines.length;

      for (const stale of staleLines) {
        const [approvalCount, deferredCount, historyCount] = await Promise.all([
          tx.authorisation_decisions.count({ where: { estimate_line_id: stale.id } }),
          tx.deferred_work.count({ where: { estimate_line_id: stale.id } }),
          tx.estimate_line_history.count({ where: { line_id: stale.id } }),
        ]);

        const hasReferences = approvalCount > 0 || deferredCount > 0 || historyCount > 0;

        if (hasReferences) {
          this.traceBulk('inside transaction before detach stale', { jobId, workshopId, staleId: stale.id, approvalCount, deferredCount, historyCount });
          // Referenced lines are detached instead of deleted so customer decisions,
          // deferred-work links, and edit history never point at missing rows.
          await tx.estimate_lines.update({
            where: { id: stale.id },
            data: {
              job_id: null,
              inspection_response_id: null,
              quote_group_id: null,
              concern_id: null,
              sort_order: preservedSortOrder++,
            },
          });
          this.traceBulk('inside transaction after detach stale', { jobId, workshopId, staleId: stale.id });
        } else {
          this.traceBulk('inside transaction before delete stale', { jobId, workshopId, staleId: stale.id });
          // Truly orphaned lines can be deleted safely because nothing else in the
          // system still depends on them.
          await tx.estimate_lines.delete({ where: { id: stale.id } });
          this.traceBulk('inside transaction after delete stale', { jobId, workshopId, staleId: stale.id });
        }
      }

      this.traceBulk('inside transaction before final lookup', { jobId, workshopId });
      const saved = await tx.estimate_lines.findMany({
        where: { job_id: jobId, workshop_id: workshopId },
        include: { quote_groups: true, job_concerns: true, authorisation_decisions: true },
        orderBy: { sort_order: 'asc' },
      });
      this.traceBulk('inside transaction after final lookup', { jobId, workshopId, savedCount: saved.length });
      const decorated = this.decorateLines(saved);
      return decorated;
      }, { maxWait: 10_000, timeout: 60_000 });
      this.traceBulk('after transaction', { jobId, workshopId, returnedCount: result.length });
      this.traceBulk('before return', { jobId, workshopId, returnedCount: result.length });
      return result;
    } catch (error: any) {
      this.logger.error(
        `ESTIMATE_BULK_FIX_ACTIVE_V2 service error ${safeJson({
          jobId,
          userId,
          workshopId,
          errorName: error?.name,
          errorMessage: error?.message,
          errorCode: error?.code,
          responseBody: typeof error?.getResponse === 'function' ? error.getResponse() : undefined,
        })}`,
        error?.stack ?? String(error),
      );
      if (error instanceof HttpException) throw error;
      const prismaBadRequest = this.toBadRequestFromPrisma(error);
      if (prismaBadRequest) throw prismaBadRequest;
      throw error;
    }
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
