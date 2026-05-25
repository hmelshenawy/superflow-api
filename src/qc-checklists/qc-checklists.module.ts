import { Module } from '@nestjs/common';
import { QcChecklistsService } from './qc-checklists.service';
import { QcChecklistsController } from './qc-checklists.controller';
import { QcChecklistTemplatesService } from './qc-checklist-templates.service';
import { QcChecklistTemplatesController } from './qc-checklist-templates.controller';
import { WorkflowService } from '../admin/workflow.service';

@Module({
  controllers: [QcChecklistsController, QcChecklistTemplatesController],
  providers: [QcChecklistsService, QcChecklistTemplatesService, WorkflowService],
  exports: [QcChecklistsService, QcChecklistTemplatesService],
})
export class QcChecklistsModule {}
