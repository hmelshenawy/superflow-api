import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { runWithWorkshop } from '../prisma/workshop-context';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

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
}