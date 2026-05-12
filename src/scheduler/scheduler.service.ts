import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { runWithWorkshop } from '../prisma/workshop-context';
import { MediaService } from '../media/media.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private media: MediaService,
  ) {}

  private async withAdvisoryLock(lockName: string, fn: () => Promise<void>) {
    const lockResult = await this.prisma.$queryRaw<Array<{ result: number | null }>>`
      SELECT GET_LOCK(${lockName}, 0) AS result
    `;
    const acquired = lockResult[0]?.result === 1;
    if (!acquired) {
      this.logger.log(`Skipping ${lockName} — lock held by another instance`);
      return;
    }
    try {
      await fn();
    } finally {
      await this.prisma.$executeRaw`SELECT RELEASE_LOCK(${lockName})`;
    }
  }

  /** Run a task for each active workshop, setting ALS context per workshop */
  private async forEachWorkshop(fn: (workshopId: string) => Promise<void>) {
    const workshops = await this.prisma.raw.workshops.findMany({ where: { is_active: true } });
    for (const w of workshops) {
      await runWithWorkshop({ workshopId: w.id, isPlatformAdmin: false }, () => fn(w.id));
    }
  }

  async onModuleInit() {
    this.logger.log('Running startup archive catch-up...');
    await this.archiveOldClosedJobs();
  }

  @Cron('0 0 * * *')
  async archiveOldClosedJobs() {
    await this.withAdvisoryLock('scheduler_archive_closed', async () => {
      try {
        await this.forEachWorkshop(async (workshopId) => {
          const result = await this.prisma.tenant.jobs.updateMany({
            where: {
              status: 'closed',
              archived_at: null,
            },
            data: { archived_at: new Date() },
          });

          if (result.count > 0) {
            this.logger.log(`Workshop ${workshopId}: Archived ${result.count} closed job(s)`);
          }
        });
      } catch (error) {
        this.logger.error('Failed to archive closed jobs', error);
      }
    });
  }

  @Cron('0 17 * * *')
  async markBookedAsNoShow() {
    await this.withAdvisoryLock('scheduler_no_show', async () => {
      try {
        await this.forEachWorkshop(async (workshopId) => {
          const result = await this.prisma.tenant.jobs.updateMany({
            where: {
              status: 'booked',
              arrived_at: null,
            },
            data: {
              status: 'no_show',
              workshop_stage: null,
            },
          });

          if (result.count > 0) {
            this.logger.log(`Workshop ${workshopId}: Marked ${result.count} booked job(s) as no_show`);
          }
        });
      } catch (error) {
        this.logger.error('Failed to mark booked jobs as no_show', error);
      }
    });
  }

  @Cron('0 3 * * *')
  async cleanupRefreshTokens() {
    await this.withAdvisoryLock('scheduler_token_cleanup', async () => {
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);

        const result = await this.prisma.raw.refresh_tokens.deleteMany({
          where: {
            expires_at: { lt: cutoff },
          },
        });

        if (result.count > 0) {
          this.logger.log(`Purged ${result.count} expired refresh token(s) older than 30 days`);
        }
      } catch (error) {
        this.logger.error('Failed to cleanup refresh tokens', error);
      }
    });
  }

  @Cron('0 4 * * 0')
  async cleanupAuditLogs() {
    await this.withAdvisoryLock('scheduler_audit_cleanup', async () => {
      try {
        await this.forEachWorkshop(async (workshopId) => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 90);

          const result = await this.prisma.tenant.audit_logs.deleteMany({
            where: {
              created_at: { lt: cutoff },
            },
          });

          if (result.count > 0) {
            this.logger.log(`Workshop ${workshopId}: Purged ${result.count} audit log(s) older than 90 days`);
          }
        });
      } catch (error) {
        this.logger.error('Failed to cleanup audit logs', error);
      }
    });
  }

  @Cron('30 3 * * *')
  async cleanupAbandonedMediaUploads() {
    await this.withAdvisoryLock('scheduler_media_cleanup', async () => {
      try {
        await this.forEachWorkshop(async (workshopId) => {
          const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const count = await this.media.cleanupAbandonedPendingUploads(cutoff);

          if (count > 0) {
            this.logger.log(`Workshop ${workshopId}: Soft-deleted ${count} abandoned pending media upload(s)`);
          }
        });
      } catch (error) {
        this.logger.error('Failed to cleanup abandoned media uploads', error);
      }
    });
  }

  @Cron('0 8 * * *')
  async sendTrialExpiryWarnings() {
    await this.withAdvisoryLock('scheduler_trial_warning', async () => {
      try {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const startOfDay = new Date(threeDaysFromNow);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(threeDaysFromNow);
        endOfDay.setHours(23, 59, 59, 999);

        const workshops = await this.prisma.raw.workshops.findMany({
          where: {
            is_active: true,
            trial_ends_at: { gte: startOfDay, lte: endOfDay },
            plan_id: 'free_trial',
          },
        });

        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
        if (!apiKey || !from) return;

        for (const workshop of workshops) {
          if (!workshop.email) continue;

          // Check if we already sent a warning for this workshop
          const alreadySent = await this.prisma.raw.notifications.findFirst({
            where: {
              workshop_id: workshop.id,
              channel: 'email',
              subject: { contains: 'trial expires' },
              queued_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          });
          if (alreadySent) continue;

          const expiryDate = workshop.trial_ends_at!.toLocaleDateString();

          await this.prisma.raw.notifications.create({
            data: {
              id: crypto.randomUUID(),
              workshop_id: workshop.id,
              channel: 'email',
              recipient: workshop.email,
              subject: 'Your PrioraFlow trial expires soon',
              body_rendered: `Your PrioraFlow free trial expires on ${expiryDate}. To continue using all features, please contact us at admin@prioraflow.com to activate your subscription.`,
              status: 'queued',
            },
          });

          this.logger.log(`Trial expiry warning queued for workshop ${workshop.id} (${workshop.email})`);
        }
      } catch (error) {
        this.logger.error('Failed to send trial expiry warnings', error);
      }
    });
  }
}
