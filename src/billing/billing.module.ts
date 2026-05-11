import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsageService } from '../common/plan-features/usage.service';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, UsageService],
  exports: [BillingService, UsageService],
})
export class BillingModule {}