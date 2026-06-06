"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LineItemEditor } from "./LineItemEditor";
import { InvoicePreview } from "./InvoicePreview";
import type { CreateInvoiceInput, UpdateInvoiceInput, Invoice } from "@/lib/invoices";

interface InvoiceFormProps {
  mode: "create" | "edit";
  invoice?: Invoice | null;
  branches: { id: string; name: string; code: string }[];
  customers: { id: string; name: string }[];
  vehicles: { id: string; make: string | null; model: string | null; plate: string | null }[];
  data: CreateInvoiceInput;
  onChange: (data: CreateInvoiceInput) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
}

export function InvoiceForm({
  mode,
  invoice,
  branches,
  customers,
  vehicles,
  data,
  onChange,
  onSubmit,
  onCancel,
  submitting,
}: InvoiceFormProps) {
  const isReadOnly = invoice?.status === "issued" || invoice?.status === "cancelled";

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === data.customer_id), [customers, data.customer_id]);
  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === data.vehicle_id), [vehicles, data.vehicle_id]);

  const patch = (partial: Partial<CreateInvoiceInput>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-6">
      {/* Header / Invoice Number */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {mode === "create" ? "New Invoice" : "Edit Invoice"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {invoice?.invoice_number ? (
                <span className="font-mono text-lg font-bold text-foreground">{invoice.invoice_number}</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">Auto-generated on save</span>
              )}
            </div>
          </div>
          {invoice?.status && (
            <span className="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize">
              {invoice.status}
            </span>
          )}
        </div>
      </div>

      {/* Branch / Customer / Vehicle selectors */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Branch</Label>
          <Select
            value={data.branch_id || ""}
            onValueChange={(v) => patch({ branch_id: v || "" })}
            disabled={isReadOnly || mode === "edit"}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Select branch..." />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer</Label>
          <Select
            value={data.customer_id || ""}
            onValueChange={(v) => patch({ customer_id: v || undefined })}
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Select customer...">{selectedCustomer?.name || "Select customer..."}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</Label>
          <Select
            value={data.vehicle_id || ""}
            onValueChange={(v) => patch({ vehicle_id: v || undefined })}
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Select vehicle...">
                {selectedVehicle ? `${selectedVehicle.make || ""} ${selectedVehicle.model || ""} ${selectedVehicle.plate || ""}`.trim() || "Select vehicle..." : "Select vehicle..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {`${v.make || ""} ${v.model || ""}`.trim() || "Unknown"} {v.plate || ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notes (customer-facing)</Label>
          <Textarea
            value={data.notes || ""}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Notes that appear on the invoice..."
            className="min-h-[80px] rounded-xl"
            disabled={isReadOnly}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Internal notes</Label>
          <Textarea
            value={data.internal_notes || ""}
            onChange={(e) => patch({ internal_notes: e.target.value })}
            placeholder="Internal notes visible only to workshop staff..."
            className="min-h-[80px] rounded-xl"
            disabled={isReadOnly}
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Line Items</p>
        <LineItemEditor
          items={data.items}
          onChange={(items) => patch({ items })}
          readOnly={isReadOnly}
        />
      </div>

      {/* Preview + Actions */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div />
        <div className="space-y-3">
          <InvoicePreview draftItems={data.items} draftDiscount={data.discount_total_cents || 0} />

          {!isReadOnly && (
            <div className="flex gap-2">
              <Button
                className="h-11 flex-1 rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                onClick={onSubmit}
                disabled={submitting || data.items.length === 0 || !data.branch_id}
              >
                {submitting ? "Saving..." : mode === "create" ? "Create Invoice" : "Save Changes"}
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
