"use client";

import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; tone: string; dot: string }> = {
  draft: { label: "Draft", tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", dot: "bg-slate-400" },
  issued: { label: "Issued", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", tone: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200", dot: "bg-red-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", meta.tone)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
