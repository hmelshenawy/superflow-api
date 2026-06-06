"use client";

import { cn } from "@/lib/utils";
import type { Invoice, CreateLineItemInput } from "@/lib/invoices";

function formatMoney(cents: number) {
  return `AED ${(Math.max(0, cents) / 100).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calcLineTotal(item: CreateLineItemInput) {
  const qty = Math.max(0, item.quantity || 0);
  const price = Math.max(0, item.unit_price_cents || 0);
  const disc = Math.max(0, item.discount_cents || 0);
  return Math.max(0, qty * price - disc);
}

interface InvoicePreviewProps {
  invoice?: Invoice | null;
  draftItems?: CreateLineItemInput[];
  draftDiscount?: number;
}

export function InvoicePreview({ invoice, draftItems, draftDiscount = 0 }: InvoicePreviewProps) {
  if (!invoice && !draftItems) return null;

  const items = invoice?.items ?? draftItems ?? [];
  const subtotal = items.reduce((sum, item) => {
    if ("line_total_cents" in item) return sum + (item as any).line_total_cents;
    return sum + calcLineTotal(item as CreateLineItemInput);
  }, 0);
  const lineDiscount = items.reduce((sum, item) => {
    if ("discount_cents" in item) return sum + (item as any).discount_cents;
    return sum + ((item as CreateLineItemInput).discount_cents || 0);
  }, 0);
  const discountTotal = lineDiscount + draftDiscount + (invoice?.discount_total_cents ?? 0) - lineDiscount;
  const taxTotal = invoice?.tax_total_cents ?? 0;
  const grandTotal = invoice?.grand_total_cents ?? subtotal + taxTotal;

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm", !invoice && "border-dashed border-amber-300 bg-amber-50/40 dark:bg-amber-950/15")}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Preview</p>
        {!invoice && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            Draft preview
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Discount</span>
          <span>-{formatMoney(discountTotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>VAT / Tax</span>
          <span>{formatMoney(taxTotal)}</span>
        </div>
        <div className="mt-2 border-t border-border pt-2 flex justify-between text-lg font-bold text-foreground">
          <span>Grand Total</span>
          <span>{formatMoney(grandTotal)}</span>
        </div>
      </div>

      {invoice?.invoice_number && (
        <div className="mt-3 rounded-xl bg-muted p-2.5 text-center text-xs text-muted-foreground">
          Invoice number: <span className="font-mono font-bold text-foreground">{invoice.invoice_number}</span>
        </div>
      )}
    </div>
  );
}
