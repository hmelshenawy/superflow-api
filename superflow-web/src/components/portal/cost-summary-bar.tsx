import { Loader2 } from "lucide-react";
import { formatMoney } from "./utils";

interface CostSummaryBarProps {
  currency: string;
  grandTotal: number;
  approvedTotal: number;
  canSubmit: boolean;
  complete: boolean;
  hasActionableLines: boolean;
  hasEstimate: boolean;
  submitting: boolean;
  usedAt?: string | null;
  onSubmit: () => void;
}

export function CostSummaryBar({
  currency,
  grandTotal,
  approvedTotal,
  canSubmit,
  complete,
  hasActionableLines,
  hasEstimate,
  submitting,
  usedAt,
  onSubmit,
}: CostSummaryBarProps) {
  const disabled = !canSubmit || !complete || submitting;
  const label = submitting
    ? "Submitting"
    : !hasEstimate
      ? "Waiting for estimate"
      : !hasActionableLines
        ? "No new decisions"
        : !canSubmit
          ? "Cannot submit"
          : !complete
            ? "Choose each item"
            : "Submit decisions";

  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total estimate</p>
            <p className="text-lg font-bold text-slate-950 dark:text-white">{formatMoney(currency, grandTotal)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Approved total</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatMoney(currency, approvedTotal)}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onSubmit}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {label}
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
        {!hasActionableLines
          ? "Previous decisions are saved. New recommendations will appear here when released."
          : usedAt
            ? "Previous decisions stay locked. You can submit only the new recommendations in this update."
            : "Your choices will be sent to the service team."}
      </p>
    </footer>
  );
}
