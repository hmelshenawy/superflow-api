import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoiceNumberService {
  constructor(private prisma: PrismaService) {}

  /**
   * Atomically generate the next invoice number for a workshop + branch + year.
   * Format: {WORKSHOP_CODE}-{BRANCH_CODE}-{YEAR}-{SERIAL}
   * Throws BadRequestException if workshop or branch code is missing.
   */
  async generateNextInvoiceNumber(workshopId: string, branchId: string): Promise<{
    invoice_number: string;
    invoice_year: number;
    invoice_serial_number: number;
    workshop_code_snapshot: string;
    branch_code_snapshot: string;
  }> {
    const workshop = await this.prisma.raw.workshops.findUnique({
      where: { id: workshopId },
      select: { code: true },
    });

    if (!workshop?.code) {
      throw new BadRequestException(
        'Workshop code is required. Set it in Workshop Settings before generating invoices.',
      );
    }

    const branch = await this.prisma.raw.branches.findUnique({
      where: { id: branchId },
      select: { code: true },
    });

    if (!branch?.code) {
      throw new BadRequestException(
        'Branch code is required. Set it in Branch Settings before generating invoices.',
      );
    }

    const year = new Date().getFullYear();
    const workshopCode = workshop.code.toUpperCase();
    const branchCode = branch.code.toUpperCase();

    const result = await this.prisma.raw.$transaction(async (tx) => {
      const seq = await tx.workshop_invoice_sequences.upsert({
        where: {
          workshop_id_branch_id_year: {
            workshop_id: workshopId,
            branch_id: branchId,
            year,
          },
        },
        update: {
          last_serial_number: { increment: 1 },
        },
        create: {
          workshop_id: workshopId,
          branch_id: branchId,
          year,
          last_serial_number: 1,
        },
      });

      return {
        invoice_year: year,
        invoice_serial_number: seq.last_serial_number,
      };
    });

    const serial = String(result.invoice_serial_number).padStart(6, '0');
    const invoice_number = `${workshopCode}-${branchCode}-${year}-${serial}`;

    return {
      invoice_number,
      invoice_year: result.invoice_year,
      invoice_serial_number: result.invoice_serial_number,
      workshop_code_snapshot: workshopCode,
      branch_code_snapshot: branchCode,
    };
  }
}
