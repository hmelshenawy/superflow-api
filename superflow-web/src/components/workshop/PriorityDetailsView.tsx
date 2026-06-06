"use client";

import { ArrowLeft } from "lucide-react";
import type { PriorityCategoryKey } from "@/lib/workshop-priority-rules";
import type { WorkshopJobInsight } from "@/lib/workshop-mappers";
import { CATEGORY_META } from "./PriorityCategoryCard";
import { PriorityJobCard } from "./PriorityJobCard";

export function PriorityDetailsView({
  category,
  jobs,
  onBack,
}: {
  category: PriorityCategoryKey;
  jobs: WorkshopJobInsight[];
  onBack: () => void;
}) {
  const meta = CATEGORY_META[category];

  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="mt-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Priority Center</p>
        <h3 className="mt-1 text-base font-semibold text-foreground">{meta.label} ({jobs.length})</h3>
      </div>

      <div className="mt-3 space-y-2">
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">No jobs in this category.</div>
        ) : (
          jobs.map((item) => <PriorityJobCard key={item.job.id} item={item} />)
        )}
      </div>
    </div>
  );
}
