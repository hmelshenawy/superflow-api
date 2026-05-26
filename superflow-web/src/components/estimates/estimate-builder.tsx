"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { ConcernApprovalStatus, EstimateLine, EstimateLineType, JobAuthorisationDecision, JobConcern, QuoteGroup, WORKFLOW_STATUS_LABELS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MediaUploader } from "@/components/media/media-uploader";
import { MediaThumbnail } from "@/components/media/media-thumbnail";
import { AlertTriangle, ChevronDown, ChevronRight, Image as ImageIcon, Lock, Plus, RefreshCw, Trash2, User, XCircle } from "lucide-react";
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
  jobConcerns?: JobConcern[];
  decisionByLine?: Record<string, JobAuthorisationDecision>;
  concernApprovals?: ConcernApprovalStatus[];
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

interface ConcernStatusOption {
  value: string;
  label: string;
}

type ConcernSeverity = "amber" | "red" | "other";

interface ConcernGroup {
  key: string;
  title: string;
  detail?: string;
  responseId: string | null;
  quoteGroupId: string | null;
  concernId: string | null;
  concern?: JobConcern | null;
  severity: ConcernSeverity;
  groupDecisionSummary: EstimateLine["group_decision_summary"];
  lines: EstimateLine[];
}

function normalizeLines(lines: EstimateLine[]) {
  return lines.map((line) => ({
    ...line,
    quote_group_id: line.quote_group_id ?? null,
    quantity: Number(line.quantity ?? 0),
    unit_price: Number(line.unit_price ?? 0),
    discount_pct: Number(line.discount_pct ?? 0),
    tax_rate_pct: Number(line.tax_rate_pct ?? 0),
    line_total: Number(line.line_total ?? 0),
    tax_amount: Number(line.tax_amount ?? 0),
  }));
}

function trafficToSeverity(traffic?: string | null): ConcernSeverity | null {
  if (traffic === "red") return "red";
  if (traffic === "amber") return "amber";
  return null;
}

function severityMeta(severity: ConcernSeverity) {
  if (severity === "red") return { tone: "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40", badge: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200", icon: <XCircle className="h-3.5 w-3.5" />, label: "Red" };
  if (severity === "amber") return { tone: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40", badge: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200", icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Yellow" };
  return { tone: "border-border bg-muted", badge: "bg-muted text-foreground/80", icon: null, label: "General" };
}

function normalizeDefaultTaxRate(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function EstimateBuilder({ jobId, lines: initialLines, onUpdate, inspection, jobConcerns = [], decisionByLine = {}, concernApprovals = [] }: Props) {
  const [lines, setLines] = useState<EstimateLine[]>(normalizeLines(initialLines));
  const [saving, setSaving] = useState(false);
  const [editingGroupTitle, setEditingGroupTitle] = useState<string | null>(null);
  const [draftGroupTitle, setDraftGroupTitle] = useState("");
  const [openMediaGroups, setOpenMediaGroups] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`estimate-collapsed-${jobId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const [defaults, setDefaults] = useState<EstimateDefaults>({
    default_tax_rate: 5, currency: "AED", standard_labour_rate: 0, standard_labour_rate_name: "Standard", labour_rates: [],
  });
  const [concernStatusOptions, setConcernStatusOptions] = useState<ConcernStatusOption[]>([]);
  const [labourRateOpen, setLabourRateOpen] = useState<string | null>(null);

  // Optimistic only: the backend recalculates and returns authoritative money fields on save.
  const recalc = (line: Partial<EstimateLine>) => {
    const qty = Number(line.quantity ?? 1);
    const price = Number(line.unit_price ?? 0);
    const disc = Number(line.discount_pct ?? 0);
    const tax = Number(line.tax_rate_pct ?? 0);
    const sub = qty * price * (1 - disc / 100);
    const taxAmt = sub * (tax / 100);
    return { line_total: Math.round(sub * 100) / 100, tax_amount: Math.round(taxAmt * 100) / 100 };
  };

  // Only reset lines when the incoming data meaningfully changes (new job, server
  // refresh after save), not on every parent re-render that creates a new array ref.
  // We compare a serialised fingerprint so optimistic local edits (e.g. group
  // rename) are not overwritten by the same server data re-rendering.
  const incomingFingerprint = useMemo(() => JSON.stringify(initialLines.map((l: EstimateLine) => `${l.id}:${l.updated_at ?? l.created_at ?? ""}:${l.quote_group?.title ?? ""}:${l.concern_id ?? ""}`)), [initialLines]);
  useEffect(() => { setLines(normalizeLines(initialLines)); }, [incomingFingerprint]);

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const [{ data }, { data: statusOptions }] = await Promise.all([
          api.get<EstimateDefaults>("/estimates/defaults"),
          api.get<ConcernStatusOption[]>("/jobs/concern-status-options"),
        ]);
        setDefaults({
          default_tax_rate: normalizeDefaultTaxRate(data.default_tax_rate),
          currency: data.currency || "AED",
          standard_labour_rate: Number(data.standard_labour_rate ?? 0),
          standard_labour_rate_name: data.standard_labour_rate_name || "Standard",
          labour_rates: (data.labour_rates ?? []).map((r) => ({ ...r, rate_per_hour: Number(r.rate_per_hour ?? 0) })),
        });
        setConcernStatusOptions(statusOptions);
      } catch {}
    };
    fetchDefaults();
  }, []);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); try { localStorage.setItem(`estimate-collapsed-${jobId}`, JSON.stringify([...next])); } catch {} return next; });
  };

  const toggleMediaGroup = (key: string) => {
    setOpenMediaGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const addLine = (type: EstimateLineType = "labour", opts?: { inspectionResponseId?: string | null; quoteGroupId?: string | null; concernId?: string | null }) => {
    const isLabour = type === "labour";
    const newLine: EstimateLine = {
      id: crypto.randomUUID(), job_id: jobId,
      inspection_response_id: opts?.inspectionResponseId ?? null,
      quote_group_id: opts?.quoteGroupId ?? null,
      concern_id: opts?.concernId ?? null,
      type, description: "", part_number: null, quantity: 1,
      unit_price: isLabour ? defaults.standard_labour_rate : 0,
      discount_pct: 0, tax_rate_pct: defaults.default_tax_rate,
      line_total: 0, tax_amount: 0,
      is_recommended: Boolean(opts?.inspectionResponseId),
      is_actionable: true,
      group_decision_summary: "pending",
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

  const createCustomGroup = async () => {
    try {
      const title = window.prompt("Customer concern name", "New customer concern");
      if (!title) return;
      const { data: concern } = await api.post<JobConcern>(`/jobs/${jobId}/concerns`, { title });
      const newLine: EstimateLine = {
        id: crypto.randomUUID(), job_id: jobId,
        inspection_response_id: null, quote_group_id: null, concern_id: concern.id,
        concern,
        type: "labour", description: "Initial checking / diagnosis", part_number: null, quantity: 1,
        unit_price: defaults.standard_labour_rate, discount_pct: 0,
        tax_rate_pct: defaults.default_tax_rate, line_total: 0, tax_amount: 0,
        is_recommended: false, is_actionable: true, group_decision_summary: "pending", sort_order: lines.length, added_by: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setLines((prev) => [...prev, { ...newLine, ...recalc(newLine) }]);
      toast.success("Customer concern group created with labour line");
      onUpdate();
    } catch {
      toast.error("Failed to create concern group");
    }
  };

  const renameCustomGroup = async (groupId: string, title: string) => {
    const previousLines = lines;
    setLines((prev) => prev.map((l) => l.quote_group_id === groupId ? { ...l, quote_group: l.quote_group ? { ...l.quote_group, title } : l.quote_group } : l));
    try {
      await api.patch(`/estimates/groups/${groupId}`, { title });
      // Don't call onUpdate() here — the optimistic update is already correct,
      // and an immediate refresh could race with the server write, reverting the title.
    } catch {
      setLines(previousLines); // revert optimistic update on failure
      toast.error("Failed to rename group");
    }
  };

  const deleteCustomGroup = async (groupId: string) => {
    setLines((prev) => prev.filter((l) => l.quote_group_id !== groupId));
    try {
      await api.delete(`/estimates/groups/${groupId}`);
    } catch {
      // Group already deleted on server or detached; local state is already updated
    }
  };

  const updateConcernFeedback = async (concernId: string, form: HTMLFormElement) => {
    const values = new FormData(form);
    try {
      await api.patch(`/jobs/${jobId}/concerns/${concernId}`, {
        status: values.get("status") || undefined,
        technician_finding: values.get("technician_finding") || "",
        work_note: values.get("work_note") || "",
        qc_note: values.get("qc_note") || "",
      });
      toast.success("Feedback saved inside quote group");
      onUpdate();
    } catch {
      toast.error("Failed to save feedback");
    }
  };

  const concernGroups = useMemo(() => {
    const allResponses = inspection?.inspection_responses ?? inspection?.responses ?? [];
    const concernResponseIds = new Set(jobConcerns.map((concern) => concern.inspection_response_id).filter(Boolean));
    const flaggedResponses = allResponses.filter((r: any) => {
      if (concernResponseIds.has(r?.id)) return false;
      const s = trafficToSeverity(r?.traffic_light);
      return s === "amber" || s === "red";
    });

    const byConcernId = new Map<string, EstimateLine[]>();
    const byResponseId = new Map<string, EstimateLine[]>();
    const byQuoteGroupId = new Map<string, EstimateLine[]>();
    const generalLines: EstimateLine[] = [];

    for (const line of lines) {
      if (line.concern_id) {
        const b = byConcernId.get(line.concern_id) ?? []; b.push(line); byConcernId.set(line.concern_id, b);
      } else if (line.inspection_response_id) {
        const b = byResponseId.get(line.inspection_response_id) ?? []; b.push(line); byResponseId.set(line.inspection_response_id, b);
      } else if (line.quote_group_id) {
        const b = byQuoteGroupId.get(line.quote_group_id) ?? []; b.push(line); byQuoteGroupId.set(line.quote_group_id, b);
      } else {
        generalLines.push(line);
      }
    }

    const summaryForLines = (groupLines: EstimateLine[]) => {
      const decisions = groupLines.map((line) => decisionByLine[line.id]?.decision).filter(Boolean);
      const approved = decisions.filter((decision) => decision === "approved").length;
      const declined = decisions.filter((decision) => decision === "declined").length;
      const deferred = decisions.filter((decision) => decision === "deferred").length;
      if (approved > 0 && declined > 0) return "mixed";
      if (approved > 0) return "approved";
      if (declined > 0) return "declined";
      if (deferred > 0) return "deferred";
      return groupLines.find((line) => line.group_decision_summary && line.group_decision_summary !== "pending")?.group_decision_summary
        ?? groupLines[0]?.group_decision_summary
        ?? "pending";
    };

    const groups: ConcernGroup[] = jobConcerns.map((c) => {
      const groupLines = [
        ...(byConcernId.get(c.id) ?? []),
        ...(c.inspection_response_id ? byResponseId.get(c.inspection_response_id) ?? [] : []),
      ];
      return ({
      key: c.id,
      title: c.title || c.code || "Customer concern",
      detail: c.technician_finding || c.description || undefined,
      responseId: c.inspection_response_id ?? null,
      quoteGroupId: null,
      concernId: c.id,
      concern: c,
      severity: "other",
      groupDecisionSummary: summaryForLines(groupLines),
      lines: groupLines,
    });
    });

    groups.push(...flaggedResponses.map((r: any) => {
      const severity = trafficToSeverity(r?.traffic_light) ?? "amber";
      const detail = [r?.tech_notes, r?.value ? `Result: ${r.value}` : null, r?.urgency && r.urgency !== "none" ? `Urgency: ${r.urgency}` : null].filter(Boolean).join(" • ");
      const groupLines = byResponseId.get(r.id) ?? [];
      return { key: r.id, title: r?.inspection_items?.label || "Inspection concern", detail, responseId: r.id, quoteGroupId: null, concernId: null, concern: null, severity, groupDecisionSummary: summaryForLines(groupLines), lines: groupLines };
    }));

    const seenGroupIds = new Set<string>();
    for (const line of lines) {
      if (line.quote_group_id && !seenGroupIds.has(line.quote_group_id)) {
        seenGroupIds.add(line.quote_group_id);
        const groupLines = byQuoteGroupId.get(line.quote_group_id) ?? [];
        groups.push({
          key: line.quote_group_id,
          title: line.quote_group?.title || "Custom group",
          responseId: null,
          quoteGroupId: line.quote_group_id,
          concernId: null,
          concern: null,
          severity: "other",
          groupDecisionSummary: summaryForLines(groupLines),
          lines: groupLines,
        });
      }
    }

    const linkedResponseIds = new Set(flaggedResponses.map((r: any) => r.id));
    const orphanLinkedLines = lines
      .filter((l) => l.inspection_response_id && !linkedResponseIds.has(l.inspection_response_id) && !concernResponseIds.has(l.inspection_response_id))
      .map((l) => ({ ...l, inspection_response_id: null }));

    if (generalLines.length > 0 || orphanLinkedLines.length > 0 || groups.length === 0) {
      groups.push({
        key: "general", title: "General / Other",
        detail: groups.length === 0 ? "Add manual estimate items here." : "Items not linked to a checklist concern.",
        responseId: null, quoteGroupId: null, concernId: null, concern: null, severity: "other",
        groupDecisionSummary: summaryForLines([...orphanLinkedLines, ...generalLines]),
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
  }, [inspection, lines, jobConcerns, decisionByLine]);

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
        concern_id: line.concern_id ?? undefined,
      }));

      const { data: savedLines } = await api.put<EstimateLine[]>(`/estimates/job/${jobId}/bulk`, { lines: payloadLines });
      setLines(normalizeLines(savedLines));
      toast.success("Estimate saved");
      onUpdate();
    } catch {
      toast.error("Failed to save estimate");
    }
    finally { setSaving(false); }
  };

  const total = lines.reduce((s, l) => s + Number(l.line_total ?? 0), 0);

  return (
    <div>
      {concernGroups.map((group) => {
        const meta = severityMeta(group.severity);
        const groupTotal = group.lines.reduce((sum, l) => sum + Number(l.line_total ?? 0), 0);
        const isCustom = Boolean(group.quoteGroupId);
        const isCollapsed = collapsedGroups.has(group.key);
        const concernApproval = group.concernId
          ? concernApprovals.find((ca) => ca.concernId === group.concernId)
          : null;

        const borderClass = concernApproval?.isLocked
          ? concernApproval.customerDecision === "approved"
            ? "border-l-[3px] border-l-emerald-500"
            : concernApproval.customerDecision === "declined"
              ? "border-l-[3px] border-l-rose-500"
              : concernApproval.customerDecision === "deferred"
                ? "border-l-[3px] border-l-amber-500"
                : "border-l-[3px] border-l-muted-foreground/30"
          : concernApproval?.advisorDecision === "approved"
            ? "border-l-[3px] border-l-emerald-500"
            : concernApproval?.advisorDecision === "declined"
              ? "border-l-[3px] border-l-rose-500"
              : concernApproval?.advisorDecision === "deferred"
                ? "border-l-[3px] border-l-amber-500"
                : "border-l-[3px] border-l-muted-foreground/30";

        const dimmedClass = (concernApproval?.customerDecision === "declined" || concernApproval?.advisorDecision === "declined")
          ? "opacity-50"
          : (concernApproval?.customerDecision === "deferred" || concernApproval?.advisorDecision === "deferred")
            ? "opacity-60"
            : "";

        const approvalBadge = (() => {
          if (!concernApproval) return null;
          if (concernApproval.isLocked) {
            if (concernApproval.customerDecision === "approved") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200"><Lock className="h-3 w-3" />Approved by customer</span>;
            if (concernApproval.customerDecision === "declined") return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:text-rose-200"><Lock className="h-3 w-3" />Rejected by customer</span>;
            if (concernApproval.customerDecision === "deferred") return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200"><Lock className="h-3 w-3" />Deferred by customer</span>;
            if (concernApproval.customerDecision === "mixed") return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80"><Lock className="h-3 w-3" />Mixed</span>;
          }
          if (concernApproval.advisorDecision === "approved") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200"><User className="h-3 w-3" />Approved by advisor</span>;
          if (concernApproval.advisorDecision === "declined") return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:text-rose-200"><User className="h-3 w-3" />Rejected by advisor</span>;
          if (concernApproval.advisorDecision === "deferred") return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200"><User className="h-3 w-3" />Deferred by advisor</span>;
          return <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80">Pending approval</span>;
        })();

        const showReset = concernApproval?.isLocked && (concernApproval.customerDecision === "declined" || concernApproval.customerDecision === "deferred");

        return (
          <div key={group.key} className={`border-b border-border ${borderClass} ${dimmedClass}`}>
            {/* Concern header row */}
            <div
              role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!isCustom || editingGroupTitle !== group.quoteGroupId) toggleGroup(group.key); } }}
              className="flex cursor-pointer select-none items-center gap-2 px-5 py-3 hover:bg-muted/50"
              onClick={() => { if (!isCustom || editingGroupTitle !== group.quoteGroupId) toggleGroup(group.key); }}
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                {isCustom ? (
                  editingGroupTitle === group.quoteGroupId ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input className="h-7 w-[180px] bg-card text-sm font-medium" value={draftGroupTitle} onChange={(e) => setDraftGroupTitle(e.target.value)} autoFocus onKeyDown={async (e) => { e.stopPropagation(); if (e.key === "Enter") { await renameCustomGroup(group.quoteGroupId as string, draftGroupTitle); setEditingGroupTitle(null); } if (e.key === "Escape") setEditingGroupTitle(null); }} />
                      <Button size="sm" className="h-7 rounded-lg bg-foreground px-2 text-xs text-background hover:bg-foreground/80" onClick={async (e) => { e.stopPropagation(); await renameCustomGroup(group.quoteGroupId as string, draftGroupTitle); setEditingGroupTitle(null); }}>Save</Button>
                      <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={(e) => { e.stopPropagation(); setEditingGroupTitle(null); }}>Cancel</Button>
                    </div>
                  ) : (
                    <span className="cursor-pointer rounded px-0.5 text-[13px] font-medium text-foreground hover:bg-muted" onClick={(e) => { e.stopPropagation(); setDraftGroupTitle(group.title); setEditingGroupTitle(group.quoteGroupId); }}>{group.title}</span>
                  )
                ) : (
                  <span className="text-[13px] font-medium text-foreground">{group.title}</span>
                )}
                {group.detail && !isCustom && <p className="mt-0.5 text-[11px] text-muted-foreground">{group.detail}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {approvalBadge}
                <span className="min-w-[70px] text-right text-[13px] font-medium text-foreground">{defaults.currency} {groupTotal.toFixed(2)}</span>
                {showReset && (
                  <button type="button" className="inline-flex items-center gap-1 rounded-md border border-rose-300 dark:border-rose-700 px-1.5 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50" onClick={async (e) => { e.stopPropagation(); const reason = prompt("Reset customer decisions for this concern. Enter reason (mandatory):"); if (!reason?.trim()) return; try { await api.post(`/jobs/${jobId}/concerns/${group.concernId}/reset-approval`, { reason: reason.trim() }); toast.success("Approval reset. You can now resend."); onUpdate(); } catch { toast.error("Failed to reset approval"); } }}>
                    <RefreshCw className="h-3 w-3" /> Reset
                  </button>
                )}
                {isCustom ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" aria-label="Delete group" onClick={(e) => { e.stopPropagation(); deleteCustomGroup(group.quoteGroupId as string); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                ) : group.key === "general" ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" aria-label="Clear group" onClick={(e) => { e.stopPropagation(); setLines((prev) => prev.filter((l) => l.inspection_response_id || l.quote_group_id)); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                ) : null}
              </div>
            </div>

            {/* Expanded panel */}
            {!isCollapsed && (
            <div className="border-t border-border bg-muted/30 p-5">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left column — diagnostics & notes */}
                {group.concern ? (
                  <div>
                    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Diagnostic &amp; notes</p>
                    <form onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); updateConcernFeedback(group.concernId as string, event.currentTarget); }}>
                      {/* Approval status */}
                      {concernApproval && (
                        <div className="mb-2.5">
                          <p className="mb-1 text-[11px] font-medium text-muted-foreground">Approval status</p>
                          {concernApproval.isLocked ? (
                            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
                              {approvalBadge}
                              <button type="button" className="text-[11px] text-muted-foreground underline hover:text-foreground" onClick={async () => { const reason = prompt("Reset customer decisions for this concern. Enter reason (mandatory):"); if (!reason?.trim()) return; try { await api.post(`/jobs/${jobId}/concerns/${group.concernId}/reset-approval`, { reason: reason.trim() }); toast.success("Approval reset. You can now resend."); onUpdate(); } catch { toast.error("Failed to reset approval"); } }}>Reset &amp; resend</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                className="h-8 rounded-md border border-border bg-card px-2 text-sm"
                                defaultValue={concernApproval.advisorDecision || ""}
                                onChange={async (e) => {
                                  const val = e.target.value || null;
                                  if (val && !concernApproval.advisorDecision) {
                                    const note = prompt("Advisor decision note (required):");
                                    if (!note?.trim()) { e.target.value = ""; return; }
                                    try { await api.patch(`/jobs/${jobId}/concerns/${group.concernId}`, { advisor_decision: val, advisor_decision_note: note.trim() }); toast.success("Advisor decision saved"); onUpdate(); } catch { toast.error("Failed to save advisor decision"); e.target.value = ""; }
                                  } else if (val) {
                                    const note = prompt("Update advisor decision note:");
                                    if (!note?.trim()) return;
                                    try { await api.patch(`/jobs/${jobId}/concerns/${group.concernId}`, { advisor_decision: val, advisor_decision_note: note.trim() }); toast.success("Advisor decision updated"); onUpdate(); } catch { toast.error("Failed to update advisor decision"); }
                                  } else {
                                    try { await api.patch(`/jobs/${jobId}/concerns/${group.concernId}`, { advisor_decision: null, advisor_decision_note: null }); toast.success("Advisor decision cleared"); onUpdate(); } catch { toast.error("Failed to clear advisor decision"); }
                                  }
                                }}
                              >
                                <option value="">Pending approval</option>
                                <option value="approved">Approved by advisor</option>
                                <option value="deferred">Deferred by advisor</option>
                                <option value="declined">Rejected by advisor</option>
                              </select>
                              {concernApproval.advisorDecision && <span className="text-[11px] text-muted-foreground">{concernApproval.advisorDecisionNote}</span>}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mb-2.5">
                        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Workflow status</p>
                        <select name="status" defaultValue={group.concern.status || "reviewing"} className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm">
                          {concernStatusOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                        </select>
                      </div>
                      <div className="mb-2.5">
                        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Technician feedback</p>
                        <Textarea name="technician_finding" defaultValue={group.concern.technician_finding || ""} placeholder="Finding / diagnosis" className="min-h-[56px] bg-card text-sm" />
                      </div>
                      <div className="mb-2.5">
                        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Work / QC note</p>
                        <Textarea name="work_note" defaultValue={group.concern.work_note || ""} placeholder="Progress note" className="min-h-[56px] bg-card text-sm" />
                        <input type="hidden" name="qc_note" value={group.concern.qc_note || ""} />
                      </div>
                      <div className="mb-2.5">
                        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Photos</p>
                        <div className="flex items-center gap-2">
                          <MediaUploader jobId={jobId} concernId={group.concernId || undefined} onUploaded={onUpdate} compact label="Upload" />
                          <Button type="button" variant="outline" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={(e) => { e.stopPropagation(); toggleMediaGroup(group.key); }}>
                            <ImageIcon className="mr-1 h-3 w-3" /> {group.concern.media_files?.length ?? 0}
                          </Button>
                        </div>
                        {openMediaGroups.has(group.key) && group.concern.media_files?.length ? (
                          <div className="mt-2 grid grid-cols-3 gap-1.5">
                            {group.concern.media_files.map((file) => (<MediaThumbnail key={file.id} file={{ ...file, original_filename: file.original_filename || undefined, file_type: file.file_type || undefined, mime_type: file.mime_type || undefined, size_bytes: file.size_bytes == null ? undefined : Number(file.size_bytes), scan_status: file.scan_status || undefined }} onDeleted={onUpdate} />))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" size="sm" className="h-7 rounded-md bg-foreground px-3 text-[12px] text-background hover:bg-foreground/80">Save</Button>
                      </div>
                    </form>
                  </div>
                ) : null}

                {/* Right column — line items */}
                <div>
                  <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Line items</p>
                  {group.lines.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border bg-card px-3 py-4 text-sm text-muted-foreground">No items added yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          <th className="pb-1.5 text-left font-medium" style={{width: "35%"}}>Description</th>
                          <th className="pb-1.5 text-center font-medium" style={{width: "80px"}}>Type</th>
                          <th className="pb-1.5 text-center font-medium" style={{width: "52px"}}>Qty</th>
                          <th className="pb-1.5 text-right font-medium" style={{width: "100px"}}>Unit price</th>
                          <th className="pb-1.5 text-right font-medium" style={{width: "52px"}}>Disc%</th>
                          <th className="pb-1.5 text-right font-medium" style={{width: "90px"}}>Total</th>
                          <th className="pb-1.5 text-center font-medium" style={{width: "28px"}}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...group.lines].sort((a, b) => { const order: Record<EstimateLineType, number> = { labour: 0, part: 1, sublet: 2 }; return (order[a.type] ?? 3) - (order[b.type] ?? 3); }).map((line) => (
                          <tr key={line.id} className="border-b border-border/50">
                            <td className="py-1.5 pr-1">
                              <Input className="h-7 text-[12px]" value={line.description ?? ""} onChange={(e) => updateLine(line.id, { description: e.target.value })} placeholder="Description" />
                            </td>
                            <td className="py-1.5 px-0.5">
                              <Select value={line.type} onValueChange={(v) => updateLine(line.id, { type: v as EstimateLineType })}>
                                <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="labour"><span className="text-blue-700">Labour</span></SelectItem>
                                  <SelectItem value="part"><span className="text-green-700">Part</span></SelectItem>
                                  <SelectItem value="sublet"><span className="text-amber-700">Sublet</span></SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-1.5 px-0.5">
                              <Input className="h-7 text-right text-[12px]" type="number" min={0} step={0.5} value={line.quantity ?? 1} onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })} />
                            </td>
                            <td className="py-1.5 px-0.5">
                              {line.type === "labour" && (defaults.labour_rates?.length ?? 0) > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Input className="h-7 text-right text-[12px]" type="number" min={0} step={0.01} value={line.unit_price ?? 0} onChange={(e) => { updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 }); }} />
                                  <Popover open={labourRateOpen === line.id} onOpenChange={(open) => setLabourRateOpen(open ? line.id : null)}>
                                    <PopoverTrigger className="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-card hover:text-foreground">
                                      {(defaults.labour_rates ?? []).find((r) => Number(r.rate_per_hour) === Number(line.unit_price ?? 0))?.name?.split(" ")[0] ?? "Custom"}
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-1" align="end">
                                      {(defaults.labour_rates ?? []).map((r) => (
                                        <button key={r.id} type="button" className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-[12px] hover:bg-muted ${Number(r.rate_per_hour) === Number(line.unit_price ?? 0) ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                                          onClick={() => { updateLine(line.id, { unit_price: Number(r.rate_per_hour ?? 0), tax_rate_pct: defaults.default_tax_rate }); setLabourRateOpen(null); }}>
                                            <span>{r.name}</span><span>{defaults.currency} {r.rate_per_hour.toFixed(2)}</span>
                                          </button>
                                      ))}
                                      <button type="button" className="flex w-full items-center justify-between rounded px-2 py-1.5 text-[12px] text-muted-foreground hover:bg-muted"
                                        onClick={() => { updateLine(line.id, { unit_price: 0 }); setLabourRateOpen(null); }}>
                                        <span>Custom</span><span>{defaults.currency} 0.00</span>
                                      </button>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              ) : (
                                <Input className="h-7 text-right text-[12px]" type="number" min={0} step={0.01} value={line.unit_price ?? 0} onChange={(e) => updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })} />
                              )}
                            </td>
                            <td className="py-1.5 px-0.5">
                              <Input className="h-7 text-right text-[12px]" type="number" min={0} max={100} value={line.discount_pct ?? 0} onChange={(e) => updateLine(line.id, { discount_pct: parseFloat(e.target.value) || 0 })} />
                            </td>
                            <td className="py-1.5 pl-0.5">
                              <div className="flex h-7 items-center justify-end rounded-md border border-border bg-muted px-2 text-[12px] font-semibold text-foreground">{defaults.currency} {Number(line.line_total ?? 0).toFixed(2)}</div>
                            </td>
                            <td className="py-1.5 px-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" aria-label="Remove line" onClick={() => removeLine(line.id)}><Trash2 className="h-3 w-3" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 rounded-md border-dashed px-2 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => addLine("labour", { inspectionResponseId: group.responseId, quoteGroupId: group.quoteGroupId, concernId: group.concernId })}><Plus className="mr-0.5 h-3 w-3" /> Labour</Button>
                      <Button variant="outline" size="sm" className="h-7 rounded-md border-dashed px-2 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => addLine("part", { inspectionResponseId: group.responseId, quoteGroupId: group.quoteGroupId, concernId: group.concernId })}><Plus className="mr-0.5 h-3 w-3" /> Part</Button>
                      <Button variant="outline" size="sm" className="h-7 rounded-md border-dashed px-2 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => addLine("sublet", { inspectionResponseId: group.responseId, quoteGroupId: group.quoteGroupId, concernId: group.concernId })}><Plus className="mr-0.5 h-3 w-3" /> Sublet</Button>
                      <Button size="sm" className="h-7 rounded-md bg-foreground px-3 text-[12px] text-background hover:bg-foreground/80" disabled={saving} onClick={save}>
                        {saving ? "Saving…" : "Save lines"}
                      </Button>
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      Concern total: <span className="font-semibold text-foreground">{defaults.currency} {groupTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        );
      })}

      {/* Add concern row */}
      <div
        role="button" tabIndex={0}
        className="flex cursor-pointer items-center gap-1.5 px-5 py-2.5 text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        onClick={createCustomGroup}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); createCustomGroup(); } }}
      >
        <Plus className="h-3.5 w-3.5" /> Add concern
      </div>
    </div>
  );
}
