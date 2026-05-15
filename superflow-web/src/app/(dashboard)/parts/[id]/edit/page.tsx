"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api, { getApiError } from "@/lib/api";
import type { Part, Supplier } from "@/types";
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
import { AlertTriangle, ArrowLeft, Loader2, Save } from "lucide-react";
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

const UNIT_OPTIONS = [
  "piece",
  "set",
  "litre",
  "kg",
  "meter",
  "box",
  "pack",
  "pair",
  "roll",
  "tube",
] as const;

export default function EditPartPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("piece");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [minStock, setMinStock] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Suppliers dropdown
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const fetchPart = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get<Part>(`/parts/${id}`);
      setName(data.name || "");
      setPartNumber(data.part_number || "");
      setBrand(data.brand || "");
      setCategory(data.category || "");
      setUnit(data.unit || "piece");
      setCostPrice(data.cost_price != null ? String(data.cost_price) : "");
      setSellingPrice(data.selling_price != null ? String(data.selling_price) : "");
      setBarcode(data.barcode || "");
      setSupplierId(data.supplier_id || "");
      setMinStock(data.min_stock != null ? String(data.min_stock) : "");
      setIsActive(data.is_active ?? true);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      setLoadError(typeof message === "string" ? message : "Failed to load part");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPart();
  }, [fetchPart]);

  useEffect(() => {
    api.get("/suppliers", { params: { limit: 200 } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
        setSuppliers(list);
      })
      .catch(() => {
        // Suppliers are optional
      });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Part name is required");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        part_number: partNumber.trim() || null,
        brand: brand.trim() || null,
        category: category || null,
        unit: unit || null,
        cost_price: costPrice ? parseFloat(costPrice) : null,
        selling_price: sellingPrice ? parseFloat(sellingPrice) : null,
        barcode: barcode.trim() || null,
        supplier_id: supplierId || null,
        min_stock: minStock ? parseInt(minStock, 10) : null,
        is_active: isActive,
      };

      await api.patch(`/parts/${id}`, payload);
      toast.success("Part updated successfully");
      router.push(`/parts/${id}`);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      toast.error(typeof message === "string" ? message : "Failed to update part");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading part details...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4 py-20 text-center">
        <div className="flex items-center justify-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <p className="font-medium">{loadError}</p>
        </div>
        <Button variant="outline" onClick={fetchPart}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to part" onClick={() => router.push(`/parts/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Part</h1>
          <p className="text-sm text-muted-foreground">Update part information and pricing</p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Part Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={submit}>
            {/* Name */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Oil Filter Mercedes C200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="partNumber">Part Number</Label>
                <Input
                  id="partNumber"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. A2721800097"
                />
              </div>
            </div>

            {/* Brand + Category */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Mann-Filter"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => { if (v !== null) setCategory(v === "_none" ? "" : v); }}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unit + Barcode */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="unit">Unit</Label>
                <Select value={unit} onValueChange={(v) => { if (v !== null) setUnit(v); }}>
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or enter barcode"
                />
              </div>
            </div>

            {/* Cost Price + Selling Price */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="costPrice">Cost Price (AED)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sellingPrice">Selling Price (AED)</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Supplier + Min Stock */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="supplier">Supplier</Label>
                <Select value={supplierId} onValueChange={(v) => { if (v !== null) setSupplierId(v); }}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="minStock">Minimum Stock Level</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Label htmlFor="isActive">Active</Label>
              <button
                id="isActive"
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isActive ? "bg-emerald-500" : "bg-muted"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-sm text-muted-foreground">
                {isActive ? "Part is active and available" : "Part is inactive and hidden"}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push(`/parts/${id}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}