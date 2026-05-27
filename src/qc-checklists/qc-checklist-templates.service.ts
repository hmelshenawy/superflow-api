import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QcChecklistTemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: { name: string; description?: string }, userId: string) {
    return this.prisma.tenant.qc_checklist_templates.create({
      data: {
        id: uuid(),
        name: dto.name,
        description: dto.description,
        created_by: userId,
        is_active: false,
      },
    });
  }

  async findAll() {
    return this.prisma.tenant.qc_checklist_templates.findMany({
      where: { is_active: true },
      include: {
        qc_checklist_sections: {
          where: { is_active: true },
          include: { qc_checklist_items: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.tenant.qc_checklist_templates.findUnique({
      where: { id },
      include: {
        qc_checklist_sections: {
          include: { qc_checklist_items: { orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        },
      },
    });
    if (!template) throw new NotFoundException('QC checklist template not found');
    return template;
  }

  async addSection(templateId: string, body: { name: string; icon?: string; sort_order?: number }) {
    const template = await this.prisma.tenant.qc_checklist_templates.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('QC checklist template not found');

    return this.prisma.tenant.qc_checklist_sections.create({
      data: {
        id: uuid(),
        template_id: templateId,
        name: body.name,
        icon: body.icon,
        sort_order: body.sort_order ?? 999,
      },
    });
  }

  async addItem(templateId: string, sectionId: string, body: {
    label: string;
    input_type?: string;
    requires_photo?: boolean;
    requires_note_on_fail?: boolean;
    help_text?: string;
    sort_order?: number;
  }) {
    const section = await this.prisma.tenant.qc_checklist_sections.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new NotFoundException('Section not found');
    if (section.template_id !== templateId) {
      throw new BadRequestException('Section does not belong to this template');
    }

    return this.prisma.tenant.qc_checklist_items.create({
      data: {
        id: uuid(),
        section_id: sectionId,
        label: body.label,
        input_type: (body.input_type as any) || 'pass_fail',
        requires_photo: body.requires_photo ?? false,
        requires_note_on_fail: body.requires_note_on_fail ?? false,
        help_text: body.help_text,
        sort_order: body.sort_order ?? 999,
      },
    });
  }

  async publish(id: string) {
    const template = await this.prisma.tenant.qc_checklist_templates.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('QC checklist template not found');

    return this.prisma.tenant.qc_checklist_templates.update({
      where: { id },
      data: { is_active: true },
    });
  }
}