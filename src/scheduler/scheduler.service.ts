import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Catch-up: cron-only scheduling is not enough in containerized deployments.
    // If the app was down at midnight, startup should still reconcile closed jobs.
    this.logger.log('Running startup archive catch-up...');
    await this.archiveOldClosedJobs();
  }

  @Cron('0 0 * * *') // midnight UTC daily
  async archiveOldClosedJobs() {
    try {
      // Archive by status only. Closed jobs are intentionally removed from the
      // active board immediately; debugging users can still query archived data.
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
  }

  // Mark booked jobs as no_show at end of Dubai working day (9 PM Gulf = 17:00 UTC)
  @Cron('0 17 * * *') // 17:00 UTC = 9:00 PM Dubai time
  async markBookedAsNoShow() {
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
  }
}