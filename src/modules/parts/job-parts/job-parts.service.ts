import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReservePartDto } from './dto/reserve-part.dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JobPartsService {
  constructor(private prisma: PrismaService) {}

  private normalizeJobPart(jobPart: any) {
    return {
      ...jobPart,
      partId: jobPart.part_id,
      estimateLineId: jobPart.estimate_line_id,
      concernId: jobPart.concern_id,
      partName: jobPart.part_name ?? jobPart.parts?.name ?? null,
      partNumber: jobPart.part_number ?? jobPart.parts?.part_number ?? null,
      source: jobPart.source,
      estimateLine: jobPart.estimate_lines ?? null,
      concern: jobPart.job_concerns ?? null,
    };
  }

  private parseSettingNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async getDefaultTaxRate(tx: Prisma.TransactionClient): Promise<number> {
    const settings = await tx.settings.findMany({
      where: { key: { in: ['default_tax_rate', 'tax_rate'] } },
    });
    const byKey = new Map(settings.map((row: (typeof settings)[number]) => [row.key, row.value]));
    return this.parseSettingNumber(byKey.get('default_tax_rate'))
      ?? this.parseSettingNumber(byKey.get('tax_rate'))
      ?? 5;
  }

  async reserveForJob(dto: ReservePartDto, userId: string) {
    return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      const source = dto.partId ? 'catalog' : 'adhoc';
      const job = await tx.jobs.findFirst({ where: { id: dto.job_id, is_deleted: false } });
      if (!job) throw new NotFoundException('Job not found');

      const concern = await tx.job_concerns.findFirst({
        where: { id: dto.concernId, job_id: dto.job_id },
      });
      if (!concern) throw new BadRequestException('Concern not found for this job');

      let partId: string | null = null;
      let partName: string;
      let partNumber: string | null = null;
      let unitCost: Prisma.Decimal | number | null = dto.unit_cost ?? null;
      let unitPrice: Prisma.Decimal | number;
      let estimateLineId = dto.estimateLineId ?? null;

      if (source === 'catalog') {
        if (!dto.partId) {
          throw new BadRequestException('partId is required for catalog parts');
        }

        const part = await tx.parts.findFirst({ where: { id: dto.partId } });
        if (!part) throw new NotFoundException('Part not found');

        partId = dto.partId;
        partName = dto.partName?.trim() || part.name;
        partNumber = dto.partNumber?.trim() || part.part_number || null;
        unitCost = dto.unit_cost ?? part.cost_price ?? null;
        unitPrice = dto.unitPrice ?? part.selling_price ?? 0;
      } else {
        if (!dto.partName?.trim()) {
          throw new BadRequestException('partName is required for ad-hoc parts');
        }

        if (dto.unitPrice === undefined || dto.unitPrice === null) {
          throw new BadRequestException('unitPrice is required for ad-hoc parts');
        }

        partName = dto.partName.trim();
        partNumber = dto.partNumber?.trim() || null;
        unitPrice = dto.unitPrice;
      }

      if (estimateLineId) {
        const estimateLine = await tx.estimate_lines.findFirst({
          where: { id: estimateLineId, job_id: dto.job_id },
        });
        if (!estimateLine) throw new BadRequestException('Estimate line not found for this job');
        if (estimateLine.type !== 'part') {
          throw new BadRequestException('Only part estimate lines can be linked to job parts');
        }
        if (estimateLine.concern_id && estimateLine.concern_id !== dto.concernId) {
          throw new BadRequestException('Estimate line belongs to a different concern');
        }
        if (!estimateLine.concern_id) {
          await tx.estimate_lines.update({
            where: { id: estimateLineId },
            data: { concern_id: dto.concernId, updated_at: new Date() },
          });
        }
        const existingJobPart = await tx.job_parts.findFirst({
          where: { estimate_line_id: estimateLineId },
        });
        if (existingJobPart) {
          throw new BadRequestException('This estimate line is already linked to a job part');
        }
      } else {
        const taxRate = await this.getDefaultTaxRate(tx);
        const quantity = Number(dto.quantity);
        const price = Number(unitPrice ?? 0);
        const lineTotal = quantity * price;
        const taxAmount = lineTotal * (taxRate / 100);
        const estimateLine = await tx.estimate_lines.create({
          data: {
            id: uuidv4(),
            job_id: dto.job_id,
            type: 'part',
            description: partName,
            part_number: partNumber,
            quantity,
            unit_price: price,
            discount_pct: 0,
            tax_rate_pct: taxRate,
            line_total: lineTotal,
            tax_amount: taxAmount,
            is_recommended: false,
            concern_id: dto.concernId,
            added_by: userId,
          },
        });
        estimateLineId = estimateLine.id;
      }

      return tx.job_parts.create({
        data: {
          id: uuidv4(),
          job_id: dto.job_id,
          part_id: partId,
          part_name: partName,
          part_number: partNumber,
          source,
          estimate_line_id: estimateLineId,
          concern_id: dto.concernId,
          warehouse_id: dto.warehouse_id ?? null,
          quantity: dto.quantity,
          unit_cost: unitCost,
          unit_price: unitPrice,
          status: 'memo',
        },
      });
    });
  }

  async reserveExistingForJob(jobPartId: string, userId: string) {
    return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      const jobPart = await tx.job_parts.findFirst({ where: { id: jobPartId } });
      if (!jobPart) throw new NotFoundException('Job part not found');
      if (jobPart.status !== 'memo') {
        throw new BadRequestException('Only memo parts can be reserved');
      }
      if (jobPart.source !== 'catalog' || !jobPart.part_id) {
        throw new BadRequestException('Only catalog parts can reserve stock');
      }
      if (!jobPart.warehouse_id) {
        throw new BadRequestException('Select a warehouse before reserving stock');
      }

      const inventory = await tx.inventory.findFirst({
        where: { part_id: jobPart.part_id, warehouse_id: jobPart.warehouse_id },
      });
      if (!inventory) {
        throw new BadRequestException(
          'No inventory record found for this part in the selected warehouse',
        );
      }

      if (inventory.available_quantity < jobPart.quantity) {
        throw new BadRequestException(
          `Insufficient available stock. Available: ${inventory.available_quantity}, Requested: ${jobPart.quantity}`,
        );
      }

      const newReserved = inventory.reserved_quantity + jobPart.quantity;
      const newAvailable = inventory.quantity_on_hand - newReserved;
      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          reserved_quantity: newReserved,
          available_quantity: newAvailable,
          updated_at: new Date(),
        },
      });

      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          part_id: jobPart.part_id,
          warehouse_id: jobPart.warehouse_id,
          type: 'job_reserve',
          quantity: jobPart.quantity,
          unit_cost: jobPart.unit_cost,
          reference_type: 'job',
          reference_id: jobPart.job_id,
          notes: `Reserved for job`,
          created_by: userId,
        },
      });

      await tx.job_parts.update({
        where: { id: jobPartId },
        data: { status: 'reserved', updated_at: new Date() },
      });

      return { message: 'Part reserved successfully' };
    });
  }

  async consumeForJob(jobPartId: string, userId: string, quantity?: number) {
    return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      const jobPart = await tx.job_parts.findFirst({ where: { id: jobPartId } });
      if (!jobPart) throw new NotFoundException('Job part not found');
      if (!['reserved', 'memo'].includes(jobPart.status)) {
        throw new BadRequestException('Only memo or reserved parts can be consumed');
      }

      if (jobPart.status === 'memo' && jobPart.source === 'catalog') {
        throw new BadRequestException('Reserve catalog stock before consuming this part');
      }

      const consumeQty = quantity ?? jobPart.quantity;
      if (consumeQty > jobPart.quantity) {
        throw new BadRequestException(
          'Cannot consume more than reserved quantity',
        );
      }

      if (!jobPart.part_id || !jobPart.warehouse_id) {
        await tx.job_parts.update({
          where: { id: jobPartId },
          data: { status: 'used', updated_at: new Date() },
        });

        return { message: 'Part consumed successfully' };
      }

      const inventory = await tx.inventory.findFirst({
        where: { part_id: jobPart.part_id, warehouse_id: jobPart.warehouse_id },
      });
      if (!inventory) throw new NotFoundException('Inventory record not found');

      // Decrease quantity_on_hand and reserved_quantity
      const newOnHand = inventory.quantity_on_hand - consumeQty;
      const newReserved = inventory.reserved_quantity - consumeQty;
      const newAvailable = newOnHand - newReserved;

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity_on_hand: newOnHand,
          reserved_quantity: newReserved,
          available_quantity: newAvailable,
          updated_at: new Date(),
        },
      });

      // Create JOB_CONSUME movement
      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          part_id: jobPart.part_id,
          warehouse_id: jobPart.warehouse_id,
          type: 'job_consume',
          quantity: consumeQty,
          unit_cost: jobPart.unit_cost,
          reference_type: 'job',
          reference_id: jobPart.job_id,
          notes: `Consumed for job`,
          created_by: userId,
        },
      });

      // Update job_parts status
      await tx.job_parts.update({
        where: { id: jobPartId },
        data: { status: 'used', updated_at: new Date() },
      });

      return { message: 'Part consumed successfully' };
    });
  }

  async returnForJob(jobPartId: string, userId: string, quantity?: number) {
    return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      const jobPart = await tx.job_parts.findFirst({ where: { id: jobPartId } });
      if (!jobPart) throw new NotFoundException('Job part not found');
      if (jobPart.status !== 'reserved') {
        throw new BadRequestException('Only reserved parts can be returned');
      }

      if (!jobPart.part_id || !jobPart.warehouse_id) {
        throw new BadRequestException(
          'Ad-hoc parts do not affect inventory and cannot be returned',
        );
      }

      const returnQty = quantity ?? jobPart.quantity;
      if (returnQty > jobPart.quantity) {
        throw new BadRequestException(
          'Cannot return more than reserved quantity',
        );
      }

      const inventory = await tx.inventory.findFirst({
        where: { part_id: jobPart.part_id, warehouse_id: jobPart.warehouse_id },
      });
      if (!inventory) throw new NotFoundException('Inventory record not found');

      // Decrease reserved, increase available
      const newReserved = inventory.reserved_quantity - returnQty;
      const newAvailable = inventory.quantity_on_hand - newReserved;

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          reserved_quantity: newReserved,
          available_quantity: newAvailable,
          updated_at: new Date(),
        },
      });

      // Create JOB_RETURN movement
      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          part_id: jobPart.part_id,
          warehouse_id: jobPart.warehouse_id,
          type: 'job_return',
          quantity: returnQty,
          reference_type: 'job',
          reference_id: jobPart.job_id,
          notes: `Returned from job`,
          created_by: userId,
        },
      });

      // Update job_parts status
      await tx.job_parts.update({
        where: { id: jobPartId },
        data: { status: 'returned', updated_at: new Date() },
      });

      return { message: 'Part returned successfully' };
    });
  }

  async cancelReservation(jobPartId: string, userId: string) {
    return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      const jobPart = await tx.job_parts.findFirst({ where: { id: jobPartId } });
      if (!jobPart) throw new NotFoundException('Job part not found');
      if (!['memo', 'reserved'].includes(jobPart.status)) {
        throw new BadRequestException('Only memo or reserved parts can be cancelled');
      }

      if (jobPart.status === 'memo') {
        await tx.job_parts.update({
          where: { id: jobPartId },
          data: { status: 'cancelled', updated_at: new Date() },
        });

        return { message: 'Part cancelled successfully' };
      }

      if (!jobPart.part_id || !jobPart.warehouse_id) {
        await tx.job_parts.update({
          where: { id: jobPartId },
          data: { status: 'cancelled', updated_at: new Date() },
        });

        return { message: 'Reservation cancelled successfully' };
      }

      const inventory = await tx.inventory.findFirst({
        where: { part_id: jobPart.part_id, warehouse_id: jobPart.warehouse_id },
      });
      if (!inventory) throw new NotFoundException('Inventory record not found');

      // Decrease reserved, increase available
      const newReserved = inventory.reserved_quantity - jobPart.quantity;
      const newAvailable = inventory.quantity_on_hand - newReserved;

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          reserved_quantity: newReserved,
          available_quantity: newAvailable,
          updated_at: new Date(),
        },
      });

      // Create JOB_RETURN movement (cancel = return)
      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          part_id: jobPart.part_id,
          warehouse_id: jobPart.warehouse_id,
          type: 'job_return',
          quantity: jobPart.quantity,
          reference_type: 'job',
          reference_id: jobPart.job_id,
          notes: `Reservation cancelled`,
          created_by: userId,
        },
      });

      // Update job_parts status
      await tx.job_parts.update({
        where: { id: jobPartId },
        data: { status: 'cancelled', updated_at: new Date() },
      });

      return { message: 'Reservation cancelled successfully' };
    });
  }

  async getByJob(jobId: string) {
    const jobParts = await this.prisma.tenant.job_parts.findMany({
      where: { job_id: jobId },
      include: { parts: true, warehouses: true, estimate_lines: true, job_concerns: true },
    });

    return jobParts.map((jobPart: any) => this.normalizeJobPart(jobPart));
  }
}
