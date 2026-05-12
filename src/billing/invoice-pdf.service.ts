import { Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

type PDFDoc = InstanceType<typeof PDFDocument>;

const COLORS = {
  brand: '#0E7490',
  brandLight: '#E0F7FA',
  slate50: '#F8FAFC',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate900: '#0F172A',
  white: '#FFFFFF',
  green: '#16A34A',
  greenBg: '#F0FDF4',
  red: '#DC2626',
  redBg: '#FEF2F2',
  gray: '#94A3B8',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  AED: 'AED', USD: '$', EUR: '€', GBP: '£', SAR: 'SAR', QAR: 'QAR', BHD: 'BHD', KWD: 'KWD', OMR: 'OMR',
};

@Injectable()
export class InvoicePdfService {
  constructor(private prisma: PrismaService) {}

  async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await this.prisma.raw.invoices.findUnique({
      where: { id: invoiceId },
      include: {
        workshops: true,
        invoice_items: { orderBy: { created_at: 'asc' } },
        payments: { where: { status: 'succeeded' }, orderBy: { paid_at: 'desc' } },
        subscriptions: { include: { plans: true } },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    return new Promise((resolve, reject) => {
      let doc: PDFDoc;
      try {
        doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      } catch (err) {
        console.error('[InvoicePdf] PDFDocument create error:', err);
        throw err;
      }
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => { console.error('[InvoicePdf] PDF stream error:', err); reject(err); });

      try {
        let y = 50;
        y = this.renderHeader(doc, invoice.invoice_number, y);
        y = this.renderFromBillTo(doc, invoice, y);
        y = this.renderInvoiceMeta(doc, invoice, y);
        y = this.renderLineItems(doc, invoice, y);
        y = this.renderTotals(doc, invoice, y);
        if (invoice.payments.length > 0) y = this.renderPayments(doc, invoice, y);
        if (invoice.notes) y = this.renderNotes(doc, invoice.notes, y);
        this.renderFooter(doc, y);
      } catch (err) {
        console.error('[InvoicePdf] Render error:', err);
        reject(err);
        return;
      }

      doc.end();
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  private fmt(cents: number | null, currency: string | null): string {
    if (cents == null) return '—';
    const sym = CURRENCY_SYMBOLS[(currency || 'AED').toUpperCase()] || (currency || 'AED');
    const abs = Math.abs(cents) / 100;
    const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return cents < 0 ? `-${sym} ${formatted}` : `${sym} ${formatted}`;
  }

  private fmtDate(d: Date | null): string {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private statusLabel(status: string): { text: string; color: string } {
    switch (status) {
      case 'paid': return { text: 'PAID', color: COLORS.green };
      case 'draft': return { text: 'DRAFT', color: COLORS.gray };
      case 'overdue': return { text: 'OVERDUE', color: COLORS.red };
      case 'void': return { text: 'VOID', color: COLORS.gray };
      default: return { text: status.toUpperCase(), color: COLORS.slate700 };
    }
  }

  private drawRow(doc: PDFDoc, y: number, cols: { text: string; width: number; align: string; color?: string; bold?: boolean }[], bgColor?: string): number {
    const rowH = 22;
    const startX = 50;
    if (bgColor) {
      doc.rect(startX, y, 495.28, rowH).fill(bgColor);
    }
    let x = startX;
    for (const col of cols) {
      doc.font(col.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(col.color || COLORS.slate700);
      doc.text(col.text, x + 6, y + 6, { width: col.width - 12, align: col.align as any });
      x += col.width;
    }
    return y + rowH;
  }

  // ── Sections ──────────────────────────────────────────────

  private renderHeader(doc: PDFDoc, invoiceNumber: string, y: number): number {
    doc.font('Helvetica-Bold').fontSize(26).fillColor(COLORS.brand).text('PrioraFlow', 50, y);
    doc.font('Helvetica').fontSize(11).fillColor(COLORS.slate500).text('Invoice', 50, y + 32);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.slate700).text(invoiceNumber, 50, y + 6, { width: 445, align: 'right' });
    const lineY = y + 52;
    doc.moveTo(50, lineY).lineTo(545, lineY).strokeColor(COLORS.slate200).lineWidth(1.5).stroke();
    return lineY + 15;
  }

  private renderFromBillTo(doc: PDFDoc, invoice: any, y: number): number {
    const colW = 230;
    const gap = 35;

    // From
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.slate500).text('FROM', 50, y, { width: colW });
    let fromY = y + 14;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.slate900).text('PrioraFlow', 50, fromY, { width: colW });
    fromY += 14;
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.slate600);
    doc.text('Dubai, UAE', 50, fromY, { width: colW }); fromY += 12;
    doc.text('support@prioraflow.com', 50, fromY, { width: colW }); fromY += 12;
    doc.text('prioraflow.com', 50, fromY, { width: colW });

    // Bill To
    const btX = 50 + colW + gap;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.slate500).text('BILL TO', btX, y, { width: colW });
    let btY = y + 14;
    const w = invoice.workshops;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.slate900).text(w?.name || '—', btX, btY, { width: colW });
    btY += 14;
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.slate600);
    if (w?.address) { doc.text(w.address, btX, btY, { width: colW }); btY += 12; }
    if (w?.phone) { doc.text(w.phone, btX, btY, { width: colW }); btY += 12; }
    if (w?.email) { doc.text(w.email, btX, btY, { width: colW }); btY += 12; }

    return Math.max(fromY, btY) + 15;
  }

  private renderInvoiceMeta(doc: PDFDoc, invoice: any, y: number): number {
    const boxH = 90;
    const boxW = 495.28;

    doc.rect(50, y, boxW, boxH).fill(COLORS.slate50).strokeColor(COLORS.slate200).lineWidth(0.5).stroke();

    const leftX = 64;
    const rightX = 310;
    const labelY = y + 12;
    const valueY = y + 24;

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.slate500);
    doc.text('INVOICE NUMBER', leftX, labelY).text('STATUS', leftX, labelY + 22).text('ISSUE DATE', leftX, labelY + 44);
    doc.text('DUE DATE', rightX, labelY).text('CURRENCY', rightX, labelY + 22);

    const st = this.statusLabel(invoice.status);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.slate700);
    doc.text(invoice.invoice_number, leftX, valueY).text(this.fmtDate(invoice.issued_at), leftX, valueY + 44);
    doc.text(this.fmtDate(invoice.due_at), rightX, valueY).text((invoice.currency || 'AED').toUpperCase(), rightX, valueY + 22);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(st.color).text(st.text, leftX, valueY + 22);

    return y + boxH + 15;
  }

  private renderLineItems(doc: PDFDoc, invoice: any, y: number): number {
    const headers = [
      { text: 'Description', width: 260, align: 'left' },
      { text: 'Qty', width: 55, align: 'center' },
      { text: 'Unit Amount', width: 95, align: 'right' },
      { text: 'Total', width: 85.28, align: 'right' },
    ];

    // Header row
    let curY = y;
    doc.rect(50, curY, 495.28, 24).fill(COLORS.brand);
    let x = 50;
    for (const h of headers) {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white).text(h.text, x + 6, curY + 7, { width: h.width - 12, align: h.align as any });
      x += h.width;
    }
    curY += 24;

    // Data rows
    for (let i = 0; i < invoice.invoice_items.length; i++) {
      const item = invoice.invoice_items[i];
      const isDiscount = item.type === 'discount';
      const bg = isDiscount ? COLORS.redBg : (i % 2 === 1 ? COLORS.slate50 : COLORS.white);
      doc.rect(50, curY, 495.28, 22).fill(bg);

      const desc = isDiscount ? `Discount: ${item.description}` : item.description;
      x = 50;
      const rowColor = isDiscount ? COLORS.red : COLORS.slate700;

      doc.font('Helvetica').fontSize(8.5).fillColor(rowColor);
      doc.text(desc, x + 6, curY + 6, { width: 248, align: 'left' });
      x += 260;
      doc.text(String(item.quantity), x + 6, curY + 6, { width: 43, align: 'center' });
      x += 55;
      doc.text(this.fmt(item.unit_amount_cents, invoice.currency), x + 6, curY + 6, { width: 83, align: 'right' });
      x += 95;
      doc.font(isDiscount ? 'Helvetica-Bold' : 'Helvetica').text(this.fmt(item.total_cents, invoice.currency), x + 6, curY + 6, { width: 73, align: 'right' });

      curY += 22;
    }

    return curY + 10;
  }

  private renderTotals(doc: PDFDoc, invoice: any, y: number): number {
    const rightX = 380;
    const amountX = 460;
    const lineW = 165.28;

    doc.font('Helvetica').fontSize(9).fillColor(COLORS.slate600);
    doc.text('Subtotal', rightX, y, { width: 70, align: 'right' });
    doc.text(this.fmt(invoice.subtotal_cents, invoice.currency), amountX, y, { width: 85, align: 'right' });
    y += 16;

    doc.text('Tax', rightX, y, { width: 70, align: 'right' });
    doc.text(this.fmt(invoice.tax_cents, invoice.currency), amountX, y, { width: 85, align: 'right' });
    y += 16;

    doc.moveTo(rightX, y).lineTo(rightX + lineW, y).strokeColor(COLORS.slate300).lineWidth(0.75).stroke();
    y += 6;

    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.slate900);
    doc.text('Total', rightX, y, { width: 70, align: 'right' });
    doc.text(this.fmt(invoice.total_cents, invoice.currency), amountX, y, { width: 85, align: 'right' });
    y += 18;

    if (invoice.amount_paid_cents > 0) {
      const balance = invoice.total_cents - invoice.amount_paid_cents;
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.slate600);
      doc.text('Amount Paid', rightX, y, { width: 70, align: 'right' });
      doc.text(this.fmt(invoice.amount_paid_cents, invoice.currency), amountX, y, { width: 85, align: 'right' });
      y += 16;

      doc.font('Helvetica-Bold').fontSize(9).fillColor(balance <= 0 ? COLORS.green : COLORS.red);
      doc.text('Balance Due', rightX, y, { width: 70, align: 'right' });
      doc.text(this.fmt(balance, invoice.currency), amountX, y, { width: 85, align: 'right' });
      y += 16;
    }

    return y + 10;
  }

  private renderPayments(doc: PDFDoc, invoice: any, y: number): number {
    if (!invoice.payments || invoice.payments.length === 0) return y;

    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.slate900).text('Payment History', 50, y);
    y += 18;

    const headers = [
      { text: 'Date', width: 100, align: 'left' },
      { text: 'Method', width: 110, align: 'left' },
      { text: 'Reference', width: 175.28, align: 'left' },
      { text: 'Amount', width: 110, align: 'right' },
    ];

    let x = 50;
    doc.rect(50, y, 495.28, 20).fill(COLORS.slate50);
    for (const h of headers) {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.slate500).text(h.text, x + 6, y + 5, { width: h.width - 12, align: h.align as any });
      x += h.width;
    }
    y += 20;

    for (const p of invoice.payments) {
      x = 50;
      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.slate700);
      doc.text(this.fmtDate(p.paid_at), x + 6, y + 4, { width: 88, align: 'left' }); x += 100;
      doc.text((p.method || 'manual').replace(/_/g, ' '), x + 6, y + 4, { width: 98, align: 'left' }); x += 110;
      doc.text(p.provider_payment_id || '—', x + 6, y + 4, { width: 163, align: 'left' }); x += 175.28;
      doc.text(this.fmt(p.amount_cents, p.currency || invoice.currency), x + 6, y + 4, { width: 98, align: 'right' });
      y += 20;
    }

    return y + 10;
  }

  private renderNotes(doc: PDFDoc, notes: string, y: number): number {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.slate900).text('Notes', 50, y);
    y += 14;
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(COLORS.slate600).text(notes, 50, y, { width: 495.28 });
    return y + 30;
  }

  private renderFooter(doc: PDFDoc, contentEndY: number): void {
    const pageH = 841.89;
    const margin = 50;
    const maxY = pageH - margin - 25;
    const y = Math.min(contentEndY + 30, maxY);
    doc.moveTo(50, y).lineTo(545, y).strokeColor(COLORS.slate200).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.gray);
    doc.text('Generated by PrioraFlow', 50, y + 8, { width: 400, align: 'left', lineBreak: false });
    doc.text('Page 1 of 1', 450, y + 8, { width: 95, align: 'right', lineBreak: false });
  }
}