"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Part, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { AlertTriangle, Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_OPTIONS = [
  "Engine",
  "Transmission",
  "Brakes",
  "Suspension",
  "Electrical",
  "Body",
  "Interior",
  "Filters",
  "Fluids",
  "Tyres",
  "Other",
] as const;

export default function PartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (category && category !== "all") params.category = category;
      if (activeFilter === "active") params.is_active = "true";
      else if (activeFilter === "inactive") params.is_active = "false";
      const { data } = await api.get<PaginatedResponse<Part>>("/parts", { params });
      setParts(data.data ?? data.items ?? []);
      setTotal(data.total);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      setLoadError(typeof message === "string" ? message : "Failed to load parts");
      toast.error(typeof message === "string" ? message : "Failed to load parts");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, category, activeFilter]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const totalPages = Math.ceil(total / limit);

  if (loading && !parts.length) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading parts...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Parts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your parts inventory, pricing, and stock levels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchParts} disabled={loading}>
            <RefreshCw className={cn("mr-1 h-4 w-4", loading && "animate-spin")} /> Refresh
          </Button>
          <Link href="/parts/new">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add Part
            </Button>
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {loadError}
          <Button variant="outline" size="sm" className="ml-auto" onClick={fetchParts} disabled={loading}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, part number, or barcode..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Parts table */}
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Part Number</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Available / On Hand</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && parts.length > 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Refreshing...
                </TableCell>
              </TableRow>
            ) : parts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No parts found. Add your first part to get started.
                </TableCell>
              </TableRow>
            ) : (
              parts.map((part) => {
                const inventory = part.inventory ?? [];
                const totalAvailable = inventory.reduce((sum, inv) => sum + (inv.available_quantity ?? 0), 0);
                const totalOnHand = inventory.reduce((sum, inv) => sum + (inv.quantity_on_hand ?? 0), 0);
                const isLowStock = part.min_stock != null && totalAvailable <= (part.min_stock ?? 0);

                return (
                  <TableRow
                    key={part.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => window.location.href = `/parts/${part.id}`}
                  >
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {part.part_number || "—"}
                    </TableCell>
                    <TableCell>{part.brand || "—"}</TableCell>
                    <TableCell>
                      {part.category ? (
                        <Badge variant="secondary">{part.category}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("font-semibold", isLowStock && "text-red-600")}>
                        {totalAvailable}
                      </span>
                      <span className="text-muted-foreground"> / {totalOnHand}</span>
                    </TableCell>
                    <TableCell className="text-right">{part.min_stock ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={part.is_active ? "default" : "secondary"}>
                          {part.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {isLowStock && (
                          <Badge variant="destructive" className="text-[10px]">Low Stock</Badge>
                        )}
                      </div>
                    </TableCell>
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
            Page {page} of {totalPages} — {total} part{total !== 1 ? "s" : ""} total
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