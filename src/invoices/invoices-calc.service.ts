import { Injectable } from '@nestjs/common';

export interface CalcLineItem {
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  vat_rate: number;
  vat_applicable: boolean;
}

export interface CalcResult {
  subtotal_cents: number;
  discount_total_cents: number;
  tax_total_cents: number;
  grand_total_cents: number;
  total_cents: number;
}

export interface CalcLineResult {
  line_total_cents: number;
  line_vat_cents: number;
}

@Injectable()
export class InvoiceCalcService {
  /**
   * Calculate line total and line VAT for a single line item.
   * All inputs and outputs are in integer cents.
   */
  calculateLine(item: CalcLineItem): CalcLineResult {
    const qty = Math.max(0, item.quantity);
    const unitPrice = Math.max(0, item.unit_price_cents);
    const discount = Math.max(0, item.discount_cents);

    const lineTotal = qty * unitPrice - discount;
    const clampedLineTotal = Math.max(0, lineTotal);

    let lineVat = 0;
    if (item.vat_applicable && item.vat_rate > 0) {
      lineVat = Math.round(clampedLineTotal * item.vat_rate);
    }

    return {
      line_total_cents: clampedLineTotal,
      line_vat_cents: lineVat,
    };
  }

  /**
   * Calculate subtotal from line totals (sum of line totals before tax).
   */
  calculateSubtotal(lineTotals: number[]): number {
    return lineTotals.reduce((sum, v) => sum + Math.max(0, v), 0);
  }

  /**
   * Calculate discount total (sum of line discounts plus any global discount).
   */
  calculateDiscountTotal(lineDiscounts: number[], globalDiscountCents = 0): number {
    const lineDiscountSum = lineDiscounts.reduce((sum, v) => sum + Math.max(0, v), 0);
    return lineDiscountSum + Math.max(0, globalDiscountCents);
  }

  /**
   * Calculate tax total (sum of line VATs).
   */
  calculateTaxTotal(lineVats: number[]): number {
    return lineVats.reduce((sum, v) => sum + Math.max(0, v), 0);
  }

  /**
   * Calculate grand total (subtotal + tax_total).
   * total_cents is an alias for grand_total_cents for API compatibility.
   */
  calculateGrandTotal(subtotalCents: number, taxTotalCents: number): CalcResult {
    const subtotal = Math.max(0, subtotalCents);
    const taxTotal = Math.max(0, taxTotalCents);
    const grandTotal = subtotal + taxTotal;

    return {
      subtotal_cents: subtotal,
      discount_total_cents: 0, // computed separately
      tax_total_cents: taxTotal,
      grand_total_cents: grandTotal,
      total_cents: grandTotal,
    };
  }

  /**
   * Full invoice recalculation from line items and optional global discount.
   * Returns complete totals including per-line results.
   */
  recalculate(lines: CalcLineItem[], globalDiscountCents = 0): {
    lineResults: CalcLineResult[];
    totals: CalcResult;
  } {
    const lineResults = lines.map((line) => this.calculateLine(line));

    const subtotalCents = this.calculateSubtotal(lineResults.map((r) => r.line_total_cents));
    const discountTotalCents = this.calculateDiscountTotal(
      lines.map((l) => l.discount_cents),
      globalDiscountCents,
    );
    const taxTotalCents = this.calculateTaxTotal(lineResults.map((r) => r.line_vat_cents));
    const grandTotalCents = subtotalCents + taxTotalCents;

    return {
      lineResults,
      totals: {
        subtotal_cents: subtotalCents,
        discount_total_cents: discountTotalCents,
        tax_total_cents: taxTotalCents,
        grand_total_cents: grandTotalCents,
        total_cents: grandTotalCents,
      },
    };
  }
}
