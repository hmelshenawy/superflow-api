import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PartsAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async partDemandHistory(partId: string, dateFrom?: string, dateTo?: string) {
    const where: any = {
      part_id: partId,
      type: 'job_consume',
    };
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    const movements = await this.prisma.tenant.stock_movements.findMany({
      where,
      select: { quantity: true, created_at: true },
      orderBy: { created_at: 'asc' },
    });

    const monthly: Record<string, number> = {};
    for (const m of movements) {
      const month = m.created_at!.toISOString().slice(0, 7);
      monthly[month] = (monthly[month] || 0) + m.quantity;
    }

    return Object.entries(monthly).map(([month, total]) => ({ month, total }));
  }

  async fastMovingParts(limit: number = 20, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await this.prisma.tenant.stock_movements.groupBy({
      by: ['part_id'],
      where: {
        type: 'job_consume',
        created_at: { gte: since },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const partIds = results.map((r: { part_id: string }) => r.part_id);
    const parts = await this.prisma.tenant.parts.findMany({
      where: { id: { in: partIds } },
      select: { id: true, name: true, part_number: true, category: true, selling_price: true },
    });

    return results.map((r: { part_id: string; _sum: { quantity: number | null } }) => ({
      ...parts.find((p: { id: string }) => p.id === r.part_id),
      total_consumed: r._sum.quantity,
    }));
  }

  async deadStock(months: number = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const partsWithMovements = await this.prisma.tenant.stock_movements.findMany({
      where: {
        type: 'job_consume',
        created_at: { gte: since },
      },
      select: { part_id: true },
      distinct: ['part_id'],
    });

    const activePartIds = partsWithMovements.map((m: { part_id: string }) => m.part_id);

    const deadParts = await this.prisma.tenant.inventory.findMany({
      where: {
        quantity_on_hand: { gt: 0 },
        parts: { is_active: true, id: { notIn: activePartIds } },
      },
      include: {
        parts: { select: { id: true, name: true, part_number: true, category: true, selling_price: true } },
        warehouses: { select: { id: true, name: true } },
      },
    });

    return deadParts.map((i: any) => ({
      ...i.parts,
      warehouse: i.warehouses.name,
      quantity_on_hand: i.quantity_on_hand,
      available_quantity: i.available_quantity,
    }));
  }

  async partsProfit(dateFrom?: string, dateTo?: string) {
    const where: any = { status: 'used' };
    if (dateFrom || dateTo) {
      where.updated_at = {};
      if (dateFrom) where.updated_at.gte = new Date(dateFrom);
      if (dateTo) where.updated_at.lte = new Date(dateTo);
    }

    const jobParts = await this.prisma.tenant.job_parts.findMany({
      where,
      select: {
        quantity: true,
        unit_cost: true,
        unit_price: true,
        part_id: true,
        parts: { select: { id: true, name: true, category: true } },
      },
    });

    const byCategory: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {};
    let totalRevenue = 0;
    let totalCost = 0;

    for (const jp of jobParts) {
      const cost = Number(jp.unit_cost ?? 0) * jp.quantity;
      const revenue = Number(jp.unit_price ?? 0) * jp.quantity;
      const profit = revenue - cost;
      const cat = jp.parts?.category || 'Uncategorized';

      if (!byCategory[cat]) byCategory[cat] = { revenue: 0, cost: 0, profit: 0, count: 0 };
      byCategory[cat].revenue += revenue;
      byCategory[cat].cost += cost;
      byCategory[cat].profit += profit;
      byCategory[cat].count += jp.quantity;

      totalRevenue += revenue;
      totalCost += cost;
    }

    return {
      by_category: byCategory,
      totals: { revenue: totalRevenue, cost: totalCost, profit: totalRevenue - totalCost },
    };
  }
}