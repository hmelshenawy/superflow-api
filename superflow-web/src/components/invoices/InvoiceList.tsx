"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { Search, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Invoice, InvoiceListFilters } from "@/lib/invoices";

function formatMoney(cents: number) {
  return `AED ${(Math.max(0, cents) / 100).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface InvoiceListProps {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  filters: InvoiceListFilters;
  onFilterChange: (filters: InvoiceListFilters) => void;
  loading: boolean;
  onRefresh: () => void;
  canCreate: boolean;
}

export function InvoiceList({
  invoices,
  total,
  page,
  limit,
  filters,
  onFilterChange,
  loading,
  onRefresh,
  canCreate,
}: InvoiceListProps) {
  const totalPages = Math.ceil(total / limit);

  const setFilter = (patch: Partial<InvoiceListFilters>) => {
    onFilterChange({ ...filters, ...patch, page: 1 });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-border bg-card p-3 shadow-sm lg:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoice number, customer, vehicle..."
                className="h-9 rounded-lg border-border bg-card pl-8 text-[13px]"
                value={filters.search || ""}
                onChange={(e) => setFilter({ search: e.target.value })}
              />
            </div>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilter({ status: v as any })}>
              <SelectTrigger className="h-9 w-full rounded-lg border-border text-[13px] md:w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 rounded-lg text-[13px]" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />Refresh
            </Button>
            {canCreate && (
              <Link href="/invoices/new">
                <Button className="h-9 rounded-lg bg-slate-950 px-3 text-[13px] text-white hover:bg-slate-800">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />New invoice
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-[24px] border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No invoices found</TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id} className="bg-card">
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="font-mono font-semibold text-foreground hover:text-blue-700">
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(inv.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell>{inv.snapshot_customer_name || inv.customer?.name || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {inv.snapshot_vehicle_plate || inv.vehicle?.plate || "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-right font-semibold">{formatMoney(inv.grand_total_cents)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/invoices/${inv.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl" disabled={page <= 1} onClick={() => onFilterChange({ ...filters, page: page - 1 })} >Previous</Button>
              <Button variant="outline" className="rounded-xl" disabled={page >= totalPages} onClick={() => onFilterChange({ ...filters, page: page + 1 })} >Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
