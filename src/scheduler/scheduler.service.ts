import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  private async withAdvisoryLock(lockName: string, fn: () => Promise<void>) {
    // MariaDB GET_LOCK returns 1 if acquired, 0 if timed out, null on error.
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

  async onModuleInit() {
    // Catch-up: cron-only scheduling is not enough in containerized deployments.
    // If the app was down at midnight, startup should still reconcile closed jobs.
    this.logger.log('Running startup archive catch-up...');
    await this.archiveOldClosedJobs();
  }

  @Cron('0 0 * * *') // midnight UTC daily
  async archiveOldClosedJobs() {
    await this.withAdvisoryLock('scheduler_archive_closed', async () => {
      try {
        const result = await this.prisma.jobs.updateMany({
          where: {
            status: 'closed',
            archived_at: null,
          },
          data: { archived_at: new Date() },
        });

        if (result.count > 0) {
          this.logger.log(`Archived ${result.count} closed job(s)`);
        } else {
          this.logger.log('No closed jobs to archive');
        }
      } catch (error) {
        this.logger.error('Failed to archive closed jobs', error);
      }
    });
  }

  // Mark booked jobs as no_show at end of Dubai working day (9 PM Gulf = 17:00 UTC)
  @Cron('0 17 * * *') // 17:00 UTC = 9:00 PM Dubai time
  async markBookedAsNoShow() {
    await this.withAdvisoryLock('scheduler_no_show', async () => {
      try {
        const result = await this.prisma.jobs.updateMany({
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
          this.logger.log(`Marked ${result.count} booked job(s) as no_show`);
        } else {
          this.logger.log('No booked jobs to mark as no_show');
        }
      } catch (error) {
        this.logger.error('Failed to mark booked jobs as no_show', error);
      }
    });
  }

  // Purge expired/revoked refresh tokens older than 30 days
  @Cron('0 3 * * *') // 03:00 UTC daily
  async cleanupRefreshTokens() {
    await this.withAdvisoryLock('scheduler_token_cleanup', async () => {
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);

        const result = await this.prisma.refresh_tokens.deleteMany({
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

  // Purge audit logs older than 90 days
  @Cron('0 4 * * 0') // 04:00 UTC every Sunday
  async cleanupAuditLogs() {
    await this.withAdvisoryLock('scheduler_audit_cleanup', async () => {
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);

        const result = await this.prisma.audit_logs.deleteMany({
          where: {
            created_at: { lt: cutoff },
          },
        });

        if (result.count > 0) {
          this.logger.log(`Purged ${result.count} audit log(s) older than 90 days`);
        }
      } catch (error) {
        this.logger.error('Failed to cleanup audit logs', error);
      }
    });
  }
}