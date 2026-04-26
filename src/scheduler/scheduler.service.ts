import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 0 * * *') // midnight UTC daily
  async archiveOldClosedJobs() {
    const result = await this.prisma.jobs.updateMany({
      where: {
        status: 'closed',
        archived_at: null,
        updated_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      data: { archived_at: new Date() },
    });

    if (result.count > 0) {
      this.logger.log(`Archived ${result.count} closed job(s)`);
    }
  }
}