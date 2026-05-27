import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePoItemDto } from './dto/receive-po-item.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';
import { getWorkshopContext } from '../prisma/workshop-context';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePurchaseOrderDto) {
    const { workshopId } = getWorkshopContext();
    // Calculate total_cost from items
    let totalCost = 0;
    const items = dto.items.map(item => {
      const unitCost = item.unit_cost ?? 0;
      totalCost += unitCost * item.ordered_qty;
      return {
        id: uuidv4(),
        part_id: item.part_id,
        ordered_qty: item.ordered_qty,
        received_qty: 0,
        unit_cost: item.unit_cost ?? null,
        workshop_id: workshopId,
      };
    });

    return this.prisma.tenant.purchase_orders.create({
      data: {
        id: uuidv4(),
        supplier_id: dto.supplier_id ?? null,
        status: 'draft',
        total_cost: totalCost > 0 ? totalCost : null,
        purchase_order_items: { create: items },
      },
      include: { purchase_order_items: { include: { parts: true } }, suppliers: true },
    });
  }

  async findAll(query: ListPurchaseOrdersDto) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.supplier_id) where.supplier_id = query.supplier_id;

    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.tenant.purchase_orders.findMany({
        where,
        skip,
        take: query.limit,
        include: { suppliers: true, _count: { select: { purchase_order_items: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.purchase_orders.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const po = await this.prisma.tenant.purchase_orders.findFirst({
      where: { id },
      include: {
        suppliers: true,
        purchase_order_items: { include: { parts: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async updateStatus(id: string, status: string) {
    const po = await this.prisma.tenant.purchase_orders.findFirst({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');

    const validTransitions: Record<string, string[]> = {
      draft: ['ordered', 'cancelled'],
      ordered: ['partially_received', 'received', 'cancelled'],
      partially_received: ['received', 'cancelled'],
    };

    const allowed = validTransitions[po.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${po.status} to ${status}`);
    }

    return this.prisma.tenant.purchase_orders.update({
      where: { id },
      data: { status, updated_at: new Date() },
      include: { suppliers: true, purchase_order_items: true },
    });
  }

  async receiveItem(poItemId: string, dto: ReceivePoItemDto, userId: string) {
    return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      const poItem = await tx.purchase_order_items.findFirst({ where: { id: poItemId } });
      if (!poItem) throw new NotFoundException('Purchase order item not found');

      const po = await tx.purchase_orders.findFirst({ where: { id: poItem.purchase_order_id } });
      if (!po) throw new NotFoundException('Purchase order not found');
      if (po.status !== 'ordered' && po.status !== 'partially_received') {
        throw new BadRequestException('Cannot receive items for a purchase order that is not in ordered or partially_received status');
      }

      // Determine warehouse
      let warehouseId = dto.warehouse_id;
      if (!warehouseId) {
        const defaultWarehouse = await tx.warehouses.findFirst({
          where: { is_default: true },
        });
        if (!defaultWarehouse) {
          const anyWarehouse = await tx.warehouses.findFirst();
          if (!anyWarehouse) throw new BadRequestException('No warehouse found. Please create a warehouse first.');
          warehouseId = anyWarehouse.id;
        } else {
          warehouseId = defaultWarehouse.id;
        }
      }

      // Validate received quantity
      const newReceivedQty = poItem.received_qty + dto.received_qty;
      if (newReceivedQty > poItem.ordered_qty) {
        throw new BadRequestException(`Cannot receive more than ordered quantity. Ordered: ${poItem.ordered_qty}, Already received: ${poItem.received_qty}, Trying to receive: ${dto.received_qty}`);
      }

      // Update PO item received_qty
      await tx.purchase_order_items.update({
        where: { id: poItemId },
        data: { received_qty: newReceivedQty, updated_at: new Date() },
      });

      // Find or create inventory row
      let inventory = await tx.inventory.findFirst({
        where: { part_id: poItem.part_id, warehouse_id: warehouseId },
      });
      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            id: uuidv4(),
            part_id: poItem.part_id,
            warehouse_id: warehouseId,
            quantity_on_hand: 0,
            reserved_quantity: 0,
            available_quantity: 0,
            workshop_id: po.workshop_id,
          },
        });
      }

      // Increase inventory
      const newOnHand = inventory.quantity_on_hand + dto.received_qty;
      const newAvailable = newOnHand - inventory.reserved_quantity;
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity_on_hand: newOnHand, available_quantity: newAvailable, updated_at: new Date() },
      });

      // Create PURCHASE_IN movement
      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          part_id: poItem.part_id,
          warehouse_id: warehouseId,
          type: 'purchase_in',
          quantity: dto.received_qty,
          unit_cost: poItem.unit_cost,
          reference_type: 'purchase_order',
          reference_id: po.id,
          notes: `Received from PO`,
          created_by: userId,
        },
      });

      // Check if all items are fully received
      const allItems = await tx.purchase_order_items.findMany({
        where: { purchase_order_id: po.id },
      });
      const allReceived = allItems.every((item: any) => item.received_qty >= item.ordered_qty);
      const anyReceived = allItems.some((item: any) => item.received_qty > 0);

      const newStatus = allReceived ? 'received' : (anyReceived ? 'partially_received' : po.status);
      if (newStatus !== po.status) {
        await tx.purchase_orders.update({
          where: { id: po.id },
          data: { status: newStatus, updated_at: new Date() },
        });
      }

      return { message: 'Item received successfully', received_qty: newReceivedQty, po_status: newStatus };
    });
  }

  async cancel(id: string) {
    const po = await this.prisma.tenant.purchase_orders.findFirst({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'received') {
      throw new BadRequestException('Cannot cancel a fully received purchase order');
    }
    return this.prisma.tenant.purchase_orders.update({
      where: { id },
      data: { status: 'cancelled', updated_at: new Date() },
      include: { suppliers: true, purchase_order_items: true },
    });
  }
}