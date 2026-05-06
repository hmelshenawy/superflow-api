import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { getWorkshopContext } from '../prisma/workshop-context';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    return this.prisma.tenant.customers.create({ data: { id: uuid(), name: dto.name, email: dto.email, phone: dto.phone, preferred_contact: dto.preferred_contact || undefined, language: dto.language, dms_customer_id: dto.dms_customer_id, notes: dto.notes } });
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.tenant.customers.findMany({ skip, take: pagination.limit, where: { is_active: true }, orderBy: { created_at: 'desc' } }),
      this.prisma.tenant.customers.count({ where: { is_active: true } }),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const customer = await this.prisma.tenant.customers.findUnique({
      where: { id },
      include: { vehicles: { select: { id: true, make: true, model: true, plate: true, vin: true, year: true } } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.tenant.customers.update({ where: { id }, data: { name: dto.name, email: dto.email, phone: dto.phone, preferred_contact: dto.preferred_contact || undefined, language: dto.language, notes: dto.notes } });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft-delete: sets is_active = false so existing jobs and references
    // still resolve, but the customer stops appearing in active lists.
    return this.prisma.tenant.customers.update({ where: { id }, data: { is_active: false } });
  }

  async getJobs(customerId: string, pagination: PaginationDto) {
    // Shallow job history: only the job rows themselves plus vehicle info,
    // not the full payload with estimates/inspections/tokens.
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.tenant.jobs.findMany({
        skip, take: pagination.limit, where: { customer_id: customerId },
        include: { vehicles: { select: { make: true, model: true, plate: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.jobs.count({ where: { customer_id: customerId } }),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async getDeferred(customerId: string, pagination: PaginationDto) {
    // Deferred work tied to a customer, useful for the rebook flow.
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.tenant.deferred_work.findMany({
        skip, take: pagination.limit, where: { customer_id: customerId },
        include: { vehicles: { select: { make: true, model: true, plate: true } }, estimate_lines: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.deferred_work.count({ where: { customer_id: customerId } }),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async search(query: string) {
    const term = `%${query.trim().toLowerCase()}%`;
    // Search uses raw SQL because Prisma does not support case-insensitive
    // multi-field LIKE across related tables in a single query.
    const { workshopId } = getWorkshopContext();
    const matches = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM customers c
      WHERE c.is_active = 1
        AND c.workshop_id = ${workshopId}
        AND (
          LOWER(COALESCE(c.name, '')) LIKE ${term}
          OR LOWER(COALESCE(c.email, '')) LIKE ${term}
          OR LOWER(COALESCE(c.phone, '')) LIKE ${term}
          OR LOWER(COALESCE(c.dms_customer_id, '')) LIKE ${term}
        )
      ORDER BY c.created_at DESC
      LIMIT 20
    `;

    if (!matches.length) return [];

    const items = await this.prisma.tenant.customers.findMany({
      where: { id: { in: matches.map((row: (typeof matches)[number]) => row.id) } },
    });

    const byId = new Map(items.map((item: (typeof items)[number]) => [item.id, item]));
    return matches
      .map((row: (typeof matches)[number]) => byId.get(row.id))
      .filter((item: (typeof items)[number] | undefined): item is (typeof items)[number] => Boolean(item));
  }
}