"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Part, Supplier, PaginatedResponse } from "@/types";
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
import { ArrowLeft, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface LineItem {
  key: string;
  part_id: string;
  ordered_qty: number;
  unit_cost: number;
  partSearch: string;
  partOptions: Part[];
  searching: boolean;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { key: crypto.randomUUID(), part_id: "", ordered_qty: 1, unit_cost: 0, partSearch: "", partOptions: [], searching: false },
  ]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const { data } = await api.get<PaginatedResponse<Supplier>>("/suppliers", { params: { limit: 200 } });
      setSuppliers(data.data ?? data.items ?? []);
    } catch {
      toast.error("Failed to load suppliers");
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const searchParts = useCallback(async (itemKey: string, query: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === itemKey ? { ...item, searching: true } : item
      )
    );
    try {
      const { data } = await api.get<Part[] | PaginatedResponse<Part>>("/parts/search", {
        params: { q: query },
      });
      const results = Array.isArray(data) ? data : (data as any).data ?? (data as any).items ?? [];
      setItems((prev) =>
        prev.map((item) =>
          item.key === itemKey ? { ...item, partOptions: results, searching: false } : item
        )
      );
    } catch {
      setItems((prev) =>
        prev.map((item) =>
          item.key === itemKey ? { ...item, searching: false } : item
        )
      );
    }
  }, []);

  const updateItem = (key: string, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), part_id: "", ordered_qty: 1, unit_cost: 0, partSearch: "", partOptions: [], searching: false },
    ]);
  };

  const removeItem = (key: string) => {
    if (items.length <= 1) {
      toast.error("At least one line item is required");
      return;
    }
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const runningTotal = items.reduce((sum, item) => sum + item.ordered_qty * item.unit_cost, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }
    const validItems = items.filter((item) => item.part_id && item.ordered_qty > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one line item with a part and quantity");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplier_id: supplierId,
        items: validItems.map((item) => ({
          part_id: item.part_id,
          ordered_qty: item.ordered_qty,
          unit_cost: item.unit_cost || undefined,
        })),
      };
      const { data } = await api.post("/purchase-orders", payload);
      toast.success("Purchase order created");
      router.push(`/purchase-orders/${data.id}`);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      toast.error(typeof message === "string" ? message : "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to purchase orders" onClick={() => router.push("/purchase-orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Purchase Order</h1>
          <p className="text-sm text-muted-foreground">Create a new procurement order with line items</p>
        </div>
      </div>

      <form className="space-y-6" onSubmit={submit}>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="supplier">Supplier *</Label>
                <Select value={supplierId} onValueChange={(v) => { if (v !== null) setSupplierId(v); }}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => {
              const selectedPart = item.partOptions.find((p) => p.id === item.part_id);
              return (
                <div key={item.key} className="rounded-xl border border-border bg-muted/40 p-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_100px_120px_auto]">
                    {/* Part search */}
                    <div className="space-y-1">
                      <Label>Part *</Label>
                      {item.part_id && selectedPart ? (
                        <div className="flex items-center gap-2">
                          <span className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                            {selectedPart.name} {selectedPart.part_number ? `(${selectedPart.part_number})` : ""}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => updateItem(item.key, { part_id: "", partSearch: "", partOptions: [] })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            placeholder="Search parts by name or number..."
                            value={item.partSearch}
                            onChange={(e) => {
                              updateItem(item.key, { partSearch: e.target.value, part_id: "" });
                              if (e.target.value.length >= 2) {
                                searchParts(item.key, e.target.value);
                              }
                            }}
                          />
                          {item.searching && (
                            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                          )}
                          {item.partOptions.length > 0 && !item.part_id && item.partSearch.length >= 2 && (
                            <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                              {item.partOptions.map((part) => (
                                <button
                                  key={part.id}
                                  type="button"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => {
                                    updateItem(item.key, {
                                      part_id: part.id,
                                      partSearch: part.name,
                                      unit_cost: part.cost_price ?? 0,
                                      partOptions: [],
                                    });
                                  }}
                                >
                                  <span className="font-medium text-foreground">{part.name}</span>
                                  {part.part_number && (
                                    <span className="font-mono text-xs text-muted-foreground">{part.part_number}</span>
                                  )}
                                  {part.cost_price != null && (
                                    <span className="ml-auto text-xs text-muted-foreground">{Number(part.cost_price).toFixed(2)}</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1">
                      <Label>Qty *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.ordered_qty}
                        onChange={(e) => updateItem(item.key, { ordered_qty: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </div>

                    {/* Unit cost */}
                    <div className="space-y-1">
                      <Label>Unit Cost</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost || ""}
                        placeholder="0.00"
                        onChange={(e) => updateItem(item.key, { unit_cost: Number(e.target.value) || 0 })}
                      />
                    </div>

                    {/* Remove */}
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(item.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Line total */}
                  <div className="mt-2 text-right text-sm text-muted-foreground">
                    Line total: <span className="font-semibold text-foreground">{(item.ordered_qty * item.unit_cost).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="mr-1 h-4 w-4" /> Add Item
            </Button>

            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <span className="text-sm font-semibold text-muted-foreground">Running Total</span>
              <span className="text-2xl font-bold text-foreground">{runningTotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/purchase-orders")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}