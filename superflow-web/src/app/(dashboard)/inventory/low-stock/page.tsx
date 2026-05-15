"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { PartsStockNav } from "@/components/parts-stock-nav";

interface LowStockItem {
  id: string;
  part_id: string;
  part_name: string;
  part_number: string | null;
  warehouse_name: string;
  quantity_on_hand: number;
  reserved_quantity: number;
  available_quantity: number;
  min_stock: number | null;
  warehouse_id: string;
}

export default function LowStockPage() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchLowStock = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get<LowStockItem[]>("/inventory/low-stock");
      setItems(data ?? []);
    } catch (err: unknown) {
      const message = getApiError(err).message;
      setLoadError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLowStock(); }, [fetchLowStock]);

  const filtered = search.trim()
    ? items.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.part_name.toLowerCase().includes(q) ||
          (item.part_number && item.part_number.toLowerCase().includes(q)) ||
          item.warehouse_name.toLowerCase().includes(q)
        );
      })
    : items;

  const getStockBadge = (item: LowStockItem) => {
    const available = item.available_quantity ?? 0;
    const min = item.min_stock ?? 0;

    if (available <= 0) {
      return { label: "Out of Stock", className: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" };
    }
    if (available <= min) {
      return { label: "Low Stock", className: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" };
    }
    if (min > 0 && available <= min * 1.5) {
      return { label: "Near Min", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <PartsStockNav />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Low Stock Alert</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""} at or below minimum stock levels
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchLowStock} aria-label="Refresh low stock" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by part name, number, or warehouse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load low stock data</p>
                <p className="mt-1">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLowStock} disabled={loading}>Retry</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part Name</TableHead>
              <TableHead>Part Number</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {search ? "No items match your search." : "All stock levels are healthy. No low stock alerts."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => {
                const badge = getStockBadge(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        href={`/parts/${item.part_id}`}
                        className="font-medium text-foreground hover:text-blue-700 hover:underline"
                      >
                        {item.part_name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.part_number || "—"}
                    </TableCell>
                    <TableCell>{item.warehouse_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity_on_hand}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.reserved_quantity}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {item.available_quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.min_stock ?? "—"}
                    </TableCell>
                    <TableCell>
                      {badge ? (
                        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", badge.className)}>
                          {badge.label}
                        </span>
                      ) : (
                        <Badge variant="secondary">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}