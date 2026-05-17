import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { getWorkshopContext } from '../prisma/workshop-context';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { ListPartsDto } from './dto/list-parts.dto';
import { CreatePartFitmentDto, UpdatePartFitmentDto } from './dto/part-fitment.dto';

@Injectable()
export class PartsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePartDto) {
    const part = await this.prisma.tenant.parts.create({
      data: {
        id: uuid(),
        part_number: dto.part_number,
        name: dto.name,
        brand: dto.brand,
        category: dto.category,
        unit: dto.unit,
        cost_price: dto.cost_price,
        selling_price: dto.selling_price,
        barcode: dto.barcode,
        supplier_id: dto.supplier_id,
        min_stock: dto.min_stock,
      },
    });

    // Create inventory rows for every warehouse in the workshop so the
    // part is immediately visible in stock views with zero quantities.
    const { workshopId } = getWorkshopContext();
    if (workshopId) {
      const warehouses = await this.prisma.tenant.warehouses.findMany({
        where: { workshop_id: workshopId },
        select: { id: true },
      });
      if (warehouses.length) {
        await this.prisma.tenant.inventory.createMany({
          data: warehouses.map((w: { id: string }) => ({
            id: uuid(),
            part_id: part.id,
            warehouse_id: w.id,
            quantity_on_hand: 0,
            reserved_quantity: 0,
            available_quantity: 0,
            workshop_id: workshopId,
          })),
        });
      }
    }

    return part;
  }

  async findAll(query: ListPartsDto) {
    const skip = (query.page - 1) * query.limit;
    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { part_number: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) where.category = query.category;
    if (query.is_active !== undefined) where.is_active = query.is_active;
    if (query.supplier_id) where.supplier_id = query.supplier_id;

    const [items, total] = await Promise.all([
      this.prisma.tenant.parts.findMany({
        skip,
        take: query.limit,
        where,
        include: {
          suppliers: true,
          inventory: { include: { warehouses: true } },
          part_fitments: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.parts.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const part = await this.prisma.tenant.parts.findUnique({
      where: { id },
      include: {
        suppliers: true,
        inventory: { include: { warehouses: true } },
        part_fitments: { orderBy: [{ make: 'asc' }, { model: 'asc' }, { year_from: 'asc' }] },
      },
    });
    if (!part) throw new NotFoundException('Part not found');
    return part;
  }

  async update(id: string, dto: UpdatePartDto) {
    await this.findOne(id);
    return this.prisma.tenant.parts.update({
      where: { id },
      data: dto,
    });
  }

  async listFitments(partId: string) {
    await this.findOne(partId);
    return this.prisma.tenant.part_fitments.findMany({
      where: { part_id: partId },
      orderBy: [{ make: 'asc' }, { model: 'asc' }, { year_from: 'asc' }],
    });
  }

  async createFitment(partId: string, dto: CreatePartFitmentDto) {
    await this.findOne(partId);
    return this.prisma.tenant.part_fitments.create({
      data: {
        id: uuid(),
        part_id: partId,
        make: dto.make.trim(),
        model: dto.model?.trim() || null,
        variant: dto.variant?.trim() || null,
        engine: dto.engine?.trim() || null,
        year_from: dto.year_from ?? null,
        year_to: dto.year_to ?? null,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async updateFitment(partId: string, fitmentId: string, dto: UpdatePartFitmentDto) {
    await this.findOne(partId);
    return this.prisma.tenant.part_fitments.update({
      where: { id: fitmentId },
      data: {
        make: dto.make?.trim(),
        model: dto.model?.trim() || null,
        variant: dto.variant?.trim() || null,
        engine: dto.engine?.trim() || null,
        year_from: dto.year_from ?? null,
        year_to: dto.year_to ?? null,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async removeFitment(partId: string, fitmentId: string) {
    await this.findOne(partId);
    return this.prisma.tenant.part_fitments.delete({ where: { id: fitmentId } });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.parts.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async search(q: string) {
    const term = `%${q.trim().toLowerCase()}%`;
    const { workshopId } = getWorkshopContext();
    const matches = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id
      FROM parts p
      WHERE p.is_active = 1
        AND p.workshop_id = ${workshopId}
        AND (
          LOWER(COALESCE(p.name, '')) LIKE ${term}
          OR LOWER(COALESCE(p.part_number, '')) LIKE ${term}
          OR LOWER(COALESCE(p.barcode, '')) LIKE ${term}
          OR LOWER(COALESCE(p.brand, '')) LIKE ${term}
          OR EXISTS (
            SELECT 1
            FROM part_fitments pf
            WHERE pf.part_id = p.id
              AND pf.workshop_id = ${workshopId}
              AND (
                LOWER(COALESCE(pf.make, '')) LIKE ${term}
                OR LOWER(COALESCE(pf.model, '')) LIKE ${term}
                OR LOWER(COALESCE(pf.variant, '')) LIKE ${term}
                OR LOWER(COALESCE(pf.engine, '')) LIKE ${term}
              )
          )
        )
      ORDER BY p.created_at DESC
      LIMIT 20
    `;

    if (!matches.length) return [];

    const items = await this.prisma.tenant.parts.findMany({
      where: { id: { in: matches.map((row: (typeof matches)[number]) => row.id) } },
      select: { id: true, name: true, part_number: true, barcode: true, brand: true },
    });

    const byId = new Map(items.map((item: (typeof items)[number]) => [item.id, item]));
    return matches
      .map((row: (typeof matches)[number]) => byId.get(row.id))
      .filter((item: (typeof items)[number] | undefined): item is (typeof items)[number] => Boolean(item));
  }
}