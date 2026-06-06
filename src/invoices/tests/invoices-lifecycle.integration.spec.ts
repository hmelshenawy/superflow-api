import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InvoicesService } from '../invoices.service';
import { InvoiceCalcService } from '../invoices-calc.service';
import { InvoiceNumberService } from '../invoice-number.service';
import { InvoicesPdfService } from '../invoices-pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus } from '../dto/invoice-response.dto';

describe('InvoicesService Lifecycle', () => {
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

  it('draft → issued → cancelled transitions work', async () => {
    // This test requires a real database with seeded workshop/branch/customer/vehicle data.
    // Skipping when DB is unavailable.
    try {
      await prisma.raw.$queryRaw`SELECT 1`;
    } catch {
      return;
    }

    const workshop = await prisma.raw.workshops.findFirst();
    const branch = await prisma.raw.branches.findFirst({ where: { workshop_id: workshop!.id } });
    if (!workshop || !branch) return;

    const invoice = await service.create(
      {
        branch_id: branch.id,
        items: [
          { type: 'labour' as any, description: 'Oil change', quantity: 1, unit_price_cents: 10000 },
        ],
      },
      workshop.id,
    );

    expect(invoice.status).toBe(InvoiceStatus.DRAFT);
    expect(invoice.invoice_number).toBeDefined();

    const issued = await service.issue(invoice.id);
    expect(issued.status).toBe(InvoiceStatus.ISSUED);
    expect(issued.issued_at).toBeDefined();

    const cancelled = await service.cancel(issued.id);
    expect(cancelled.status).toBe(InvoiceStatus.CANCELLED);
    expect(cancelled.cancelled_at).toBeDefined();

    // Clean up
    await prisma.tenant.workshop_invoice_items.deleteMany({ where: { invoice_id: invoice.id } });
    await prisma.tenant.workshop_invoices.delete({ where: { id: invoice.id } });
  });

  it('rejects update on issued invoice', async () => {
    try { await prisma.raw.$queryRaw`SELECT 1`; } catch { return; }

    const workshop = await prisma.raw.workshops.findFirst();
    const branch = await prisma.raw.branches.findFirst({ where: { workshop_id: workshop!.id } });
    if (!workshop || !branch) return;

    const invoice = await service.create(
      { branch_id: branch.id, items: [{ type: 'labour' as any, description: 'Test', quantity: 1, unit_price_cents: 1000 }] },
      workshop.id,
    );
    await service.issue(invoice.id);

    await expect(service.update(invoice.id, { notes: 'Should fail' })).rejects.toThrow(ForbiddenException);

    await prisma.tenant.workshop_invoice_items.deleteMany({ where: { invoice_id: invoice.id } });
    await prisma.tenant.workshop_invoices.delete({ where: { id: invoice.id } });
  });

  it('invoice number is immutable after creation', async () => {
    try { await prisma.raw.$queryRaw`SELECT 1`; } catch { return; }

    const workshop = await prisma.raw.workshops.findFirst();
    const branch = await prisma.raw.branches.findFirst({ where: { workshop_id: workshop!.id } });
    if (!workshop || !branch) return;

    const invoice = await service.create(
      { branch_id: branch.id, items: [{ type: 'labour' as any, description: 'Test', quantity: 1, unit_price_cents: 1000 }] },
      workshop.id,
    );
    const originalNumber = invoice.invoice_number;

    const updated = await service.update(invoice.id, { notes: 'Updated' });
    expect(updated.invoice_number).toBe(originalNumber);

    await prisma.tenant.workshop_invoice_items.deleteMany({ where: { invoice_id: invoice.id } });
    await prisma.tenant.workshop_invoices.delete({ where: { id: invoice.id } });
  });
});
