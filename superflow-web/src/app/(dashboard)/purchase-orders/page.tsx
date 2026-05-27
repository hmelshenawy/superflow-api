"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PurchaseOrder, PurchaseOrderStatus, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { PartsStockNav } from "@/components/parts-stock-nav";

const STATUS_OPTIONS: { value: PurchaseOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "ordered", label: "Ordered" },
  { value: "partially_received", label: "Partially Received" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<PurchaseOrderStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300" },
  ordered: { label: "Ordered", tone: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200" },
  partially_received: { label: "Partially Received", tone: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200" },
  received: { label: "Received", tone: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200" },
  cancelled: { label: "Cancelled", tone: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200" },
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (status && status !== "all") params.status = status;
      if (search) params.search = search;
      const { data } = await api.get<PaginatedResponse<PurchaseOrder>>("/purchase-orders", { params });
      setOrders(data.data ?? data.items ?? []);
      setTotal(data.total);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      setLoadError(typeof message === "string" ? message : "Failed to load purchase orders");
      toast.error(typeof message === "string" ? message : "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = Math.ceil(total / limit);

  if (loading && !orders.length) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading purchase orders...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PartsStockNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Purchase Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage procurement orders, track deliveries, and receive parts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={cn("mr-1 h-4 w-4", loading && "animate-spin")} /> Refresh
          </Button>
          <Link href="/purchase-orders/new">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Create PO
            </Button>
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchOrders} disabled={loading}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by supplier or PO ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO ID</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && orders.length > 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Refreshing...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No purchase orders found. Create your first PO to get started.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const meta = STATUS_BADGE[order.status];
                const itemsCount = order._count?.purchase_order_items ?? order.purchase_order_items?.length ?? 0;
                return (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => window.location.href = `/purchase-orders/${order.id}`}
                  >
                    <TableCell className="font-mono font-medium">
                      {order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{order.suppliers?.name || "—"}</TableCell>
                    <TableCell>
                      {meta ? (
                        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", meta.tone)}>
                          {meta.label}
                        </span>
                      ) : order.status}
                    </TableCell>
                    <TableCell className="text-right">{itemsCount}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {order.total_cost != null ? `${Number(order.total_cost).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(order.created_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} — {total} order{total !== 1 ? "s" : ""} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}