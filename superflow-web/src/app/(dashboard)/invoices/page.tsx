"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { hasAnyPermission } from "@/lib/permissions";
import { useInvoiceList } from "@/hooks/use-invoices";
import { InvoiceList } from "@/components/invoices/InvoiceList";
import { RequirePermission } from "@/components/auth/require-permission";
import type { InvoiceListFilters } from "@/lib/invoices";

export default function InvoicesPage() {
  const user = useAuthStore((state) => state.user);
  const canCreate = hasAnyPermission(user, ["invoices:create"]);

  const [filters, setFilters] = useState<InvoiceListFilters>({
    status: "all",
    page: 1,
    limit: 20,
  });

  const { data, loading, error, refetch } = useInvoiceList(filters);

  return (
    <RequirePermission permissions={["invoices:read"]}>
      <div className="space-y-4">
        <div className="rounded-[24px] border border-border bg-card p-3 shadow-sm lg:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Billing</p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">Invoices</h1>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-medium">Could not load invoices</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <InvoiceList
          invoices={data?.data ?? []}
          total={data?.total ?? 0}
          page={data?.page ?? 1}
          limit={data?.limit ?? 20}
          filters={filters}
          onFilterChange={setFilters}
          loading={loading}
          onRefresh={refetch}
          canCreate={canCreate}
        />
      </div>
    </RequirePermission>
  );
}
