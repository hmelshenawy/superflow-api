import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { runWithWorkshop } from '../../prisma/workshop-context';
import { DecideDto } from '../dto/decide.dto';
import { WorkflowService } from '../../admin/workflow.service';
import { AuthorisationNotificationService } from './authorisation-notification.service';
import { AuthorisationQueryService } from './authorisation-query.service';
import { hashToken, portalStageForStatus } from './authorisation-utils';

@Injectable()
export class AuthorisationDecisionService {
  constructor(
    private prisma: PrismaService,
    private workflowService: WorkflowService,
    private notificationService: AuthorisationNotificationService,
    private queryService: AuthorisationQueryService,
  ) {}

  async requestAuthorisation(jobId: string, channel: string = 'link', sentTo?: string) {
    const job = await this.prisma.tenant.jobs.findUnique({
      where: { id: jobId },
      include: {
        customers: true,
        vehicles: true,
        estimate_lines: true,
        users_jobs_advisor_idTousers: true,
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (!job.estimate_lines.length) throw new BadRequestException('Job has no estimate lines to approve');

    // The raw token is returned only once in the portal URL. After this point
    // the backend works from the hash stored in approval_tokens.
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = hashToken(raw);

    const token = await this.prisma.tenant.approval_tokens.create({
      data: {
        id: uuid(),
        job_id: jobId,
        token_hash: hash,
        channel: channel as any,
        sent_to: sentTo || job.customers?.email || job.customers?.phone || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl = process.env.CUSTOMER_PORTAL_URL || 'http://127.0.0.1:3002';
    const portalUrl = `${baseUrl.replace(/\/$/, '')}/portal/${raw}`;

    // Sending a new approval request always moves the job back to estimate_sent
    // and releases a portal snapshot so the customer sees the latest data.
    const shouldMoveToEstimateSent =
      job.status !== 'estimate_sent' &&
      job.status !== 'closed' &&
      job.status !== 'no_show';
    if (shouldMoveToEstimateSent) {
      await this.moveJobToEstimateSent(job.id, job.status);
    }

    // Release a portal snapshot so the customer sees the latest estimate data.
    await this.releasePortalSnapshot(job.id, raw);

    await this.notificationService.sendCustomerApprovalNotification(job, channel, sentTo, portalUrl);
    await this.notificationService.sendAdvisorEstimateNotification(job);

    return {
      tokenId: token.id,
      portalUrl,
      expiresAt: token.expires_at,
      sentTo: token.sent_to,
      estimateLineCount: job.estimate_lines.length,
    };
  }

  async releasePortalUpdate(jobId: string, releasedBy?: string, releaseNote?: string) {
    const job = await this.prisma.tenant.jobs.findUnique({
      where: { id: jobId },
      include: { customers: true, vehicles: true, estimate_lines: true },
    });
    if (!job) throw new NotFoundException('Job not found');

    const raw = crypto.randomBytes(32).toString('hex');
    const token = await this.prisma.tenant.approval_tokens.create({
      data: {
        id: uuid(),
        job_id: jobId,
        token_hash: hashToken(raw),
        channel: 'link' as any,
        sent_to: job.customers?.email || job.customers?.phone || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const payload = await this.queryService.loadPortal(raw, false);
    const latest = await this.prisma.tenant.customer_portal_snapshots.findFirst({
      where: { job_id: jobId },
      orderBy: { version: 'desc' },
      select: { version: true },
    }).catch(() => null);
    const version = (latest?.version ?? 0) + 1;
    const stage = (payload as any).stage || portalStageForStatus(job.status as any);

    const snapshot = await this.prisma.tenant.customer_portal_snapshots.create({
      data: {
        id: uuid(),
        job_id: jobId,
        version,
        stage,
        payload_json: JSON.stringify(payload),
        release_note: releaseNote || null,
        released_by: releasedBy || null,
      },
    });

    const baseUrl = process.env.CUSTOMER_PORTAL_URL || 'http://127.0.0.1:3002';
    return {
      tokenId: token.id,
      snapshotId: snapshot.id,
      version: snapshot.version,
      stage: snapshot.stage,
      releasedAt: snapshot.released_at,
      portalUrl: `${baseUrl.replace(/\/$/, '')}/portal/${raw}`,
    };
  }

  async resetConcernApproval(jobId: string, concernId: string, userId: string, reason: string) {
    const concern = await this.prisma.tenant.job_concerns.findFirst({
      where: { id: concernId, job_id: jobId },
    });
    if (!concern) throw new NotFoundException('Concern not found');

    // Find all estimate lines for this concern
    const lines = await this.prisma.tenant.estimate_lines.findMany({
      where: { concern_id: concernId },
      select: { id: true },
    });
    const lineIds = lines.map((l: { id: string }) => l.id);

    // Delete all authorisation decisions for those lines
    const deleteResult = await this.prisma.tenant.authorisation_decisions.deleteMany({
      where: { estimate_line_id: { in: lineIds } },
    });

    // Reset advisor decision on the concern
    await this.prisma.tenant.job_concerns.update({
      where: { id: concernId },
      data: { advisor_decision: null, advisor_decision_note: null },
    });

    // Audit trail
    await this.prisma.tenant.approval_reset_audit.create({
      data: {
        id: uuid(),
        concern_id: concernId,
        job_id: jobId,
        reset_by: userId,
        reason,
        lines_cleared: deleteResult.count,
      },
    });

    return { concernId, linesCleared: deleteResult.count };
  }

  async decideFromPortal(rawToken: string, dto: DecideDto, ip: string, userAgent?: string) {
    const token = await this.queryService.getValidTokenByRaw(rawToken);
    if (!dto.decisions.length) throw new BadRequestException('No decisions provided');

    const portalLines = token.jobs?.estimate_lines || [];
    const allowedLineIds = new Set(portalLines.map((l: (typeof portalLines)[number]) => l.id));
    for (const item of dto.decisions) {
      if (!allowedLineIds.has(item.estimate_line_id)) {
        throw new BadRequestException(`Estimate line ${item.estimate_line_id} does not belong to this job`);
      }
    }

    // A customer's decision for an estimate line is final. New portal releases
    // can ask for decisions on newly added lines, but they must not overwrite
    // previously approved/rejected/deferred items from older links.
    const existingLineDecision = await this.prisma.raw.authorisation_decisions.findFirst({
      where: {
        estimate_line_id: { in: dto.decisions.map((item) => item.estimate_line_id) },
        approval_tokens: { job_id: token.job_id },
      },
      select: { estimate_line_id: true },
    });
    if (existingLineDecision?.estimate_line_id) {
      throw new BadRequestException('One or more estimate lines were already decided and cannot be changed. Please refresh the portal.');
    }

    // Portal requests have no JWT, so the workshop context is not set by the
    // interceptor. Set it from the token's job so tenant-scoped writes work.
    const workshopId = (token.jobs as any)?.workshop_id;
    if (!workshopId) throw new BadRequestException('No workshop associated with this job');

    return runWithWorkshop({ workshopId, isPlatformAdmin: false }, async () => {
    // Decision submission is transactional because three things must stay in
    // sync: the per-line decisions, the token usage state, and the job status.
    // Use tenant-scoped transaction so workshop_id is auto-injected
    const created = await this.prisma.tenant.$transaction(async (tx: Prisma.TransactionClient) => {
      const rows: any[] = [];
      for (const item of dto.decisions) {
        const row = await tx.authorisation_decisions.create({
          data: {
            id: uuid(),
            token_id: token.id,
            estimate_line_id: item.estimate_line_id,
            decision: item.decision as any,
            customer_comment: item.customer_comment,
            ip_address: ip,
          },
        });
        rows.push(row);

        if (item.decision === 'declined' || item.decision === 'deferred') {
          // Deferred-work rows are created only once per original job + line so
          // repeated submissions/retries do not duplicate follow-up work.
          const existingDeferred = await tx.deferred_work.findFirst({
            where: {
              original_job_id: token.job_id,
              estimate_line_id: item.estimate_line_id,
            },
          });
          if (!existingDeferred) {
            const estimateLine = await tx.estimate_lines.findUnique({ where: { id: item.estimate_line_id } });
            await tx.deferred_work.create({
              data: {
                id: uuid(),
                customer_id: token.jobs?.customer_id,
                vehicle_id: token.jobs?.vehicle_id,
                original_job_id: token.job_id,
                estimate_line_id: item.estimate_line_id,
                status: 'pending',
                urgency: 'none',
                estimated_value: estimateLine?.line_total ?? null,
              },
            });
          }
        }
      }

      await tx.approval_tokens.update({
        where: { id: token.id },
        data: { used_at: new Date(), ip_address: ip, user_agent: userAgent || null },
      });

      // Both first and repeat customer approvals move the job to "approved" with
      // workshop_stage null, using a single shared function.
      const jobId = token.job_id;
      const currentStatus = token.jobs?.status;
      if (jobId && currentStatus && currentStatus !== 'closed' && currentStatus !== 'no_show') {
        await this.moveJobToApproved(tx, jobId, currentStatus);
      }

      return rows;
    });

    await this.notificationService.sendAdvisorDecisionNotification(token, dto.decisions);

    return {
      saved: created.length,
      decisions: created,
    };
    });
  }

  private async moveJobToApproved(
    tx: Prisma.TransactionClient,
    jobId: string,
    currentStatus: string,
  ) {
    const workflowStageKey = await this.workflowService.resolveStageKeyForStatus('approved');
    const shouldRecordHistory = currentStatus !== 'approved';
    await tx.jobs.update({
      where: { id: jobId },
      data: {
        status: 'approved',
        workflow_stage_key: workflowStageKey,
        workshop_stage: null,
        ...(shouldRecordHistory ? {} : {}),
      },
    });
    if (shouldRecordHistory) {
      await tx.job_status_history.create({
        data: {
          id: uuid(),
          job_id: jobId,
          from_status: currentStatus,
          to_status: 'approved',
          changed_by: null,
          reason: 'Customer submitted approval response from portal',
        },
      });
    }
  }

  private async moveJobToEstimateSent(jobId: string, currentStatus: string) {
    const workflowStageKey = await this.workflowService.resolveStageKeyForStatus('estimate_sent');
    await this.prisma.tenant.jobs.update({
      where: { id: jobId },
      data: { status: 'estimate_sent', workflow_stage_key: workflowStageKey, workshop_stage: null },
    });
    await this.prisma.tenant.job_status_history.create({
      data: {
        id: uuid(),
        job_id: jobId,
        from_status: currentStatus,
        to_status: 'estimate_sent',
        changed_by: null,
        reason: 'Approval link generated',
      },
    });
  }

  private async releasePortalSnapshot(jobId: string, rawToken: string) {
    const payload = await this.queryService.loadPortal(rawToken, false);
    const latest = await this.prisma.tenant.customer_portal_snapshots.findFirst({
      where: { job_id: jobId },
      orderBy: { version: 'desc' },
      select: { version: true },
    }).catch(() => null);
    const version = (latest?.version ?? 0) + 1;
    const stage = (payload as any).stage || portalStageForStatus('estimate_sent');
    await this.prisma.tenant.customer_portal_snapshots.create({
      data: {
        id: uuid(),
        job_id: jobId,
        version,
        stage,
        payload_json: JSON.stringify(payload),
        release_note: null,
        released_by: null,
      },
    });
  }

}