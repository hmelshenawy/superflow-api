import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DecideDto } from './dto/decide.dto';
import { AuthorisationNotificationService } from './services/authorisation-notification.service';
import { AuthorisationQueryService } from './services/authorisation-query.service';
import { AuthorisationDecisionService } from './services/authorisation-decision.service';

@Injectable()
export class AuthorisationService {
  constructor(
    private prisma: PrismaService,
    private queryService: AuthorisationQueryService,
    private decisionService: AuthorisationDecisionService,
    private notificationService: AuthorisationNotificationService,
  ) {}

  // ── Query delegations ──

  async validatePortalToken(rawToken: string) {
    return this.queryService.validatePortalToken(rawToken);
  }

  async getAuthStatus(jobId: string) {
    return this.queryService.getAuthStatus(jobId);
  }

  async loadPortal(rawToken: string, preferSnapshot = true) {
    return this.queryService.loadPortal(rawToken, preferSnapshot);
  }

  // ── Decision delegations ──

  async requestAuthorisation(jobId: string, channel: string = 'link', sentTo?: string) {
    return this.decisionService.requestAuthorisation(jobId, channel, sentTo);
  }

  async releasePortalUpdate(jobId: string, releasedBy?: string, releaseNote?: string) {
    return this.decisionService.releasePortalUpdate(jobId, releasedBy, releaseNote);
  }

  async resetConcernApproval(jobId: string, concernId: string, userId: string, reason: string) {
    return this.decisionService.resetConcernApproval(jobId, concernId, userId, reason);
  }

  async decideFromPortal(rawToken: string, dto: DecideDto, ip: string, userAgent?: string) {
    return this.decisionService.decideFromPortal(rawToken, dto, ip, userAgent);
  }
}