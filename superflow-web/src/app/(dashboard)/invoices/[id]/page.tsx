"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { hasAnyPermission } from "@/lib/permissions";
import { useInvoiceDetail } from "@/hooks/use-invoices";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { StatusBadge } from "@/components/invoices/StatusBadge";
import { Button } from "@/components/ui/button";
import { RequirePermission } from "@/components/auth/require-permission";
import {
  ArrowLeft,
  FileDown,
  Send,
  Ban,
  Pencil,
  Printer,
} from "lucide-react";
import type { CreateInvoiceInput } from "@/lib/invoices";

function formatMoney(cents: number) {
  return `AED ${(Math.max(0, cents) / 100).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const canUpdate = hasAnyPermission(user, ["invoices:update"]);
  const canCancel = hasAnyPermission(user, ["invoices:cancel"]);
  const canExport = hasAnyPermission(user, ["invoices:export"]);

  const {
    invoice,
    loading,
    error,
    refetch,
    update,
    issue,
    cancel,
    downloadPdf,
  } = useInvoiceDetail(id);

  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; make: string | null; model: string | null; plate: string | null }[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [draft, setDraft] = useState<CreateInvoiceInput>({
    branch_id: "",
    items: [],
  });

  useEffect(() => {
    (async () => {
      setLoadingLists(true);
      try {
        const [brRes, cuRes, veRes] = await Promise.all([
          api.get<any[]>("/branches"),
          api.get<{ items: any[] }>("/customers", { params: { limit: 500 } }),
          api.get<{ items: any[] }>("/vehicles", { params: { limit: 500 } }),
        ]);
        setBranches((brRes.data ?? []).map((b: any) => ({ id: b.id, name: b.name, code: b.code })));
        setCustomers((cuRes.data?.items ?? cuRes.data ?? []).map((c: any) => ({ id: c.id, name: c.name })));
        setVehicles((veRes.data?.items ?? veRes.data ?? []).map((v: any) => ({ id: v.id, make: v.make, model: v.model, plate: v.plate })));
      } catch {
        toast.error("Failed to load reference data");
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!invoice) return;
    setDraft({
      branch_id: invoice.branch_id || "",
      customer_id: invoice.customer_id || undefined,
      vehicle_id: invoice.vehicle_id || undefined,
      notes: invoice.notes || undefined,
      internal_notes: invoice.internal_notes || undefined,
      discount_total_cents: invoice.discount_total_cents,
      items: (invoice.items ?? []).map((item) => ({
        type: item.type as any,
        description: item.description,
        sku: item.sku || undefined,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        discount_cents: item.discount_cents,
        vat_rate: item.vat_rate,
        vat_applicable: item.vat_applicable,
        sort_order: item.sort_order,
      })),
    });
  }, [invoice]);

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      await update({
        customer_id: draft.customer_id,
        vehicle_id: draft.vehicle_id,
        notes: draft.notes,
        internal_notes: draft.internal_notes,
        discount_total_cents: draft.discount_total_cents,
        items: draft.items,
      });
      toast.success("Invoice updated");
      setEditMode(false);
    } catch {
      toast.error("Failed to update invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssue = async () => {
    if (!confirm("Issue this invoice? It will become read-only.")) return;
    const result = await issue();
    if (result) {
      toast.success(`Invoice ${result.invoice_number} issued`);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this invoice? This cannot be undone.")) return;
    const result = await cancel();
    if (result) {
      toast.success(`Invoice ${result.invoice_number} cancelled`);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadPdf();
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to download PDF");
    }
  };

  if (loading || loadingLists) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  if (error || !invoice) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-500">{error || "Invoice not found"}</p>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={() => router.push("/invoices")}>
          Back to invoices
        </Button>
      </div>
    );
  }

  const isDraft = invoice.status === "draft";
  const isIssued = invoice.status === "issued";
  const isCancelled = invoice.status === "cancelled";

  return (
    <RequirePermission permissions={["invoices:read"]}>
      <div className="space-y-4">
        {/* Header */}
        <div className="rounded-[24px] border border-border bg-card p-3 shadow-sm lg:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/invoices")}
                className="rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
                Back
              </button>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Invoice
                </p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">
                  <span className="font-mono">{invoice.invoice_number}</span>
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={invoice.status} />
              {isDraft && canUpdate && (
                <>
                  {!editMode ? (
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg"
                      onClick={() => setEditMode(true)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg"
                      onClick={() => setEditMode(false)}
                    >
                      Cancel edit
                    </Button>
                  )}
                  <Button
                    className="h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                    onClick={handleIssue}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Issue
                  </Button>
                </>
              )}
              {isIssued && canCancel && (
                <Button
                  variant="outline"
                  className="h-9 rounded-lg border-red-200 text-red-700 hover:bg-red-50"
                  onClick={handleCancel}
                >
                  <Ban className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
              {canExport && (
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={handleDownload}
                >
                  <FileDown className="mr-1.5 h-3.5 w-3.5" />
                  PDF
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Snapshot block for issued / cancelled */}
        {(isIssued || isCancelled) && (
          <div className="rounded-2xl border border-border bg-muted p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Snapshot at issuance
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Customer</p>
                <p className="text-sm font-semibold">{invoice.snapshot_customer_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{invoice.snapshot_customer_email || ""}</p>
                <p className="text-xs text-muted-foreground">{invoice.snapshot_customer_phone || ""}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vehicle</p>
                <p className="text-sm font-semibold">
                  {invoice.snapshot_vehicle_make || ""} {invoice.snapshot_vehicle_model || ""}
                </p>
                <p className="text-xs text-muted-foreground">{invoice.snapshot_vehicle_plate || "—"}</p>
                <p className="text-xs text-muted-foreground">{invoice.snapshot_vehicle_vin || ""}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Branch</p>
                <p className="text-sm font-semibold">{invoice.branch_code_snapshot}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Issued</p>
                <p className="text-sm font-semibold">
                  {invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString("en-GB") : "—"}
                </p>
                {invoice.cancelled_at && (
                  <p className="text-xs text-red-600">
                    Cancelled {new Date(invoice.cancelled_at).toLocaleDateString("en-GB")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form or read-only view */}
        {editMode ? (
          <InvoiceForm
            mode="edit"
            invoice={invoice}
            branches={branches}
            customers={customers}
            vehicles={vehicles}
            data={draft}
            onChange={setDraft}
            onSubmit={handleUpdate}
            onCancel={() => setEditMode(false)}
            submitting={submitting}
          />
        ) : (
          <InvoiceForm
            mode="edit"
            invoice={invoice}
            branches={branches}
            customers={customers}
            vehicles={vehicles}
            data={draft}
            onChange={() => {}}
            onSubmit={() => {}}
            onCancel={() => {}}
            submitting={false}
          />
        )}

        {/* Linked job */}
        {invoice.job_id && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Linked job
            </p>
            <Link
              href={`/jobs/${invoice.job_id}`}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
            >
              #{invoice.job?.job_number || invoice.job_id}
            </Link>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
