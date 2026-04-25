import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DecideDto } from './dto/decide.dto';
import { canTransition } from '../jobs/jobs.state-machine';

@Injectable()
export class AuthorisationService {
  constructor(private prisma: PrismaService) {}

  private hashToken(raw: string) {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async getValidTokenByRaw(rawToken: string) {
    const token = await this.prisma.approval_tokens.findUnique({
      where: { token_hash: this.hashToken(rawToken) },
      include: {
        jobs: {
          include: {
            customers: true,
            vehicles: true,
            estimate_lines: { orderBy: { created_at: 'asc' } },
            users_jobs_advisor_idTousers: true,
            inspections: {
              include: {
                inspection_responses: {
                  include: {
                    inspection_items: true,
                    media_files: { where: { is_deleted: false } },
                  },
                  orderBy: { recorded_at: 'asc' },
                },
                inspection_templates: {
                  include: {
                    inspection_sections: {
                      include: { inspection_items: { orderBy: { sort_order: 'asc' } } },
                      orderBy: { sort_order: 'asc' },
                    },
                  },
                },
              },
            },
            media_files: { where: { is_deleted: false } },
          },
        },
        authorisation_decisions: true,
      },
    });

    if (!token) throw new NotFoundException('Approval link not found');
    if (token.is_revoked) throw new BadRequestException('Approval link revoked');
    if (token.expires_at && token.expires_at < new Date()) throw new BadRequestException('Approval link expired');

    // Generate API proxy URLs for all media files
    const rewriteMediaUrls = (files: any[]) => {
      for (const mf of files ?? []) {
        if (mf.s3_bucket && mf.s3_key && !mf.is_deleted) {
          (mf as any).url = `/api/portal/${rawToken}/media/${mf.id}`;
        }
      }
    };

    if (token.jobs?.inspections) {
      const insp = token.jobs.inspections;
      for (const resp of insp.inspection_responses ?? []) {
        rewriteMediaUrls(resp.media_files ?? []);
      }
    }
    rewriteMediaUrls(token.jobs?.media_files ?? []);

    return token;
  }

  async validatePortalToken(rawToken: string) {
    const token = await this.prisma.approval_tokens.findUnique({
      where: { token_hash: this.hashToken(rawToken) },
    });
    if (!token) throw new NotFoundException('Approval link not found');
    if (token.is_revoked) throw new BadRequestException('Approval link revoked');
    if (token.expires_at && token.expires_at < new Date()) throw new BadRequestException('Approval link expired');
    return token;
  }

  async requestAuthorisation(jobId: string, channel: string = 'link', sentTo?: string) {
    const job = await this.prisma.jobs.findUnique({
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

    const raw = crypto.randomBytes(32).toString('hex');
    const hash = this.hashToken(raw);

    const token = await this.prisma.approval_tokens.create({
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

    if (job.status !== 'estimate_sent' && canTransition(job.status as any, 'estimate_sent')) {
      await this.prisma.$transaction([
        this.prisma.jobs.update({
          where: { id: job.id },
          data: { status: 'estimate_sent' as any },
        }),
        this.prisma.job_status_history.create({
          data: {
            id: uuid(),
            job_id: job.id,
            from_status: job.status,
            to_status: 'estimate_sent',
            changed_by: null,
            reason: 'Approval link generated',
          },
        }),
      ]).catch(() => {});
    }

    await this.prisma.notifications.create({
      data: {
        id: uuid(),
        job_id: job.id,
        customer_id: job.customer_id,
        channel: (channel === 'link' ? 'push' : channel) as any,
        recipient: sentTo || job.customers?.email || job.customers?.phone || 'customer',
        subject: `Approval request for ${job.job_number}`,
        body_rendered: `Please review and approve the estimate for ${job.vehicles?.make || ''} ${job.vehicles?.model || ''}. Link: ${portalUrl}`,
        status: 'queued',
        provider: 'internal',
      },
    }).catch(() => {});

    if (job.advisor_id) {
      await this.prisma.notifications.create({
        data: {
          id: uuid(),
          job_id: job.id,
          customer_id: job.customer_id,
          channel: 'push',
          recipient: job.users_jobs_advisor_idTousers?.email || job.users_jobs_advisor_idTousers?.name || 'advisor',
          subject: `Estimate sent for ${job.job_number}`,
          body_rendered: `Approval link generated for ${job.customers?.name || 'customer'} / ${job.vehicles?.make || ''} ${job.vehicles?.model || ''}. Job moved to Estimate Sent.`,
          status: 'queued',
          provider: 'internal',
        },
      }).catch(() => {});
    }

    return {
      tokenId: token.id,
      portalUrl,
      expiresAt: token.expires_at,
      sentTo: token.sent_to,
      estimateLineCount: job.estimate_lines.length,
    };
  }

  async getAuthStatus(jobId: string) {
    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        estimate_lines: true,
        approval_tokens: {
          orderBy: { issued_at: 'desc' },
          include: { authorisation_decisions: true },
        },
      },
    });
    if (!job) throw new NotFoundException('Job not found');

    const latestToken = job.approval_tokens[0] ?? null;
    const latestDecisions = latestToken?.authorisation_decisions ?? [];
    const activeLineIds = new Set(job.estimate_lines.map((line: (typeof job.estimate_lines)[number]) => line.id));
    const activeDecisions = latestDecisions.filter((decision: (typeof latestDecisions)[number]) =>
      Boolean(decision.estimate_line_id) && activeLineIds.has(decision.estimate_line_id as string),
    );
    const counts = {
      totalLines: job.estimate_lines.length,
      approved: activeDecisions.filter((d: (typeof activeDecisions)[number]) => d.decision === 'approved').length,
      declined: activeDecisions.filter((d: (typeof activeDecisions)[number]) => d.decision === 'declined').length,
      deferred: activeDecisions.filter((d: (typeof activeDecisions)[number]) => d.decision === 'deferred').length,
      pending: Math.max(job.estimate_lines.length - activeDecisions.length, 0),
    };

    const decisionByLine = Object.fromEntries(
      activeDecisions
        .filter((decision: (typeof activeDecisions)[number]) => Boolean(decision.estimate_line_id))
        .map((decision: (typeof latestDecisions)[number]) => [
          decision.estimate_line_id,
          {
            id: decision.id,
            estimate_line_id: decision.estimate_line_id,
            decision: decision.decision,
            customer_comment: decision.customer_comment,
            decided_at: decision.decided_at,
          },
        ]),
    );

    return {
      jobId,
      counts,
      latestToken: latestToken
        ? {
            id: latestToken.id,
            issued_at: latestToken.issued_at,
            expires_at: latestToken.expires_at,
            first_opened_at: latestToken.first_opened_at,
            used_at: latestToken.used_at,
            is_revoked: latestToken.is_revoked,
          }
        : null,
      decisions: latestDecisions,
      decisionByLine,
    };
  }

  async loadPortal(rawToken: string) {
    const token = await this.getValidTokenByRaw(rawToken);

    if (!token.first_opened_at) {
      await this.prisma.approval_tokens.update({
        where: { id: token.id },
        data: { first_opened_at: new Date() },
      }).catch(() => {});
    }

    // Build inspection findings for customer view
    const inspectionFindings: any[] = [];
    if (token.jobs?.inspections) {
      const insp = token.jobs.inspections;
      for (const resp of insp.inspection_responses ?? []) {
        const severity = (() => {
          const u = String(resp.urgency ?? '').toLowerCase();
          const v = String(resp.value ?? '').toLowerCase();
          if (['high', 'critical', 'red'].includes(u) || ['fail', 'bad', 'no'].includes(v)) return 'red';
          if (['medium', 'amber', 'yellow'].includes(u) || ['warn', 'warning'].includes(v)) return 'amber';
          return null;
        })();
        if (!severity) continue; // skip normal/pass findings
        inspectionFindings.push({
          id: resp.id,
          label: resp.inspection_items?.label || 'Inspection finding',
          value: resp.value,
          urgency: resp.urgency,
          severity,
          tech_notes: resp.tech_notes,
          photos: (resp.media_files ?? []).map((mf: any) => ({ id: mf.id, url: mf.url, mime_type: mf.mime_type, filename: mf.filename })),
        });
      }
    }

    // Sort findings: red first, then amber
    const severityOrder: Record<string, number> = { red: 0, amber: 1 };
    inspectionFindings.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

    // Group estimate lines for customer view
    const lines = token.jobs?.estimate_lines || [];
    const grouped: any[] = [];
    const byGroup = new Map<string, any[]>();
    const generalLines: any[] = [];
    for (const line of lines) {
      const gid = line.quote_group_id || line.inspection_response_id;
      if (gid) {
        if (!byGroup.has(gid)) byGroup.set(gid, []);
        byGroup.get(gid)!.push(line);
      } else {
        generalLines.push(line);
      }
    }
    // Link groups to findings
    const findingMap = new Map(inspectionFindings.map((f) => [f.id, f]));
    for (const [gid, gLines] of byGroup) {
      const finding = findingMap.get(gid);
      const typeOrder: Record<string, number> = { labour: 0, part: 1, sublet: 2 };
      gLines.sort((a, b) => (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3));
      grouped.push({
        key: gid,
        title: gLines[0]?.quote_group_title || finding?.label || 'Quote items',
        severity: finding?.severity || null,
        finding: finding || null,
        isCustom: Boolean(gLines[0]?.quote_group_id),
        lines: gLines,
        total: gLines.reduce((s: number, l: any) => s + Number(l.line_total ?? 0), 0),
      });
    }
    if (generalLines.length > 0) {
      const typeOrder: Record<string, number> = { labour: 0, part: 1, sublet: 2 };
      generalLines.sort((a, b) => (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3));
      grouped.push({
        key: 'general',
        title: 'General / Other',
        severity: null,
        finding: null,
        isCustom: false,
        lines: generalLines,
        total: generalLines.reduce((s: number, l: any) => s + Number(l.line_total ?? 0), 0),
      });
    }

    grouped.sort((a, b) => {
      const order = (group: { key: string; severity: string | null; isCustom?: boolean }) => {
        if (group.severity === 'red') return 0;
        if (group.severity === 'amber') return 1;
        if (group.isCustom) return 2;
        if (group.key === 'general') return 3;
        return 4;
      };
      return order(a) - order(b);
    });

    return {
      token: {
        expires_at: token.expires_at,
        first_opened_at: token.first_opened_at,
        used_at: token.used_at,
        is_revoked: token.is_revoked,
      },
      job: {
        id: token.jobs?.id,
        job_number: token.jobs?.job_number,
        status: token.jobs?.status,
        customer_concern: token.jobs?.customer_concern,
        customer: token.jobs?.customers,
        vehicle: token.jobs?.vehicles,
      },
      findings: inspectionFindings.length ? inspectionFindings : undefined,
      job_photos: (token.jobs?.media_files ?? []).map((mf: any) => ({ id: mf.id, url: mf.url, mime_type: mf.mime_type, filename: mf.original_filename || mf.filename })),
      grouped_estimate: grouped,
      grand_total: lines.reduce((s: number, l: any) => s + Number(l.line_total ?? 0), 0),
      existing_decisions: token.authorisation_decisions,
    };
  }

  async decideFromPortal(rawToken: string, dto: DecideDto, ip: string, userAgent?: string) {
    const token = await this.getValidTokenByRaw(rawToken);
    if (token.used_at) throw new BadRequestException('Approval link already used');
    if (!dto.decisions.length) throw new BadRequestException('No decisions provided');

    const portalLines = token.jobs?.estimate_lines || [];
    const allowedLineIds = new Set(portalLines.map((l: (typeof portalLines)[number]) => l.id));
    for (const item of dto.decisions) {
      if (!allowedLineIds.has(item.estimate_line_id)) {
        throw new BadRequestException(`Estimate line ${item.estimate_line_id} does not belong to this job`);
      }
    }

    const created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      if (token.job_id && token.jobs?.status && token.jobs.status !== 'approved' && canTransition(token.jobs.status as any, 'approved')) {
        await tx.jobs.update({
          where: { id: token.job_id },
          data: { status: 'approved' as any },
        });
        await tx.job_status_history.create({
          data: {
            id: uuid(),
            job_id: token.job_id,
            from_status: token.jobs.status,
            to_status: 'approved',
            changed_by: null,
            reason: 'Customer submitted approval response from portal',
          },
        });
      }

      return rows;
    });

    if (token.jobs?.advisor_id) {
      const approvedCount = dto.decisions.filter((item) => item.decision === 'approved').length;
      const declinedCount = dto.decisions.filter((item) => item.decision === 'declined').length;
      const deferredCount = dto.decisions.filter((item) => item.decision === 'deferred').length;

      await this.prisma.notifications.create({
        data: {
          id: uuid(),
          job_id: token.job_id,
          customer_id: token.jobs?.customer_id,
          channel: 'push',
          recipient: token.jobs.users_jobs_advisor_idTousers?.email || token.jobs.users_jobs_advisor_idTousers?.name || 'advisor',
          subject: `Customer replied to estimate for ${token.jobs?.job_number}`,
          body_rendered: `Customer submitted estimate decisions for ${token.jobs?.customers?.name || 'customer'} / ${token.jobs?.vehicles?.make || ''} ${token.jobs?.vehicles?.model || ''}. Approved: ${approvedCount}, Rejected: ${declinedCount}, Deferred: ${deferredCount}. Job moved to Approved.`,
          status: 'queued',
          provider: 'internal',
        },
      }).catch(() => {});
    }

    return {
      saved: created.length,
      decisions: created,
    };
  }
}
