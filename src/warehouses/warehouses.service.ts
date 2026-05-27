import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWarehouseDto) {
    if (dto.is_default) {
      return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.warehouses.updateMany({
          where: { is_default: true },
          data: { is_default: false },
        });
        return tx.warehouses.create({
          data: {
            id: uuid(),
            name: dto.name,
            location: dto.location || null,
            is_default: true,
          },
        });
      });
    }

    return this.prisma.tenant.warehouses.create({
      data: {
        id: uuid(),
        name: dto.name,
        location: dto.location || null,
        is_default: dto.is_default ?? false,
      },
    });
  }

  async findAll() {
    return this.prisma.tenant.warehouses.findMany({
      orderBy: [
        { is_default: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.tenant.warehouses.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    await this.findOne(id);

    if (dto.is_default === true) {
      return this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.warehouses.updateMany({
          where: { is_default: true },
          data: { is_default: false },
        });
        return tx.warehouses.update({
          where: { id },
          data: {
            name: dto.name,
            location: dto.location,
            is_default: true,
          },
        });
      });
    }

    return this.prisma.tenant.warehouses.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.is_default !== undefined && { is_default: dto.is_default }),
      },
    });
  }
}