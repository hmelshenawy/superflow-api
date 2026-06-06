import type { Job } from "@/types";

export interface WorkshopJobInsight {
  job: Job;
  idleHours: number;
  priorityScore: number;
  isOverdue: boolean;
  nextAction: {
    title: string;
    reason?: string;
    urgency: string;
    owner: string;
    actionType: string;
    signals?: string[];
  };
}

export function getJobIdleHours(job: Job): number {
  if (typeof job.meta?.idleHours === "number") return job.meta.idleHours;

  const updatedAt = job.updated_at ? new Date(job.updated_at).getTime() : Date.now();
  if (!Number.isFinite(updatedAt)) return 0;

  return Math.max(0, (Date.now() - updatedAt) / 3_600_000);
}

export function mapJobToWorkshopInsight(job: Job): WorkshopJobInsight {
  const fallbackNextAction = job.meta?.nextAction ?? {
    title: "Review job",
    urgency: "low",
    owner: "workshop",
    actionType: "review",
    signals: [],
  };

  return {
    job,
    idleHours: getJobIdleHours(job),
    priorityScore: job.meta?.priorityScore ?? 0,
    isOverdue: Boolean(job.meta?.isOverdue),
    nextAction: fallbackNextAction,
  };
}
