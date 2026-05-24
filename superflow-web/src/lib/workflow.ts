import type { Job, WorkflowStageConfig } from "@/types";

export const WORKFLOW_COLOR_CLASSES: Record<string, { column: string; header: string; accent: string; dot: string; chip: string }> = {
  slate: { column: "border-slate-200 bg-slate-50/70 dark:border-slate-800/40 dark:bg-slate-950/30", header: "bg-slate-100/80 dark:bg-slate-900/50", accent: "border-l-slate-400", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-200" },
  blue: { column: "border-blue-200 bg-blue-50/70 dark:border-blue-800/40 dark:bg-blue-950/30", header: "bg-blue-100/80 dark:bg-blue-900/50", accent: "border-l-blue-400", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200" },
  amber: { column: "border-amber-200 bg-amber-50/70 dark:border-amber-800/40 dark:bg-amber-950/30", header: "bg-amber-100/80 dark:bg-amber-900/50", accent: "border-l-amber-400", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" },
  rose: { column: "border-rose-200 bg-rose-50/70 dark:border-rose-800/40 dark:bg-rose-950/30", header: "bg-rose-100/80 dark:bg-rose-900/50", accent: "border-l-rose-400", dot: "bg-rose-500", chip: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200" },
  pink: { column: "border-pink-200 bg-pink-50/70 dark:border-pink-800/40 dark:bg-pink-950/30", header: "bg-pink-100/80 dark:bg-pink-900/50", accent: "border-l-pink-400", dot: "bg-pink-500", chip: "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200" },
  purple: { column: "border-purple-200 bg-purple-50/70 dark:border-purple-800/40 dark:bg-purple-950/30", header: "bg-purple-100/80 dark:bg-purple-900/50", accent: "border-l-purple-400", dot: "bg-purple-500", chip: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200" },
  indigo: { column: "border-indigo-200 bg-indigo-50/70 dark:border-indigo-800/40 dark:bg-indigo-950/30", header: "bg-indigo-100/80 dark:bg-indigo-900/50", accent: "border-l-indigo-400", dot: "bg-indigo-500", chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200" },
  cyan: { column: "border-cyan-200 bg-cyan-50/70 dark:border-cyan-800/40 dark:bg-cyan-950/30", header: "bg-cyan-100/80 dark:bg-cyan-900/50", accent: "border-l-cyan-400", dot: "bg-cyan-500", chip: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200" },
  emerald: { column: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/40 dark:bg-emerald-950/30", header: "bg-emerald-100/80 dark:bg-emerald-900/50", accent: "border-l-emerald-400", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" },
  zinc: { column: "border-zinc-200 bg-zinc-50/70 dark:border-zinc-800/40 dark:bg-zinc-950/30", header: "bg-zinc-100/80 dark:bg-zinc-900/50", accent: "border-l-zinc-400", dot: "bg-zinc-500", chip: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200" },
  stone: { column: "border-stone-200 bg-stone-50/70 dark:border-stone-800/40 dark:bg-stone-950/30", header: "bg-stone-100/80 dark:bg-stone-900/50", accent: "border-l-stone-400", dot: "bg-stone-400", chip: "bg-stone-100 text-stone-800 dark:bg-stone-900/50 dark:text-stone-200" },
};

export function workflowColor(color?: string) {
  return WORKFLOW_COLOR_CLASSES[color || "slate"] ?? WORKFLOW_COLOR_CLASSES.slate;
}

export function getJobWorkflowStage(job: Job, stages: WorkflowStageConfig[]) {
  // Prefer backend-computed workflow stage key
  const meta = (job as any).meta;
  if (meta?.resolvedWorkflowStageKey) {
    const configured = stages.find((stage) => stage.key === meta.resolvedWorkflowStageKey && stage.isActive);
    if (configured) return configured;
  }

  // Fallback: derive from status (kept for safety during transition)
  if (job.workflow_stage_key) {
    const configured = stages.find((stage) => stage.key === job.workflow_stage_key && stage.isActive);
    if (configured) return configured;
  }
  const exact = stages.find((stage) => stage.isActive && stage.systemStatus === job.status);
  if (exact) return exact;

  const category = job.status === "booked" ? "booked"
    : job.status === "ready" ? "ready"
    : job.status === "closed" ? "closed"
    : job.status === "no_show" ? "cancelled"
    : "active";
  const sameCategory = stages.find((stage) => stage.isActive && stage.systemCategory === category);
  if (sameCategory) return sameCategory;

  return category === "active"
    ? stages.find((stage) => stage.isActive && stage.systemCategory === "active") ?? null
    : null;
}
