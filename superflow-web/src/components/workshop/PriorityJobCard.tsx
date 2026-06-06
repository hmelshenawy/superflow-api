"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWorkshopStage, STATUS_META, WORKSHOP_STAGE_META } from "@/lib/jobs-data";
import type { WorkshopJobInsight } from "@/lib/workshop-mappers";

export function PriorityJobCard({ item }: { item: WorkshopJobInsight }) {
  const { job } = item;
  const stage = getWorkshopStage(job);
  const stageLabel = stage ? WORKSHOP_STAGE_META[stage].label : STATUS_META[job.status]?.label ?? job.status;

  return (
    <Link href={`/jobs/${job.id}`} className="block rounded-xl border border-border bg-card p-3 transition hover:border-slate-300 hover:shadow-sm dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-black text-foreground">#{job.job_number || "Draft"}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">Stage: {stageLabel}</p>
        </div>
        {item.isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
        <span>Idle: {Math.round(item.idleHours)}h</span>
        <span className="truncate">Advisor: {job.advisor?.name || job.owner_code || "—"}</span>
        <span className="truncate">Tech: {job.technician?.name || "—"}</span>
        <span className="truncate">Status: {STATUS_META[job.status]?.label ?? job.status}</span>
      </div>

      {item.nextAction?.title ? (
        <p className="mt-2 line-clamp-2 text-xs font-medium text-foreground">{item.nextAction.title}</p>
      ) : null}

      <Button variant="outline" size="sm" className="mt-3 h-8 w-full rounded-lg text-xs">
        Open Job <ArrowRight className="ml-1 h-3 w-3" />
      </Button>
    </Link>
  );
}
