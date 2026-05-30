import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { WorkshopScheduleService } from './schedule.service';

@Module({
  controllers: [ScheduleController],
  providers: [WorkshopScheduleService],
})
export class WorkshopScheduleModule {}
