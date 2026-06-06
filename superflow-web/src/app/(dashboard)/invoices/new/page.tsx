"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { useInvoiceMutations } from "@/hooks/use-invoices";
import { RequirePermission } from "@/components/auth/require-permission";
import type { CreateInvoiceInput } from "@/lib/invoices";

export default function NewInvoicePage() {
  const router = useRouter();
  const { create, submitting } = useInvoiceMutations();

  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; make: string | null; model: string | null; plate: string | null }[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [data, setData] = useState<CreateInvoiceInput>({
    branch_id: "",
    items: [
      {
        type: "labour",
        description: "",
        quantity: 1,
        unit_price_cents: 0,
        discount_cents: 0,
        vat_rate: 0,
        vat_applicable: true,
        sort_order: 1,
      },
    ],
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

  const handleSubmit = async () => {
    if (!data.branch_id) {
      toast.error("Please select a branch");
      return;
    }
    if (data.items.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    const result = await create(data);
    if (result) {
      toast.success(`Invoice ${result.invoice_number} created`);
      router.push(`/invoices/${result.id}`);
    }
  };

  return (
    <RequirePermission permissions={["invoices:create"]}>
      <div className="space-y-4">
        <div className="rounded-[24px] border border-border bg-card p-3 shadow-sm lg:p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/invoices")}
              className="rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back to invoices
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">New</p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">Create Invoice</h1>
            </div>
          </div>
        </div>

        {loadingLists ? (
          <div className="py-20 text-center text-muted-foreground">Loading...</div>
        ) : (
          <InvoiceForm
            mode="create"
            branches={branches}
            customers={customers}
            vehicles={vehicles}
            data={data}
            onChange={setData}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/invoices")}
            submitting={submitting}
          />
        )}
      </div>
    </RequirePermission>
  );
}
