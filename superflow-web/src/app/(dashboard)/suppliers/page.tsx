"use client";

import { useCallback, useEffect, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { Supplier, PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PartsStockNav } from "@/components/parts-stock-nav";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPaymentTerms, setFormPaymentTerms] = useState("");

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      const { data } = await api.get<PaginatedResponse<Supplier>>("/suppliers", { params });
      setSuppliers(data.data ?? data.items ?? []);
      setTotal(data.total);
    } catch (err: unknown) {
      const message = getApiError(err).message;
      setLoadError(Array.isArray(message) ? message.join(", ") : message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const totalPages = Math.ceil(total / limit);

  const openCreate = () => {
    setEditingSupplier(null);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormPaymentTerms("");
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormName(supplier.name);
    setFormPhone(supplier.phone ?? "");
    setFormEmail(supplier.email ?? "");
    setFormAddress(supplier.address ?? "");
    setFormPaymentTerms(supplier.payment_terms ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        address: formAddress.trim() || null,
        payment_terms: formPaymentTerms.trim() || null,
      };
      if (editingSupplier) {
        await api.patch(`/suppliers/${editingSupplier.id}`, payload);
        toast.success("Supplier updated");
      } else {
        await api.post("/suppliers", payload);
        toast.success("Supplier created");
      }
      setDialogOpen(false);
      fetchSuppliers();
    } catch (err: unknown) {
      toast.error(getApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success("Supplier deleted");
      fetchSuppliers();
    } catch (err: unknown) {
      toast.error(getApiError(err).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PartsStockNav />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchSuppliers} aria-label="Refresh suppliers" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load suppliers</p>
                <p className="mt-1">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSuppliers} disabled={loading}>Retry</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading...
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {search ? "No suppliers match your search." : "No suppliers found yet."}
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.phone || "—"}</TableCell>
                  <TableCell>{s.email || "—"}</TableCell>
                  <TableCell>
                    {s.payment_terms ? (
                      <Badge variant="secondary">{s.payment_terms}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`} disabled={deletingId === s.id}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} aria-label={`Delete ${s.name}`} disabled={deletingId === s.id}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} — {total} supplier{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "New Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="Email address"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Address"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Terms</label>
              <Input
                value={formPaymentTerms}
                onChange={(e) => setFormPaymentTerms(e.target.value)}
                placeholder="e.g. Net 30, COD"
              />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? "Saving..." : editingSupplier ? "Save Changes" : "Create Supplier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}