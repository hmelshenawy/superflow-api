"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Job } from "@/types";
import type { WorkshopJobInsight } from "@/lib/workshop-mappers";
import { usePriorityCenter } from "@/hooks/usePriorityCenter";
import { getPriorityAlertCount, PriorityCenter } from "./PriorityCenter";
import { WorkshopKanbanBoard } from "./WorkshopKanbanBoard";
import type { WorkshopBoardStage } from "@/lib/workshop-stage-groups";

interface WorkshopViewProps {
  jobs: Job[];
  insights: WorkshopJobInsight[];
  blockerCounts: Map<string, number>;
  collapsedStages: Set<WorkshopBoardStage>;
  dropStage: WorkshopBoardStage | null;
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

export function WorkshopView({
  jobs,
  insights,
  blockerCounts,
  collapsedStages,
  dropStage,
  draggedJobId,
  updatingJobId,
  onToggleStage,
  onDropJob,
  onDragStart,
  onDragEnd,
  onDragOverStage,
  onDragLeaveStage,
  onCustomerInformed,
}: WorkshopViewProps) {
  const categories = usePriorityCenter(insights);
  const alertCount = getPriorityAlertCount(categories);
  const insightsByJobId = useMemo(() => new Map(insights.map((item) => [item.job.id, item])), [insights]);
  const [isPriorityCenterOpen, setIsPriorityCenterOpen] = useState(true);
  const [isPriorityDrawerOpen, setIsPriorityDrawerOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("prioraflow-workshop-priority-center-open");
    if (saved !== null) setIsPriorityCenterOpen(saved === "true");
  }, []);

  const setDesktopPriorityOpen = (open: boolean) => {
    setIsPriorityCenterOpen(open);
    localStorage.setItem("prioraflow-workshop-priority-center-open", String(open));
  };

  return (
    <div className="relative mt-4">
      <div className="mb-3 flex justify-end xl:hidden">
        <button
          type="button"
          onClick={() => setIsPriorityDrawerOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm"
          aria-label={`Open Priority Center with ${alertCount} alerts`}
        >
          <AlertTriangle className="h-4 w-4 text-red-500" />
          {alertCount} Alerts
        </button>
      </div>

      <div className="flex min-w-0 flex-col gap-4 xl:flex-row">
        <div className="min-w-0 flex-1">
          <WorkshopKanbanBoard
            jobs={jobs}
            collapsedStages={collapsedStages}
            dropStage={dropStage}
            insightsByJobId={insightsByJobId}
            blockerCounts={blockerCounts}
            draggedJobId={draggedJobId}
            updatingJobId={updatingJobId}
            onToggleStage={onToggleStage}
            onDropJob={onDropJob}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOverStage={onDragOverStage}
            onDragLeaveStage={onDragLeaveStage}
            onCustomerInformed={onCustomerInformed}
          />
        </div>

        {isPriorityCenterOpen ? (
          <div className="hidden xl:block">
            <PriorityCenter categories={categories} onCollapse={() => setDesktopPriorityOpen(false)} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDesktopPriorityOpen(true)}
            className="fixed bottom-5 right-5 z-30 hidden items-center gap-2 rounded-full border border-red-200 bg-card px-4 py-2 text-sm font-bold text-red-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl dark:border-red-800/50 dark:text-red-300 xl:inline-flex"
            aria-label={`Open Priority Center with ${alertCount} alerts`}
          >
            <AlertTriangle className="h-4 w-4" />
            {alertCount} Alerts
          </button>
        )}
      </div>

      {isPriorityDrawerOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close Priority Center overlay"
            onClick={() => setIsPriorityDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[min(360px,92vw)] flex-col border-l border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                {alertCount} Alerts
              </span>
              <button
                type="button"
                onClick={() => setIsPriorityDrawerOpen(false)}
                className="rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close Priority Center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <PriorityCenter categories={categories} onClose={() => setIsPriorityDrawerOpen(false)} compact />
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
