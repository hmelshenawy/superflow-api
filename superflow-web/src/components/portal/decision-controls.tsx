import { CheckCircle, Clock, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { PortalDecision } from "./types";
import { DECISION_LABEL } from "./utils";

interface DecisionControlsProps {
  value?: PortalDecision;
  disabled?: boolean;
  onChange: (decision: PortalDecision) => void;
}

const baseClass = "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition duration-150 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 sm:flex-none";

export function DecisionControls({ value, disabled, onChange }: DecisionControlsProps) {
  const options: { decision: PortalDecision; icon: ReactNode; activeClass: string; idleClass: string }[] = [
    {
      decision: "approved",
      icon: <CheckCircle className="h-4 w-4" />,
      activeClass: "border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
      idleClass: "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
    },
    {
      decision: "declined",
      icon: <XCircle className="h-4 w-4" />,
      activeClass: "border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200",
      idleClass: "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:text-rose-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
    },
    {
      decision: "deferred",
      icon: <Clock className="h-4 w-4" />,
      activeClass: "border-amber-300 bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200",
      idleClass: "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200",
    },
  ];

  return (
    <div className="flex w-full gap-2 sm:w-auto">
      {options.map((option) => {
        const active = value === option.decision;
        return (
          <button
            key={option.decision}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.decision)}
            className={`${baseClass} ${active ? option.activeClass : option.idleClass} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {option.icon}
            {DECISION_LABEL[option.decision]}
          </button>
        );
      })}
    </div>
  );
}
