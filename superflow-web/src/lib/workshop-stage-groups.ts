import type { Job, WorkshopStage } from "@/types";
import { getWorkshopStage, WORKSHOP_STAGE_META } from "@/lib/jobs-data";

export type WorkshopBoardStage = WorkshopStage | "waiting_parts";

export interface WorkshopBoardColumnMeta {
  key: WorkshopBoardStage;
  label: string;
  sub: string;
  tone: string;
}

export interface WorkshopStageGroup {
  label: string;
  hint: string;
  stages: WorkshopBoardStage[];
  className: string;
}

export const WORKSHOP_BOARD_STAGE_ORDER: WorkshopBoardStage[] = [
  "waiting_technician",
  "diagnosis",
  "estimate_prep",
  "customer_approval",
  "waiting_parts",
  "work_in_progress",
  "final_test",
  "quality_check",
  "ready_handover",
];

/* ─── Group 1: PRE-WORK ─── */
const PRE_TONE   = "border-blue-200/70 dark:border-blue-700/40 bg-blue-50/35 dark:bg-blue-950/30";
const PRE_HEAD   = "bg-blue-50/60 dark:bg-blue-950/40";
const PRE_ACCENT = "border-l-blue-400";

/* ─── Group 2: IN-WORK ─── */
const IN_TONE    = "border-amber-200/70 dark:border-amber-700/40 bg-amber-50/35 dark:bg-amber-950/30";
const IN_HEAD    = "bg-amber-50/60 dark:bg-amber-950/40";
const IN_ACCENT  = "border-l-amber-400";

/* ─── Group 3: COMPLETION ─── */
const COMP_TONE   = "border-emerald-200/70 dark:border-emerald-700/40 bg-emerald-50/35 dark:bg-emerald-950/30";
const COMP_HEAD   = "bg-emerald-50/60 dark:bg-emerald-950/40";
const COMP_ACCENT = "border-l-emerald-400";

export const WORKSHOP_BOARD_STAGE_META: Record<WorkshopBoardStage, WorkshopBoardColumnMeta> = {
  waiting_technician: { key: "waiting_technician", label: "Waiting to Start",   sub: "Received, waiting technician/bay",        tone: PRE_TONE },
  diagnosis:          { key: "diagnosis",          label: "Diagnosis",          sub: "Inspection / diagnosis active",           tone: PRE_TONE },
  estimate_prep:      { key: "estimate_prep",      label: "Estimate Prep",      sub: "Technician/advisor quote prep",           tone: PRE_TONE },
  customer_approval:  { key: "customer_approval",  label: "Advisor / Approval", sub: "Advisor follow-up + customer approval",   tone: PRE_TONE },
  waiting_parts:      { key: "waiting_parts",      label: "Waiting Parts",      sub: "Parts required / delayed",                tone: IN_TONE },
  work_in_progress:   { key: "work_in_progress",   label: "WIP",                sub: "Work in progress",                        tone: IN_TONE },
  final_test:         { key: "final_test",         label: "Final Test",         sub: "Road/final test",                         tone: IN_TONE },
  quality_check:      { key: "quality_check",      label: "QC",                 sub: "Quality check",                           tone: COMP_TONE },
  ready_handover:     { key: "ready_handover",     label: "Ready Handover",     sub: "Ready for delivery",                      tone: COMP_TONE },
};

export const WORKSHOP_BOARD_STAGE_ACCENT: Record<WorkshopBoardStage, string> = {
  waiting_technician: PRE_ACCENT,
  diagnosis:          PRE_ACCENT,
  estimate_prep:      PRE_ACCENT,
  customer_approval:  PRE_ACCENT,
  waiting_parts:      IN_ACCENT,
  work_in_progress:   IN_ACCENT,
  final_test:         IN_ACCENT,
  quality_check:      COMP_ACCENT,
  ready_handover:     COMP_ACCENT,
};

export const WORKSHOP_BOARD_STAGE_HEADER_TONE: Record<WorkshopBoardStage, string> = {
  waiting_technician: PRE_HEAD,
  diagnosis:          PRE_HEAD,
  estimate_prep:      PRE_HEAD,
  customer_approval:  PRE_HEAD,
  waiting_parts:      IN_HEAD,
  work_in_progress:   IN_HEAD,
  final_test:         IN_HEAD,
  quality_check:      COMP_HEAD,
  ready_handover:     COMP_HEAD,
};

export const WORKSHOP_STAGE_GROUPS: WorkshopStageGroup[] = [
  {
    label: "PRE-WORK",
    hint: "Waiting, diagnosis, estimate, approval",
    stages: ["waiting_technician", "diagnosis", "estimate_prep", "customer_approval"],
    className: "border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200",
  },
  {
    label: "IN-WORK",
    hint: "Parts, production, final test",
    stages: ["waiting_parts", "work_in_progress", "final_test"],
    className: "border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200",
  },
  {
    label: "COMPLETION",
    hint: "Quality control and handover",
    stages: ["quality_check", "ready_handover"],
    className: "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200",
  },
];

export function getWorkshopBoardStage(job: Job): WorkshopBoardStage | null {
  if (job.status === "waiting_parts") return "waiting_parts";
  return getWorkshopStage(job);
}
