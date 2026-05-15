"use client";

import { useCallback, useEffect, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { Warehouse, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Pencil, Plus, RefreshCw, Warehouse as WarehouseIcon } from "lucide-react";
import { toast } from "sonner";
import { PartsStockNav } from "@/components/parts-stock-nav";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get<PaginatedResponse<Warehouse> | Warehouse[]>("/warehouses", { params: { limit: 100 } });
      setWarehouses(Array.isArray(data) ? data : (data.data ?? data.items ?? []));
    } catch (err: unknown) {
      const message = getApiError(err).message;
      setLoadError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const openCreate = () => {
    setEditingWarehouse(null);
    setFormName("");
    setFormLocation("");
    setFormIsDefault(false);
    setDialogOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setFormName(w.name);
    setFormLocation(w.location ?? "");
    setFormIsDefault(w.is_default ?? false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Warehouse name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        location: formLocation.trim() || null,
        is_default: formIsDefault,
      };
      if (editingWarehouse) {
        await api.patch(`/warehouses/${editingWarehouse.id}`, payload);
        toast.success("Warehouse updated");
      } else {
        await api.post("/warehouses", payload);
        toast.success("Warehouse created");
      }
      setDialogOpen(false);
      fetchWarehouses();
    } catch (err: unknown) {
      toast.error(getApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PartsStockNav />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <WarehouseIcon className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchWarehouses} aria-label="Refresh warehouses" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Warehouse
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load warehouses</p>
                <p className="mt-1">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchWarehouses} disabled={loading}>Retry</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading...
                </TableCell>
              </TableRow>
            ) : warehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No warehouses found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              warehouses.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>{w.location || "—"}</TableCell>
                  <TableCell>
                    {w.is_default ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                        Default
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(w)} aria-label={`Edit ${w.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? "Edit Warehouse" : "New Warehouse"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Main Warehouse"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. Building A, Zone 2"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                id="isDefault"
                type="button"
                role="switch"
                aria-checked={formIsDefault}
                onClick={() => setFormIsDefault(!formIsDefault)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${formIsDefault ? "bg-emerald-500" : "bg-muted"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formIsDefault ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <Label htmlFor="isDefault">Default warehouse</Label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? "Saving..." : editingWarehouse ? "Save Changes" : "Create Warehouse"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}