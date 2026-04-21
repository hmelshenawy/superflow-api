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
    if (existing) return existing;

    return this.prisma.inspections.create({
      data: {
        id: uuid(),
        job_id: jobId,
        template_id: templateId,
        technician_id: technicianId,
        status: 'in_progress',
        started_at: new Date(),
      },
    });
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.inspections.findMany({
        skip,
        take: pagination.limit,
        include: { jobs: true, inspection_templates: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.inspections.count(),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const inspection = await this.prisma.inspections.findUnique({
      where: { id },
      include: {
        inspection_responses: {
          include: { inspection_items: true },
          orderBy: { recorded_at: 'asc' },
        },
        jobs: true,
        inspection_templates: {
          include: {
            inspection_sections: {
              include: { inspection_items: { orderBy: { sort_order: 'asc' } } },
              orderBy: { sort_order: 'asc' },
            },
          },
        },
      },
    });
    if (!inspection) throw new NotFoundException('Inspection not found');
    return inspection;
  }

  async saveResponses(id: string, dto: CreateResponseDto) {
    const inspection = await this.prisma.inspections.findUnique({ where: { id } });
    if (!inspection) throw new NotFoundException('Inspection not found');
    if (['submitted', 'reviewed', 'approved'].includes(inspection.status)) {
      throw new BadRequestException('Inspection is locked and can no longer be edited');
    }

    const results = await this.prisma.$transaction(async (tx) => {
      const saved: any[] = [];
      for (const r of dto.responses) {
        const existing = await tx.inspection_responses.findFirst({
          where: { inspection_id: id, item_id: r.item_id },
        });

        if (existing) {
          saved.push(
            await tx.inspection_responses.update({
              where: { id: existing.id },
              data: {
                value: r.value,
                urgency: (r.urgency as any) || 'none',
                tech_notes: r.tech_notes,
                media_count: r.media_count ?? 0,
                recorded_at: new Date(),
              },
            }),
          );
        } else {
          saved.push(
            await tx.inspection_responses.create({
              data: {
                id: uuid(),
                inspection_id: id,
                item_id: r.item_id,
                value: r.value,
                urgency: (r.urgency as any) || 'none',
                tech_notes: r.tech_notes,
                media_count: r.media_count ?? 0,
              },
            }),
          );
        }
      }
      return saved;
    });

    if (dto.offline_draft !== undefined) {
      await this.prisma.inspections.update({
        where: { id },
        data: { offline_draft: JSON.stringify(dto.offline_draft) },
      });
    }

    return {
      saved: results.length,
      inspection_id: id,
      status: inspection.status,
    };
  }

  async submit(id: string, dto: SubmitInspectionDto, userId: string) {
    const inspection = await this.findOne(id);
    if (inspection.status === 'submitted') throw new BadRequestException('Inspection already submitted');
    if (inspection.status === 'reviewed' || inspection.status === 'approved') {
      throw new BadRequestException('Inspection already finalized');
    }

    const updated = await this.prisma.inspections.update({
      where: { id },
      data: {
        status: 'submitted',
        submitted_at: new Date(),
      },
    });

    const job = await this.prisma.jobs.findUnique({
      where: { id: inspection.job_id },
      include: { customers: true, vehicles: true, users_jobs_advisor_idTousers: true },
    });

    if (job?.advisor_id) {
      await this.prisma.notifications.create({
        data: {
          id: uuid(),
          job_id: job.id,
          customer_id: job.customer_id,
          channel: 'push',
          recipient: job.users_jobs_advisor_idTousers?.email || job.users_jobs_advisor_idTousers?.name || 'advisor',
          subject: `Inspection submitted for ${job.job_number}`,
          body_rendered: `Inspection for ${job.customers?.name || 'customer'} / ${job.vehicles?.make || ''} ${job.vehicles?.model || ''} has been submitted by technician.${dto.advisor_note ? ` Note: ${dto.advisor_note}` : ''}`,
          status: 'queued',
          provider: 'internal',
        },
      }).catch(() => {});
    }

    await this.prisma.audit_logs.create({
      data: {
        id: uuid(),
        user_id: userId,
        entity_type: 'inspection',
        entity_id: id,
        action: 'SUBMIT',
        new_values: JSON.stringify({ status: 'submitted' }),
      },
    }).catch(() => {});

    return updated;
  }
}
