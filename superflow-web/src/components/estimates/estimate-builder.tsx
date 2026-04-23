"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { EstimateLine, EstimateLineType } from "@/types";
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
import { AlertTriangle, Plus, Trash2, XCircle } from "lucide-react";
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
  inspection?: any | null;
}

interface LabourRateOption {
  id: string;
  name: string;
  rate_per_hour: number;
  currency: string;
}

interface EstimateDefaults {
  default_tax_rate: number;
  currency: string;
  standard_labour_rate: number;
  standard_labour_rate_name: string;
  labour_rates?: LabourRateOption[];
}

type ConcernSeverity = "amber" | "red" | "other";

interface ConcernGroup {
  key: string;
  title: string;
  detail?: string;
  responseId: string | null;
  severity: ConcernSeverity;
  lines: EstimateLine[];
}

function normalizeLines(lines: EstimateLine[]) {
  return lines.map((line) => ({
    ...line,
    quantity: Number(line.quantity ?? 0),
    unit_price: Number(line.unit_price ?? 0),
    discount_pct: Number(line.discount_pct ?? 0),
    tax_rate_pct: Number(line.tax_rate_pct ?? 0),
    line_total: Number(line.line_total ?? 0),
    tax_amount: Number(line.tax_amount ?? 0),
  }));
}

function resultToSeverity(value?: string | null, urgency?: string | null): ConcernSeverity | null {
  const u = String(urgency ?? "").toLowerCase();
  if (["medium", "amber", "yellow"].includes(u)) return "amber";
  if (["high", "critical", "red"].includes(u)) return "red";

  const v = String(value ?? "").toLowerCase();
  if (["warn", "warning", "medium", "amber", "yellow"].includes(v)) return "amber";
  if (["fail", "bad", "critical", "high", "red", "no"].includes(v)) return "red";
  return null;
}

function severityMeta(severity: ConcernSeverity) {
  if (severity === "red") {
    return {
      tone: "border-rose-200 bg-rose-50",
      badge: "bg-rose-100 text-rose-700",
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Red concern",
    };
  }

  if (severity === "amber") {
    return {
      tone: "border-amber-200 bg-amber-50",
      badge: "bg-amber-100 text-amber-800",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "Yellow concern",
    };
  }

  return {
    tone: "border-slate-200 bg-slate-50",
    badge: "bg-slate-100 text-slate-700",
    icon: null,
    label: "General",
  };
}

export function EstimateBuilder({ jobId, lines: initialLines, onUpdate, inspection }: Props) {
  const [lines, setLines] = useState<EstimateLine[]>(normalizeLines(initialLines));
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState<EstimateDefaults>({
    default_tax_rate: 5,
    currency: "AED",
    standard_labour_rate: 0,
    standard_labour_rate_name: "Standard",
    labour_rates: [],
  });

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

  useEffect(() => {
    setLines(normalizeLines(initialLines));
  }, [initialLines]);

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const { data } = await api.get<EstimateDefaults>("/estimates/defaults");
        setDefaults({
          default_tax_rate: Number(data.default_tax_rate ?? 5),
          currency: data.currency || "AED",
          standard_labour_rate: Number(data.standard_labour_rate ?? 0),
          standard_labour_rate_name: data.standard_labour_rate_name || "Standard",
          labour_rates: (data.labour_rates ?? []).map((rate) => ({
            ...rate,
            rate_per_hour: Number(rate.rate_per_hour ?? 0),
          })),
        });
      } catch {
        // keep safe defaults silently
      }
    };

    fetchDefaults();
  }, []);

  const addLine = (type: EstimateLineType = "labour", inspectionResponseId: string | null = null) => {
    const isLabour = type === "labour";
    const newLine: EstimateLine = {
      id: crypto.randomUUID(),
      job_id: jobId,
      inspection_response_id: inspectionResponseId,
      type,
      description: "",
      part_number: null,
      quantity: 1,
      unit_price: isLabour ? defaults.standard_labour_rate : 0,
      discount_pct: 0,
      tax_rate_pct: defaults.default_tax_rate,
      line_total: 0,
      tax_amount: 0,
      is_recommended: Boolean(inspectionResponseId),
      sort_order: lines.length,
      added_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLines((prev) => [...prev, { ...newLine, ...recalc(newLine) }]);
  };

  const getMatchedLabourRateId = (line: EstimateLine) => {
    if (line.type !== "labour") return "custom";
    const match = (defaults.labour_rates ?? []).find(
      (rate) => Number(rate.rate_per_hour) === Number(line.unit_price ?? 0),
    );
    return match?.id ?? "custom";
  };

  const getLabourRateLabel = (line: EstimateLine) => {
    const matched = (defaults.labour_rates ?? []).find(
      (rate) => rate.id === getMatchedLabourRateId(line),
    );

    if (matched) {
      return `${matched.name} • ${defaults.currency} ${matched.rate_per_hour.toFixed(2)}`;
    }

    return `Custom • ${defaults.currency} ${Number(line.unit_price ?? 0).toFixed(2)}`;
  };

  const updateLine = (id: string, patch: Partial<EstimateLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const merged = { ...l, ...patch };

        if (patch.type === "labour" && l.type !== "labour") {
          merged.unit_price = defaults.standard_labour_rate;
          merged.tax_rate_pct = defaults.default_tax_rate;
        }

        if ((patch.type === "part" || patch.type === "sublet") && l.type !== patch.type) {
          if (Number(l.unit_price ?? 0) === Number(defaults.standard_labour_rate)) {
            merged.unit_price = 0;
          }
          merged.tax_rate_pct = defaults.default_tax_rate;
        }

        if (patch.type === "labour") {
          if (!Number(merged.unit_price ?? 0)) {
            merged.unit_price = defaults.standard_labour_rate;
          }
          if (!Number(merged.tax_rate_pct ?? 0)) {
            merged.tax_rate_pct = defaults.default_tax_rate;
          }
        }

        return { ...merged, ...recalc(merged) };
      }),
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const concernGroups = useMemo(() => {
    const allResponses = inspection?.inspection_responses ?? inspection?.responses ?? [];
    const flaggedResponses = allResponses.filter((response: any) => {
      const severity = resultToSeverity(response?.value, response?.urgency);
      return severity === "amber" || severity === "red";
    });

    const byResponseId = new Map<string, EstimateLine[]>();
    const generalLines: EstimateLine[] = [];

    for (const line of lines) {
      if (line.inspection_response_id) {
        const bucket = byResponseId.get(line.inspection_response_id) ?? [];
        bucket.push(line);
        byResponseId.set(line.inspection_response_id, bucket);
      } else {
        generalLines.push(line);
      }
    }

    const groups: ConcernGroup[] = flaggedResponses.map((response: any) => {
      const severity = resultToSeverity(response?.value, response?.urgency) ?? "amber";
      const detail = [response?.tech_notes, response?.value ? `Result: ${response.value}` : null, response?.urgency && response.urgency !== "none" ? `Urgency: ${response.urgency}` : null]
        .filter(Boolean)
        .join(" • ");
      return {
        key: response.id,
        title: response?.inspection_items?.label || "Inspection concern",
        detail,
        responseId: response.id,
        severity,
        lines: byResponseId.get(response.id) ?? [],
      };
    });

    const linkedResponseIds = new Set(flaggedResponses.map((response: any) => response.id));
    const orphanLinkedLines = lines.filter(
      (line) => line.inspection_response_id && !linkedResponseIds.has(line.inspection_response_id),
    );

    if (generalLines.length > 0 || orphanLinkedLines.length > 0 || groups.length === 0) {
      groups.push({
        key: "general",
        title: "General / Other",
        detail: groups.length === 0 ? "Add manual estimate items here." : "Items not linked to a red or yellow checklist concern.",
        responseId: null,
        severity: "other",
        lines: [...orphanLinkedLines, ...generalLines],
      });
    }

    return groups;
  }, [inspection, lines]);

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
    <div className="space-y-4">
      {concernGroups.map((group) => {
        const meta = severityMeta(group.severity);
        const groupTotal = group.lines.reduce((sum, line) => sum + Number(line.line_total ?? 0), 0);

        return (
          <div key={group.key} className={`rounded-2xl border p-4 ${meta.tone}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">{group.title}</h3>
                  <Badge className={meta.badge}>
                    <span className="mr-1 inline-flex">{meta.icon}</span>
                    {meta.label}
                  </Badge>
                </div>
                {group.detail ? (
                  <p className="mt-1 text-sm text-slate-600">{group.detail}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                  Total: <span className="font-semibold text-slate-950">{defaults.currency} {groupTotal.toFixed(2)}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => addLine("labour", group.responseId)}>
                  <Plus className="mr-1 h-4 w-4" /> Labour
                </Button>
                <Button variant="outline" size="sm" onClick={() => addLine("part", group.responseId)}>
                  <Plus className="mr-1 h-4 w-4" /> Part
                </Button>
                <Button variant="outline" size="sm" onClick={() => addLine("sublet", group.responseId)}>
                  <Plus className="mr-1 h-4 w-4" /> Sublet
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {group.lines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-5 text-sm text-slate-500">
                  No parts or labour added under this concern yet.
                </div>
              ) : (
                group.lines.map((line) => (
                  <div key={line.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="grid gap-3 xl:grid-cols-[110px_minmax(240px,1fr)_72px_170px_72px_72px_130px_44px]">
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Type</p>
                        <Select
                          value={line.type}
                          onValueChange={(v) => updateLine(line.id, { type: v as EstimateLineType })}
                        >
                          <SelectTrigger className="h-9">
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
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Description</p>
                        <Input
                          className="h-9"
                          value={line.description ?? ""}
                          onChange={(e) => updateLine(line.id, { description: e.target.value })}
                          placeholder="Description"
                        />
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Qty</p>
                        <Input
                          className="h-9 text-right"
                          type="number"
                          min={0}
                          step={0.5}
                          value={line.quantity ?? 1}
                          onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                        />
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Unit price</p>
                        {line.type === "labour" && (defaults.labour_rates?.length ?? 0) > 0 ? (
                          <Select
                            value={getMatchedLabourRateId(line)}
                            onValueChange={(value) => {
                              if (value === "custom") return;
                              const matched = defaults.labour_rates?.find((rate) => rate.id === value);
                              if (!matched) return;
                              updateLine(line.id, {
                                unit_price: Number(matched.rate_per_hour ?? 0),
                                tax_rate_pct: defaults.default_tax_rate,
                              });
                            }}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue>{getLabourRateLabel(line)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {(defaults.labour_rates ?? []).map((rate) => (
                                <SelectItem key={rate.id} value={rate.id}>
                                  {rate.name} • {defaults.currency} {rate.rate_per_hour.toFixed(2)}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">
                                Custom • {defaults.currency} {Number(line.unit_price ?? 0).toFixed(2)}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="h-9 text-right"
                            type="number"
                            min={0}
                            step={0.01}
                            value={line.unit_price ?? 0}
                            onChange={(e) => updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })}
                          />
                        )}
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Disc %</p>
                        <Input
                          className="h-9 text-right"
                          type="number"
                          min={0}
                          max={100}
                          value={line.discount_pct ?? 0}
                          onChange={(e) => updateLine(line.id, { discount_pct: parseFloat(e.target.value) || 0 })}
                        />
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Tax %</p>
                        <Input
                          className="h-9 text-right"
                          type="number"
                          min={0}
                          max={100}
                          value={line.tax_rate_pct ?? defaults.default_tax_rate}
                          onChange={(e) => updateLine(line.id, { tax_rate_pct: parseFloat(e.target.value) || 0 })}
                        />
                      </div>

                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Line total</p>
                        <div className="flex h-9 items-center justify-end rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900">
                          {defaults.currency} {Number(line.line_total ?? 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-end justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-400 hover:text-red-600"
                          onClick={() => removeLine(line.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">Grouped by checklist concerns when the inspection item is marked yellow or red.</p>
          <p className="text-xs text-slate-400">Each concern can carry its own parts, labour, and subtotal.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-slate-500">
            Total: <span className="text-lg font-bold text-slate-900">{defaults.currency} {total.toFixed(2)}</span>
          </p>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Estimate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
