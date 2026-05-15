import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReservePartDto } from './dto/reserve-part.dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JobPartsService {
  constructor(private prisma: PrismaService) {}

  async reserveForJob(dto: ReservePartDto, userId: string) {
    return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Verify part exists
      const part = await tx.parts.findFirst({ where: { id: dto.part_id } });
      if (!part) throw new NotFoundException('Part not found');

      // 2. Find or create inventory row
      const inventory = await tx.inventory.findFirst({
        where: { part_id: dto.part_id, warehouse_id: dto.warehouse_id },
      });
      if (!inventory) {
        throw new BadRequestException(
          'No inventory record found for this part in the selected warehouse',
        );
      }

      // 3. Check available quantity
      if (inventory.available_quantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient available stock. Available: ${inventory.available_quantity}, Requested: ${dto.quantity}`,
        );
      }

      // 4. Update inventory: increase reserved, decrease available
      const newReserved = inventory.reserved_quantity + dto.quantity;
      const newAvailable = inventory.quantity_on_hand - newReserved;
      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          reserved_quantity: newReserved,
          available_quantity: newAvailable,
          updated_at: new Date(),
        },
      });

      // 5. Create stock movement (JOB_RESERVE)
      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          part_id: dto.part_id,
          warehouse_id: dto.warehouse_id,
          type: 'job_reserve',
          quantity: dto.quantity,
          unit_cost: dto.unit_cost ?? null,
          reference_type: 'job',
          reference_id: dto.job_id,
          notes: `Reserved for job`,
          created_by: userId,
        },
      });

      // 6. Create job_parts row
      const jobPart = await tx.job_parts.create({
        data: {
          id: uuidv4(),
          job_id: dto.job_id,
          part_id: dto.part_id,
          warehouse_id: dto.warehouse_id,
          quantity: dto.quantity,
          unit_cost: dto.unit_cost ?? null,
          unit_price: dto.unit_price ?? null,
          status: 'reserved',
        },
      });

      return jobPart;
    });
  }

  async consumeForJob(jobPartId: string, userId: string, quantity?: number) {
    return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      const jobPart = await tx.job_parts.findFirst({ where: { id: jobPartId } });
      if (!jobPart) throw new NotFoundException('Job part not found');
      if (jobPart.status !== 'reserved') {
        throw new BadRequestException('Only reserved parts can be consumed');
      }

      const consumeQty = quantity ?? jobPart.quantity;
      if (consumeQty > jobPart.quantity) {
        throw new BadRequestException(
          'Cannot consume more than reserved quantity',
        );
      }

      // Find inventory
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

      const returnQty = quantity ?? jobPart.quantity;
      if (returnQty > jobPart.quantity) {
        throw new BadRequestException(
          'Cannot return more than reserved quantity',
        );
      }

      // Find inventory
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
      if (jobPart.status !== 'reserved') {
        throw new BadRequestException('Only reserved parts can be cancelled');
      }

      // Find inventory
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
    return this.prisma.tenant.job_parts.findMany({
      where: { job_id: jobId },
      include: { parts: true, warehouses: true },
    });
  }
}