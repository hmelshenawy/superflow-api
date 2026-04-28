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
}