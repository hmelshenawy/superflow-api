import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { RolesService } from './roles.service';
import { LabourRatesService } from './labour-rates.service';
import { TemplatesAdminService } from './templates.admin.service';
import { QcTemplatesAdminService } from './qc-templates.admin.service';
import { WorkflowService } from './workflow.service';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [SettingsService, RolesService, LabourRatesService, TemplatesAdminService, QcTemplatesAdminService, WorkflowService],
  exports: [SettingsService, RolesService, LabourRatesService, TemplatesAdminService, QcTemplatesAdminService, WorkflowService],
})
export class AdminModule {}
