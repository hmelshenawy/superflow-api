import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsageService } from '../common/plan-features/usage.service';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, InvoicePdfService, UsageService],
  exports: [BillingService, InvoicePdfService, UsageService],
})
export class BillingModule {}