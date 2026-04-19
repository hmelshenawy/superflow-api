import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [jobs, customers, vehicles, deferred] = await Promise.all([
      this.prisma.jobs.count(),
      this.prisma.customers.count({ where: { is_active: true } }),
      this.prisma.vehicles.count(),
      this.prisma.deferred_work.count({ where: { status: 'pending' } }),
    ]);

    const jobsByStatus = await this.prisma.jobs.groupBy({ by: ['status'], _count: true });

    return { totalJobs: jobs, activeCustomers: customers, totalVehicles: vehicles, pendingDeferred: deferred, jobsByStatus };
  }

  async getSettings() {
    return this.prisma.settings.findMany({ orderBy: { key: 'asc' } });
  }

  async upsertSetting(key: string, value: string, valueType: string, userId: string) {
    const existing = await this.prisma.settings.findUnique({ where: { key } });
    if (existing) {
      return this.prisma.settings.update({ where: { id: existing.id }, data: { value, value_type: valueType as any, updated_by: userId } });
    }
    const { v4: uuid } = require('uuid');
    return this.prisma.settings.create({ data: { id: uuid(), key, value, value_type: valueType as any, updated_by: userId } });
  }

  async getLabourRates() {
    return this.prisma.labour_rates.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } });
  }
}