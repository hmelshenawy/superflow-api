"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { EstimateLine, EstimateLineType, JobAuthorisationDecision } from "@/types";
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
import { AlertTriangle, ChevronDown, ChevronRight, Plus, Trash2, XCircle } from "lucide-react";
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
  decisionByLine?: Record<string, JobAuthorisationDecision>;
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
  quoteGroupId: string | null;
  severity: ConcernSeverity;
  lines: EstimateLine[];
}

interface GroupDecisionSummary {
  decision: "approved" | "declined" | "deferred" | "mixed" | "pending";
  comment: string | null;
  decidedAt: string | null;
}

function normalizeLines(lines: EstimateLine[]) {
  return lines.map((line) => ({
    ...line,
    quote_group_id: line.quote_group_id ?? null,
    quote_group_title: line.quote_group_title ?? null,
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
  if (severity === "red") return { tone: "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40", badge: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200", icon: <XCircle className="h-3.5 w-3.5" />, label: "Red" };
  if (severity === "amber") return { tone: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40", badge: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200", icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Yellow" };
  return { tone: "border-border bg-muted", badge: "bg-muted text-foreground/80", icon: null, label: "General" };
}

function summarizeGroupDecision(lines: EstimateLine[], decisionByLine: Record<string, JobAuthorisationDecision>): GroupDecisionSummary | null {
  const decisions = lines
    .map((line) => decisionByLine[line.id])
    .filter(Boolean) as JobAuthorisationDecision[];

  if (!decisions.length) return { decision: "pending", comment: null, decidedAt: null };

  const uniqueDecisions = Array.from(new Set(decisions.map((item) => item.decision)));
  const comment = decisions.find((item) => item.customer_comment)?.customer_comment ?? null;
  const decidedAt = decisions
    .map((item) => item.decided_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  if (uniqueDecisions.length === 1) {
    return { decision: uniqueDecisions[0], comment, decidedAt };
  }

  return { decision: "mixed", comment, decidedAt };
}

export function EstimateBuilder({ jobId, lines: initialLines, onUpdate, inspection, decisionByLine = {} }: Props) {
  const [lines, setLines] = useState<EstimateLine[]>(normalizeLines(initialLines));
  const [saving, setSaving] = useState(false);
  const [editingGroupTitle, setEditingGroupTitle] = useState<string | null>(null);
  const [draftGroupTitle, setDraftGroupTitle] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`estimate-collapsed-${jobId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [defaults, setDefaults] = useState<EstimateDefaults>({
    default_tax_rate: 5, currency: "AED", standard_labour_rate: 0, standard_labour_rate_name: "Standard", labour_rates: [],
  });

  const recalc = (line: Partial<EstimateLine>) => {
    const qty = Number(line.quantity ?? 1);
    const price = Number(line.unit_price ?? 0);
    const disc = Number(line.discount_pct ?? 0);
    const tax = Number(line.tax_rate_pct ?? 0);
    const sub = qty * price * (1 - disc / 100);
    const taxAmt = sub * (tax / 100);
    return { line_total: Math.round(sub * 100) / 100, tax_amount: Math.round(taxAmt * 100) / 100 };
  };

  useEffect(() => { setLines(normalizeLines(initialLines)); }, [initialLines]);

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const { data } = await api.get<EstimateDefaults>("/estimates/defaults");
        setDefaults({
          default_tax_rate: Number(data.default_tax_rate ?? 5),
          currency: data.currency || "AED",
          standard_labour_rate: Number(data.standard_labour_rate ?? 0),
          standard_labour_rate_name: data.standard_labour_rate_name || "Standard",
          labour_rates: (data.labour_rates ?? []).map((r) => ({ ...r, rate_per_hour: Number(r.rate_per_hour ?? 0) })),
        });
      } catch {}
    };
    fetchDefaults();
  }, []);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); try { localStorage.setItem(`estimate-collapsed-${jobId}`, JSON.stringify([...next])); } catch {} return next; });
  };

  const addLine = (type: EstimateLineType = "labour", opts?: { inspectionResponseId?: string | null; quoteGroupId?: string | null; quoteGroupTitle?: string | null }) => {
    const isLabour = type === "labour";
    const newLine: EstimateLine = {
      id: crypto.randomUUID(), job_id: jobId,
      inspection_response_id: opts?.inspectionResponseId ?? null,
      quote_group_id: opts?.quoteGroupId ?? null,
      quote_group_title: opts?.quoteGroupTitle ?? null,
      type, description: "", part_number: null, quantity: 1,
      unit_price: isLabour ? defaults.standard_labour_rate : 0,
      discount_pct: 0, tax_rate_pct: defaults.default_tax_rate,
      line_total: 0, tax_amount: 0,
      is_recommended: Boolean(opts?.inspectionResponseId),
      sort_order: lines.length, added_by: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    setLines((prev) => [...prev, { ...newLine, ...recalc(newLine) }]);
  };

  const getMatchedLabourRateId = (line: EstimateLine) => {
    if (line.type !== "labour") return "custom";
    return (defaults.labour_rates ?? []).find((r) => Number(r.rate_per_hour) === Number(line.unit_price ?? 0))?.id ?? "custom";
  };

  const getLabourRateLabel = (line: EstimateLine) => {
    const m = (defaults.labour_rates ?? []).find((r) => r.id === getMatchedLabourRateId(line));
    return m ? `${m.name} • ${defaults.currency} ${m.rate_per_hour.toFixed(2)}` : `Custom • ${defaults.currency} ${Number(line.unit_price ?? 0).toFixed(2)}`;
  };

  const updateLine = (id: string, patch: Partial<EstimateLine>) => {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const merged = { ...l, ...patch };
      if (patch.type === "labour" && l.type !== "labour") { merged.unit_price = defaults.standard_labour_rate; merged.tax_rate_pct = defaults.default_tax_rate; }
      if ((patch.type === "part" || patch.type === "sublet") && l.type !== patch.type) { if (Number(l.unit_price ?? 0) === Number(defaults.standard_labour_rate)) merged.unit_price = 0; merged.tax_rate_pct = defaults.default_tax_rate; }
      if (patch.type === "labour") { if (!Number(merged.unit_price ?? 0)) merged.unit_price = defaults.standard_labour_rate; if (!Number(merged.tax_rate_pct ?? 0)) merged.tax_rate_pct = defaults.default_tax_rate; }
      return { ...merged, ...recalc(merged) };
    }));
  };

  const removeLine = (id: string) => { setLines((prev) => prev.filter((l) => l.id !== id)); };

  const createCustomGroup = () => {
    const groupId = crypto.randomUUID();
    const newLine: EstimateLine = {
      id: crypto.randomUUID(), job_id: jobId,
      inspection_response_id: null, quote_group_id: groupId, quote_group_title: "New group",
      type: "labour", description: "", part_number: null, quantity: 1,
      unit_price: defaults.standard_labour_rate, discount_pct: 0,
      tax_rate_pct: defaults.default_tax_rate, line_total: 0, tax_amount: 0,
      is_recommended: false, sort_order: lines.length, added_by: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    setLines((prev) => [...prev, { ...newLine, ...recalc(newLine) }]);
  };

  const renameCustomGroup = (groupId: string, title: string) => {
    setLines((prev) => prev.map((l) => l.quote_group_id === groupId ? { ...l, quote_group_title: title } : l));
  };

  const deleteCustomGroup = (groupId: string) => {
    setLines((prev) => prev.filter((l) => l.quote_group_id !== groupId));
  };

  const concernGroups = useMemo(() => {
    const allResponses = inspection?.inspection_responses ?? inspection?.responses ?? [];
    const flaggedResponses = allResponses.filter((r: any) => { const s = resultToSeverity(r?.value, r?.urgency); return s === "amber" || s === "red"; });

    const byResponseId = new Map<string, EstimateLine[]>();
    const byQuoteGroupId = new Map<string, EstimateLine[]>();
    const generalLines: EstimateLine[] = [];

    for (const line of lines) {
      if (line.inspection_response_id) {
        const b = byResponseId.get(line.inspection_response_id) ?? []; b.push(line); byResponseId.set(line.inspection_response_id, b);
      } else if (line.quote_group_id) {
        const b = byQuoteGroupId.get(line.quote_group_id) ?? []; b.push(line); byQuoteGroupId.set(line.quote_group_id, b);
      } else {
        generalLines.push(line);
      }
    }

    const groups: ConcernGroup[] = flaggedResponses.map((r: any) => {
      const severity = resultToSeverity(r?.value, r?.urgency) ?? "amber";
      const detail = [r?.tech_notes, r?.value ? `Result: ${r.value}` : null, r?.urgency && r.urgency !== "none" ? `Urgency: ${r.urgency}` : null].filter(Boolean).join(" • ");
      return { key: r.id, title: r?.inspection_items?.label || "Inspection concern", detail, responseId: r.id, quoteGroupId: null, severity, lines: byResponseId.get(r.id) ?? [] };
    });

    const seenGroupIds = new Set<string>();
    for (const line of lines) {
      if (line.quote_group_id && !seenGroupIds.has(line.quote_group_id)) {
        seenGroupIds.add(line.quote_group_id);
        groups.push({
          key: line.quote_group_id,
          title: line.quote_group_title || "Custom group",
          responseId: null,
          quoteGroupId: line.quote_group_id,
          severity: "other",
          lines: byQuoteGroupId.get(line.quote_group_id) ?? [],
        });
      }
    }

    const linkedResponseIds = new Set(flaggedResponses.map((r: any) => r.id));
    const orphanLinkedLines = lines.filter((l) => l.inspection_response_id && !linkedResponseIds.has(l.inspection_response_id)).map((l) => ({ ...l, inspection_response_id: null }));

    if (generalLines.length > 0 || orphanLinkedLines.length > 0 || groups.length === 0) {
      groups.push({
        key: "general", title: "General / Other",
        detail: groups.length === 0 ? "Add manual estimate items here." : "Items not linked to a checklist concern.",
        responseId: null, quoteGroupId: null, severity: "other",
        lines: [...orphanLinkedLines, ...generalLines],
      });
    }

    // Sort: red → amber → custom (other with quoteGroupId) → general
    const severityOrder: Record<string, number> = { red: 0, amber: 1 };
    groups.sort((a, b) => {
      const aOrder = a.key === "general" ? 3 : a.quoteGroupId ? 2 : (severityOrder[a.severity] ?? 1);
      const bOrder = b.key === "general" ? 3 : b.quoteGroupId ? 2 : (severityOrder[b.severity] ?? 1);
      return aOrder - bOrder;
    });

    return groups;
  }, [inspection, lines]);

  const save = async () => {
    setSaving(true);
    try {
      const payloadLines = lines.map((line) => ({
        id: line.id,
        job_id: line.job_id,
        type: line.type,
        description: line.description ?? "",
        part_number: line.part_number ?? undefined,
        quantity: Number(line.quantity ?? 0),
        unit_price: Number(line.unit_price ?? 0),
        discount_pct: Number(line.discount_pct ?? 0),
        tax_rate_pct: Number(line.tax_rate_pct ?? 0),
        is_recommended: Boolean(line.is_recommended),
        inspection_response_id: line.inspection_response_id ?? undefined,
        quote_group_id: line.quote_group_id ?? undefined,
        quote_group_title: line.quote_group_title ?? undefined,
      }));

      await api.put(`/estimates/job/${jobId}/bulk`, { lines: payloadLines });
      toast.success("Estimate saved");
      onUpdate();
    } catch {
      toast.error("Failed to save estimate");
    }
    finally { setSaving(false); }
  };

  const total = lines.reduce((s, l) => s + Number(l.line_total ?? 0), 0);

  return (
    <div className="space-y-4">
      {concernGroups.map((group) => {
        const meta = severityMeta(group.severity);
        const groupTotal = group.lines.reduce((sum, l) => sum + Number(l.line_total ?? 0), 0);
        const isCustom = Boolean(group.quoteGroupId);
        const isCollapsed = collapsedGroups.has(group.key);
        const groupDecision = summarizeGroupDecision(group.lines, decisionByLine);
        const groupDecisionTone = groupDecision?.decision === "approved"
          ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200"
          : groupDecision?.decision === "declined"
            ? "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200"
            : groupDecision?.decision === "deferred"
              ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
              : groupDecision?.decision === "pending"
                ? "bg-muted text-foreground/80"
                : "bg-muted text-foreground/80";
        const groupDecisionLabel = groupDecision?.decision === "approved"
          ? "Approved"
          : groupDecision?.decision === "declined"
            ? "Rejected"
            : groupDecision?.decision === "deferred"
              ? "Deferred"
              : groupDecision?.decision === "pending"
                ? "Pending"
                : groupDecision?.decision === "mixed"
                  ? "Mixed"
                  : null;

        return (
          <div key={group.key} className={`rounded-2xl border p-4 ${meta.tone}`}>
            {/* Header — always visible */}
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!isCustom || editingGroupTitle !== group.quoteGroupId) toggleGroup(group.key); } }} className="cursor-pointer select-none" onClick={() => { if (!isCustom || editingGroupTitle !== group.quoteGroupId) toggleGroup(group.key); }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isCollapsed ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  {isCustom ? (
                    editingGroupTitle === group.quoteGroupId ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          className="h-8 w-[200px] bg-card font-semibold text-sm"
                          value={draftGroupTitle}
                          onChange={(e) => setDraftGroupTitle(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { renameCustomGroup(group.quoteGroupId as string, draftGroupTitle); setEditingGroupTitle(null); }
                            if (e.key === "Escape") { setEditingGroupTitle(null); }
                          }}
                        />
                        <Button size="sm" className="h-7 rounded-lg bg-slate-950 px-2 text-xs text-white hover:bg-slate-800" onClick={() => { renameCustomGroup(group.quoteGroupId as string, draftGroupTitle); setEditingGroupTitle(null); }}>Save</Button>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={() => setEditingGroupTitle(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <h3 className="cursor-pointer rounded px-1 text-sm font-semibold text-foreground hover:bg-muted" onClick={(e) => { e.stopPropagation(); setDraftGroupTitle(group.title); setEditingGroupTitle(group.quoteGroupId); }}>
                        {group.title}
                      </h3>
                    )
                  ) : (
                    <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                  )}
                  <Badge className={meta.badge}>
                    <span className="mr-1 inline-flex">{meta.icon}</span>
                    {isCustom ? "Custom" : meta.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {groupDecisionLabel ? <Badge className={groupDecisionTone}>{groupDecisionLabel}</Badge> : null}
                  <div className="rounded-xl bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
                    Total: <span className="font-semibold text-foreground">{defaults.currency} {groupTotal.toFixed(2)}</span>
                  </div>
                  {!isCollapsed && (
                  <>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); addLine("labour", { inspectionResponseId: group.responseId, quoteGroupId: group.quoteGroupId, quoteGroupTitle: group.title }); }}>
                      <Plus className="mr-1 h-4 w-4" /> Labour
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); addLine("part", { inspectionResponseId: group.responseId, quoteGroupId: group.quoteGroupId, quoteGroupTitle: group.title }); }}>
                      <Plus className="mr-1 h-4 w-4" /> Part
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); addLine("sublet", { inspectionResponseId: group.responseId, quoteGroupId: group.quoteGroupId, quoteGroupTitle: group.title }); }}>
                      <Plus className="mr-1 h-4 w-4" /> Sublet
                    </Button>
                    {isCustom ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" aria-label="Delete group" onClick={(e) => { e.stopPropagation(); deleteCustomGroup(group.quoteGroupId as string); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : group.key === "general" ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" aria-label="Clear group" onClick={(e) => { e.stopPropagation(); setLines((prev) => prev.filter((l) => l.inspection_response_id || l.quote_group_id)); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </>
                  )}
                </div>
              </div>
              {(group.detail && !isCustom) ? <p className="mt-1.5 text-xs text-muted-foreground">{group.detail}</p> : null}
              {groupDecision ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  {groupDecision.decidedAt ? <span>Reply: {new Date(groupDecision.decidedAt).toLocaleString("en-GB")}</span> : null}
                  {groupDecision.comment ? <p className="mt-1">Comment: {groupDecision.comment}</p> : null}
                </div>
              ) : null}
            </div>

            {/* Lines — collapsible */}
            {!isCollapsed && (
            <div className="mt-4 space-y-3">
              {group.lines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white/70 px-4 py-5 text-sm text-muted-foreground">
                  No parts or labour added yet.
                </div>
              ) : (
                [...group.lines].sort((a, b) => {
                  const order: Record<EstimateLineType, number> = { labour: 0, part: 1, sublet: 2 };
                  return (order[a.type] ?? 3) - (order[b.type] ?? 3);
                }).map((line) => {
                  return (
                  <div key={line.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <div className="grid gap-3 xl:grid-cols-[110px_minmax(240px,1fr)_72px_170px_72px_72px_130px_44px]">
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Type</p>
                        <Select value={line.type} onValueChange={(v) => updateLine(line.id, { type: v as EstimateLineType })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="labour"><span className={TYPE_COLORS.labour}>Labour</span></SelectItem>
                            <SelectItem value="part"><span className={TYPE_COLORS.part}>Part</span></SelectItem>
                            <SelectItem value="sublet"><span className={TYPE_COLORS.sublet}>Sublet</span></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                        <Input className="h-9" value={line.description ?? ""} onChange={(e) => updateLine(line.id, { description: e.target.value })} placeholder="Description" />
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Qty</p>
                        <Input className="h-9 text-right" type="number" min={0} step={0.5} value={line.quantity ?? 1} onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Unit price</p>
                        {line.type === "labour" && (defaults.labour_rates?.length ?? 0) > 0 ? (
                          <Select value={getMatchedLabourRateId(line)} onValueChange={(v) => { if (v === "custom") return; const m = defaults.labour_rates?.find((r) => r.id === v); if (!m) return; updateLine(line.id, { unit_price: Number(m.rate_per_hour ?? 0), tax_rate_pct: defaults.default_tax_rate }); }}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue>{getLabourRateLabel(line)}</SelectValue></SelectTrigger>
                            <SelectContent>
                              {(defaults.labour_rates ?? []).map((r) => <SelectItem key={r.id} value={r.id}>{r.name} • {defaults.currency} {r.rate_per_hour.toFixed(2)}</SelectItem>)}
                              <SelectItem value="custom">Custom • {defaults.currency} {Number(line.unit_price ?? 0).toFixed(2)}</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input className="h-9 text-right" type="number" min={0} step={0.01} value={line.unit_price ?? 0} onChange={(e) => updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })} />
                        )}
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Disc %</p>
                        <Input className="h-9 text-right" type="number" min={0} max={100} value={line.discount_pct ?? 0} onChange={(e) => updateLine(line.id, { discount_pct: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tax %</p>
                        <Input className="h-9 text-right" type="number" min={0} max={100} value={line.tax_rate_pct ?? defaults.default_tax_rate} onChange={(e) => updateLine(line.id, { tax_rate_pct: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Line total</p>
                        <div className="flex h-9 items-center justify-end rounded-lg border border-border bg-muted px-3 text-sm font-semibold text-foreground">
                          {defaults.currency} {Number(line.line_total ?? 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-end justify-end">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-red-400 hover:text-red-600" aria-label="Remove line" onClick={() => removeLine(line.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Checklist concerns are auto-grouped above. Add custom groups for things like customer requests.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={createCustomGroup}>
            <Plus className="mr-1 h-4 w-4" /> New group
          </Button>
          <p className="ml-2 text-sm text-muted-foreground">
            Total: <span className="text-lg font-bold text-foreground">{defaults.currency} {total.toFixed(2)}</span>
          </p>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Estimate"}
          </Button>
        </div>
      </div>
    </div>
  );
}