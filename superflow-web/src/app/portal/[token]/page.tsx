"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { CostSummaryBar } from "@/components/portal/cost-summary-bar";
import { CustomerPortalLayout } from "@/components/portal/customer-portal-layout";
import { FindingPhotoGrid } from "@/components/portal/finding-photo-grid";
import { PortalHeader } from "@/components/portal/portal-header";
import { PortalProgress } from "@/components/portal/portal-progress";
import { PortalState } from "@/components/portal/portal-state";
import { RepairRecommendationCard } from "@/components/portal/repair-recommendation-card";
import type { ExistingDecision, Finding, GroupDecisionState, PortalData, PortalDecision, QuoteGroup } from "@/components/portal/types";
import { formatMoney, getActionableLines, getPortalApiBase } from "@/components/portal/utils";
import { VehicleStatusCard } from "@/components/portal/vehicle-status-card";

const STAGE_LABELS: Record<string, string> = {
  initial_findings: "Findings shared",
  approval_needed: "Waiting for your decision",
  work_in_progress: "Repair work in progress",
  final_report: "Final report ready",
};

const lineVatAmount = (line: { line_total: number; tax_amount?: number; tax_rate_pct: number }) => {
  const storedVat = Number(line.tax_amount ?? 0);
  if (storedVat > 0) return storedVat;
  return Number(line.line_total || 0) * (Number(line.tax_rate_pct || 0) / 100);
};

export default function PortalPage() {
  const params = useParams<{ token?: string | string[] }>();
  const pathname = usePathname();
  const tokenParam = params?.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam || pathname.split("/").filter(Boolean).at(-1) || "";
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, GroupDecisionState>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    console.log("PORTAL_EFFECT_V1", { token, pathname });
    if (!token) return;

    const apiBase = getPortalApiBase();
    fetch(`${apiBase}/portal/${token}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.status === 404 ? "Link not found" : response.status === 410 ? "Link expired" : "Failed to load");
        }
        return response.json();
      })
      .then((portalData: PortalData) => {
        setData(portalData);
        setExpandedGroups(getInitialExpandedGroups(portalData.grouped_estimate));
        setDecisions(getExistingGroupDecisions(portalData.grouped_estimate, portalData.existing_decisions));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  const existingDecisionByLine = useMemo(
    () => new Map((data?.existing_decisions ?? []).map((decision) => [decision.estimate_line_id, toGroupDecision(decision)])),
    [data?.existing_decisions],
  );

  const portalCanSubmit = data?.can_submit ?? false;
  const allActionableGroupsDecided = Boolean(data?.grouped_estimate?.length) && data.grouped_estimate.every((group) => {
    const actionable = getUnlockedActionableLines(group, existingDecisionByLine);
    if (actionable.length === 0) return true;
    return Boolean(decisions[group.key]?.decision);
  });

  const approvedTotal = useMemo(() => {
    if (!data) return 0;
    return data.approved_total + data.grouped_estimate.reduce((sum, group) => {
      if (decisions[group.key]?.decision !== "approved") return sum;
      return sum + getUnlockedActionableLines(group, existingDecisionByLine).reduce((lineSum, line) => lineSum + Number(line.line_total || 0) + lineVatAmount(line), 0);
    }, 0);
  }, [data, decisions, existingDecisionByLine]);
  const approvedSubtotal = useMemo(() => {
    if (!data) return 0;
    return (data.approved_subtotal ?? 0) + data.grouped_estimate.reduce((sum, group) => {
      if (decisions[group.key]?.decision !== "approved") return sum;
      return sum + getUnlockedActionableLines(group, existingDecisionByLine).reduce((lineSum, line) => lineSum + Number(line.line_total || 0), 0);
    }, 0);
  }, [data, decisions, existingDecisionByLine]);
  const approvedVatAmount = useMemo(() => {
    if (!data) return 0;
    return (data.approved_vat_amount ?? 0) + data.grouped_estimate.reduce((sum, group) => {
      if (decisions[group.key]?.decision !== "approved") return sum;
      return sum + getUnlockedActionableLines(group, existingDecisionByLine).reduce((lineSum, line) => lineSum + lineVatAmount(line), 0);
    }, 0);
  }, [data, decisions, existingDecisionByLine]);

  const recommendationGroups = data?.grouped_estimate ?? [];
  const hasUnlockedActionableLines = recommendationGroups.some((group) => getUnlockedActionableLines(group, existingDecisionByLine).length > 0);
  const attachedFindingIds = new Set(recommendationGroups.map((group) => group.finding?.id).filter(Boolean));
  const standaloneFindings = (data?.findings ?? []).filter((finding) => !attachedFindingIds.has(finding.id));
  const stage = data?.released_snapshot?.stage || data?.stage || "initial_findings";
  const stageLabel = STAGE_LABELS[stage] || "Service update";

  const setDecision = (groupKey: string, decision: PortalDecision) => {
    setDecisions((current) => ({
      ...current,
      [groupKey]: { decision, comment: current[groupKey]?.comment || "" },
    }));
  };

  const setComment = (groupKey: string, comment: string) => {
    setDecisions((current) => ({
      ...current,
      [groupKey]: { decision: current[groupKey]?.decision || "approved", comment },
    }));
  };

  const submit = async () => {
    if (!data || !token || !portalCanSubmit || !allActionableGroupsDecided) return;

    setSubmitting(true);
    try {
      const payload = {
        decisions: data.grouped_estimate.flatMap((group) => {
          const groupDecision = decisions[group.key];
          if (!groupDecision) return [];
          return getUnlockedActionableLines(group, existingDecisionByLine).map((line) => ({
            estimate_line_id: line.id,
            decision: groupDecision.decision,
            customer_comment: groupDecision.comment || null,
          }));
        }),
      };

      const response = await fetch(`${getPortalApiBase()}/portal/${token}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Submission failed");
      }

      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PortalState type="loading" />;

  if (error || !data) {
    return (
      <PortalState
        type="error"
        title={error || "Something went wrong"}
        message="Please contact your service advisor if the problem continues."
      />
    );
  }

  if (submitted) {
    return (
      <PortalState
        type="submitted"
        title="Thank you"
        message="Your decisions have been submitted. Our team will review them and continue with the next step."
      />
    );
  }

  return (
    <CustomerPortalLayout
      footer={
        <CostSummaryBar
          currency={data.currency}
          subtotal={data.subtotal ?? data.grand_total}
          vatAmount={data.vat_amount ?? 0}
          grandTotal={data.grand_total}
          approvedSubtotal={approvedSubtotal}
          approvedVatAmount={approvedVatAmount}
          approvedTotal={approvedTotal}
          canSubmit={portalCanSubmit && hasUnlockedActionableLines}
          complete={allActionableGroupsDecided}
          hasActionableLines={hasUnlockedActionableLines}
          hasEstimate={data.grouped_estimate.length > 0}
          submitting={submitting}
          usedAt={data.token.used_at}
          onSubmit={submit}
        />
      }
    >
      <PortalHeader data={data} />
      <VehicleStatusCard data={data} stageLabel={stageLabel} />
      <PortalProgress stage={stage} />

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Repair recommendations</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Open any item to see photos and workshop notes. You can decide from the card summary.
          </p>
        </div>

        {recommendationGroups.length ? (
          recommendationGroups.map((group) => {
            const lockedDecision = group.lines.map((line) => existingDecisionByLine.get(line.id)).find(Boolean);
            const effectiveGroup = getEffectiveGroup(group, existingDecisionByLine);
            return (
              <RepairRecommendationCard
                key={group.key}
                group={effectiveGroup}
                token={token}
                currency={data.currency}
                expanded={expandedGroups[group.key] ?? false}
                decision={decisions[group.key]}
                lockedDecision={lockedDecision}
                onToggle={() => setExpandedGroups((current) => ({ ...current, [group.key]: !current[group.key] }))}
                onDecisionChange={(decision) => setDecision(group.key, decision)}
                onCommentChange={(comment) => setComment(group.key, comment)}
              />
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            The workshop has not released any repair costs yet. Please refresh this page after your advisor sends the next update.
          </div>
        )}
      </section>

      {standaloneFindings.length ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Other findings</h2>
          {standaloneFindings.map((finding) => (
            <StandaloneFinding key={finding.id} finding={finding} token={token} />
          ))}
        </section>
      ) : null}

      {data.job_photos?.length ? <GeneralVehiclePhotos photos={data.job_photos} token={token} /> : null}

      {/* <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <p>
          Total estimate: <span className="font-bold text-slate-950 dark:text-white">{formatMoney(data.currency, data.grand_total)}</span>
        </p>
        <p className="mt-1">Only the total cost is shown here. Detailed workshop pricing stays with the service team.</p>
      </section> */}
    </CustomerPortalLayout>
  );
}

function StandaloneFinding({ finding, token }: { finding: Finding; token: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button type="button" onClick={() => setExpanded((current) => !current)} className="flex w-full items-start justify-between gap-3 p-4 text-left transition duration-150 hover:bg-slate-50 dark:hover:bg-slate-950">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Information only</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{finding.label}</h3>
          {finding.tech_notes ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{finding.tech_notes}</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {expanded ? "Hide" : "Expand"}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          {finding.tech_notes ? <p className="mb-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{finding.tech_notes}</p> : null}
          <FindingPhotoGrid photos={finding.photos ?? []} token={token} label={`${finding.label} photo`} />
        </div>
      ) : null}
    </article>
  );
}

function GeneralVehiclePhotos({ photos, token }: { photos: PortalData["job_photos"]; token: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!photos?.length) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button type="button" onClick={() => setExpanded((current) => !current)} className="flex w-full items-start justify-between gap-3 p-4 text-left transition duration-150 hover:bg-slate-50 dark:hover:bg-slate-950 sm:p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">General vehicle photos</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {photos.length} {photos.length === 1 ? "photo" : "photos"} from the vehicle check-in and workshop review.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {expanded ? "Hide" : "Expand"}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
          <FindingPhotoGrid photos={photos} token={token} label="General vehicle photo" />
        </div>
      ) : null}
    </section>
  );
}

function getInitialExpandedGroups(groups: QuoteGroup[]) {
  return Object.fromEntries(groups.map((group, index) => [group.key, index === 0])) as Record<string, boolean>;
}

function getExistingGroupDecisions(groups: QuoteGroup[], existingDecisions: ExistingDecision[]) {
  const byLine = new Map(existingDecisions.map((decision) => [decision.estimate_line_id, toGroupDecision(decision)]));
  const existing: Record<string, GroupDecisionState> = {};

  groups.forEach((group) => {
    const groupDecisions = group.lines.map((line) => byLine.get(line.id)).filter(Boolean) as GroupDecisionState[];
    if (!groupDecisions.length) return;

    const first = groupDecisions[0];
    const allSameDecision = groupDecisions.every((item) => item.decision === first.decision);
    const sharedComment = groupDecisions.find((item) => item.comment)?.comment || "";

    if (allSameDecision) {
      existing[group.key] = { decision: first.decision, comment: sharedComment };
    }
  });

  return existing;
}

function toGroupDecision(decision: ExistingDecision): GroupDecisionState {
  return {
    decision: decision.decision,
    comment: decision.customer_comment || "",
  };
}

function getUnlockedActionableLines(group: QuoteGroup, existingDecisionByLine: Map<string, GroupDecisionState>) {
  return getActionableLines(group).filter((line) => !existingDecisionByLine.has(line.id));
}

function getEffectiveGroup(group: QuoteGroup, existingDecisionByLine: Map<string, GroupDecisionState>): QuoteGroup {
  const lines = group.lines.map((line) => ({
    ...line,
    is_actionable: line.is_actionable && !existingDecisionByLine.has(line.id),
  }));

  return {
    ...group,
    lines,
    is_locked: lines.length > 0 && lines.every((line) => existingDecisionByLine.has(line.id)),
  };
}
