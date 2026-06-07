import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import PDFDocument = require('pdfkit');
import { PrismaService } from '../../prisma/prisma.service';

type InvoiceForPdf = Prisma.workshop_invoicesGetPayload<{
  include: {
    items: { orderBy: { sort_order: 'asc' } };
    workshops: {
      select: {
        name: true;
        address: true;
        phone: true;
        email: true;
        vat_trn: true;
        logo_url: true;
      };
    };
  };
}>;

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

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        this.renderInvoice(doc, invoice);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private renderInvoice(doc: PDFKit.PDFDocument, invoice: InvoiceForPdf) {
    const workshop = invoice.workshops;
    const yStart = 50;
    let y = yStart;
    const shouldRenderLogo = Boolean(workshop?.logo_url && this.canRenderLocalLogo(workshop.logo_url));
    const workshopX = shouldRenderLogo ? 150 : 50;
    const workshopWidth = shouldRenderLogo ? 190 : 285;
    const metaX = 365;
    const metaWidth = 180;

    // Header / Branding
    if (workshop?.logo_url && shouldRenderLogo) {
      try {
        doc.image(workshop.logo_url, 50, yStart, { width: 80 });
      } catch {
        // Skip invalid or unreadable local logo files.
      }
    }

    doc.fontSize(18).font('Helvetica-Bold');
    doc.text(workshop?.name || 'Workshop', workshopX, yStart, { align: 'left', width: workshopWidth });

    doc.fontSize(9).font('Helvetica');
    y = yStart + 22;
    if (workshop?.address) {
      doc.text(workshop.address, workshopX, y, { width: workshopWidth });
      y += Math.max(12, doc.heightOfString(workshop.address, { width: workshopWidth }));
    }
    if (workshop?.phone) {
      doc.text(`Phone: ${workshop.phone}`, workshopX, y, { width: workshopWidth });
      y += 12;
    }
    if (workshop?.email) {
      doc.text(`Email: ${workshop.email}`, workshopX, y, { width: workshopWidth });
      y += 12;
    }
    if (workshop?.vat_trn) {
      doc.text(`VAT/TRN: ${workshop.vat_trn}`, workshopX, y, { width: workshopWidth });
      y += 12;
    }

    // Invoice Meta
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('INVOICE NUMBER', metaX, yStart, { width: metaWidth, align: 'right' });
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(invoice.invoice_number, metaX, yStart + 12, { width: metaWidth, align: 'right' });
    doc.fontSize(9).font('Helvetica');
    doc.text(`Status: ${(invoice.status as string).toUpperCase()}`, metaX, yStart + 28, {
      width: metaWidth,
      align: 'right',
    });
    if (invoice.issued_at) {
      doc.text(`Issued: ${new Date(invoice.issued_at).toLocaleDateString()}`, metaX, yStart + 42, {
        width: metaWidth,
        align: 'right',
      });
    }

    // Customer / Vehicle Snapshot
    y = Math.max(y, yStart + 74) + 20;
    y = this.ensureSpace(doc, y, 110);
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
    doc.text(customerName, 50, y, { width: 210 });
    doc.text(
      `${invoice.snapshot_vehicle_make || ''} ${invoice.snapshot_vehicle_model || ''}`.trim() || 'N/A',
      300,
      y,
      { width: 245 },
    );
    y += 12;
    if (customerEmail) doc.text(customerEmail, 50, y, { width: 210 });
    doc.text(`Plate: ${invoice.snapshot_vehicle_plate || 'N/A'}`, 300, y, { width: 245 });
    y += 12;
    if (customerPhone) doc.text(customerPhone, 50, y, { width: 210 });
    doc.text(`VIN: ${invoice.snapshot_vehicle_vin || 'N/A'}`, 300, y, { width: 245 });
    y += 12;
    if (invoice.snapshot_vehicle_year) {
      doc.text(`Year: ${invoice.snapshot_vehicle_year}  Color: ${invoice.snapshot_vehicle_color || 'N/A'}`, 300, y, {
        width: 245,
      });
    }
    y += 24;

    // Line Items Table
    y = this.ensureSpace(doc, y, 36);
    y = this.renderLineItemHeader(doc, y);

    doc.fontSize(9).font('Helvetica');
    for (const item of invoice.items) {
      const description = item.description || '';
      const descriptionHeight = doc.heightOfString(description, { width: 180 });
      const rowHeight = Math.max(16, descriptionHeight + 4);

      y = this.ensureSpace(doc, y, rowHeight, (newY) => this.renderLineItemHeader(doc, newY));

      const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      doc.fontSize(9).font('Helvetica');
      doc.text(description, 50, y, { width: 180 });
      doc.text(typeLabel, 235, y, { width: 40 });
      doc.text(this.formatQuantity(item.quantity), 280, y, { width: 30, align: 'right' });
      doc.text(this.formatAmount(item.unit_price_cents), 315, y, { width: 55, align: 'right' });
      doc.text(this.formatAmount(item.discount_cents), 375, y, { width: 50, align: 'right' });
      doc.text(this.formatAmount(item.line_vat_cents), 430, y, { width: 50, align: 'right' });
      doc.text(this.formatAmount(item.line_total_cents), 485, y, { width: 60, align: 'right' });
      y += rowHeight;
    }

    // Totals
    y = this.ensureSpace(doc, y + 10, 90);
    doc.moveTo(50, y).lineTo(545, y).stroke();
    y += 14;

    doc.fontSize(10).font('Helvetica-Bold');
    const rightX = 330;
    const labelWidth = 95;
    const amountX = 430;
    const amountWidth = 115;
    doc.text('Subtotal:', rightX, y, { width: labelWidth, align: 'right' });
    doc.text(this.formatCurrency(invoice.subtotal_cents), amountX, y, { width: amountWidth, align: 'right' });
    y += 14;
    doc.text('Discount:', rightX, y, { width: labelWidth, align: 'right' });
    doc.text(this.formatCurrency(invoice.discount_total_cents), amountX, y, { width: amountWidth, align: 'right' });
    y += 14;
    doc.text('VAT:', rightX, y, { width: labelWidth, align: 'right' });
    doc.text(this.formatCurrency(invoice.tax_total_cents), amountX, y, { width: amountWidth, align: 'right' });
    y += 16;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Grand Total:', rightX, y, { width: labelWidth, align: 'right' });
    doc.text(this.formatCurrency(invoice.grand_total_cents), amountX, y, { width: amountWidth, align: 'right' });
    y += 24;

    // Notes / Footer
    if (invoice.notes) {
      y = this.ensureSpace(doc, y + 6, 34);
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Notes:', 50, y);
      y += 12;
      doc.font('Helvetica');
      y = this.renderWrappedText(doc, invoice.notes, 50, y, 495, 11);
    }

    this.addPageNumbers(doc);
  }

  private renderLineItemHeader(doc: PDFKit.PDFDocument, y: number): number {
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Description', 50, y);
    doc.text('Type', 235, y);
    doc.text('Qty', 280, y, { width: 30, align: 'right' });
    doc.text('Unit', 315, y, { width: 55, align: 'right' });
    doc.text('Disc', 375, y, { width: 50, align: 'right' });
    doc.text('VAT', 430, y, { width: 50, align: 'right' });
    doc.text('Total', 485, y, { width: 60, align: 'right' });
    y += 14;
    doc.moveTo(50, y).lineTo(545, y).stroke();
    return y + 8;
  }

  private ensureSpace(
    doc: PDFKit.PDFDocument,
    y: number,
    requiredHeight: number,
    afterPageAdd?: (newY: number) => number,
  ): number {
    if (y + requiredHeight <= this.pageBottom(doc)) return y;

    doc.addPage();
    const newY = 50;
    return afterPageAdd ? afterPageAdd(newY) : newY;
  }

  private renderWrappedText(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    lineHeight: number,
  ): number {
    const paragraphs = text.split(/\r?\n/);
    let currentY = y;

    for (const paragraph of paragraphs) {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);

      if (!words.length) {
        currentY = this.ensureSpace(doc, currentY, lineHeight);
        currentY += lineHeight;
        continue;
      }

      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (doc.widthOfString(candidate) <= width) {
          line = candidate;
          continue;
        }

        currentY = this.ensureSpace(doc, currentY, lineHeight);
        doc.text(line, x, currentY, { width });
        currentY += lineHeight;
        line = word;
      }

      if (line) {
        currentY = this.ensureSpace(doc, currentY, lineHeight);
        doc.text(line, x, currentY, { width });
        currentY += lineHeight;
      }
    }

    return currentY;
  }

  private addPageNumbers(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      doc.fontSize(8).font('Helvetica');
      doc.text(`Page ${i + 1} of ${range.count}`, 50, this.pageBottom(doc) + 18, {
        width: 495,
        align: 'center',
      });
    }
  }

  private pageBottom(doc: PDFKit.PDFDocument): number {
    return doc.page.height - doc.page.margins.bottom - 24;
  }

  private canRenderLocalLogo(logoUrl: string): boolean {
    if (/^https?:\/\//i.test(logoUrl)) return false;
    if (/^data:/i.test(logoUrl)) return false;
    return fs.existsSync(logoUrl);
  }

  private formatCurrency(cents: number | Prisma.Decimal): string {
    const value = Number(cents) / 100;
    return `AED ${value.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private formatAmount(cents: number | Prisma.Decimal): string {
    const value = Number(cents) / 100;
    return value.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private formatQuantity(quantity: number | Prisma.Decimal): string {
    const value = Number(quantity);
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }
}
