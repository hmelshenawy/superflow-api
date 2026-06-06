"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";
import type { WorkshopJobInsight } from "@/lib/workshop-mappers";
import { WORKSHOP_BOARD_STAGE_HEADER_TONE, type WorkshopBoardStage } from "@/lib/workshop-stage-groups";
import { WorkshopJobCard } from "./WorkshopJobCard";

interface WorkshopColumnProps {
  stage: {
    key: WorkshopBoardStage;
    label: string;
    sub: string;
    tone: string;
    jobs: Job[];
  };
  isCollapsed: boolean;
  isDropTarget: boolean;
  insightsByJobId: Map<string, WorkshopJobInsight>;
  blockerCounts: Map<string, number>;
  draggedJobId: string | null;
  updatingJobId: string | null;
  onToggle: (stage: WorkshopBoardStage) => void;
  onDropJob: (jobId: string, stage: WorkshopBoardStage) => Promise<void>;
  onDragStart: (jobId: string) => void;
  onDragEnd: () => void;
  onDragOverStage: (stage: WorkshopBoardStage) => void;
  onDragLeaveStage: () => void;
  onCustomerInformed: (jobId: string) => void;
}

export function WorkshopColumn({
  stage,
  isCollapsed,
  isDropTarget,
  insightsByJobId,
  blockerCounts,
  draggedJobId,
  updatingJobId,
  onToggle,
  onDropJob,
  onDragStart,
  onDragEnd,
  onDragOverStage,
  onDragLeaveStage,
  onCustomerInformed,
}: WorkshopColumnProps) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (draggedJobId) onDragOverStage(stage.key);
      }}
      onDragLeave={onDragLeaveStage}
      onDrop={async (event) => {
        event.preventDefault();
        const jobId = event.dataTransfer.getData("text/plain") || draggedJobId;
        if (!jobId) return;
        await onDropJob(jobId, stage.key);
      }}
      className={cn(
        "flex h-[calc(100vh-230px)] min-h-[520px] shrink-0 flex-col rounded-[16px] border shadow-sm ring-1 ring-border/70 transition-all",
        stage.tone,
        isCollapsed ? "w-[46px]" : "w-[238px]",
        isDropTarget && "border-blue-400 bg-blue-50/50 ring-2 ring-blue-200",
      )}
    >
      <div
        className={cn("cursor-pointer select-none border-b border-border/70 px-3 py-2.5", WORKSHOP_BOARD_STAGE_HEADER_TONE[stage.key])}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle(stage.key);
          }
        }}
        onClick={() => onToggle(stage.key)}
      >
        <div className={cn("flex items-start justify-between gap-2", isCollapsed && "flex-col items-center")}>
          {isCollapsed ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <span className="h-2 w-2 shrink-0 rounded-full bg-foreground/50" />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-foreground">{stage.label}</h3>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{stage.sub}</p>
            </div>
          )}
          <span className="rounded-full bg-card px-2 py-1 text-[11px] font-bold text-foreground/80 shadow-sm">{stage.jobs.length}</span>
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
          {stage.jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/70 p-4 text-center text-xs text-muted-foreground">No vehicles</div>
          ) : (
            stage.jobs.map((job) => (
              <WorkshopJobCard
                key={`${stage.key}-${job.id}`}
                job={job}
                stageKey={stage.key}
                insight={insightsByJobId.get(job.id)}
                blockerCount={blockerCounts.get(job.id) ?? 0}
                draggedJobId={draggedJobId}
                updatingJobId={updatingJobId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onCustomerInformed={onCustomerInformed}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
