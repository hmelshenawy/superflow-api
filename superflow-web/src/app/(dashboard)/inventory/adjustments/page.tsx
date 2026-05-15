"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { Part, Warehouse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StockAdjustmentPage() {
  // Form state
  const [partSearch, setPartSearch] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [selectedPartLabel, setSelectedPartLabel] = useState("");
  const [partResults, setPartResults] = useState<Part[]>([]);
  const [partSearchLoading, setPartSearchLoading] = useState(false);
  const [showPartDropdown, setShowPartDropdown] = useState(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"adjustment_in" | "adjustment_out">("adjustment_in");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch warehouses on mount
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const { data } = await api.get<Warehouse[]>("/warehouses");
        setWarehouses(data ?? []);
      } catch (err: unknown) {
        setLoadError(getApiError(err).message);
      }
    };
    fetchWarehouses();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPartDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Part search with debounce
  const handlePartSearch = useCallback((query: string) => {
    setPartSearch(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      setPartResults([]);
      setShowPartDropdown(false);
      return;
    }
    setPartSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data } = await api.get<Part[]>("/parts/search", { params: { q: query } });
        setPartResults(data ?? []);
        setShowPartDropdown(true);
      } catch {
        setPartResults([]);
      } finally {
        setPartSearchLoading(false);
      }
    }, 300);
  }, []);

  const selectPart = (part: Part) => {
    setSelectedPartId(part.id);
    setSelectedPartLabel(`${part.name}${part.part_number ? ` (${part.part_number})` : ""}`);
    setPartSearch(part.name);
    setShowPartDropdown(false);
  };

  const resetForm = () => {
    setPartSearch("");
    setSelectedPartId("");
    setSelectedPartLabel("");
    setPartResults([]);
    setShowPartDropdown(false);
    setSelectedWarehouseId("");
    setAdjustmentType("adjustment_in");
    setQuantity("");
    setUnitCost("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!selectedPartId) {
      toast.error("Please select a part");
      return;
    }
    if (!selectedWarehouseId) {
      toast.error("Please select a warehouse");
      return;
    }
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/inventory/adjust", {
        part_id: selectedPartId,
        warehouse_id: selectedWarehouseId,
        type: adjustmentType,
        quantity: qty,
        unit_cost: unitCost ? parseFloat(unitCost) : undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Stock adjustment recorded successfully");
      resetForm();
    } catch (err: unknown) {
      toast.error(getApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Stock Adjustment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add or remove stock from a warehouse
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Could not load warehouses</p>
              <p className="mt-1">{loadError}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg space-y-4 rounded-lg border bg-card p-6">
        {/* Part search */}
        <div className="space-y-2" ref={dropdownRef}>
          <Label>Part *</Label>
          <div className="relative">
            <Input
              placeholder="Search by part name or number..."
              value={selectedPartId ? selectedPartLabel : partSearch}
              onChange={(e) => {
                if (selectedPartId) {
                  setSelectedPartId("");
                  setSelectedPartLabel("");
                }
                handlePartSearch(e.target.value);
              }}
              onFocus={() => {
                if (partResults.length > 0) setShowPartDropdown(true);
              }}
            />
            {partSearchLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {showPartDropdown && partResults.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-card shadow-lg">
                {partResults.map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => selectPart(part)}
                  >
                    <span className="font-medium">{part.name}</span>
                    {part.part_number && (
                      <span className="text-muted-foreground">({part.part_number})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Warehouse */}
        <div className="space-y-2">
          <Label>Warehouse *</Label>
          <Select value={selectedWarehouseId} onValueChange={(v) => setSelectedWarehouseId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Adjustment type */}
        <div className="space-y-2">
          <Label>Type *</Label>
          <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as "adjustment_in" | "adjustment_out")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="adjustment_in">Add Stock</SelectItem>
              <SelectItem value="adjustment_out">Remove Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label>Quantity *</Label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="1"
          />
        </div>

        {/* Unit Cost */}
        <div className="space-y-2">
          <Label>Unit Cost (optional)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for adjustment..."
            rows={3}
          />
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Submit Adjustment"
          )}
        </Button>
      </div>
    </div>
  );
}