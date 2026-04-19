import { Module } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { InspectionsController } from './inspections.controller';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';

@Module({
  controllers: [InspectionsController, TemplatesController],
  providers: [InspectionsService, TemplatesService],
  exports: [InspectionsService, TemplatesService],
})
export class InspectionsModule {}