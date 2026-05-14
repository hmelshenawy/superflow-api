import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class LabourRatesService {
  constructor(private prisma: PrismaService) {}

  async getLabourRates() {
    return this.prisma.tenant.labour_rates.findMany({ orderBy: { name: 'asc' } });
  }

  async addLabourRate(body: { name: string; rate_per_hour: number; currency?: string; is_active?: boolean }) {
    if (!body?.name || body?.rate_per_hour == null) throw new BadRequestException('name and rate_per_hour are required');
    return this.prisma.tenant.labour_rates.create({
      data: {
        id: uuid(),
        name: body.name,
        rate_per_hour: body.rate_per_hour,
        currency: body.currency || 'AED',
        is_active: body.is_active ?? true,
      },
    });
  }

  async updateLabourRate(id: string, body: { name?: string; rate_per_hour?: number; currency?: string; is_active?: boolean }) {
    const rate = await this.prisma.tenant.labour_rates.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Labour rate not found');
    return this.prisma.tenant.labour_rates.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.rate_per_hour !== undefined && { rate_per_hour: body.rate_per_hour }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
      },
    });
  }

  async deleteLabourRate(id: string) {
    const rate = await this.prisma.tenant.labour_rates.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Labour rate not found');
    return this.prisma.tenant.labour_rates.delete({ where: { id } });
  }
}