import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { SubmitInspectionDto } from './dto/submit-inspection.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class InspectionsService {
  constructor(private prisma: PrismaService) {}

  async create(jobId: string, templateId: string, technicianId: string) {
    const existing = await this.prisma.inspections.findUnique({ where: { job_id: jobId } });
    if (existing) throw new BadRequestException('Job already has an inspection');
    return this.prisma.inspections.create({
      data: { id: uuid(), job_id: jobId, template_id: templateId, technician_id: technicianId, status: 'in_progress', started_at: new Date() },
    });
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.inspections.findMany({ skip, take: pagination.limit, orderBy: { created_at: 'desc' } }),
      this.prisma.inspections.count(),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const inspection = await this.prisma.inspections.findUnique({
      where: { id },
      include: { inspection_responses: { include: { inspection_items: true } }, jobs: true, inspection_templates: true },
    });
    if (!inspection) throw new NotFoundException('Inspection not found');
    return inspection;
  }

  async addResponse(dto: CreateResponseDto) {
    // Upsert on (inspection_id, item_id) unique constraint
    const existing = await this.prisma.inspection_responses.findFirst({
      where: { inspection_id: dto.inspection_id, item_id: dto.item_id },
    });
    if (existing) {
      return this.prisma.inspection_responses.update({ where: { id: existing.id }, data: { value: dto.value, urgency: dto.urgency as any, tech_notes: dto.tech_notes, media_count: dto.media_count ?? existing.media_count } });
    }
    return this.prisma.inspection_responses.create({
      data: { id: uuid(), inspection_id: dto.inspection_id, item_id: dto.item_id, value: dto.value, urgency: (dto.urgency as any) || 'none', tech_notes: dto.tech_notes, media_count: dto.media_count || 0 },
    });
  }

  async submit(id: string, dto: SubmitInspectionDto) {
    const inspection = await this.findOne(id);
    const validStatuses = ['submitted', 'reviewed', 'approved'];
    if (!validStatuses.includes(dto.status)) throw new BadRequestException(`Invalid status: ${dto.status}`);
    return this.prisma.inspections.update({
      where: { id },
      data: { status: dto.status as any, submitted_at: dto.status === 'submitted' ? new Date() : inspection.submitted_at },
    });
  }
}