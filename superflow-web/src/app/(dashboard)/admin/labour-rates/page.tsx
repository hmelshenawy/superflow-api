"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { LabourRate } from "@/types";
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
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function LabourRatesPage() {
  const [rates, setRates] = useState<LabourRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRate, setFormRate] = useState("");
  const [currency, setCurrency] = useState("AED");

  const fetchRates = async () => {
    setLoading(true);
    try {
      const [ratesRes, defaultsRes] = await Promise.all([
        api.get<LabourRate[]>("/admin/labour-rates"),
        api.get<{ currency: string }>("/estimates/defaults").catch(() => ({ data: { currency: "AED" } })),
      ]);
      setRates(ratesRes.data);
      setCurrency(defaultsRes.data.currency || "AED");
    } catch {
      toast.error("Failed to load labour rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  const save = async (id: string | null) => {
    try {
      const payload = { name: formName, rate_per_hour: parseFloat(formRate) || 0, currency };
      if (id) {
        await api.patch(`/admin/labour-rates/${id}`, payload);
        toast.success("Rate updated");
      } else {
        await api.post("/admin/labour-rates", payload);
        toast.success("Rate created");
      }
      setEditingId(null);
      fetchRates();
    } catch {
      toast.error("Failed to save rate");
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/admin/labour-rates/${id}`);
      toast.success("Rate deleted");
      fetchRates();
    } catch {
      toast.error("Failed to delete rate");
    }
  };

  const startEdit = (rate: LabourRate) => {
    setEditingId(rate.id);
    setFormName(rate.name ?? "");
    setFormRate(String(rate.rate_per_hour ?? ""));
  };

  const startCreate = () => {
    setEditingId("new");
    setFormName("");
    setFormRate("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Labour Rates</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchRates}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={startCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Rate
          </Button>
        </div>
      </div>

      {editingId && (
        <div className="flex items-end gap-3 rounded-lg border p-4">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Name</label>
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Standard Labour" />
          </div>
          <div className="w-40 space-y-1">
            <label className="text-sm font-medium">Rate/hr ({currency})</label>
            <Input type="number" value={formRate} onChange={(e) => setFormRate(e.target.value)} />
          </div>
          <Button onClick={() => save(editingId === "new" ? null : editingId)}>
            {editingId === "new" ? "Create" : "Update"}
          </Button>
          <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rate/hr</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-400">Loading…</TableCell>
              </TableRow>
            ) : (
              rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{currency} {Number(r.rate_per_hour).toFixed(2)}</TableCell>
                  <TableCell>{r.currency || currency}</TableCell>
                  <TableCell>
                    <Badge variant={r.is_active ? "default" : "secondary"}>
                      {r.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
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
    </div>
  );
}