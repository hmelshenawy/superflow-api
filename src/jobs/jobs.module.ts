import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { BillingModule } from '../billing/billing.module';
import { WorkflowService } from '../admin/workflow.service';

@Module({
  imports: [BillingModule],
  controllers: [JobsController],
  providers: [JobsService, WorkflowService],
  exports: [JobsService],
})
export class JobsModule {}
