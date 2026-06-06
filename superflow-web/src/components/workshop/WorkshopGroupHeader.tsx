"use client";

import { cn } from "@/lib/utils";

export function WorkshopGroupHeader({
  label,
  hint,
  count,
  width,
  className,
}: {
  label: string;
  hint: string;
  count: number;
  width: number;
  className: string;
}) {
  return (
    <div style={{ width }} className={cn("rounded-2xl border px-3.5 py-2.5 shadow-sm ring-1 ring-border/60", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em]">{label}</p>
          <p className="truncate text-[11px] opacity-75">{hint}</p>
        </div>
        <span className="shrink-0 rounded-full bg-card/80 px-2 py-0.5 text-[11px] font-bold shadow-sm">{count}</span>
      </div>
    </div>
  );
}
