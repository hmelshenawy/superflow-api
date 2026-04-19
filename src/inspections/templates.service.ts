import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTemplateDto, userId: string) {
    return this.prisma.inspection_templates.create({
      data: { id: uuid(), name: dto.name, vehicle_type: dto.vehicle_type, description: dto.description, created_by: userId },
    });
  }

  async findAll(vehicleType?: string) {
    return this.prisma.inspection_templates.findMany({
      where: { is_active: true, ...(vehicleType ? { vehicle_type: vehicleType } : {}) },
      include: { inspection_sections: { include: { inspection_items: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } }, orderBy: { sort_order: 'asc' } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.inspection_templates.findUnique({
      where: { id },
      include: { inspection_sections: { include: { inspection_items: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } }, orderBy: { sort_order: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }
}