import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoicesPdfService } from './invoices-pdf.service';
import { InvoiceCalcService } from './invoices-calc.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceNumberService, InvoicesPdfService, InvoiceCalcService],
  exports: [InvoicesService, InvoiceNumberService, InvoicesPdfService, InvoiceCalcService],
})
export class InvoicesModule {}
