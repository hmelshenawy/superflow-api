import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class TemplatesAdminService {
  constructor(private prisma: PrismaService) {}

  // ─── Templates ──────────────────────────────────────────

  async getTemplates() {
    return this.prisma.tenant.inspection_templates.findMany({
      include: {
        inspection_sections: {
          include: { inspection_items: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTemplate(id: string) {
    const template = await this.prisma.tenant.inspection_templates.findUnique({
      where: { id },
      include: {
        inspection_sections: {
          include: { inspection_items: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        },
      },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async createTemplate(body: any, userId: string) {
    if (!body?.name) throw new BadRequestException('name is required');
    return this.prisma.tenant.inspection_templates.create({
      data: {
        id: uuid(),
        name: body.name,
        vehicle_type: body.vehicle_type || null,
        description: body.description || null,
        is_default: body.is_default ?? false,
        is_active: body.is_active ?? true,
        created_by: userId,
      },
    });
  }

  async updateTemplate(id: string, body: any) {
    const template = await this.prisma.tenant.inspection_templates.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return this.prisma.tenant.inspection_templates.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.vehicle_type !== undefined && { vehicle_type: body.vehicle_type }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.is_default !== undefined && { is_default: body.is_default }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
      },
    });
  }

  async deleteTemplate(id: string) {
    const template = await this.prisma.tenant.inspection_templates.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return this.prisma.tenant.inspection_templates.update({
      where: { id },
      data: { is_active: false },
    });
  }

  // ─── Sections ──────────────────────────────────────────

  async addSection(templateId: string, body: { name: string; icon?: string; sort_order?: number }) {
    const template = await this.prisma.tenant.inspection_templates.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Template not found');
    return this.prisma.tenant.inspection_sections.create({
      data: {
        id: uuid(),
        template_id: templateId,
        name: body.name,
        icon: body.icon || null,
        sort_order: body.sort_order ?? 999,
        is_active: true,
      },
    });
  }

  async updateSection(sectionId: string, body: { name?: string; icon?: string; sort_order?: number; is_active?: boolean }) {
    const section = await this.prisma.tenant.inspection_sections.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    return this.prisma.tenant.inspection_sections.update({
      where: { id: sectionId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
      },
    });
  }

  async deleteSection(sectionId: string) {
    const section = await this.prisma.tenant.inspection_sections.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    await this.prisma.tenant.inspection_items.deleteMany({ where: { section_id: sectionId } });
    await this.prisma.tenant.inspection_sections.delete({ where: { id: sectionId } });
    return { deleted: true };
  }

  async reorderSections(templateId: string, sectionIds: string[]) {
    const template = await this.prisma.tenant.inspection_templates.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Template not found');
    const updates = sectionIds.map((id, index) =>
      this.prisma.tenant.inspection_sections.update({ where: { id }, data: { sort_order: index + 1 } }),
    );
    await this.prisma.$transaction(updates);
    return { reordered: true };
  }

  // ─── Items ─────────────────────────────────────────────

  async addItem(templateId: string, body: {
    section_id: string;
    label: string;
    input_type?: string;
    options?: unknown[];
    unit?: string;
    requires_photo?: boolean;
    requires_note_on?: string;
    help_text?: string;
    sort_order?: number;
  }) {
    const section = await this.prisma.tenant.inspection_sections.findUnique({ where: { id: body.section_id } });
    if (!section) throw new NotFoundException('Section not found');
    if (section.template_id !== templateId) throw new BadRequestException('Section does not belong to this template');
    return this.prisma.tenant.inspection_items.create({
      data: {
        id: uuid(),
        section_id: body.section_id,
        label: body.label,
        input_type: (body.input_type as any) || 'pass_fail',
        options: body.options ? JSON.stringify(body.options) : null,
        unit: body.unit || null,
        requires_photo: body.requires_photo ?? false,
        requires_note_on: body.requires_note_on || null,
        help_text: body.help_text || null,
        sort_order: body.sort_order ?? 999,
        is_active: true,
      },
    });
  }

  async updateItem(itemId: string, body: {
    label?: string;
    input_type?: string;
    options?: unknown[];
    unit?: string;
    requires_photo?: boolean;
    requires_note_on?: string;
    help_text?: string;
    sort_order?: number;
    is_active?: boolean;
  }) {
    const item = await this.prisma.tenant.inspection_items.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    return this.prisma.tenant.inspection_items.update({
      where: { id: itemId },
      data: {
        ...(body.label !== undefined && { label: body.label }),
        ...(body.input_type !== undefined && { input_type: body.input_type as any }),
        ...(body.options !== undefined && { options: typeof body.options === 'string' ? body.options : JSON.stringify(body.options) }),
        ...(body.unit !== undefined && { unit: body.unit }),
        ...(body.requires_photo !== undefined && { requires_photo: body.requires_photo }),
        ...(body.requires_note_on !== undefined && { requires_note_on: body.requires_note_on }),
        ...(body.help_text !== undefined && { help_text: body.help_text }),
        ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
      },
    });
  }

  async deleteItem(itemId: string) {
    const item = await this.prisma.tenant.inspection_items.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    await this.prisma.tenant.inspection_items.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async reorderItems(sectionId: string, itemIds: string[]) {
    const section = await this.prisma.tenant.inspection_sections.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    const updates = itemIds.map((id, index) =>
      this.prisma.tenant.inspection_items.update({ where: { id }, data: { sort_order: index + 1 } }),
    );
    await this.prisma.$transaction(updates);
    return { reordered: true };
  }
}