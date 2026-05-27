import { Module } from '@nestjs/common';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';
import { PartsAnalyticsService } from './parts-analytics.service';
import { WarehousesModule } from '../warehouses/warehouses.module';

@Module({
  imports: [WarehousesModule],
  controllers: [PartsController],
  providers: [PartsService, PartsAnalyticsService],
  exports: [PartsService, PartsAnalyticsService],
})
export class PartsModule {}