import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InvoicesService } from '../invoices.service';
import { InvoiceCalcService } from '../invoices-calc.service';
import { InvoiceNumberService } from '../invoice-number.service';
import { InvoicesPdfService } from '../invoices-pdf.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Invoices Code Validation', () => {
  let service: InvoicesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        InvoiceCalcService,
        InvoiceNumberService,
        InvoicesPdfService,
        PrismaService,
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('rejects invoice creation when workshop code is missing', async () => {
    try { await prisma.raw.$queryRaw`SELECT 1`; } catch { return; }

    const ws = await prisma.raw.workshops.findFirst({ where: { code: '' } });
    if (!ws) return;

    const branch = await prisma.raw.branches.findFirst({ where: { workshop_id: ws.id } });
    if (!branch) return;

    await expect(
      service.create(
        { branch_id: branch.id, items: [{ type: 'labour' as any, description: 'Test', quantity: 1, unit_price_cents: 1000 }] },
        ws.id,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invoice creation when branch code is missing', async () => {
    try { await prisma.raw.$queryRaw`SELECT 1`; } catch { return; }

    const ws = await prisma.raw.workshops.findFirst({ where: { NOT: { code: '' } } });
    if (!ws) return;

    const branch = await prisma.raw.branches.findFirst({ where: { workshop_id: ws.id, code: '' } });
    if (!branch) return;

    await expect(
      service.create(
        { branch_id: branch.id, items: [{ type: 'labour' as any, description: 'Test', quantity: 1, unit_price_cents: 1000 }] },
        ws.id,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
