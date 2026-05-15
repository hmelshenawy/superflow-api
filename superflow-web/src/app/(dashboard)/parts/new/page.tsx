"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Loader2, Save } from "lucide-react";
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

export default function NewPartPage() {
  const router = useRouter();
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

  // Suppliers dropdown
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    api.get("/suppliers", { params: { limit: 100 } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
        setSuppliers(list);
      })
      .catch(() => {
        // Suppliers are optional; just leave the dropdown empty
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
        part_number: partNumber.trim() || undefined,
        brand: brand.trim() || undefined,
        category: category || undefined,
        unit: unit || undefined,
        cost_price: costPrice ? parseFloat(costPrice) : undefined,
        selling_price: sellingPrice ? parseFloat(sellingPrice) : undefined,
        barcode: barcode.trim() || undefined,
        supplier_id: supplierId || undefined,
        min_stock: minStock ? parseInt(minStock, 10) : undefined,
      };

      const { data } = await api.post<Part>("/parts", payload);
      toast.success("Part created successfully");
      router.push(`/parts/${data.id}`);
    } catch (err: unknown) {
      const { message } = getApiError(err);
      toast.error(typeof message === "string" ? message : "Failed to create part");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Back to parts" onClick={() => router.push("/parts")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">New Part</h1>
          <p className="text-sm text-muted-foreground">Add a new part to the inventory catalog</p>
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
                <Select value={category} onValueChange={(v) => setCategory(v === "_none" ? "" : (v ?? ""))}>
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
                <Select value={unit} onValueChange={(v) => setUnit(v ?? "piece")}>
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
                <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? "")}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push("/parts")}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? "Creating..." : "Create Part"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}