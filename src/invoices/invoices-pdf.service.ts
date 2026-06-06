import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus } from './dto/invoice-response.dto';

@Injectable()
export class InvoicesPdfService {
  constructor(private prisma: PrismaService) {}

  async generatePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await this.prisma.tenant.workshop_invoices.findUnique({
      where: { id: invoiceId },
      include: {
        items: { orderBy: { sort_order: 'asc' } },
        workshops: {
          select: {
            name: true,
            address: true,
            phone: true,
            email: true,
            vat_trn: true,
            logo_url: true,
          },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    const workshop = invoice.workshops;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─── Header / Branding ───
      const yStart = 50;

      if (workshop?.logo_url) {
        try {
          doc.image(workshop.logo_url, 50, yStart, { width: 80 });
        } catch {
          // ignore missing logo
        }
      }

      doc.fontSize(18).font('Helvetica-Bold');
      doc.text(workshop?.name || 'Workshop', 150, yStart, { align: 'left' });

      doc.fontSize(9).font('Helvetica');
      let y = yStart + 22;
      if (workshop?.address) {
        doc.text(workshop.address, 150, y);
        y += 12;
      }
      if (workshop?.phone) {
        doc.text(`Phone: ${workshop.phone}`, 150, y);
        y += 12;
      }
      if (workshop?.email) {
        doc.text(`Email: ${workshop.email}`, 150, y);
        y += 12;
      }
      if (workshop?.vat_trn) {
        doc.text(`VAT/TRN: ${workshop.vat_trn}`, 150, y);
        y += 12;
      }

      // ─── Invoice Meta ───
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Invoice Number: ${invoice.invoice_number}`, 400, yStart, { align: 'right' });
      doc.fontSize(9).font('Helvetica');
      doc.text(`Status: ${(invoice.status as string).toUpperCase()}`, 400, yStart + 14, { align: 'right' });
      if (invoice.issued_at) {
        doc.text(`Issued: ${new Date(invoice.issued_at).toLocaleDateString()}`, 400, yStart + 28, { align: 'right' });
      }

      // ─── Customer / Vehicle Snapshot ───
      y = Math.max(y, yStart + 60) + 20;
      doc.moveTo(50, y).lineTo(545, y).stroke();
      y += 14;

      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('BILL TO', 50, y);
      doc.text('VEHICLE', 300, y);
      y += 16;

      doc.fontSize(9).font('Helvetica');
      const customerName = invoice.snapshot_customer_name || 'N/A';
      const customerEmail = invoice.snapshot_customer_email || '';
      const customerPhone = invoice.snapshot_customer_phone || '';
      doc.text(customerName, 50, y);
      doc.text(
        `${invoice.snapshot_vehicle_make || ''} ${invoice.snapshot_vehicle_model || ''}`.trim() || 'N/A',
        300,
        y,
      );
      y += 12;
      if (customerEmail) doc.text(customerEmail, 50, y);
      doc.text(`Plate: ${invoice.snapshot_vehicle_plate || 'N/A'}`, 300, y);
      y += 12;
      if (customerPhone) doc.text(customerPhone, 50, y);
      doc.text(`VIN: ${invoice.snapshot_vehicle_vin || 'N/A'}`, 300, y);
      y += 12;
      if (invoice.snapshot_vehicle_year) {
        doc.text(`Year: ${invoice.snapshot_vehicle_year}  Color: ${invoice.snapshot_vehicle_color || 'N/A'}`, 300, y);
      }
      y += 24;

      // ─── Line Items Table ───
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 50, y);
      doc.text('Type', 240, y);
      doc.text('Qty', 290, y, { width: 30, align: 'right' });
      doc.text('Unit', 330, y, { width: 50, align: 'right' });
      doc.text('Disc', 390, y, { width: 40, align: 'right' });
      doc.text('VAT', 440, y, { width: 40, align: 'right' });
      doc.text('Total', 490, y, { width: 55, align: 'right' });
      y += 14;
      doc.moveTo(50, y).lineTo(545, y).stroke();
      y += 8;

      doc.fontSize(9).font('Helvetica');
      for (const item of (invoice as any).items || []) {
        const typeLabel = (item.type as string).charAt(0).toUpperCase() + (item.type as string).slice(1);
        doc.text(item.description || '', 50, y, { width: 180 });
        doc.text(typeLabel, 240, y);
        doc.text(String(item.quantity), 290, y, { width: 30, align: 'right' });
        doc.text(this.formatCurrency(item.unit_price_cents), 330, y, { width: 50, align: 'right' });
        doc.text(this.formatCurrency(item.discount_cents), 390, y, { width: 40, align: 'right' });
        doc.text(this.formatCurrency(item.line_vat_cents), 440, y, { width: 40, align: 'right' });
        doc.text(this.formatCurrency(item.line_total_cents + item.line_vat_cents), 490, y, { width: 55, align: 'right' });
        y += 14;
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      }

      y += 10;
      doc.moveTo(50, y).lineTo(545, y).stroke();
      y += 14;

      // ─── Totals ───
      doc.fontSize(10).font('Helvetica-Bold');
      const rightX = 400;
      doc.text('Subtotal:', rightX, y, { width: 80, align: 'right' });
      doc.text(this.formatCurrency(invoice.subtotal_cents), 490, y, { width: 55, align: 'right' });
      y += 14;
      doc.text('Discount:', rightX, y, { width: 80, align: 'right' });
      doc.text(this.formatCurrency(invoice.discount_total_cents), 490, y, { width: 55, align: 'right' });
      y += 14;
      doc.text('VAT:', rightX, y, { width: 80, align: 'right' });
      doc.text(this.formatCurrency(invoice.tax_total_cents), 490, y, { width: 55, align: 'right' });
      y += 16;
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Grand Total:', rightX, y, { width: 80, align: 'right' });
      doc.text(this.formatCurrency(invoice.grand_total_cents), 490, y, { width: 55, align: 'right' });

      // ─── Notes / Footer ───
      if (invoice.notes) {
        y += 30;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Notes:', 50, y);
        y += 12;
        doc.font('Helvetica');
        doc.text(invoice.notes, 50, y, { width: 495 });
      }

      doc.end();
    });
  }

  private formatCurrency(cents: number): string {
    const value = Math.max(0, cents) / 100;
    return `AED ${value.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
