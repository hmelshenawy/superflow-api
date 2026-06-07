import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobMetaService } from './job-meta.service';
import { JobConcernService } from './services/job-concern.service';
import { BillingModule } from '../../billing/billing.module';
import { PriorityModule } from './priority/priority.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { WorkflowService } from '../../admin/workflow.service';

@Module({
  imports: [BillingModule, PriorityModule, InvoicesModule],
  controllers: [JobsController],
  providers: [JobsService, JobMetaService, JobConcernService, WorkflowService],
  exports: [JobsService, JobMetaService],
})
export class JobsModule {}
