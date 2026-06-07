import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { SubmitInspectionDto } from './dto/submit-inspection.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { inspectionTrafficLight, isInformationalInputType, inspectionAvailableOptions } from '../../common/utils/traffic-light';
import { WorkflowService } from '../../admin/workflow.service';

@Injectable()
export class InspectionsService {
  constructor(
    private prisma: PrismaService,
    private workflowService: WorkflowService,
  ) {}

  async create(jobId: string, templateId: string, technicianId: string) {
    const existing = await this.prisma.tenant.inspections.findUnique({ where: { job_id: jobId } });
    // One inspection per job keeps the workflow simple: later steps (estimate,
    // portal findings, advisor review) all assume a single active inspection.
    if (existing) return existing;

    // Move job from booked → checking when inspection is created.
    const job = await this.prisma.tenant.jobs.findUnique({ where: { id: jobId } });
    if (job?.status === 'booked') {
      const workflowStageKey = await this.workflowService.resolveStageKeyForStatus('checking');
      // Bug fix: keep inspection-created check-in aligned with the job state machine side effects.
      await this.prisma.$transaction([
        this.prisma.tenant.jobs.update({
          where: { id: jobId },
          data: { status: 'checking', workflow_stage_key: workflowStageKey, workshop_stage: null, arrived_at: job.arrived_at || new Date() },
        }),
        this.prisma.tenant.job_status_history.create({
          data: {
            id: uuid(),
            job_id: jobId,
            from_status: 'booked',
            to_status: 'checking',
            changed_by: technicianId,
            reason: 'Inspection started',
          },
        }),
      ]);
    }

    return this.prisma.tenant.inspections.create({
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
      this.prisma.tenant.inspections.findMany({
        skip,
        take: pagination.limit,
        include: { jobs: true, inspection_templates: true },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.inspections.count(),
    ]);
    const itemsWithMeta = items.map((item: any) => ({
      ...item,
      is_locked: ['submitted', 'reviewed', 'approved'].includes(item.status ?? ''),
    }));
    return { items: itemsWithMeta, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const inspection = await this.prisma.tenant.inspections.findUnique({
      where: { id },
      include: {
        inspection_responses: {
          include: {
            inspection_items: true,
            media_files: { where: { is_deleted: false } },
          },
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

    // Add is_locked computed field
    (inspection as any).is_locked = ['submitted', 'reviewed', 'approved'].includes(inspection.status ?? '');

    // Add computed fields to each inspection item and response
    for (const section of inspection.inspection_templates?.inspection_sections ?? []) {
      for (const item of section.inspection_items ?? []) {
        (item as any).is_informational = isInformationalInputType(item.input_type ?? 'pass_fail');
        (item as any).available_options = inspectionAvailableOptions(item.input_type ?? 'pass_fail', (item as any).options);
      }
    }
    for (const resp of inspection.inspection_responses ?? []) {
      (resp as any).traffic_light = inspectionTrafficLight(resp.value, (resp as any).urgency, resp.inspection_items?.input_type);
    }
    const responseByItem = new Map((inspection.inspection_responses ?? []).map((resp: any) => [resp.item_id, resp]));
    const summary = { green: 0, amber: 0, red: 0, unset: 0 };
    for (const section of inspection.inspection_templates?.inspection_sections ?? []) {
      for (const item of section.inspection_items ?? []) {
        if ((item as any).is_informational) continue;
        const resp = responseByItem.get(item.id) as any;
        if (!resp?.value) {
          summary.unset++;
          continue;
        }
        const light = (resp.traffic_light ?? 'none') as keyof typeof summary | 'none';
        if (light === 'green' || light === 'amber' || light === 'red') summary[light]++;
        else summary.unset++;
      }
    }
    (inspection as any).summary = summary;

    // Generate API proxy URLs for media_files on each response
    // (browser can't reach minio:9000 directly, so we serve through /media/:id/download)
    for (const resp of inspection.inspection_responses ?? []) {
      for (const mf of resp.media_files ?? []) {
        if (mf.s3_bucket && mf.s3_key && !mf.is_deleted) {
          (mf as any).url = `/api/media/${mf.id}/download`;
        }
      }
    }


    return inspection;
  }

  async saveResponses(id: string, dto: CreateResponseDto) {
    const inspection = await this.prisma.tenant.inspections.findUnique({ where: { id } });
    if (!inspection) throw new NotFoundException('Inspection not found');
    if (inspection.status && ['submitted', 'reviewed', 'approved'].includes(inspection.status)) {
      throw new BadRequestException('Inspection is locked and can no longer be edited');
    }

    // Validate that all item_ids belong to this inspection's template.
    if (inspection.template_id && dto.responses.length) {
      const validItems = await this.prisma.tenant.inspection_items.findMany({
        where: { inspection_sections: { template_id: inspection.template_id } },
        select: { id: true },
      });
      const validIds = new Set(validItems.map((i: any) => i.id));
      for (const r of dto.responses) {
        if (!validIds.has(r.item_id)) {
          throw new BadRequestException(`Item ${r.item_id} does not belong to this inspection's template`);
        }
      }
    }

    // Look up odometer item IDs from this inspection's template so we can sync the value to the job
    const odometerItems = inspection.template_id
      ? await this.prisma.tenant.inspection_items.findMany({
          where: {
            input_type: 'odometer',
            inspection_sections: { template_id: inspection.template_id },
          },
          select: { id: true },
        })
      : [];
    const odometerItemIds = new Set(odometerItems.map((i: any) => i.id));

    // Use tenant-scoped transaction so workshop_id is auto-injected on create.
    const results = await this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      const saved: any[] = [];
      // Responses are effectively upserted by (inspection_id, item_id). This
      // lets the mobile/offline UI resend the same batch safely.
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

    // Sync odometer value from inspection responses to the job's odometer_in field
    if (odometerItemIds.size > 0 && inspection.job_id) {
      const odometerResponse = dto.responses.find(r => odometerItemIds.has(r.item_id) && r.value);
      if (odometerResponse) {
        const odometerValue = parseInt(String(odometerResponse.value), 10);
        if (!isNaN(odometerValue) && odometerValue > 0) {
          await this.prisma.tenant.jobs.update({
            where: { id: inspection.job_id },
            data: { odometer_in: odometerValue },
          });
        }
      }
    }

    if (dto.offline_draft !== undefined) {
      // Offline draft is stored on the inspection row so the frontend can keep
      // a device-friendly draft payload without inventing a separate draft table.
      await this.prisma.tenant.inspections.update({
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

    const updated = await this.prisma.tenant.inspections.update({
      where: { id },
      data: {
        status: 'submitted',
        submitted_at: new Date(),
      },
    });

    if (!inspection.job_id) throw new BadRequestException('Inspection is missing linked job');

    const job = await this.prisma.tenant.jobs.findUnique({
      where: { id: inspection.job_id },
      include: { customers: true, vehicles: true, users_jobs_advisor_idTousers: true },
    });

    if (job?.advisor_id) {
      // Submitting an inspection is the handoff from technician work to advisor
      // review, so the notification is part of the business workflow, not just UX.
      await this.prisma.tenant.notifications.create({
        data: {
          id: uuid(),
          job_id: job.id,
          customer_id: job.customer_id,
          channel: 'push',
          recipient: job.users_jobs_advisor_idTousers?.email || job.users_jobs_advisor_idTousers?.name || 'advisor',
          subject: `Inspection submitted for ${job.job_number}`,
          body_rendered: `Inspection for ${job.customers?.name || 'customer'} / ${job.vehicles?.make || ''} ${job.vehicles?.vehicle_model || ''} has been submitted by technician.${dto.advisor_note ? ` Note: ${dto.advisor_note}` : ''}`,
          status: 'queued',
          provider: 'internal',
        },
      }).catch(() => {});
    }

    // Audit log keeps a durable trace of who finalized the inspection.
    await this.prisma.tenant.audit_logs.create({
      data: {
        id: uuid(),
        user_id: userId,
        entity_type: 'inspection',
        entity_id: id,
        action: 'SUBMIT',
        new_values: JSON.stringify({ status: 'submitted' }),
      },
    }).catch(() => {});

    await this.syncActionableResponsesToConcerns(id, inspection.job_id);

    return updated;
  }

  async reopen(id: string, userId: string) {
    const inspection = await this.prisma.tenant.inspections.findUnique({ where: { id } });
    if (!inspection) throw new NotFoundException('Inspection not found');
    if (!inspection.status || !['submitted', 'reviewed', 'approved'].includes(inspection.status)) {
      throw new BadRequestException('Inspection is not locked');
    }

    const updated = await this.prisma.tenant.inspections.update({
      where: { id },
      data: {
        status: 'in_progress',
        submitted_at: null,
        started_at: inspection.started_at || new Date(),
      },
    });

    // Reopen is intentionally audited because it unlocks a finalized record
    // and can affect downstream estimate/customer-approval work.
    await this.prisma.tenant.audit_logs.create({
      data: {
        id: uuid(),
        user_id: userId,
        entity_type: 'inspection',
        entity_id: id,
        action: 'REOPEN',
        old_values: JSON.stringify({ status: inspection.status }),
        new_values: JSON.stringify({ status: 'in_progress' }),
      },
    }).catch(() => {});

    return updated;
  }

  private async syncActionableResponsesToConcerns(inspectionId: string, jobId: string) {
    const responses = await this.prisma.tenant.inspection_responses.findMany({
      where: { inspection_id: inspectionId },
      include: { inspection_items: true },
      orderBy: { recorded_at: 'asc' },
    });
    const actionable = responses.filter((response: any) => {
      const traffic = inspectionTrafficLight(response.value, response.urgency, response.inspection_items?.input_type);
      return traffic === 'amber' || traffic === 'red';
    });
    if (!actionable.length) return;

    let nextSortOrder = await this.prisma.tenant.job_concerns.count({ where: { job_id: jobId } });
    for (const response of actionable as any[]) {
      const title = response.inspection_items?.label || 'Inspection finding';
      const description = [
        response.value ? `Result: ${response.value}` : null,
        response.urgency && response.urgency !== 'none' ? `Urgency: ${response.urgency}` : null,
      ].filter(Boolean).join(' • ') || null;
      const technicianFinding = response.tech_notes || description || null;

      const existing = await this.prisma.tenant.job_concerns.findFirst({
        where: { job_id: jobId, inspection_response_id: response.id },
      });

      const concern = existing
        ? await this.prisma.tenant.job_concerns.update({
            where: { id: existing.id },
            data: {
              title,
              description,
              technician_finding: technicianFinding,
              status: 'finding_ready',
            },
          })
        : await this.prisma.tenant.job_concerns.create({
            data: {
              id: uuid(),
              job_id: jobId,
              code: `C${nextSortOrder + 1}`,
              title,
              description,
              status: 'finding_ready',
              technician_finding: technicianFinding,
              sort_order: nextSortOrder++,
              inspection_response_id: response.id,
            },
          });

      // Bug fix: make media uploaded against the inspection finding visible on
      // the structured customer concern used by estimates and the portal.
      await this.prisma.tenant.media_files.updateMany({
        where: { inspection_response_id: response.id, is_deleted: false },
        data: { concern_id: concern.id },
      }).catch(() => {});
    }
  }
}
