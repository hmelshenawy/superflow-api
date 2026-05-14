import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { RolesService } from './roles.service';
import { LabourRatesService } from './labour-rates.service';
import { TemplatesAdminService } from './templates.admin.service';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [SettingsService, RolesService, LabourRatesService, TemplatesAdminService],
  exports: [SettingsService, RolesService, LabourRatesService, TemplatesAdminService],
})
export class AdminModule {}