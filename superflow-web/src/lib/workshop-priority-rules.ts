import type { Job, WorkshopStage } from "@/types";
import { getWorkshopStage } from "@/lib/jobs-data";
import type { WorkshopJobInsight } from "@/lib/workshop-mappers";

export type PriorityCategoryKey =
  | "overdue"
  | "idle"
  | "partsEtaMissing"
  | "approvalDelay"
  | "readyForDelivery";

export type PriorityCategories = Record<PriorityCategoryKey, WorkshopJobInsight[]>;

const PARTS_BLOCKING_STATUSES = new Set(["order_parts", "waiting_warehouse", "backorder"]);
const APPROVAL_STAGES = new Set<WorkshopStage>(["customer_approval"]);

function isPastPromise(job: Job) {
  if (!job.promised_at || job.status === "closed" || job.status === "no_show") return false;
  return new Date(job.promised_at).getTime() < Date.now();
}

function isPartsBlocked(job: Job) {
  return job.status === "waiting_parts" || PARTS_BLOCKING_STATUSES.has(job.parts_status ?? "");
}

function isReadyForDelivery(job: Job) {
  return job.status === "ready" || getWorkshopStage(job) === "ready_handover";
}

export function getWorkshopPriorityCategories(items: WorkshopJobInsight[]): PriorityCategories {
  return {
    overdue: items.filter((item) => item.isOverdue || isPastPromise(item.job)),
    idle: items.filter((item) => !["ready", "closed", "no_show"].includes(item.job.status) && item.idleHours >= 24),
    partsEtaMissing: items.filter((item) => isPartsBlocked(item.job)),
    approvalDelay: items.filter((item) => {
      const stage = getWorkshopStage(item.job);
      return (stage && APPROVAL_STAGES.has(stage) || item.job.status === "estimate_sent") && item.idleHours >= 48;
    }),
    readyForDelivery: items.filter((item) => isReadyForDelivery(item.job)),
  };
}
