import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    return this.prisma.customers.create({ data: { id: uuid(), name: dto.name, email: dto.email, phone: dto.phone, preferred_contact: dto.preferred_contact || undefined, language: dto.language, dms_customer_id: dto.dms_customer_id, notes: dto.notes } });
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.customers.findMany({ skip, take: pagination.limit, where: { is_active: true }, orderBy: { created_at: 'desc' } }),
      this.prisma.customers.count({ where: { is_active: true } }),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customers.findUnique({ where: { id }, include: { vehicles: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customers.update({ where: { id }, data: { name: dto.name, email: dto.email, phone: dto.phone, preferred_contact: dto.preferred_contact || undefined, language: dto.language, notes: dto.notes } });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customers.update({ where: { id }, data: { is_active: false } });
  }

  async search(query: string) {
    return this.prisma.customers.findMany({
      where: {
        is_active: true,
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
          { dms_customer_id: { contains: query } },
        ],
      },
      take: 20,
    });
  }
}