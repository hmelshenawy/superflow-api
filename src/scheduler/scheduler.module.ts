import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
