import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    return this.prisma.tenant.suppliers.create({
      data: {
        id: uuid(),
        name: dto.name,
        phone: dto.phone || undefined,
        email: dto.email || undefined,
        address: dto.address || undefined,
        payment_terms: dto.payment_terms || undefined,
      },
    });
  }

  async findAll(dto: ListSuppliersDto) {
    const skip = (dto.page - 1) * dto.limit;
    const where: any = { is_active: true };

    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.tenant.suppliers.findMany({
        skip,
        take: dto.limit,
        where,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.suppliers.count({ where }),
    ]);

    return { items, total, page: dto.page, limit: dto.limit };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.tenant.suppliers.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.tenant.suppliers.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone || undefined,
        email: dto.email || undefined,
        address: dto.address || undefined,
        payment_terms: dto.payment_terms || undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft-delete: sets is_active = false so existing purchase orders and
    // references still resolve, but the supplier stops appearing in active lists.
    return this.prisma.tenant.suppliers.update({
      where: { id },
      data: { is_active: false },
    });
  }
}