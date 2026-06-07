import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InvoiceNumberService } from '../invoice-number.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('InvoiceNumberService', () => {
  let service: InvoiceNumberService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      raw: {
        workshops: { findUnique: jest.fn() },
        branches: { findUnique: jest.fn() },
        $transaction: jest.fn(),
        workshop_invoice_sequences: {
          upsert: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceNumberService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InvoiceNumberService>(InvoiceNumberService);
  });

  it('generates correct invoice number format', async () => {
    prisma.raw.workshops.findUnique.mockResolvedValue({ code: 'GAR' });
    prisma.raw.branches.findUnique.mockResolvedValue({ code: 'DEI' });
    prisma.raw.$transaction.mockImplementation(async (cb: any) => {
      const seq = await cb({
        workshop_invoice_sequences: {
          upsert: jest.fn().mockResolvedValue({ last_serial_number: 1 }),
        },
      });
      return seq;
    });

    const result = await service.generateNextInvoiceNumber('ws-1', 'br-1');
    const year = new Date().getFullYear();
    expect(result.invoice_number).toBe(`GAR-DEI-${year}-000001`);
    expect(result.invoice_year).toBe(year);
    expect(result.invoice_serial_number).toBe(1);
    expect(result.workshop_code_snapshot).toBe('GAR');
    expect(result.branch_code_snapshot).toBe('DEI');
  });

  it('rejects when workshop code is missing', async () => {
    prisma.raw.workshops.findUnique.mockResolvedValue({ code: null });

    await expect(service.generateNextInvoiceNumber('ws-1', 'br-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects when branch code is missing', async () => {
    prisma.raw.workshops.findUnique.mockResolvedValue({ code: 'GAR' });
    prisma.raw.branches.findUnique.mockResolvedValue({ code: null });

    await expect(service.generateNextInvoiceNumber('ws-1', 'br-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('does not produce fallback invoice numbers', async () => {
    prisma.raw.workshops.findUnique.mockResolvedValue({ code: 'GAR' });
    prisma.raw.branches.findUnique.mockResolvedValue({ code: 'DEI' });
    prisma.raw.$transaction.mockImplementation(async (cb: any) => {
      return cb({
        workshop_invoice_sequences: {
          upsert: jest.fn().mockResolvedValue({ last_serial_number: 42 }),
        },
      });
    });

    const result = await service.generateNextInvoiceNumber('ws-1', 'br-1');
    expect(result.invoice_number).not.toContain('UNKNOWN');
    expect(result.invoice_number).not.toContain('DEFAULT');
    expect(result.invoice_number).not.toContain('WS-');
    expect(result.invoice_number).toMatch(/^GAR-DEI-\d{4}-\d{6}$/);
  });
});
