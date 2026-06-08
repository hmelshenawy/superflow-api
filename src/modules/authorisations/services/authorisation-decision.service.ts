import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { PrismaService } from '@prisma/prisma.service';
import { runWithWorkshop } from '@prisma/workshop-context';
import { DecideDto } from '../dto/decide.dto';
import { WorkflowService } from '../../admin/settings/workflow.service';
import { AuthorisationNotificationService } from './authorisation-notification.service';
import { AuthorisationQueryService } from './authorisation-query.service';
import { hashToken, portalStageForStatus } from './authorisation-utils';

@Injectable()
export class AuthorisationDecisionService {
  private readonly logger = new Logger(AuthorisationDecisionService.name);

  constructor(
    private prisma: PrismaService,
    private workflowService: WorkflowService,
    private notificationService: AuthorisationNotificationService,
    private queryService: AuthorisationQueryService,
  ) {}

  private getCustomerPortalBaseUrl() {
    return (
      process.env.CUSTOMER_PORTAL_URL ||
      process.env.FRONTEND_URL ||
      process.env.PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.APP_DOMAIN ? `https://${process.env.APP_DOMAIN}` : '') ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

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

    const portalUrl = `${this.getCustomerPortalBaseUrl()}/portal/${raw}`;

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

    return {
      tokenId: token.id,
      snapshotId: snapshot.id,
      version: snapshot.version,
      stage: snapshot.stage,
      releasedAt: snapshot.released_at,
      portalUrl: `${this.getCustomerPortalBaseUrl()}/portal/${raw}`,
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

    this.logger.log(
      `Portal decision submit started: token=${token.id} jobId=${token.job_id} currentStatus=${token.jobs?.status} decisions=${dto.decisions.length}`,
    );

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
              const lineSubtotal = Number(estimateLine?.line_total ?? 0);
              const lineVat = Number(estimateLine?.tax_amount ?? 0) || (lineSubtotal * (Number(estimateLine?.tax_rate_pct ?? 0) / 100));
              await tx.deferred_work.create({
                data: {
                  id: uuid(),
                  customer_id: token.jobs?.customer_id,
                  vehicle_id: token.jobs?.vehicle_id,
                  original_job_id: token.job_id,
                  estimate_line_id: item.estimate_line_id,
                  status: 'pending',
                  urgency: 'none',
                  estimated_value: estimateLine ? lineSubtotal + lineVat : null,
                },
              });
            }
          }
        }

        await tx.approval_tokens.update({
          where: { id: token.id },
          data: { used_at: new Date(), ip_address: ip, user_agent: userAgent || null },
        });

        const jobId = token.job_id;
        const currentStatus = token.jobs?.status;
        if (jobId && currentStatus) {
          await this.transitionJobAfterDecisions(tx, jobId, currentStatus, dto.decisions);
        } else {
          this.logger.warn(`Skipped job status transition: missing jobId=${jobId} or currentStatus=${currentStatus}`);
        }

        return rows;
      });

      await this.notificationService.sendAdvisorDecisionNotification(token, dto.decisions);

      // Post-transaction verification: read back job status to confirm it persisted
      try {
        const verifiedJob = await this.prisma.tenant.jobs.findUnique({
          where: { id: token.job_id },
          select: { id: true, status: true },
        });
        this.logger.log(
          `Post-transaction verification: jobId=${verifiedJob?.id} status=${verifiedJob?.status}`,
        );
      } catch (verifyErr: any) {
        this.logger.error(`Post-transaction verification failed: ${verifyErr.message}`);
      }

      return {
        saved: created.length,
        decisions: created,
      };
    });
  }

  private async transitionJobAfterDecisions(
    tx: Prisma.TransactionClient,
    jobId: string,
    currentStatus: string,
    submittedDecisions: DecideDto['decisions'],
  ) {
    const summary = await this.computeApprovalSummary(tx, jobId, submittedDecisions);
    this.logger.log(
      `Approval summary for jobId=${jobId}: total=${summary.totalLines} approved=${summary.approved} declined=${summary.declined} deferred=${summary.deferred} pending=${summary.pending}`,
    );

    // Do not transition jobs that are already past the approval stage or are terminal.
    const nonTransitionableStatuses = ['approved', 'in_progress', 'waiting_parts', 'quality_check', 'ready', 'closed', 'no_show'];
    if (nonTransitionableStatuses.includes(currentStatus)) {
      this.logger.log(`No transition needed: jobId=${jobId} already at ${currentStatus}`);
      return;
    }

    // The Prisma enum does not have a partially_approved status. Any customer
    // response (all approved, mixed, or all declined) is treated as "approved"
    // because the job has received a decision and can move forward.
    const targetStatus = 'approved';
    this.logger.log(
      `Transitioning jobId=${jobId} from ${currentStatus} to ${targetStatus} (decision mix: ${summary.mixLabel})`,
    );
    await this.moveJobToApproved(tx, jobId, currentStatus, targetStatus);
  }

  private async computeApprovalSummary(
    tx: Prisma.TransactionClient,
    jobId: string,
    submittedDecisions: DecideDto['decisions'],
  ) {
    const estimateLines = await tx.estimate_lines.findMany({
      where: { job_id: jobId },
      select: { id: true },
    });
    const lineIds = new Set(estimateLines.map((l) => l.id));

    const allDecisions = await tx.authorisation_decisions.findMany({
      where: { approval_tokens: { job_id: jobId } },
      select: { estimate_line_id: true, decision: true },
    });

    const seen = new Set<string>();
    const counts = { approved: 0, declined: 0, deferred: 0, decided: 0 };
    for (const d of allDecisions) {
      if (!d.estimate_line_id || seen.has(d.estimate_line_id)) continue;
      if (!lineIds.has(d.estimate_line_id)) continue;
      seen.add(d.estimate_line_id);
      counts.decided += 1;
      if (d.decision === 'approved') counts.approved += 1;
      else if (d.decision === 'declined') counts.declined += 1;
      else if (d.decision === 'deferred') counts.deferred += 1;
    }

    const totalLines = lineIds.size;
    const pending = totalLines - counts.decided;

    let mixLabel = 'mixed';
    if (counts.approved > 0 && counts.declined === 0 && counts.deferred === 0) mixLabel = 'all_approved';
    else if (counts.declined > 0 && counts.approved === 0 && counts.deferred === 0) mixLabel = 'all_declined';
    else if (counts.deferred > 0 && counts.approved === 0 && counts.declined === 0) mixLabel = 'all_deferred';

    return {
      totalLines,
      approved: counts.approved,
      declined: counts.declined,
      deferred: counts.deferred,
      pending,
      decided: counts.decided,
      mixLabel,
    };
  }

  private async moveJobToApproved(
    tx: Prisma.TransactionClient,
    jobId: string,
    currentStatus: string,
    targetStatus: string = 'approved',
  ) {
    this.logger.log(`moveJobToApproved called: jobId=${jobId} current=${currentStatus} target=${targetStatus}`);

    const workflowStageKey = await this.workflowService.resolveStageKeyForStatus(targetStatus);
    this.logger.log(`Resolved workflowStageKey=${workflowStageKey} for status=${targetStatus}`);

    const shouldRecordHistory = currentStatus !== targetStatus;
    await tx.jobs.update({
      where: { id: jobId },
      data: {
        status: targetStatus as any,
        workflow_stage_key: workflowStageKey,
        workshop_stage: null,
      },
    });
    this.logger.log(`Updated jobs.status for jobId=${jobId} to ${targetStatus}`);

    if (shouldRecordHistory) {
      await tx.job_status_history.create({
        data: {
          id: uuid(),
          job_id: jobId,
          from_status: currentStatus,
          to_status: targetStatus,
          changed_by: null,
          reason: 'Customer submitted approval response from portal',
        },
      });
      this.logger.log(`Recorded status history for jobId=${jobId}: ${currentStatus} -> ${targetStatus}`);
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
