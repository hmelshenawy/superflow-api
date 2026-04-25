import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import { NotificationsService } from './notifications.service';
import { RendererService } from './templates/renderer.service';
import { NotificationsProcessor } from './notifications.processor';

export const REDIS_CONNECTION = 'REDIS_CONNECTION';

@Module({
  providers: [
    {
      provide: REDIS_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new IORedis({
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
        });
      },
    },
    NotificationsService,
    RendererService,
    NotificationsProcessor,
  ],
  exports: [NotificationsService, RendererService, REDIS_CONNECTION],
})
export class NotificationsModule {}