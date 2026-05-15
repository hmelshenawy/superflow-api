import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // Get stock per warehouse for a specific part
  async getStockByPart(partId: string) {
    return this.prisma.tenant.inventory.findMany({
      where: { part_id: partId },
      include: { warehouses: true, parts: true },
    });
  }

  // Get low stock items (available_quantity <= min_stock)
  async getLowStock() {
    const items = await this.prisma.tenant.inventory.findMany({
      where: { parts: { is_active: true } },
      include: { parts: true, warehouses: true },
    });
    return items.filter((item: any) => {
      const minStock = (item.parts as any)?.min_stock ?? 0;
      return item.available_quantity <= minStock;
    });
  }

  // Manual stock adjustment
  async adjustStock(dto: AdjustStockDto, userId: string) {
    return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      // Verify part exists
      const part = await tx.parts.findFirst({ where: { id: dto.part_id } });
      if (!part) throw new NotFoundException('Part not found');

      // Find or create inventory row
      let inventory = await tx.inventory.findFirst({
        where: { part_id: dto.part_id, warehouse_id: dto.warehouse_id },
      });

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            id: uuidv4(),
            part_id: dto.part_id,
            warehouse_id: dto.warehouse_id,
            quantity_on_hand: 0,
            reserved_quantity: 0,
            available_quantity: 0,
          },
        });
      }

      let newQuantityOnHand: number;
      if (dto.type === 'adjustment_in') {
        newQuantityOnHand = inventory.quantity_on_hand + dto.quantity;
      } else {
        newQuantityOnHand = inventory.quantity_on_hand - dto.quantity;
        if (newQuantityOnHand < 0) {
          throw new BadRequestException('Adjustment would result in negative stock');
        }
      }

      const newAvailable = newQuantityOnHand - inventory.reserved_quantity;

      inventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity_on_hand: newQuantityOnHand,
          available_quantity: newAvailable,
          updated_at: new Date(),
        },
      });

      // Create stock movement
      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          part_id: dto.part_id,
          warehouse_id: dto.warehouse_id,
          type: dto.type,
          quantity: dto.quantity,
          unit_cost: dto.unit_cost ? dto.unit_cost : null,
          notes: dto.notes || null,
          created_by: userId,
          reference_type: 'adjustment',
          reference_id: inventory.id,
        },
      });

      return inventory;
    });
  }

  // Transfer stock between warehouses
  async transferStock(dto: TransferStockDto, userId: string) {
    if (dto.from_warehouse_id === dto.to_warehouse_id) {
      throw new BadRequestException('Source and destination warehouses must be different');
    }

    return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      // Verify part exists
      const part = await tx.parts.findFirst({ where: { id: dto.part_id } });
      if (!part) throw new NotFoundException('Part not found');

      // Find or create source inventory
      let sourceInventory = await tx.inventory.findFirst({
        where: { part_id: dto.part_id, warehouse_id: dto.from_warehouse_id },
      });
      if (!sourceInventory) {
        throw new BadRequestException('No stock found in source warehouse');
      }
      if (sourceInventory.available_quantity < dto.quantity) {
        throw new BadRequestException('Insufficient available stock in source warehouse');
      }

      // Find or create destination inventory
      let destInventory = await tx.inventory.findFirst({
        where: { part_id: dto.part_id, warehouse_id: dto.to_warehouse_id },
      });
      if (!destInventory) {
        destInventory = await tx.inventory.create({
          data: {
            id: uuidv4(),
            part_id: dto.part_id,
            warehouse_id: dto.to_warehouse_id,
            quantity_on_hand: 0,
            reserved_quantity: 0,
            available_quantity: 0,
          },
        });
      }

      // Decrease source
      const sourceNewOnHand = sourceInventory.quantity_on_hand - dto.quantity;
      const sourceNewAvailable = sourceNewOnHand - sourceInventory.reserved_quantity;
      await tx.inventory.update({
        where: { id: sourceInventory.id },
        data: { quantity_on_hand: sourceNewOnHand, available_quantity: sourceNewAvailable, updated_at: new Date() },
      });

      // Increase destination
      const destNewOnHand = destInventory.quantity_on_hand + dto.quantity;
      const destNewAvailable = destNewOnHand - destInventory.reserved_quantity;
      await tx.inventory.update({
        where: { id: destInventory.id },
        data: { quantity_on_hand: destNewOnHand, available_quantity: destNewAvailable, updated_at: new Date() },
      });

      // Create TRANSFER_OUT movement
      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          part_id: dto.part_id,
          warehouse_id: dto.from_warehouse_id,
          type: 'transfer_out',
          quantity: dto.quantity,
          notes: dto.notes || `Transfer to warehouse ${dto.to_warehouse_id}`,
          created_by: userId,
          reference_type: 'transfer',
          reference_id: destInventory.id,
        },
      });

      // Create TRANSFER_IN movement
      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          part_id: dto.part_id,
          warehouse_id: dto.to_warehouse_id,
          type: 'transfer_in',
          quantity: dto.quantity,
          notes: dto.notes || `Transfer from warehouse ${dto.from_warehouse_id}`,
          created_by: userId,
          reference_type: 'transfer',
          reference_id: sourceInventory.id,
        },
      });

      return { message: 'Transfer completed successfully' };
    });
  }
}