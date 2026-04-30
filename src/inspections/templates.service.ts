import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTemplateDto, userId: string) {
    return this.prisma.inspection_templates.create({
      data: {
        id: uuid(),
        name: dto.name,
        vehicle_type: dto.vehicle_type,
        description: dto.description,
        created_by: userId,
        is_active: false,
      },
    });
  }

  async findAll(vehicleType?: string) {
    return this.prisma.inspection_templates.findMany({
      where: { ...(vehicleType ? { vehicle_type: vehicleType } : {}) },
      include: {
        inspection_sections: {
          include: { inspection_items: { orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.inspection_templates.findUnique({
      where: { id },
      include: {
        inspection_sections: {
          include: { inspection_items: { orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        },
      },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async addSection(templateId: string, body: { name: string; icon?: string; sort_order?: number }) {
    await this.findOne(templateId);
    return this.prisma.inspection_sections.create({
      data: {
        id: uuid(),
        template_id: templateId,
        name: body.name,
        icon: body.icon,
        sort_order: body.sort_order ?? 999,
        is_active: true,
      },
    });
  }

  async addItem(
    templateId: string,
    body: {
      section_id: string;
      label: string;
      input_type?: 'pass_fail' | 'yes_no' | 'ok_warn_fail' | 'number' | 'odometer' | 'fuel_level' | 'text' | 'toggle' | 'photo';
      options?: any;
      unit?: string;
      requires_photo?: boolean;
      requires_note_on?: string;
      help_text?: string;
      sort_order?: number;
    },
  ) {
    const section = await this.prisma.inspection_sections.findUnique({ where: { id: body.section_id } });
    if (!section) throw new NotFoundException('Section not found');
    if (section.template_id !== templateId) throw new BadRequestException('Section does not belong to this template');

    return this.prisma.inspection_items.create({
      data: {
        id: uuid(),
        section_id: body.section_id,
        label: body.label,
        input_type: body.input_type || 'pass_fail',
        options: body.options ? JSON.stringify(body.options) : null,
        unit: body.unit,
        requires_photo: body.requires_photo ?? false,
        requires_note_on: body.requires_note_on,
        help_text: body.help_text,
        sort_order: body.sort_order ?? 999,
        is_active: true,
      },
    });
  }

  async publish(id: string) {
    await this.findOne(id);
    return this.prisma.inspection_templates.update({
      where: { id },
      data: { is_active: true },
    });
  }
}
