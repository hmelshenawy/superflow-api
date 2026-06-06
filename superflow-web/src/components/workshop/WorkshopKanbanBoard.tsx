"use client";

import type { Job } from "@/types";
import type { WorkshopJobInsight } from "@/lib/workshop-mappers";
import { useWorkshopColumns } from "@/hooks/useWorkshopView";
import { WORKSHOP_STAGE_GROUPS, type WorkshopBoardStage } from "@/lib/workshop-stage-groups";
import { WorkshopColumn } from "./WorkshopColumn";
import { WorkshopGroupHeader } from "./WorkshopGroupHeader";

const COLUMN_WIDTH = 238;
const COLLAPSED_COLUMN_WIDTH = 46;
const COLUMN_GAP = 12;

interface WorkshopKanbanBoardProps {
  jobs: Job[];
  collapsedStages: Set<WorkshopBoardStage>;
  dropStage: WorkshopBoardStage | null;
  insightsByJobId: Map<string, WorkshopJobInsight>;
  blockerCounts: Map<string, number>;
  draggedJobId: string | null;
  updatingJobId: string | null;
  onToggleStage: (stage: WorkshopBoardStage) => void;
  onDropJob: (jobId: string, stage: WorkshopBoardStage) => Promise<void>;
  onDragStart: (jobId: string) => void;
  onDragEnd: () => void;
  onDragOverStage: (stage: WorkshopBoardStage) => void;
  onDragLeaveStage: () => void;
  onCustomerInformed: (jobId: string) => void;
}

export function WorkshopKanbanBoard({
  jobs,
  collapsedStages,
  dropStage,
  insightsByJobId,
  blockerCounts,
  draggedJobId,
  updatingJobId,
  onToggleStage,
  onDropJob,
  onDragStart,
  onDragEnd,
  onDragOverStage,
  onDragLeaveStage,
  onCustomerInformed,
}: WorkshopKanbanBoardProps) {
  const columns = useWorkshopColumns(jobs);
  const columnsByStage = new Map(columns.map((column) => [column.key, column]));

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted p-3">
      <div className="overflow-x-auto pb-2">
        <div className="mb-3 flex min-w-max gap-3">
          {WORKSHOP_STAGE_GROUPS.map((group) => {
            const width = group.stages.reduce((sum, stage) => sum + (collapsedStages.has(stage) ? COLLAPSED_COLUMN_WIDTH : COLUMN_WIDTH), 0) + Math.max(0, group.stages.length - 1) * COLUMN_GAP;
            const count = group.stages.reduce((sum, stage) => sum + (columnsByStage.get(stage)?.jobs.length || 0), 0);
            return (
              <WorkshopGroupHeader
                key={group.label}
                label={group.label}
                hint={group.hint}
                count={count}
                width={width}
                className={group.className}
              />
            );
          })}
        </div>
        <div className="flex min-w-max gap-3">
          {columns.map((stage) => (
            <WorkshopColumn
              key={stage.key}
              stage={stage}
              isCollapsed={collapsedStages.has(stage.key)}
              isDropTarget={dropStage === stage.key}
              insightsByJobId={insightsByJobId}
              blockerCounts={blockerCounts}
              draggedJobId={draggedJobId}
              updatingJobId={updatingJobId}
              onToggle={onToggleStage}
              onDropJob={onDropJob}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOverStage={onDragOverStage}
              onDragLeaveStage={onDragLeaveStage}
              onCustomerInformed={onCustomerInformed}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
