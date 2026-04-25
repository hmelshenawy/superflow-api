import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DecideDto } from './dto/decide.dto';

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
          (mf as any).url = `/api/media/${mf.id}/download`;
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

  async requestAuthorisation(jobId: string, channel: string = 'link', sentTo?: string) {
    const job = await this.prisma.jobs.findUnique({
      where: { id: jobId },
      include: {
        customers: true,
        vehicles: true,
        estimate_lines: true,
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

    const allDecisions = job.approval_tokens.flatMap((t) => t.authorisation_decisions);
    const counts = {
      totalLines: job.estimate_lines.length,
      approved: allDecisions.filter((d) => d.decision === 'approved').length,
      declined: allDecisions.filter((d) => d.decision === 'declined').length,
      deferred: allDecisions.filter((d) => d.decision === 'deferred').length,
      pending: Math.max(job.estimate_lines.length - allDecisions.length, 0),
    };

    return {
      jobId,
      counts,
      latestToken: job.approval_tokens[0]
        ? {
            id: job.approval_tokens[0].id,
            issued_at: job.approval_tokens[0].issued_at,
            expires_at: job.approval_tokens[0].expires_at,
            first_opened_at: job.approval_tokens[0].first_opened_at,
            used_at: job.approval_tokens[0].used_at,
            is_revoked: job.approval_tokens[0].is_revoked,
          }
        : null,
      decisions: allDecisions,
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
        lines: gLines,
        total: gLines.reduce((s: number, l: any) => s + Number(l.line_total ?? 0), 0),
      });
    }
    if (generalLines.length > 0) {
      const typeOrder: Record<string, number> = { labour: 0, part: 1, sublet: 2 };
      generalLines.sort((a, b) => (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3));
      grouped.push({
        key: 'general',
        title: 'Other items',
        severity: null,
        finding: null,
        lines: generalLines,
        total: generalLines.reduce((s: number, l: any) => s + Number(l.line_total ?? 0), 0),
      });
    }

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
      grouped_estimate: grouped,
      grand_total: lines.reduce((s: number, l: any) => s + Number(l.line_total ?? 0), 0),
      existing_decisions: token.authorisation_decisions,
    };
  }

  async decideFromPortal(rawToken: string, dto: DecideDto, ip: string, userAgent?: string) {
    const token = await this.getValidTokenByRaw(rawToken);
    if (token.used_at) throw new BadRequestException('Approval link already used');
    if (!dto.decisions.length) throw new BadRequestException('No decisions provided');

    const allowedLineIds = new Set((token.jobs?.estimate_lines || []).map((l) => l.id));
    for (const item of dto.decisions) {
      if (!allowedLineIds.has(item.estimate_line_id)) {
        throw new BadRequestException(`Estimate line ${item.estimate_line_id} does not belong to this job`);
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
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

      return rows;
    });

    return {
      saved: created.length,
      decisions: created,
    };
  }
}
