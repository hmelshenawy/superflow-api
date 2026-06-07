import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { SaveResponseDto } from './dto/save-response.dto';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { qcTrafficLight, isQcInformationalInputType, qcAvailableOptions } from '../../../common/utils/traffic-light';
import { WorkflowService } from '../../../admin/workflow.service';

@Injectable()
export class QcChecklistsService {
  constructor(
    private prisma: PrismaService,
    private workflowService: WorkflowService,
  ) {}

  async create(jobId: string, templateId: string, checkerId: string) {
    const existing = await this.prisma.tenant.qc_checklists.findUnique({ where: { job_id: jobId } });
    if (existing) return existing;

    // Move job to quality_check if currently in_progress or waiting_parts
    const job = await this.prisma.tenant.jobs.findUnique({ where: { id: jobId } });
    if (job?.status === 'in_progress' || job?.status === 'waiting_parts') {
      const workflowStageKey = await this.workflowService.resolveStageKeyForStatus('quality_check');
      // Bug fix: QC-created transitions must keep workflow lane and history in sync.
      await this.prisma.$transaction([
        this.prisma.tenant.jobs.update({
          where: { id: jobId },
          data: { status: 'quality_check', workflow_stage_key: workflowStageKey, workshop_stage: 'quality_check' },
        }),
        this.prisma.tenant.job_status_history.create({
          data: {
            id: uuid(),
            job_id: jobId,
            from_status: job.status,
            to_status: 'quality_check',
            changed_by: checkerId,
            reason: 'QC checklist started',
          },
        }),
      ]);
    }

    return this.prisma.tenant.qc_checklists.create({
      data: {
        id: uuid(),
        job_id: jobId,
        template_id: templateId,
        checker_id: checkerId,
        status: 'in_progress',
        started_at: new Date(),
      },
    });
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.tenant.qc_checklists.findMany({
        skip,
        take: pagination.limit,
        include: { jobs: true, qc_checklist_templates: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.qc_checklists.count(),
    ]);
    const itemsWithMeta = items.map((item: any) => ({
      ...item,
      is_locked: ['submitted', 'approved'].includes(item.status ?? ''),
    }));
    return { items: itemsWithMeta, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const checklist = await this.prisma.tenant.qc_checklists.findUnique({
      where: { id },
      include: {
        qc_checklist_responses: {
          include: {
            qc_checklist_items: true,
            media_files: { where: { is_deleted: false } },
          },
          orderBy: { recorded_at: 'asc' },
        },
        jobs: true,
        qc_checklist_templates: {
          include: {
            qc_checklist_sections: {
              include: { qc_checklist_items: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
              orderBy: { sort_order: 'asc' },
            },
          },
        },
      },
    });
    if (!checklist) throw new NotFoundException('QC checklist not found');

    // Add is_locked computed field
    (checklist as any).is_locked = ['submitted', 'approved'].includes(checklist.status ?? '');

    // Add computed fields to each QC item and response
    for (const section of checklist.qc_checklist_templates?.qc_checklist_sections ?? []) {
      for (const item of section.qc_checklist_items ?? []) {
        (item as any).is_informational = isQcInformationalInputType(item.input_type ?? 'pass_fail');
        (item as any).available_options = qcAvailableOptions(item.input_type ?? 'pass_fail');
      }
    }
    for (const resp of checklist.qc_checklist_responses ?? []) {
      (resp as any).traffic_light = qcTrafficLight(resp.value);
    }

    // Generate API proxy URLs for media_files on each response
    for (const resp of checklist.qc_checklist_responses ?? []) {
      for (const mf of resp.media_files ?? []) {
        if (mf.s3_bucket && mf.s3_key && !mf.is_deleted) {
          (mf as any).url = `/api/media/${mf.id}/download`;
        }
      }
    }

    return checklist;
  }

  async saveResponses(id: string, dto: SaveResponseDto) {
    const checklist = await this.prisma.tenant.qc_checklists.findUnique({ where: { id } });
    if (!checklist) throw new NotFoundException('QC checklist not found');
    if (checklist.status && ['submitted', 'approved'].includes(checklist.status)) {
      throw new BadRequestException('QC checklist is locked and can no longer be edited');
    }

    // Validate that all item_ids belong to this checklist's template
    if (checklist.template_id && dto.responses.length) {
      const validItems = await this.prisma.tenant.qc_checklist_items.findMany({
        where: { qc_checklist_sections: { template_id: checklist.template_id } },
        select: { id: true },
      });
      const validIds = new Set(validItems.map((i: any) => i.id));
      for (const r of dto.responses) {
        if (!validIds.has(r.item_id)) {
          throw new BadRequestException(`Item ${r.item_id} does not belong to this checklist's template`);
        }
      }
    }

    const results = await this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      const saved: any[] = [];
      for (const r of dto.responses) {
        const existing = await tx.qc_checklist_responses.findFirst({
          where: { checklist_id: id, item_id: r.item_id },
        });

        if (existing) {
          saved.push(
            await tx.qc_checklist_responses.update({
              where: { id: existing.id },
              data: {
                value: r.value,
                notes: r.notes,
                media_count: r.media_count ?? 0,
                recorded_at: new Date(),
              },
            }),
          );
        } else {
          saved.push(
            await tx.qc_checklist_responses.create({
              data: {
                id: uuid(),
                checklist_id: id,
                item_id: r.item_id,
                value: r.value,
                notes: r.notes,
                media_count: r.media_count ?? 0,
              },
            }),
          );
        }
      }
      return saved;
    });

    return {
      saved: results.length,
      checklist_id: id,
      status: checklist.status,
    };
  }

  async submit(id: string, dto: SubmitChecklistDto, userId: string) {
    const checklist = await this.findOne(id);
    if (checklist.status === 'submitted') throw new BadRequestException('QC checklist already submitted');
    if (checklist.status === 'approved') throw new BadRequestException('QC checklist already approved');

    // Compute overall_result based on responses
    const responses = checklist.qc_checklist_responses ?? [];
    let overallResult: string = 'na';
    if (responses.length > 0) {
      const hasFail = responses.some((r: any) => r.value === 'fail');
      overallResult = hasFail ? 'fail' : 'pass';
    }

    const updated = await this.prisma.tenant.qc_checklists.update({
      where: { id },
      data: {
        status: 'submitted',
        submitted_at: new Date(),
        overall_result: overallResult as any,
      },
    });

    // Transition job status based on QC result
    if (checklist.job_id) {
      const job = await this.prisma.tenant.jobs.findUnique({ where: { id: checklist.job_id } });
      if (job?.status === 'quality_check') {
        const newStatus = overallResult === 'pass' ? 'ready' : 'in_progress';
        const workflowStageKey = await this.workflowService.resolveStageKeyForStatus(newStatus);
        const transitionData: any = {
          status: newStatus,
          workflow_stage_key: workflowStageKey,
          workshop_stage: newStatus === 'ready' ? 'ready_handover' : 'waiting_technician',
        };
        if (newStatus === 'ready') transitionData.completed_at = new Date();
        if (newStatus === 'in_progress') transitionData.completed_at = null;
        // Bug fix: QC submit transitions must keep workflow lane, timestamps, and history in sync.
        await this.prisma.$transaction([
          this.prisma.tenant.jobs.update({
            where: { id: checklist.job_id },
            data: transitionData,
          }),
          this.prisma.tenant.job_status_history.create({
            data: {
              id: uuid(),
              job_id: checklist.job_id,
              from_status: 'quality_check',
              to_status: newStatus,
              changed_by: userId,
              reason: `QC checklist ${overallResult}`,
            },
          }),
        ]);
      }
    }

    // Notify advisor if applicable
    if (checklist.job_id) {
      const job = await this.prisma.tenant.jobs.findUnique({
        where: { id: checklist.job_id },
        include: { customers: true, vehicles: true, users_jobs_advisor_idTousers: true },
      });
      if (job?.advisor_id) {
        await this.prisma.tenant.notifications.create({
          data: {
            id: uuid(),
            job_id: job.id,
            customer_id: job.customer_id,
            channel: 'push',
            recipient: job.users_jobs_advisor_idTousers?.email || job.users_jobs_advisor_idTousers?.name || 'advisor',
            subject: `QC checklist ${overallResult === 'pass' ? 'passed' : 'failed'} for ${job.job_number}`,
            body_rendered: `Quality check for ${job.customers?.name || 'customer'} / ${job.vehicles?.make || ''} ${job.vehicles?.vehicle_model || ''} has been completed. Result: ${overallResult.toUpperCase()}.${dto.notes ? ` Notes: ${dto.notes}` : ''}`,
            status: 'queued',
            provider: 'internal',
          },
        }).catch(() => {});
      }
    }

    // Audit log
    await this.prisma.tenant.audit_logs.create({
      data: {
        id: uuid(),
        user_id: userId,
        entity_type: 'qc_checklist',
        entity_id: id,
        action: 'SUBMIT',
        new_values: JSON.stringify({ status: 'submitted', overall_result: overallResult }),
      },
    }).catch(() => {});

    return updated;
  }

  async reopen(id: string, userId: string) {
    const checklist = await this.prisma.tenant.qc_checklists.findUnique({ where: { id } });
    if (!checklist) throw new NotFoundException('QC checklist not found');
    if (!checklist.status || !['submitted', 'approved'].includes(checklist.status)) {
      throw new BadRequestException('QC checklist is not locked');
    }

    const updated = await this.prisma.tenant.qc_checklists.update({
      where: { id },
      data: {
        status: 'in_progress',
        submitted_at: null,
        started_at: checklist.started_at || new Date(),
      },
    });

    await this.prisma.tenant.audit_logs.create({
      data: {
        id: uuid(),
        user_id: userId,
        entity_type: 'qc_checklist',
        entity_id: id,
        action: 'REOPEN',
        old_values: JSON.stringify({ status: checklist.status }),
        new_values: JSON.stringify({ status: 'in_progress' }),
      },
    }).catch(() => {});

    return updated;
  }
}
