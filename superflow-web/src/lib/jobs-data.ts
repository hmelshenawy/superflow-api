import type { Job, JobStatus, PartsStatus, CustomerSensitivity, WorkshopStage } from "@/types";

// ─── State Machine ─────────────────────────────────────────────
// Mirror of backend state machine — single source of truth for frontend transitions.
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  booked: ["checking", "closed", "no_show"],
  checking: ["estimate_sent", "approved", "in_progress", "closed"],
  estimate_sent: ["checking", "approved", "closed"],
  approved: ["estimate_sent", "in_progress", "closed"],
  in_progress: ["waiting_parts", "quality_check", "ready", "closed"],
  waiting_parts: ["in_progress", "closed"],
  quality_check: ["in_progress", "ready"],
  ready: ["quality_check", "closed"],
  closed: [],
  no_show: [],
};

export function getValidTransitions(current: JobStatus): JobStatus[] {
  return [...(TRANSITIONS[current] ?? [])];
}

// ─── Status Metadata ──────────────────────────────────────────
export const STATUS_META: Record<JobStatus, { label: string; tone: string; chip: string; dot: string }> = {
  booked:          { label: "Booked",         tone: "border-border bg-muted text-foreground", chip: "bg-muted text-foreground", dot: "bg-slate-400" },
  checking:         { label: "Checking",       tone: "border-amber-300 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200", chip: "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200", dot: "bg-amber-500" },
  estimate_sent:    { label: "Estimate Sent",  tone: "border-rose-200 dark:border-rose-700/40 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200", chip: "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200", dot: "bg-rose-500" },
  approved:         { label: "Approved",       tone: "border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200", chip: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-500" },
  in_progress:      { label: "In Progress",    tone: "border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200", chip: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200", dot: "bg-blue-500" },
  waiting_parts:    { label: "Waiting Parts",  tone: "border-purple-200 dark:border-purple-700/40 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200", chip: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200", dot: "bg-purple-500" },
  quality_check:    { label: "Quality Check",   tone: "border-cyan-200 dark:border-cyan-700/40 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-200", chip: "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200", dot: "bg-cyan-500" },
  ready:            { label: "Ready",           tone: "border-teal-200 dark:border-teal-700/40 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200", chip: "bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200", dot: "bg-teal-500" },
  closed:           { label: "Closed",         tone: "border-border bg-muted text-foreground", chip: "bg-muted text-foreground", dot: "bg-slate-600" },
  no_show:          { label: "No Show",        tone: "border-border bg-muted text-muted-foreground", chip: "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400", dot: "bg-slate-300" },
};

export const BOARD_COLUMNS: JobStatus[] = [
  "booked", "checking", "estimate_sent", "approved", "in_progress", "waiting_parts", "quality_check", "ready", "closed",
];

export const BOARD_CARD_ACCENT: Record<JobStatus, string> = {
  booked: "border-l-slate-300", checking: "border-l-amber-400", estimate_sent: "border-l-rose-400",
  approved: "border-l-emerald-400", in_progress: "border-l-blue-400", waiting_parts: "border-l-purple-400",
  quality_check: "border-l-cyan-400", ready: "border-l-teal-400", closed: "border-l-slate-400",
  no_show: "border-l-slate-300",
};

export const BOARD_COLUMN_WIDTH = 248;
export const BOARD_COLUMN_COLLAPSED_WIDTH = 46;
export const BOARD_COLUMN_GAP = 12;

export const OVERALL_COLUMN_TONE: Record<JobStatus, string> = {
  booked: "border-blue-200 dark:border-blue-800/40 bg-blue-50/70 dark:bg-blue-950/30",
  checking: "border-blue-200 dark:border-blue-800/40 bg-blue-50/70 dark:bg-blue-950/30",
  estimate_sent: "border-blue-200 dark:border-blue-800/40 bg-blue-50/70 dark:bg-blue-950/30",
  approved: "border-blue-200 dark:border-blue-800/40 bg-blue-50/70 dark:bg-blue-950/30",
  in_progress: "border-orange-200 dark:border-orange-800/40 bg-orange-50/70 dark:bg-orange-950/30",
  waiting_parts: "border-orange-200 dark:border-orange-800/40 bg-orange-50/70 dark:bg-orange-950/30",
  quality_check: "border-orange-200 dark:border-orange-800/40 bg-orange-50/70 dark:bg-orange-950/30",
  ready: "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-emerald-950/30",
  closed: "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-emerald-950/30",
  no_show: "border-slate-200 dark:border-slate-800/40 bg-slate-50/70 dark:bg-slate-950/30",
};

export const OVERALL_COLUMN_HEADER_TONE: Record<JobStatus, string> = {
  booked: "border-blue-200 dark:border-blue-800/40 bg-blue-100/70 dark:bg-blue-900/40",
  checking: "border-blue-200 dark:border-blue-800/40 bg-blue-100/70 dark:bg-blue-900/40",
  estimate_sent: "border-blue-200 dark:border-blue-800/40 bg-blue-100/70 dark:bg-blue-900/40",
  approved: "border-blue-200 dark:border-blue-800/40 bg-blue-100/70 dark:bg-blue-900/40",
  in_progress: "border-orange-200 dark:border-orange-800/40 bg-orange-100/70 dark:bg-orange-900/40",
  waiting_parts: "border-orange-200 dark:border-orange-800/40 bg-orange-100/70 dark:bg-orange-900/40",
  quality_check: "border-orange-200 dark:border-orange-800/40 bg-orange-100/70 dark:bg-orange-900/40",
  ready: "border-emerald-200 dark:border-emerald-800/40 bg-emerald-100/70 dark:bg-emerald-900/40",
  closed: "border-emerald-200 dark:border-emerald-800/40 bg-emerald-100/70 dark:bg-emerald-900/40",
  no_show: "border-slate-200 dark:border-slate-800/40 bg-slate-100/70 dark:bg-slate-900/40",
};

export const OVERALL_PHASES: Array<{ label: string; hint: string; columns: JobStatus[]; className: string }> = [
  { label: "Reception / Advisor", hint: "Booking, checking, estimate, approval", columns: ["booked", "checking", "estimate_sent", "approved"], className: "border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200" },
  { label: "Workshop", hint: "Production, parts, quality control", columns: ["in_progress", "waiting_parts", "quality_check"], className: "border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200" },
  { label: "Delivery", hint: "Ready and closed", columns: ["ready", "closed"], className: "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200" },
];

// ─── Parts / Customer / Workshop Stage ─────────────────────────
export const CUSTOMER_SENSITIVITY_META: Record<CustomerSensitivity, { label: string; score: number; tone: string }> = {
  normal: { label: "Normal", score: 0, tone: "bg-muted text-foreground" },
  vip: { label: "VIP", score: 20, tone: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200" },
  angry: { label: "Angry", score: 20, tone: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200" },
  comeback: { label: "Comeback", score: 15, tone: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200" },
};

export const PARTS_STATUS_META: Record<PartsStatus, { label: string; tone: string }> = {
  no_parts: { label: "No Parts", tone: "bg-muted text-foreground" },
  order_parts: { label: "Order Parts", tone: "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200" },
  waiting_warehouse: { label: "Waiting Warehouse", tone: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200" },
  backorder: { label: "Backorder", tone: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200" },
  parts_ready: { label: "Parts Ready", tone: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200" },
  issued: { label: "Issued", tone: "bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200" },
};

export const WORKSHOP_STAGE_META: Record<WorkshopStage, { label: string; sub: string; tone: string }> = {
  waiting_technician: { label: "Waiting to Start", sub: "Received, waiting technician/bay", tone: "border-orange-200/70 dark:border-orange-700/40/70 bg-orange-50/35 dark:bg-orange-950/30" },
  diagnosis: { label: "Diagnosis", sub: "Inspection / diagnosis active", tone: "border-amber-200/70 dark:border-amber-700/40/70 bg-amber-50/35 dark:bg-amber-950/30" },
  estimate_prep: { label: "Estimate Prep", sub: "Technician/advisor quote prep", tone: "border-blue-200/70 dark:border-blue-700/40/70 bg-blue-50/35 dark:bg-blue-950/30" },
  customer_approval: { label: "Advisor / Approval", sub: "Advisor follow-up + customer approval", tone: "border-rose-200/70 dark:border-rose-700/40/70 bg-rose-50/35 dark:bg-rose-950/30" },
  work_in_progress: { label: "WIP", sub: "Work in progress", tone: "border-sky-200/70 dark:border-sky-700/70 bg-sky-50/35 dark:bg-sky-950/30" },
  final_test: { label: "Final Test", sub: "Road/final test", tone: "border-cyan-200/70 dark:border-cyan-700/40/70 bg-cyan-50/35 dark:bg-cyan-950/30" },
  quality_check: { label: "QC", sub: "Quality check", tone: "border-violet-200/70 dark:border-violet-700/70 bg-violet-50/35 dark:bg-violet-950/30" },
  ready_handover: { label: "Ready Handover", sub: "Ready for delivery", tone: "border-emerald-200/70 dark:border-emerald-700/40/70 bg-emerald-50/35 dark:bg-emerald-950/30" },
};

export const WORKSHOP_STAGE_ACCENT: Record<WorkshopStage, string> = {
  waiting_technician: "border-l-orange-400",
  diagnosis: "border-l-amber-400", estimate_prep: "border-l-blue-400",
  customer_approval: "border-l-rose-400", work_in_progress: "border-l-sky-400",
  final_test: "border-l-cyan-400", quality_check: "border-l-violet-400",
  ready_handover: "border-l-emerald-400",
};

export const WORKSHOP_STAGE_HEADER_TONE: Record<WorkshopStage, string> = {
  waiting_technician: "bg-orange-50/60 dark:bg-orange-950/40",
  diagnosis: "bg-amber-50/60 dark:bg-amber-950/40", estimate_prep: "bg-blue-50/60 dark:bg-blue-950/40",
  customer_approval: "bg-rose-50/60 dark:bg-rose-950/40", work_in_progress: "bg-sky-50/60 dark:bg-sky-950/40",
  final_test: "bg-cyan-50/60 dark:bg-cyan-950/40", quality_check: "bg-violet-50/60 dark:bg-violet-950/40",
  ready_handover: "bg-emerald-50/60 dark:bg-emerald-950/40",
};

export const WORKSHOP_STAGES = (Object.keys(WORKSHOP_STAGE_META) as WorkshopStage[]);

// ─── Display Helpers (UI-only, no scoring logic) ────────────────
// ⚠️  All priority scoring lives in the backend: GET /priority API
// ⚠️  Do not add scoring logic here — it will drift out of sync

export function getVehicleLabel(job: Job) {
  if (!job.vehicle) return "Vehicle pending";
  return [job.vehicle.year, job.vehicle.make, job.vehicle.model].filter(Boolean).join(" ");
}

export function getPlate(job: Job) {
  return job.vehicle?.plate || "No plate";
}

export function isWorkshopPhaseJob(job: Job) {
  return ["in_progress", "waiting_parts", "quality_check", "ready"].includes(job.status);
}

export function getWorkshopStage(job: Job): WorkshopStage | null {
  if (["booked", "checking", "estimate_sent", "approved", "closed"].includes(job.status)) return null;
  if (String(job.workshop_stage) === "advisor_review") return "customer_approval";
  if (job.workshop_stage && WORKSHOP_STAGE_META[job.workshop_stage]) return job.workshop_stage;
  if (job.status === "waiting_parts") return null;
  if (job.status === "in_progress") return "waiting_technician";
  if (job.status === "quality_check") return "quality_check";
  if (job.status === "ready") return "ready_handover";
  return null;
}

export function getPromisedLabel(value: string | null) {
  if (!value) return "No promise set";
  return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(value));
}

// Priority score → badge color (display only, thresholds match backend)
export function getPriorityTone(score?: number) {
  if (!score && score !== 0) return "bg-muted text-muted-foreground ring-border";
  if (score >= 60) return "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 ring-red-200 dark:ring-red-700";
  if (score >= 40) return "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 ring-amber-200 dark:ring-amber-700";
  if (score >= 22) return "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 ring-blue-200 dark:ring-blue-700";
  return "bg-muted text-muted-foreground ring-border";
}

// Urgency level → CSS class (display only)
export function getActionUrgencyClass(urgency: string) {
  if (urgency === "critical") return "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-100 dark:border-red-800/40";
  if (urgency === "high") return "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-100 dark:border-amber-800/40";
  if (urgency === "normal") return "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-100 dark:border-blue-800/40";
  return "bg-muted text-muted-foreground border-border";
}