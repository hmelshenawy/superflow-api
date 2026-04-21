"use client";

import { useState } from "react";
import api from "@/lib/api";
import type { EstimateLine, EstimateLineType } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_COLORS: Record<EstimateLineType, string> = {
  labour: "bg-blue-100 text-blue-700",
  part: "bg-green-100 text-green-700",
  sublet: "bg-purple-100 text-purple-700",
};

interface Props {
  jobId: string;
  lines: EstimateLine[];
  onUpdate: () => void;
}

export function EstimateBuilder({ jobId, lines: initialLines, onUpdate }: Props) {
  const [lines, setLines] = useState<EstimateLine[]>(
    initialLines.map((line) => ({
      ...line,
      quantity: Number(line.quantity ?? 0),
      unit_price: Number(line.unit_price ?? 0),
      discount_pct: Number(line.discount_pct ?? 0),
      tax_rate_pct: Number(line.tax_rate_pct ?? 0),
      line_total: Number(line.line_total ?? 0),
      tax_amount: Number(line.tax_amount ?? 0),
    })),
  );
  const [saving, setSaving] = useState(false);

  const recalc = (line: Partial<EstimateLine>) => {
    const qty = Number(line.quantity ?? 1);
    const price = Number(line.unit_price ?? 0);
    const disc = Number(line.discount_pct ?? 0);
    const tax = Number(line.tax_rate_pct ?? 0);
    const sub = qty * price * (1 - disc / 100);
    const taxAmt = sub * (tax / 100);
    return {
      line_total: Math.round(sub * 100) / 100,
      tax_amount: Math.round(taxAmt * 100) / 100,
    };
  };

  const addLine = () => {
    const newLine: EstimateLine = {
      id: crypto.randomUUID(),
      job_id: jobId,
      inspection_response_id: null,
      type: "labour",
      description: "",
      part_number: null,
      quantity: 1,
      unit_price: 0,
      discount_pct: 0,
      tax_rate_pct: 5,
      line_total: 0,
      tax_amount: 0,
      is_recommended: false,
      sort_order: lines.length,
      added_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLines([...lines, newLine]);
  };

  const updateLine = (id: string, patch: Partial<EstimateLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const merged = { ...l, ...patch };
        return { ...merged, ...recalc(merged) };
      }),
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/estimates/job/${jobId}/bulk`, { lines });
      toast.success("Estimate saved");
      onUpdate();
    } catch {
      toast.error("Failed to save estimate");
    } finally {
      setSaving(false);
    }
  };

  const total = lines.reduce((s, l) => s + Number(l.line_total ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead className="w-28">Unit Price</TableHead>
              <TableHead className="w-24">Disc %</TableHead>
              <TableHead className="w-24">Tax %</TableHead>
              <TableHead className="w-28 text-right">Total</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-20 text-center text-slate-400">
                  No lines yet — click Add Line
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <Select
                      value={line.type}
                      onValueChange={(v) => updateLine(line.id, { type: v as EstimateLineType })}
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labour">
                          <span className={TYPE_COLORS.labour}>Labour</span>
                        </SelectItem>
                        <SelectItem value="part">
                          <span className={TYPE_COLORS.part}>Part</span>
                        </SelectItem>
                        <SelectItem value="sublet">
                          <span className={TYPE_COLORS.sublet}>Sublet</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8"
                      value={line.description ?? ""}
                      onChange={(e) => updateLine(line.id, { description: e.target.value })}
                      placeholder="Description…"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-16 text-right"
                      type="number"
                      min={0}
                      step={0.5}
                      value={line.quantity ?? 1}
                      onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-24 text-right"
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unit_price ?? 0}
                      onChange={(e) => updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-20 text-right"
                      type="number"
                      min={0}
                      max={100}
                      value={line.discount_pct ?? 0}
                      onChange={(e) => updateLine(line.id, { discount_pct: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-20 text-right"
                      type="number"
                      min={0}
                      max={100}
                      value={line.tax_rate_pct ?? 5}
                      onChange={(e) => updateLine(line.id, { tax_rate_pct: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    AED {Number(line.line_total ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => removeLine(line.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addLine}>
          <Plus className="mr-1 h-4 w-4" /> Add Line
        </Button>
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-500">
            Total: <span className="text-lg font-bold text-slate-900">AED {total.toFixed(2)}</span>
          </p>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Estimate"}
          </Button>
        </div>
      </div>
    </div>
  );
}