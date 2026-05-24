import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobMetaService } from './job-meta.service';
import { BillingModule } from '../billing/billing.module';
import { PriorityModule } from '../priority/priority.module';
import { WorkflowService } from '../admin/workflow.service';

@Module({
  imports: [BillingModule, PriorityModule],
  controllers: [JobsController],
  providers: [JobsService, JobMetaService, WorkflowService],
  exports: [JobsService, JobMetaService],
})
export class JobsModule {}
