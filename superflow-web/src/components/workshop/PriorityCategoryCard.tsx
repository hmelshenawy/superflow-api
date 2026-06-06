"use client";

import { AlertTriangle, CheckCircle2, Clock3, Package, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriorityCategoryKey } from "@/lib/workshop-priority-rules";

const CATEGORY_META: Record<PriorityCategoryKey, { label: string; icon: React.ElementType; tone: string }> = {
  overdue: { label: "Overdue Jobs", icon: AlertTriangle, tone: "border-red-200 text-red-700 dark:border-red-800/50 dark:text-red-300" },
  idle: { label: "Idle > 24h", icon: Clock3, tone: "border-red-200 text-red-700 dark:border-red-800/50 dark:text-red-300" },
  partsEtaMissing: { label: "Parts ETA Missing", icon: Package, tone: "border-amber-200 text-amber-700 dark:border-amber-800/50 dark:text-amber-300" },
  approvalDelay: { label: "Approval Delays", icon: PhoneCall, tone: "border-amber-200 text-amber-700 dark:border-amber-800/50 dark:text-amber-300" },
  readyForDelivery: { label: "Ready For Delivery", icon: CheckCircle2, tone: "border-emerald-200 text-emerald-700 dark:border-emerald-800/50 dark:text-emerald-300" },
};

export { CATEGORY_META };

export function PriorityCategoryCard({
  category,
  count,
  onClick,
}: {
  category: PriorityCategoryKey;
  count: number;
  onClick: () => void;
}) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center justify-between rounded-xl border bg-card px-3 py-2.5 text-left transition hover:border-slate-300 hover:shadow-sm dark:hover:border-slate-700", meta.tone)}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate text-sm font-semibold">{meta.label}</span>
      </span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-foreground">{count}</span>
    </button>
  );
}
