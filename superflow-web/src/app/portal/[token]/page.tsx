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
  labour: "bg-blue-50 text-blue-700 border-blue-200",
  part: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sublet: "bg-purple-50 text-purple-700 border-purple-200",
};
const SEVERITY_STYLE: Record<string, string> = {
  red: "bg-rose-50 border-rose-200",
  amber: "bg-amber-50 border-amber-200",
};
const SEVERITY_BADGE: Record<string, string> = {
  red: "bg-rose-100 text-rose-700",
  amber: "bg-amber-100 text-amber-800",
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

  const allDecided = data?.grouped_estimate.every((g) => g.lines.length > 0 && decisions[g.key]?.decision);

  const submit = async () => {
    if (!data || !allDecided) return;
    setSubmitting(true);
    try {
      const apiBase = `${window.location.origin}/api`;
      const payload = {
        decisions: data.grouped_estimate.flatMap((group) => {
          const groupDecision = decisions[group.key];
          if (!groupDecision) return [];
          return group.lines.map((line) => ({
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
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setError("Failed to submit. Please try again.");
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
  const isExpired = data.token.expires_at && new Date(data.token.expires_at) < new Date();
  const approvedTotal = grouped_estimate.reduce((sum, group) => {
    return decisions[group.key]?.decision === "approved" ? sum + Number(group.total || 0) : sum;
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* ── Header ──────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Service Estimate</p>
              <h1 className="mt-1 text-2xl font-bold text-foreground">{job.job_number}</h1>
            </div>
            <Shield className="h-5 w-5 text-slate-300" />
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

          {job.customer_concern && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-background p-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Customer Concern</p>
                <p className="text-sm text-foreground/80">{job.customer_concern}</p>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              This link has expired. Please contact your service advisor for a new one.
            </div>
          )}
        </div>

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
                        <a key={p.id} href={`/api/portal/${token}/media/${p.id}`} target="_blank" rel="noopener noreferrer">
                          <img
                            src={`/api/portal/${token}/media/${p.id}`}
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
          <div className="space-y-3">
            {grouped_estimate.map((group) => {
              const isExpanded = expandedGroups[group.key] !== false;
              const groupDecision = decisions[group.key];
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
                      {groupDecision ? (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            groupDecision.decision === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : groupDecision.decision === "declined"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {groupDecision.decision === "approved"
                            ? "Approved"
                            : groupDecision.decision === "declined"
                              ? "Rejected"
                              : "Deferred"}
                        </span>
                      ) : null}
                    </button>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className="shrink-0 font-semibold text-foreground">
                        {currency} {group.total.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setDecision(group.key, "approved")}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          groupDecision?.decision === "approved"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300"
                            : "border-border text-muted-foreground hover:border-emerald-300 hover:text-emerald-700"
                        }`}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setDecision(group.key, "declined")}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          groupDecision?.decision === "declined"
                            ? "bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-300"
                            : "border-border text-muted-foreground hover:border-rose-300 hover:text-rose-700"
                        }`}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>

                  {/* Lines */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-3">
                      {group.finding && group.finding.photos.length > 0 && (
                        <div className="mb-3 mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {group.finding.photos.map((p) => (
                            <a key={p.id} href={`/api/portal/${token}/media/${p.id}`} target="_blank" rel="noopener noreferrer">
                              <img
                                src={`/api/portal/${token}/media/${p.id}`}
                                alt={p.filename || "Inspection photo"}
                                className="h-28 w-full rounded-lg border border-border object-cover shadow-sm"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 rounded-lg border border-border bg-card p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approve this whole group</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {(["approved", "declined", "deferred"] as const).map((dec) => {
                            const active = groupDecision?.decision === dec;
                            const styles = {
                              approved: active
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300"
                                : "border-border text-muted-foreground hover:border-emerald-300 hover:text-emerald-700",
                              declined: active
                                ? "bg-rose-100 text-rose-800 border-rose-300 ring-1 ring-rose-300"
                                : "border-border text-muted-foreground hover:border-rose-300 hover:text-rose-700",
                              deferred: active
                                ? "bg-amber-100 text-amber-800 border-amber-300 ring-1 ring-amber-300"
                                : "border-border text-muted-foreground hover:border-amber-300 hover:text-amber-700",
                            };
                            const icons = {
                              approved: <CheckCircle className="h-3.5 w-3.5" />,
                              declined: <XCircle className="h-3.5 w-3.5" />,
                              deferred: <Clock className="h-3.5 w-3.5" />,
                            };
                            const labels = { approved: "Approve group", declined: "Reject group", deferred: "Defer group" };
                            return (
                              <button
                                key={dec}
                                onClick={() => setDecision(group.key, dec)}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${styles[dec]}`}
                              >
                                {icons[dec]} {labels[dec]}
                              </button>
                            );
                          })}
                        </div>
                        {(groupDecision?.decision === "declined" || groupDecision?.decision === "deferred") && (
                          <input
                            type="text"
                            placeholder="Add a comment (optional)…"
                            value={groupDecision?.comment || ""}
                            onChange={(e) => setComment(group.key, e.target.value)}
                            className="mt-2 w-full rounded-lg border border-border px-3 py-1.5 text-sm text-foreground/80 placeholder:text-muted-foreground focus:border-slate-400 focus:outline-none"
                          />
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {group.lines.map((line) => {
                          return (
                            <div key={line.id} className="rounded-lg border border-border bg-card p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${TYPE_STYLE[line.type] || "bg-background text-muted-foreground border-border"}`}>
                                      {TYPE_LABEL[line.type] || line.type}
                                    </span>
                                    <span className="text-sm font-medium text-foreground">{line.description || "—"}</span>
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
                <a key={p.id} href={`/api/portal/${token}/media/${p.id}`} target="_blank" rel="noopener noreferrer">
                  <img
                    src={`/api/portal/${token}/media/${p.id}`}
                    alt={p.filename || "Vehicle photo"}
                    className="h-32 w-full rounded-lg border border-border object-cover shadow-sm"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Grand Total + Submit ─────────────────── */}
        <div className="sticky bottom-0 -mx-4 border-t border-border bg-white/90 px-4 py-4 backdrop-blur sm:-mx-0 sm:rounded-2xl sm:border sm:shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Estimate</p>
                <p className="text-3xl font-bold text-foreground">{currency} {grand_total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved Total</p>
                <p className="text-3xl font-bold text-emerald-700">{currency} {approvedTotal.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={submit}
              disabled={!allDecided || submitting || isExpired || !!data.token.used_at}
              className="rounded-xl bg-slate-900 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {data.token.used_at
                ? "Already Submitted"
                : submitting
                ? "Submitting…"
                : !allDecided
                ? "Review all groups first"
                : "Submit My Decisions"}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground sm:text-left">
            {data.token.used_at
              ? "Your decisions have already been recorded."
              : "Your choices will be sent to our team for review."}
          </p>
        </div>
      </div>
    </div>
  );
}