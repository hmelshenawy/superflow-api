"use client";

import Link from "next/link";
import { AlertTriangle, Clock3, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActionUrgencyClass,
  getPlate,
  getPromisedLabel,
  getVehicleLabel,
  PARTS_STATUS_META,
} from "@/lib/jobs-data";
import type { Job } from "@/types";
import type { WorkshopJobInsight } from "@/lib/workshop-mappers";
import { WORKSHOP_BOARD_STAGE_ACCENT, type WorkshopBoardStage } from "@/lib/workshop-stage-groups";

interface WorkshopJobCardProps {
  job: Job;
  stageKey: WorkshopBoardStage;
  insight?: WorkshopJobInsight;
  blockerCount: number;
  draggedJobId: string | null;
  updatingJobId: string | null;
  onDragStart: (jobId: string) => void;
  onDragEnd: () => void;
  onCustomerInformed: (jobId: string) => void;
}

export function WorkshopJobCard({
  job,
  stageKey,
  insight,
  blockerCount,
  draggedJobId,
  updatingJobId,
  onDragStart,
  onDragEnd,
  onCustomerInformed,
}: WorkshopJobCardProps) {
  const overdue = Boolean(insight?.isOverdue);

  return (
    <Link
      href={`/jobs/${job.id}`}
      draggable
      onDragStart={(event) => {
        onDragStart(job.id);
        event.dataTransfer.setData("text/plain", job.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "block rounded-xl border border-l-4 border-border bg-card p-2.5 text-xs shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:hover:border-slate-600",
        WORKSHOP_BOARD_STAGE_ACCENT[stageKey],
        overdue && "border-l-red-500 bg-red-50/40 dark:border-l-red-500 dark:bg-red-950/15",
        draggedJobId === job.id && "opacity-60",
        updatingJobId === job.id && "ring-2 ring-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <span className="mt-0.5 shrink-0 cursor-grab rounded-md border border-border bg-muted p-1 text-muted-foreground" title="Drag to move" onClick={(event) => event.preventDefault()}>
            <GripVertical className="h-3 w-3" />
          </span>
          <div className="min-w-0">
            <p className="inline-flex max-w-full rounded-md border border-blue-200 bg-blue-50/80 px-2 py-0.5 text-[13px] font-black leading-none tracking-[0.08em] text-blue-950 shadow-sm dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-200">
              <span className="truncate tabular-nums">#{job.job_number || "Draft"}</span>
            </p>
            <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">{getVehicleLabel(job)}</p>
            <p className="mt-0.5 truncate text-[12px] font-black tracking-[0.12em] text-foreground tabular-nums">{getPlate(job)}</p>
          </div>
        </div>
        <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-bold", overdue ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" : (insight?.priorityScore ?? 0) >= 40 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground")}>
          {insight?.priorityScore ?? 0}
        </span>
      </div>

      {job.parts_status && job.parts_status !== "no_parts" ? (
        <div className={cn("mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", PARTS_STATUS_META[job.parts_status]?.tone)}>
          {PARTS_STATUS_META[job.parts_status]?.label}
        </div>
      ) : null}

      {blockerCount ? (
        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-900/50 dark:text-red-300">
          <AlertTriangle className="h-3 w-3" />{blockerCount} blocker{blockerCount > 1 ? "s" : ""}
        </div>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
        <span className="truncate">Advisor: {job.advisor?.name || "—"}</span>
        <span className="truncate">Tech: {job.technician?.name || "—"}</span>
        <span className="truncate">Idle: {Math.round(insight?.idleHours ?? 0)}h</span>
        <span className={cn("truncate font-semibold", overdue ? "text-red-700 dark:text-red-300" : "text-muted-foreground")}>
          {overdue ? "Overdue" : job.promised_at ? getPromisedLabel(job.promised_at) : "No promise"}
        </span>
      </div>

      <div className={cn("mt-2 rounded-lg border px-2 py-1 text-[11px] font-semibold", getActionUrgencyClass(insight?.nextAction.urgency ?? "low"))}>
        {stageKey === "waiting_technician" ? "Assign technician" : stageKey === "customer_approval" ? "Advisor / customer approval" : stageKey === "waiting_parts" ? "Confirm parts ETA" : insight?.nextAction.title ?? "Review job"}
      </div>

      {job.status === "ready" && !job.customer_informed ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onCustomerInformed(job.id);
          }}
          className="mt-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-200"
        >
          Inform customer
        </button>
      ) : null}
    </Link>
  );
}
