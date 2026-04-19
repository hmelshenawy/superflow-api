import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DecideDto } from './dto/decide.dto';

@Injectable()
export class AuthorisationService {
  constructor(private prisma: PrismaService) {}

  async createToken(jobId: string, channel: string = 'email', sentTo?: string) {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');

    await this.prisma.approval_tokens.create({
      data: {
        id: uuid(), job_id: jobId, token_hash: hash,
        channel: channel as any, sent_to: sentTo,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Return raw token ONCE — never stored
    return { token: raw, channel, sent_to: sentTo };
  }

  async decide(dto: DecideDto, ip: string) {
    const token = await this.prisma.approval_tokens.findUnique({ where: { id: dto.token_id } });
    if (!token) throw new NotFoundException('Token not found');
    if (token.is_revoked) throw new BadRequestException('Token revoked');
    if (token.used_at) throw new BadRequestException('Token already used');
    if (token.expires_at < new Date()) throw new BadRequestException('Token expired');

    const decision = await this.prisma.authorisation_decisions.create({
      data: {
        id: uuid(), token_id: dto.token_id, estimate_line_id: dto.estimate_line_id,
        decision: dto.decision as any, customer_comment: dto.customer_comment, ip_address: ip,
      },
    });

    await this.prisma.approval_tokens.update({ where: { id: dto.token_id }, data: { used_at: new Date() } });

    // If declined → create deferred work
    if (dto.decision === 'declined') {
      const job = await this.prisma.jobs.findUnique({ where: { id: token.job_id } });
      if (job) {
        await this.prisma.deferred_work.create({
          data: {
            id: uuid(), customer_id: job.customer_id, vehicle_id: job.vehicle_id,
            original_job_id: job.id, estimate_line_id: dto.estimate_line_id,
            status: 'pending', urgency: 'none',
          },
        });
      }
    }

    return decision;
  }

  async getDecisionsForJob(jobId: string) {
    const tokens = await this.prisma.approval_tokens.findMany({
      where: { job_id: jobId },
      include: { authorisation_decisions: true },
    });
    return tokens;
  }
}