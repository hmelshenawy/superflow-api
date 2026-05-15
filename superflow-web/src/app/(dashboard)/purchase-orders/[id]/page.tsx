"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Supplier, Warehouse, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle2, Loader2, PackagePlus, XCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_BADGE: Record<PurchaseOrderStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300" },
  ordered: { label: "Ordered", tone: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200" },
  partially_received: { label: "Partially Received", tone: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200" },
  received: { label: "Received", tone: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200" },
  cancelled: { label: "Cancelled", tone: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200" },
};

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(withTime
      ? { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }
      : { timeZone: "UTC" }),
  }).format(date);
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Receive dialog state
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveItemId, setReceiveItemId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState<number>(0);
  const [receiveWarehouseId, setReceiveWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
      setOrder(data);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      toast.error(typeof message === "string" ? message : "Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const { data } = await api.get<PaginatedResponse<Warehouse>>("/warehouses", { params: { limit: 100 } });
      setWarehouses(data.data ?? data.items ?? []);
    } catch {
      // Warehouses are optional for receiving
    }
  }, []);

  useEffect(() => {
    fetchOrder();
    fetchWarehouses();
  }, [fetchOrder, fetchWarehouses]);

  const markAsOrdered = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await api.patch(`/purchase-orders/${order.id}/status`, { status: "ordered" });
      toast.success("Purchase order marked as ordered");
      await fetchOrder();
    } catch (err: unknown) {
      const { message } = getApiError(err);
      toast.error(typeof message === "string" ? message : "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await api.patch(`/purchase-orders/${order.id}/cancel`);
      toast.success("Purchase order cancelled");
      await fetchOrder();
    } catch (err: unknown) {
      const { message } = getApiError(err);
      toast.error(typeof message === "string" ? message : "Failed to cancel order");
    } finally {
      setActionLoading(false);
    }
  };

  const openReceiveDialog = (itemId: string) => {
    setReceiveItemId(itemId);
    setReceiveQty(0);
    setReceiveWarehouseId("");
    setReceiveDialogOpen(true);
  };

  const submitReceive = async () => {
    if (!order || !receiveItemId) return;
    if (receiveQty <= 0) {
      toast.error("Received quantity must be greater than 0");
      return;
    }
    setReceiveSubmitting(true);
    try {
      const payload: Record<string, unknown> = { received_qty: receiveQty };
      if (receiveWarehouseId) payload.warehouse_id = receiveWarehouseId;
      await api.post(`/purchase-orders/${order.id}/items/${receiveItemId}/receive`, payload);
      toast.success("Item received");
      setReceiveDialogOpen(false);
      await fetchOrder();
    } catch (err: unknown) {
      const { message } = getApiError(err);
      toast.error(typeof message === "string" ? message : "Failed to receive item");
    } finally {
      setReceiveSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading purchase order...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center text-red-500">Purchase order not found</div>
    );
  }

  const items: PurchaseOrderItem[] = order.purchase_order_items ?? [];
  const meta = STATUS_BADGE[order.status];
  const totalCost = order.total_cost ?? items.reduce((sum, item) => sum + (item.ordered_qty * (item.unit_cost ?? 0)), 0);

  const canMarkOrdered = order.status === "draft";
  const canCancel = order.status === "ordered";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to purchase orders" onClick={() => router.push("/purchase-orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              PO {order.id.slice(0, 8)}
            </h1>
            {meta && (
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", meta.tone)}>
                {meta.label}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(order.created_at, true)}
          </p>
        </div>
        <div className="flex gap-2">
          {canMarkOrdered && (
            <Button
              onClick={markAsOrdered}
              disabled={actionLoading}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {actionLoading ? "Updating..." : "Mark as Ordered"}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              onClick={cancelOrder}
              disabled={actionLoading}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              {actionLoading ? "Cancelling..." : "Cancel Order"}
            </Button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">{order.suppliers?.name || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {meta ? (
              <span className={cn("inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold", meta.tone)}>
                {meta.label}
              </span>
            ) : order.status}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">{Number(totalCost).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">{formatDate(order.created_at)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No items in this purchase order.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead className="text-right">Ordered Qty</TableHead>
                    <TableHead className="text-right">Received Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const canReceive = order.status === "ordered" || order.status === "partially_received";
                    const lineTotal = item.ordered_qty * (item.unit_cost ?? 0);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.parts?.name || "—"}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{item.parts?.part_number || "—"}</TableCell>
                        <TableCell className="text-right">{item.ordered_qty}</TableCell>
                        <TableCell className="text-right">{item.received_qty}</TableCell>
                        <TableCell className="text-right">{item.unit_cost != null ? Number(item.unit_cost).toFixed(2) : "—"}</TableCell>
                        <TableCell className="text-right font-semibold">{lineTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {canReceive && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg"
                              onClick={() => openReceiveDialog(item.id)}
                            >
                              <PackagePlus className="mr-1 h-3.5 w-3.5" /> Receive
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receive dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="receiveQty">Received Quantity *</Label>
              <Input
                id="receiveQty"
                type="number"
                min="1"
                value={receiveQty || ""}
                placeholder="Enter received quantity"
                onChange={(e) => setReceiveQty(Math.max(0, Number(e.target.value)))}
              />
            </div>
            {warehouses.length > 0 && (
              <div className="space-y-1">
                <Label htmlFor="receiveWarehouse">Warehouse</Label>
                <Select value={receiveWarehouseId} onValueChange={(v) => { if (v !== null) setReceiveWarehouseId(v); }}>
                  <SelectTrigger id="receiveWarehouse">
                    <SelectValue placeholder="Select warehouse (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReceiveDialogOpen(false)} disabled={receiveSubmitting}>
                Cancel
              </Button>
              <Button onClick={submitReceive} disabled={receiveSubmitting || receiveQty <= 0}>
                {receiveSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {receiveSubmitting ? "Receiving..." : "Confirm Receipt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}