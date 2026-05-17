"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Car,
  User,
  FileText,
  ChevronDown,
  ChevronRight,
  Loader2,
  Shield,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────── */
interface Finding {
  id: string;
  label: string;
  value?: string;
  urgency?: string;
  severity: "red" | "amber";
  tech_notes?: string;
  photos: { id: string; url: string; mime_type?: string; filename?: string }[];
}

interface QuoteLine {
  id: string;
  type: "labour" | "part" | "sublet";
  description?: string;
  part_number?: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_rate_pct: number;
  line_total: number;
}

interface QuoteGroup {
  key: string;
  title: string;
  severity: "red" | "amber" | null;
  finding: Finding | null;
  lines: QuoteLine[];
  total: number;
}

interface ExistingDecision {
  estimate_line_id: string;
  decision: "approved" | "declined" | "deferred";
  customer_comment?: string;
}

interface PortalConcern {
  id: string;
  code?: string | null;
  title: string;
  description?: string | null;
  status?: string | null;
  technician_finding?: string | null;
  work_note?: string | null;
  qc_note?: string | null;
  customer_decision?: string | null;
  photos?: { id: string; url?: string; mime_type?: string; filename?: string }[];
}

type GroupDecisionState = {
  decision: "approved" | "declined" | "deferred";
  comment: string;
};

interface PortalData {
  token: { expires_at: string; is_revoked: boolean; used_at: string | null };
  job: {
    id: string;
    job_number: string;
    status: string;
    customer_concern?: string;
    customer: { name?: string; phone?: string; email?: string } | null;
    vehicle: { make?: string; model?: string; plate?: string; vin?: string; year?: number } | null;
  };
  stage?: string;
  released_snapshot?: { version: number; stage?: string | null; released_at?: string | null; release_note?: string | null };
  concerns?: PortalConcern[];
  findings?: Finding[];
  job_photos?: { id: string; url: string; mime_type?: string; filename?: string }[];
  grouped_estimate: QuoteGroup[];
  grand_total: number;
  existing_decisions: ExistingDecision[];
  currency: string;
}

/* ── Helpers ────────────────────────────────────────── */
const TYPE_LABEL: Record<string, string> = { labour: "Labour", part: "Parts", sublet: "Sublet" };
const TYPE_STYLE: Record<string, string> = {
  labour: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40",
  part: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
  sublet: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40",
};
const SEVERITY_STYLE: Record<string, string> = {
  red: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40",
  amber: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40",
};
const SEVERITY_BADGE: Record<string, string> = {
  red: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
  amber: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300",
};

/* ── Component ──────────────────────────────────────── */
export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, GroupDecisionState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    const apiBase = `${window.location.origin}/api`;
    fetch(`${apiBase}/portal/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "Link not found" : r.status === 410 ? "Link expired" : "Failed to load");
        return r.json();
      })
      .then((d: PortalData) => {
        setData(d);
        // Default all groups to collapsed
        const expanded: Record<string, boolean> = {};
        d.grouped_estimate.forEach((g) => (expanded[g.key] = false));
        setExpandedGroups(expanded);
        // Pre-fill existing decisions
        const existingByLine = new Map(
          (d.existing_decisions ?? []).map((ed) => [ed.estimate_line_id, { decision: ed.decision, comment: ed.customer_comment || "" }]),
        );
        const existing: Record<string, GroupDecisionState> = {};
        d.grouped_estimate.forEach((group) => {
          const groupDecisions = group.lines
            .map((line) => existingByLine.get(line.id))
            .filter(Boolean) as GroupDecisionState[];

          if (!groupDecisions.length) return;

          const first = groupDecisions[0];
          const allSameDecision = groupDecisions.every((item) => item.decision === first.decision);
          const sharedComment = groupDecisions.find((item) => item.comment)?.comment || "";

          if (allSameDecision) {
            existing[group.key] = { decision: first.decision, comment: sharedComment };
          }
        });
        setDecisions(existing);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleGroup = (key: string) => setExpandedGroups((p) => ({ ...p, [key]: !p[key] }));

  const setDecision = (groupKey: string, decision: "approved" | "declined" | "deferred") =>
    setDecisions((p) => ({ ...p, [groupKey]: { ...p[groupKey], decision, comment: p[groupKey]?.comment || "" } }));

  const setComment = (groupKey: string, comment: string) =>
    setDecisions((p) => ({ ...p, [groupKey]: { ...p[groupKey], decision: p[groupKey]?.decision || "approved", comment } }));

  const existingDecisionByLine = new Map(
    (data?.existing_decisions ?? []).map((ed) => [ed.estimate_line_id, { decision: ed.decision, comment: ed.customer_comment || "" }]),
  );
  const getActionableLines = (group: QuoteGroup) => group.lines.filter((line) => !existingDecisionByLine.has(line.id));
  const hasActionableLines = Boolean(data?.grouped_estimate?.some((group) => getActionableLines(group).length > 0));
  const allDecided = Boolean(data?.grouped_estimate?.length) && data!.grouped_estimate.every((group) => {
    const actionable = getActionableLines(group);
    // Groups with no new undecided estimate lines are informational only:
    // already-submitted lines are locked, and empty concern updates should not
    // block the customer from replying to newly added actionable items.
    if (actionable.length === 0) return true;
    return Boolean(decisions[group.key]?.decision);
  });

  const submit = async () => {
    if (!data || !allDecided || !hasActionableLines) return;
    setSubmitting(true);
    try {
      const apiBase = `${window.location.origin}/api`;
      const payload = {
        decisions: data.grouped_estimate.flatMap((group) => {
          const groupDecision = decisions[group.key];
          if (!groupDecision) return [];
          return getActionableLines(group).map((line) => ({
            estimate_line_id: line.id,
            decision: groupDecision.decision,
            customer_comment: groupDecision.comment || null,
          }));
        }),
      };
      const res = await fetch(`${apiBase}/portal/${token}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Submission failed");
      }
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading ──────────────────────────────────────── */
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );

  /* ── Error ────────────────────────────────────────── */
  if (error || !data)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <XCircle className="h-12 w-12 text-rose-400" />
        <p className="text-lg font-semibold text-foreground">{error || "Something went wrong"}</p>
        <p className="text-sm text-muted-foreground">Please contact your service advisor if the problem persists.</p>
      </div>
    );

  const { job, findings, grouped_estimate, grand_total, currency } = data;
  const stage = data.released_snapshot?.stage || data.stage || "initial_findings";
  const stageSteps = [
    { key: "initial_findings", label: "Findings" },
    { key: "approval_needed", label: "Approval" },
    { key: "work_in_progress", label: "Work" },
    { key: "final_report", label: "Final report" },
  ];
  const activeStageIndex = Math.max(stageSteps.findIndex((s) => s.key === stage), 0);
  const isExpired = Boolean(data.token.expires_at && new Date(data.token.expires_at) < new Date());
  const approvedTotal = grouped_estimate.reduce((sum, group) => {
    const lineTotal = group.lines.reduce((lineSum, line) => {
      const locked = existingDecisionByLine.get(line.id);
      const decision = locked?.decision || decisions[group.key]?.decision;
      return decision === "approved" ? lineSum + Number(line.line_total || 0) : lineSum;
    }, 0);
    return sum + lineTotal;
  }, 0);

  /* ── Submitted ────────────────────────────────────── */
  if (submitted)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <CheckCircle className="h-16 w-16 text-emerald-500" />
        <h1 className="text-2xl font-bold text-foreground">Thank you!</h1>
        <p className="max-w-md text-muted-foreground">Your decisions have been submitted. Our team will review and proceed accordingly.</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* ── Header ──────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Customer service portal</p>
              <h1 className="mt-1 text-2xl font-bold text-foreground">{job.job_number}</h1>
            </div>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Vehicle */}
            <div className="flex items-start gap-3">
              <Car className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Vehicle</p>
                <p className="font-semibold text-foreground">
                  {job.vehicle?.year ? `${job.vehicle.year} ` : ""}
                  {job.vehicle?.make} {job.vehicle?.model}
                </p>
                {job.vehicle?.plate && <p className="text-sm text-muted-foreground">{job.vehicle.plate}</p>}
                {job.vehicle?.vin && <p className="text-xs text-muted-foreground">VIN: {job.vehicle.vin}</p>}
              </div>
            </div>
            {/* Customer */}
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Customer</p>
                <p className="font-semibold text-foreground">{job.customer?.name || "N/A"}</p>
                {job.customer?.phone && <p className="text-sm text-muted-foreground">{job.customer.phone}</p>}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-muted/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Current released update</p>
                <p className="mt-1 text-lg font-bold text-foreground">{stageSteps[activeStageIndex]?.label || "Service update"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Refresh this page to see the latest advisor-released update.</p>
              </div>
              {data.released_snapshot?.version && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Published v{data.released_snapshot.version}</span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {stageSteps.map((step, idx) => (
                <div key={step.key} className={`rounded-xl border p-2 text-center text-[11px] font-semibold ${idx <= activeStageIndex ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-card text-muted-foreground"}`}>
                  <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${idx <= activeStageIndex ? "bg-emerald-500" : "bg-slate-300"}`} />
                  {step.label}
                </div>
              ))}
            </div>
          </div>

          {job.customer_concern && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-muted p-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Customer Concern</p>
                <p className="text-sm text-foreground/80">{job.customer_concern}</p>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              This link has expired. Please contact your service advisor for a new one.
            </div>
          )}
        </div>

        {/* ── Concern Journey ──────────────────── */}
        {data.concerns && data.concerns.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-bold text-foreground">Your Concerns & Workshop Updates</h2>
            <div className="space-y-3">
              {data.concerns.map((concern) => (
                <div key={concern.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{concern.code || "Concern"}</p>
                      <h3 className="mt-1 font-bold text-foreground">{concern.title}</h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{concern.status || "Reviewing"}</span>
                  </div>
                  {concern.description && <p className="mt-2 text-sm text-muted-foreground">{concern.description}</p>}
                  {concern.technician_finding && (
                    <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                      <span className="font-semibold">Technician finding: </span>{concern.technician_finding}
                    </div>
                  )}
                  {concern.work_note && (
                    <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                      <span className="font-semibold">Work update: </span>{concern.work_note}
                    </div>
                  )}
                  {concern.qc_note && (
                    <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
                      <span className="font-semibold">QC result: </span>{concern.qc_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Inspection Findings ──────────────────── */}
        {findings && findings.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-bold text-foreground">Inspection Findings</h2>
            <div className="space-y-3">
              {findings.map((f) => (
                <div key={f.id} className={`rounded-xl border p-4 ${SEVERITY_STYLE[f.severity] || "border-border bg-card"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      {f.severity === "red" ? (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{f.label}</p>
                        {f.tech_notes && <p className="mt-1 text-sm text-muted-foreground">{f.tech_notes}</p>}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_BADGE[f.severity]}`}>
                      {f.severity === "red" ? "Red" : "Yellow"}
                    </span>
                  </div>
                  {f.photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {f.photos.map((p) => (
                        <a key={p.id} href={p.url || `/api/portal/${token}/media/${p.id}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={p.url || `/api/portal/${token}/media/${p.id}`}
                            alt={p.filename || "Inspection photo"}
                            className="h-28 w-full rounded-lg border border-border object-cover shadow-sm"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Estimate Groups ─────────────────────── */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-foreground">Estimate</h2>
          {grouped_estimate.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-muted-foreground">
              Estimate is not released yet. Please refresh later after your advisor publishes the next update.
            </div>
          ) : null}
          <div className="space-y-3">
            {grouped_estimate.map((group) => {
              const isExpanded = expandedGroups[group.key] !== false;
              const groupDecision = decisions[group.key];
              const lockedGroupDecision = group.lines.map((line) => existingDecisionByLine.get(line.id)).filter(Boolean)[0];
              const displayDecision = groupDecision || lockedGroupDecision;
              const actionableLines = getActionableLines(group);
              const isFullyLocked = group.lines.length > 0 && actionableLines.length === 0;
              return (
                <div key={group.key} className={`rounded-xl border ${SEVERITY_STYLE[group.severity || ""] || "border-border bg-card"} overflow-hidden`}>
                  {/* Group header */}
                  <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={() => toggleGroup(group.key)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span className="truncate font-semibold text-foreground">{group.title}</span>
                      {group.severity && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE[group.severity]}`}>
                          {group.severity === "red" ? "Red" : "Yellow"}
                        </span>
                      )}
                      {displayDecision ? (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            displayDecision.decision === "approved"
                              ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                              : displayDecision.decision === "declined"
                                ? "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300"
                                : "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {displayDecision.decision === "approved"
                            ? "Approved"
                            : displayDecision.decision === "declined"
                              ? "Rejected"
                              : "Deferred"}
                        </span>
                      ) : null}
                    </button>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className="shrink-0 font-semibold text-foreground">
                        {currency} {group.total.toFixed(2)}
                      </span>
                      {(["approved", "declined", "deferred"] as const).map((dec) => {
                        const active = displayDecision?.decision === dec;
                        const styles = {
                          approved: active
                            ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/40 ring-1 ring-emerald-300 dark:ring-emerald-700/40"
                            : "border-border text-muted-foreground hover:border-emerald-300 dark:hover:border-emerald-700/40 hover:text-emerald-700 dark:hover:text-emerald-300",
                          declined: active
                            ? "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700/40 ring-1 ring-rose-300 dark:ring-rose-700/40"
                            : "border-border text-muted-foreground hover:border-rose-300 dark:hover:border-rose-700/40 hover:text-rose-700 dark:hover:text-rose-300",
                          deferred: active
                            ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/40 ring-1 ring-amber-300 dark:ring-amber-700/40"
                            : "border-border text-muted-foreground hover:border-amber-300 dark:hover:border-amber-700/40 hover:text-amber-700 dark:hover:text-amber-300",
                        };
                        const icons = {
                          approved: <CheckCircle className="h-3.5 w-3.5" />,
                          declined: <XCircle className="h-3.5 w-3.5" />,
                          deferred: <Clock className="h-3.5 w-3.5" />,
                        };
                        const labels = { approved: "Approve", declined: "Reject", deferred: "Defer" };
                        return (
                          <button
                            key={dec}
                            onClick={() => !isFullyLocked && setDecision(group.key, dec)}
                            disabled={isFullyLocked}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[dec]}`}
                          >
                            {icons[dec]} {labels[dec]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {!isFullyLocked && (groupDecision?.decision === "declined" || groupDecision?.decision === "deferred") && (
                    <div className="border-t border-border px-4 pb-3">
                      <input
                        type="text"
                        placeholder="Add a comment (optional)…"
                        value={groupDecision?.comment || ""}
                        onChange={(e) => setComment(group.key, e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-slate-400 dark:focus:border-slate-600 focus:outline-none"
                      />
                    </div>
                  )}

                  {isFullyLocked && (
                    <div className="border-t border-border px-4 py-2 text-xs font-semibold text-muted-foreground">
                      Decision already submitted for this concern. It cannot be changed.
                    </div>
                  )}

                  {group.finding?.tech_notes && (
                    <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Technician feedback: </span>{group.finding.tech_notes}
                    </div>
                  )}
                  {group.finding?.photos?.length ? (
                    <div className="border-t border-border px-4 py-3">
                      <div className="grid grid-cols-3 gap-2">
                        {group.finding.photos.map((p) => (
                          <a key={p.id} href={p.url || `/api/portal/${token}/media/${p.id}`} target="_blank" rel="noopener noreferrer">
                            <img src={p.url || `/api/portal/${token}/media/${p.id}`} alt={p.filename || "Concern photo"} className="h-24 w-full rounded-lg border border-border object-cover shadow-sm" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Lines */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-3">
                      <div className="mt-3 space-y-2">
                        {group.lines.map((line) => {
                          return (
                            <div key={line.id} className="rounded-lg border border-border bg-card p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${TYPE_STYLE[line.type] || "bg-muted text-muted-foreground border-border"}`}>
                                      {TYPE_LABEL[line.type] || line.type}
                                    </span>
                                    <span className="text-sm font-medium text-foreground">{line.description || "—"}</span>
                                    {existingDecisionByLine.get(line.id) && (
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                        Locked: {existingDecisionByLine.get(line.id)?.decision === "declined" ? "rejected" : existingDecisionByLine.get(line.id)?.decision}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1.5 flex gap-4 text-xs text-muted-foreground">
                                    <span>Qty: {Number(line.quantity)}</span>
                                    <span>Unit: {currency} {Number(line.unit_price).toFixed(2)}</span>
                                    {Number(line.discount_pct) > 0 && <span>Disc: {Number(line.discount_pct)}%</span>}
                                  </div>
                                </div>
                                <span className="shrink-0 font-semibold text-foreground">{currency} {Number(line.line_total).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Vehicle / General Photos ──────────────── */}
        {data.job_photos && data.job_photos.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-bold text-foreground">Vehicle Photos</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {data.job_photos.map((p) => (
                <a key={p.id} href={p.url || `/api/portal/${token}/media/${p.id}`} target="_blank" rel="noopener noreferrer">
                  <img
                    src={p.url || `/api/portal/${token}/media/${p.id}`}
                    alt={p.filename || "Vehicle photo"}
                    className="h-32 w-full rounded-lg border border-border object-cover shadow-sm"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Grand Total + Submit ─────────────────── */}
        <div className="sticky bottom-0 -mx-4 border-t border-border bg-white/90 dark:bg-slate-900/90 px-4 py-4 backdrop-blur sm:-mx-0 sm:rounded-2xl sm:border sm:shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Estimate</p>
                <p className="text-3xl font-bold text-foreground">{currency} {grand_total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved Total</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{currency} {approvedTotal.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={submit}
              disabled={!allDecided || !hasActionableLines || submitting || isExpired}
              className="rounded-xl bg-slate-900 dark:bg-slate-100 px-8 py-3 text-sm font-semibold text-white dark:text-slate-900 shadow-lg transition hover:bg-slate-800 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Submitting…"
                : grouped_estimate.length === 0
                ? "Waiting for estimate"
                : !hasActionableLines
                ? "No new items to decide"
                : !allDecided
                ? "Review new groups first"
                : "Submit My Decisions"}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground sm:text-left">
            {!hasActionableLines
              ? "Previous decisions are locked. New advisor-released items will appear here for a new decision."
              : data.token.used_at
              ? "Previous decisions are locked. You can submit only the new items in this update."
              : "Your choices will be sent to our team for review."}
          </p>
        </div>
      </div>
    </div>
  );
}