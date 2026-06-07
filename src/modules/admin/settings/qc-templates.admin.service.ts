import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class QcTemplatesAdminService {
  constructor(private prisma: PrismaService) {}

  async getTemplates() {
    return this.prisma.tenant.qc_checklist_templates.findMany({
      include: {
        qc_checklist_sections: {
          include: { qc_checklist_items: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTemplate(id: string) {
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

  async createTemplate(body: { name: string; description?: string; is_default?: boolean; is_active?: boolean }, userId: string) {
    return this.prisma.tenant.qc_checklist_templates.create({
      data: {
        id: uuid(),
        name: body.name,
        description: body.description,
        is_default: body.is_default ?? false,
        is_active: body.is_active ?? true,
        created_by: userId,
      },
    });
  }

  async updateTemplate(id: string, body: Record<string, any>) {
    await this.getTemplate(id);
    const data: Record<string, any> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.is_default !== undefined) data.is_default = body.is_default;
    if (body.is_active !== undefined) data.is_active = body.is_active;
    data.updated_at = new Date();

    return this.prisma.tenant.qc_checklist_templates.update({ where: { id }, data });
  }

  async deleteTemplate(id: string) {
    await this.getTemplate(id);
    return this.prisma.tenant.qc_checklist_templates.update({
      where: { id },
      data: { is_active: false, updated_at: new Date() },
    });
  }

  async addSection(templateId: string, body: { name: string; icon?: string; sort_order?: number }) {
    await this.getTemplate(templateId);
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

  async updateSection(sectionId: string, body: Record<string, any>) {
    const data: Record<string, any> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.sort_order !== undefined) data.sort_order = body.sort_order;
    if (body.is_active !== undefined) data.is_active = body.is_active;

    return this.prisma.tenant.qc_checklist_sections.update({ where: { id: sectionId }, data });
  }

  async deleteSection(sectionId: string) {
    await this.prisma.tenant.qc_checklist_items.deleteMany({ where: { section_id: sectionId } });
    return this.prisma.tenant.qc_checklist_sections.delete({ where: { id: sectionId } });
  }

  async reorderSections(templateId: string, sectionIds: string[]) {
    await this.getTemplate(templateId);
    return this.prisma.$transaction(
      sectionIds.map((id: string, index: number) =>
        this.prisma.tenant.qc_checklist_sections.update({
          where: { id },
          data: { sort_order: index },
        }),
      ),
    );
  }

  async addItem(templateId: string, body: {
    section_id: string;
    label: string;
    input_type?: string;
    requires_photo?: boolean;
    requires_note_on_fail?: boolean;
    help_text?: string;
    sort_order?: number;
  }) {
    const section = await this.prisma.tenant.qc_checklist_sections.findUnique({ where: { id: body.section_id } });
    if (!section || section.template_id !== templateId) {
      throw new NotFoundException('Section not found in this template');
    }

    return this.prisma.tenant.qc_checklist_items.create({
      data: {
        id: uuid(),
        section_id: body.section_id,
        label: body.label,
        input_type: (body.input_type as any) || 'pass_fail',
        requires_photo: body.requires_photo ?? false,
        requires_note_on_fail: body.requires_note_on_fail ?? false,
        help_text: body.help_text,
        sort_order: body.sort_order ?? 999,
      },
    });
  }

  async updateItem(itemId: string, body: Record<string, any>) {
    const data: Record<string, any> = {};
    if (body.label !== undefined) data.label = body.label;
    if (body.input_type !== undefined) data.input_type = body.input_type;
    if (body.requires_photo !== undefined) data.requires_photo = body.requires_photo;
    if (body.requires_note_on_fail !== undefined) data.requires_note_on_fail = body.requires_note_on_fail;
    if (body.help_text !== undefined) data.help_text = body.help_text;
    if (body.sort_order !== undefined) data.sort_order = body.sort_order;
    if (body.is_active !== undefined) data.is_active = body.is_active;

    return this.prisma.tenant.qc_checklist_items.update({ where: { id: itemId }, data });
  }

  async deleteItem(itemId: string) {
    return this.prisma.tenant.qc_checklist_items.delete({ where: { id: itemId } });
  }

  async reorderItems(sectionId: string, itemIds: string[]) {
    return this.prisma.$transaction(
      itemIds.map((id: string, index: number) =>
        this.prisma.tenant.qc_checklist_items.update({
          where: { id },
          data: { sort_order: index },
        }),
      ),
    );
  }
}