import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { getWorkshopContext } from '../../../prisma/workshop-context';
import { CreateJobTypeDto } from './dto/create-job-type.dto';
import { ImportJobTypesDto } from './dto/import-job-types.dto';
import { UpdateJobTypeDto } from './dto/update-job-type.dto';

@Injectable()
export class JobTypesService {
  constructor(private prisma: PrismaService) {}

  async templates() {
    const templates = await (this.prisma.raw as any).job_type_templates.findMany({
      where: { is_active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return templates.reduce((acc: Record<string, any[]>, template: any) => {
      acc[template.category] = acc[template.category] || [];
      acc[template.category].push(template);
      return acc;
    }, {});
  }

  async importTemplates(dto: ImportJobTypesDto) {
    const { workshopId } = getWorkshopContext();
    const created: any[] = [];
    for (const templateId of dto.template_ids) {
      const existing = await (this.prisma.tenant as any).job_types.findFirst({ where: { template_id: templateId } });
      if (existing) continue;
      const template = await (this.prisma.raw as any).job_type_templates.findFirst({ where: { id: templateId, is_active: true } });
      if (!template) continue;
      created.push(await (this.prisma.tenant as any).job_types.create({
        data: {
          id: uuid(),
          workshop_id: workshopId,
          template_id: template.id,
          name: template.name,
          category: template.category,
          duration_min: template.default_duration_min,
          color_hex: template.color_hex,
          description: template.description,
        },
      }));
    }
    return created;
  }

  async categories() {
    // Get all unique categories from both templates and this workshop's custom types
    const [templateCategories, customCategories] = await Promise.all([
      (this.prisma.raw as any).job_type_templates.findMany({
        where: { is_active: true },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
      (this.prisma.tenant as any).job_types.findMany({
        where: { is_active: true },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
    ]);
    const all = new Set([
      ...templateCategories.map((t: any) => t.category),
      ...customCategories.map((t: any) => t.category),
    ]);
    return [...all].sort();
  }

  findAll() {
    return (this.prisma.tenant as any).job_types.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      include: { job_type_templates: true },
    });
  }

  async create(dto: CreateJobTypeDto) {
    const { workshopId } = getWorkshopContext();
    return (this.prisma.tenant as any).job_types.create({
      data: { id: uuid(), workshop_id: workshopId, template_id: null, category: dto.category || 'Custom', ...dto },
    });
  }

  async findOne(id: string) {
    const jobType = await (this.prisma.tenant as any).job_types.findUnique({ where: { id } });
    if (!jobType) throw new NotFoundException('Job type not found');
    return jobType;
  }

  async update(id: string, dto: UpdateJobTypeDto) {
    await this.findOne(id);
    return (this.prisma.tenant as any).job_types.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return (this.prisma.tenant as any).job_types.update({ where: { id }, data: { is_active: false } });
  }
}
