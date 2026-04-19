import { Module } from '@nestjs/common';
import { DeferredService } from './deferred.service';
import { DeferredController } from './deferred.controller';

@Module({
  controllers: [DeferredController],
  providers: [DeferredService],
  exports: [DeferredService],
})
export class DeferredModule {}