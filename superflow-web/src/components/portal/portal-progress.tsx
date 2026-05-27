import { Check } from "lucide-react";

const steps = [
  { key: "initial_findings", label: "Findings" },
  { key: "approval_needed", label: "Your decision" },
  { key: "work_in_progress", label: "Repair work" },
  { key: "final_report", label: "Ready" },
];

interface PortalProgressProps {
  stage?: string | null;
}

export function PortalProgress({ stage }: PortalProgressProps) {
  const activeIndex = Math.max(steps.findIndex((step) => step.key === stage), 0);

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {steps.map((step, index) => {
        const active = index <= activeIndex;
        return (
          <div key={step.key} className={`rounded-xl border px-2 py-2 text-center ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"}`}>
            <div className={`mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full ${active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-800"}`}>
              {active ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </div>
            <p className="text-[11px] font-semibold leading-tight">{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}
