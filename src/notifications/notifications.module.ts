import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RendererService } from './templates/renderer.service';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  providers: [NotificationsService, RendererService, NotificationsProcessor],
  exports: [NotificationsService, RendererService],
})
export class NotificationsModule {}
