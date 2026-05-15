"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Part, Inventory, StockMovement, JobPart, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, ArrowLeft, Loader2, Pencil, Package, ArrowRightLeft, Wrench } from "lucide-react";
import { toast } from "sonner";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  purchase_in: "Purchase In",
  job_reserve: "Job Reserve",
  job_consume: "Job Consume",
  job_return: "Job Return",
  adjustment_in: "Adjustment In",
  adjustment_out: "Adjustment Out",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
};

const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  purchase_in: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  job_reserve: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  job_consume: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  job_return: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200",
  adjustment_in: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  adjustment_out: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  transfer_in: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
  transfer_out: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
};

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" } : { timeZone: "UTC" }),
  }).format(date);
}

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Stock tab
  const [inventory, setInventory] = useState<Inventory[]>([]);

  // Movements tab
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsLimit] = useState(10);
  const [movementsLoading, setMovementsLoading] = useState(false);

  // Jobs tab
  const [jobParts, setJobParts] = useState<JobPart[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const fetchPart = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get<Part>(`/parts/${id}`);
      setPart(data);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      setLoadError(typeof message === "string" ? message : "Failed to load part");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchInventory = useCallback(async () => {
    try {
      const { data } = await api.get<Inventory[]>(`/inventory/${id}`);
      setInventory(Array.isArray(data) ? data : []);
    } catch {
      // May not have inventory yet
      setInventory([]);
    }
  }, [id]);

  const fetchMovements = useCallback(async () => {
    setMovementsLoading(true);
    try {
      const { data } = await api.get<PaginatedResponse<StockMovement>>("/stock-movements", {
        params: { part_id: id, page: movementsPage, limit: movementsLimit },
      });
      setMovements(data.data ?? data.items ?? []);
      setMovementsTotal(data.total);
    } catch {
      toast.error("Failed to load stock movements");
    } finally {
      setMovementsLoading(false);
    }
  }, [id, movementsPage, movementsLimit]);

  const fetchJobParts = useCallback(async () => {
    setJobsLoading(true);
    try {
      const { data } = await api.get<PaginatedResponse<JobPart>>("/job-parts", {
        params: { part_id: id, limit: 50 },
      });
      setJobParts(data.data ?? data.items ?? []);
    } catch {
      toast.error("Failed to load job parts");
    } finally {
      setJobsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPart();
    fetchInventory();
  }, [fetchPart, fetchInventory]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading part details...
      </div>
    );
  }

  if (loadError || !part) {
    return (
      <div className="space-y-4 py-20 text-center">
        <div className="flex items-center justify-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <p className="font-medium">{loadError || "Part not found"}</p>
        </div>
        <Button variant="outline" onClick={fetchPart}>Retry</Button>
      </div>
    );
  }

  const totalAvailable = (part.inventory ?? inventory).reduce((sum, inv) => sum + (inv.available_quantity ?? 0), 0);
  const totalOnHand = (part.inventory ?? inventory).reduce((sum, inv) => sum + (inv.quantity_on_hand ?? 0), 0);
  const totalReserved = (part.inventory ?? inventory).reduce((sum, inv) => sum + (inv.reserved_quantity ?? 0), 0);
  const isLowStock = part.min_stock != null && totalAvailable <= (part.min_stock ?? 0);
  const movementsTotalPages = Math.ceil(movementsTotal / movementsLimit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to parts" onClick={() => router.push("/parts")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{part.name}</h1>
            <Badge variant={part.is_active ? "default" : "secondary"}>
              {part.is_active ? "Active" : "Inactive"}
            </Badge>
            {isLowStock && <Badge variant="destructive">Low Stock</Badge>}
          </div>
          {part.part_number && (
            <p className="mt-1 text-sm font-mono text-muted-foreground">{part.part_number}</p>
          )}
        </div>
        <Link href={`/parts/${part.id}/edit`}>
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        </Link>
      </div>

      {/* Low stock warning */}
      {isLowStock && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800/40 dark:bg-red-950/15 dark:text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Low stock warning</p>
            <p className="mt-0.5 text-red-700 dark:text-red-300">
              Available quantity ({totalAvailable}) is at or below the minimum stock level ({part.min_stock}).
              Consider restocking this part.
            </p>
          </div>
        </div>
      )}

      {/* Part info card */}
      <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
        <CardHeader className="border-b border-border bg-gradient-to-r from-card to-blue-500/5">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Part Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Name", value: part.name },
              { label: "Part Number", value: part.part_number },
              { label: "Brand", value: part.brand },
              { label: "Category", value: part.category },
              { label: "Unit", value: part.unit },
              { label: "Barcode", value: part.barcode },
              { label: "Cost Price", value: part.cost_price != null ? `AED ${Number(part.cost_price).toFixed(2)}` : "—" },
              { label: "Selling Price", value: part.selling_price != null ? `AED ${Number(part.selling_price).toFixed(2)}` : "—" },
              { label: "Supplier", value: part.suppliers?.name || "—" },
              { label: "Min Stock", value: part.min_stock != null ? String(part.min_stock) : "—" },
              { label: "Total Available", value: String(totalAvailable) },
              { label: "Total On Hand", value: String(totalOnHand) },
            ].map((item, index) => (
              <div key={item.label} className={cn("border-b border-r border-border px-5 py-4", index >= 6 && "")}>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">{item.label}</p>
                <p className={cn("mt-1 text-sm font-semibold text-foreground", item.label === "Total Available" && isLowStock && "text-red-600")}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-2 rounded-2xl border border-border bg-card p-2">
          <TabsTrigger value="stock" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <Package className="mr-2 h-4 w-4" /> Stock
          </TabsTrigger>
          <TabsTrigger value="movements" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Movements
          </TabsTrigger>
          <TabsTrigger value="jobs" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <Wrench className="mr-2 h-4 w-4" /> Jobs
          </TabsTrigger>
        </TabsList>

        {/* Stock tab */}
        <TabsContent value="stock" className="space-y-4">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Inventory by Warehouse</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(part.inventory ?? inventory).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No inventory records found. Stock has not been added to any warehouse yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (part.inventory ?? inventory).map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">
                            {inv.warehouses?.name || inv.warehouse_id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-right">{inv.quantity_on_hand}</TableCell>
                          <TableCell className="text-right text-amber-600">{inv.reserved_quantity}</TableCell>
                          <TableCell className={cn("text-right font-semibold", inv.available_quantity <= 0 && "text-red-600")}>
                            {inv.available_quantity}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Stock Movements</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movementsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading movements...
                        </TableCell>
                      </TableRow>
                    ) : movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No stock movements recorded for this part.
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", MOVEMENT_TYPE_COLORS[mov.type] || "bg-muted text-foreground/80")}>
                              {MOVEMENT_TYPE_LABELS[mov.type] || mov.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                          </TableCell>
                          <TableCell>{mov.warehouses?.name || mov.warehouse_id.slice(0, 8)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {mov.reference_type && mov.reference_id
                              ? `${mov.reference_type}: ${mov.reference_id.slice(0, 8)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {mov.notes || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(mov.created_at, true)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {movementsTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {movementsPage} of {movementsTotalPages} — {movementsTotal} movement{movementsTotal !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={movementsPage <= 1}
                  onClick={() => setMovementsPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={movementsPage >= movementsTotalPages}
                  onClick={() => setMovementsPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Jobs tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Jobs Using This Part</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Warehouse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading...
                        </TableCell>
                      </TableRow>
                    ) : jobParts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No jobs found using this part.
                        </TableCell>
                      </TableRow>
                    ) : (
                      jobParts.map((jp) => {
                        const STATUS_COLORS: Record<string, string> = {
                          reserved: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
                          used: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
                          returned: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
                          cancelled: "bg-muted text-foreground/80",
                        };
                        return (
                          <TableRow key={jp.id}>
                            <TableCell>
                              <Link href={`/jobs/${jp.job_id}`} className="font-semibold text-foreground hover:text-blue-700">
                                View Job
                              </Link>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{jp.quantity}</TableCell>
                            <TableCell>{jp.unit_cost != null ? `AED ${Number(jp.unit_cost).toFixed(2)}` : "—"}</TableCell>
                            <TableCell>{jp.unit_price != null ? `AED ${Number(jp.unit_price).toFixed(2)}` : "—"}</TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", STATUS_COLORS[jp.status] || "bg-muted text-foreground/80")}>
                                {jp.status}
                              </span>
                            </TableCell>
                            <TableCell>{jp.warehouses?.name || jp.warehouse_id.slice(0, 8)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}