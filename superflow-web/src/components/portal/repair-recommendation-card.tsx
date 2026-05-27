import { AlertTriangle, ChevronDown, ChevronUp, ClipboardCheck, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";
import { DecisionControls } from "./decision-controls";
import { FindingPhotoGrid } from "./finding-photo-grid";
import type { GroupDecisionState, PortalDecision, QuoteGroup } from "./types";
import { DECISION_STATUS_LABEL, formatMoney, getGroupPhotos, getGroupSummary, getSeverityLabel } from "./utils";

interface RepairRecommendationCardProps {
  group: QuoteGroup;
  token: string;
  currency: string;
  expanded: boolean;
  decision?: GroupDecisionState;
  lockedDecision?: GroupDecisionState;
  onToggle: () => void;
  onDecisionChange: (decision: PortalDecision) => void;
  onCommentChange: (comment: string) => void;
}

const decisionClass: Record<PortalDecision, string> = {
  approved: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
  declined: "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800",
  deferred: "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
};

const severityClass: Record<"red" | "amber", string> = {
  red: "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800",
  amber: "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
};

export function RepairRecommendationCard({
  group,
  token,
  currency,
  expanded,
  decision,
  lockedDecision,
  onToggle,
  onDecisionChange,
  onCommentChange,
}: RepairRecommendationCardProps) {
  const displayDecision = decision || lockedDecision;
  const photos = getGroupPhotos(group);
  const summary = getGroupSummary(group);
  const severityLabel = getSeverityLabel(group.severity);
  const hasDecisionButtons = group.lines.some((line) => line.is_actionable) || group.is_locked;
  const canEdit = !group.is_locked && group.lines.some((line) => line.is_actionable);
  const showComment = canEdit && (decision?.decision === "declined" || decision?.decision === "deferred");
  const technicianFinding = group.concern?.technician_finding || group.finding?.tech_notes;
  const workNote = group.concern?.work_note;
  const qcNote = group.concern?.qc_note;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {severityLabel && group.severity ? (
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${severityClass[group.severity]}`}>
                  {severityLabel}
                </span>
              ) : null}
              {displayDecision ? (
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${decisionClass[displayDecision.decision]}`}>
                  {DECISION_STATUS_LABEL[displayDecision.decision]}
                </span>
              ) : null}
              {group.is_locked ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Already submitted</span> : null}
            </div>
            <h2 className="mt-2 text-lg font-bold leading-tight text-slate-950 dark:text-white">{group.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{summary}</p>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label={expanded ? "Collapse recommendation" : "Expand recommendation"}
          >
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total cost</p>
            <p className="text-2xl font-bold text-slate-950 dark:text-white">{formatMoney(currency, group.total)}</p>
          </div>
          {hasDecisionButtons ? (
            <DecisionControls value={displayDecision?.decision} disabled={!canEdit} onChange={onDecisionChange} />
          ) : (
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Information only</span>
          )}
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-5">
          <div className="space-y-4">
            {technicianFinding ? (
              <InfoBlock icon={<ClipboardCheck className="h-4 w-4" />} title="What we found" text={technicianFinding} />
            ) : null}
            {workNote ? <InfoBlock icon={<MessageSquareText className="h-4 w-4" />} title="Workshop update" text={workNote} /> : null}
            {qcNote ? <InfoBlock icon={<ClipboardCheck className="h-4 w-4" />} title="Quality check" text={qcNote} /> : null}
            {!technicianFinding && !workNote && !qcNote ? (
              <InfoBlock icon={<AlertTriangle className="h-4 w-4" />} title="Details" text={summary} />
            ) : null}
            <FindingPhotoGrid photos={photos} token={token} label={`${group.title} photo`} />
            {showComment ? (
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor={`comment-${group.key}`}>
                  Add a note for the service team
                </label>
                <input
                  id={`comment-${group.key}`}
                  type="text"
                  value={decision?.comment || ""}
                  onChange={(event) => onCommentChange(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-slate-600"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function InfoBlock({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex gap-2">
        <div className="mt-0.5 text-slate-500">{icon}</div>
        <div>
          <p className="text-sm font-bold text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
        </div>
      </div>
    </div>
  );
}
