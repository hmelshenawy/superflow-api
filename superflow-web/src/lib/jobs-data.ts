import type { Job, JobStatus, PartsStatus, CustomerSensitivity, WorkshopStage } from "@/types";

// ─── Priority Weights ──────────────────────────────────────────
export const DEFAULT_PRIORITY_WEIGHTS = {
  promiseOverdue: 30,
  promiseDue2h: 20,
  promiseDue6h: 10,
  noPromiseDate: 5,
  customerWaiting: 22,
  customerAngry: 18,
  customerVip: 16,
  customerComeback: 14,
  waitingCustomerDecision: 20,
  partsBackorder: 22,
  partsWaitingWarehouse: 16,
  partsNeedOrder: 12,
  idle12h: 12,
  idle6h: 6,
  stageCheckingDiagnosis: 10,
  stageQcNearDelivery: 10,
  readyToInform: 20,
  highEstimateValue: 8,
  mediumEstimateValue: 4,
};

export type PriorityWeights = typeof DEFAULT_PRIORITY_WEIGHTS;

export function normalizePriorityWeights(value: unknown): PriorityWeights {
  const source = typeof value === "object" && value !== null ? value as Partial<Record<keyof PriorityWeights, unknown>> : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_PRIORITY_WEIGHTS).map(([key, fallback]) => {
      const raw = source[key as keyof PriorityWeights];
      const parsed = typeof raw === "number" ? raw : Number(raw);
      return [key, Number.isFinite(parsed) ? Math.max(0, Math.min(30, parsed)) : fallback];
    }),
  ) as PriorityWeights;
}

// ─── Status Metadata ──────────────────────────────────────────
export const STATUS_META: Record<JobStatus, { label: string; tone: string; chip: string; dot: string }> = {
  booked: { label: "Booked", tone: "border-slate-200 bg-slate-50 text-slate-700", chip: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  checking: { label: "Checking", tone: "border-amber-300 bg-amber-50 text-amber-900", chip: "bg-amber-100 text-amber-900", dot: "bg-amber-500" },
  estimate_sent: { label: "Estimate Sent", tone: "border-rose-200 bg-rose-50 text-rose-800", chip: "bg-rose-100 text-rose-800", dot: "bg-rose-500" },
  approved: { label: "Approved", tone: "border-emerald-200 bg-emerald-50 text-emerald-800", chip: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  in_progress: { label: "In Progress", tone: "border-blue-200 bg-blue-50 text-blue-800", chip: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  waiting_parts: { label: "Waiting Parts", tone: "border-purple-200 bg-purple-50 text-purple-800", chip: "bg-purple-100 text-purple-800", dot: "bg-purple-500" },
  quality_check: { label: "Quality Check", tone: "border-cyan-200 bg-cyan-50 text-cyan-800", chip: "bg-cyan-100 text-cyan-800", dot: "bg-cyan-500" },
  ready: { label: "Ready", tone: "border-teal-200 bg-teal-50 text-teal-800", chip: "bg-teal-100 text-teal-800", dot: "bg-teal-500" },
  closed: { label: "Closed", tone: "border-slate-300 bg-slate-100 text-slate-700", chip: "bg-slate-200 text-slate-700", dot: "bg-slate-600" },
};

export const BOARD_COLUMNS: JobStatus[] = [
  "booked", "checking", "estimate_sent", "approved", "in_progress", "waiting_parts", "quality_check", "ready", "closed",
];

export const BOARD_CARD_ACCENT: Record<JobStatus, string> = {
  booked: "border-l-slate-300", checking: "border-l-amber-400", estimate_sent: "border-l-rose-400",
  approved: "border-l-emerald-400", in_progress: "border-l-blue-400", waiting_parts: "border-l-purple-400",
  quality_check: "border-l-cyan-400", ready: "border-l-teal-400", closed: "border-l-slate-400",
};

export const BOARD_COLUMN_WIDTH = 248;
export const BOARD_COLUMN_COLLAPSED_WIDTH = 46;
export const BOARD_COLUMN_GAP = 12;

export const OVERALL_COLUMN_TONE: Record<JobStatus, string> = {
  booked: "border-blue-200 bg-blue-50/70", checking: "border-blue-200 bg-blue-50/70",
  estimate_sent: "border-blue-200 bg-blue-50/70", approved: "border-blue-200 bg-blue-50/70",
  in_progress: "border-orange-200 bg-orange-50/70", waiting_parts: "border-orange-200 bg-orange-50/70",
  quality_check: "border-orange-200 bg-orange-50/70",
  ready: "border-emerald-200 bg-emerald-50/70", closed: "border-emerald-200 bg-emerald-50/70",
};

export const OVERALL_COLUMN_HEADER_TONE: Record<JobStatus, string> = {
  booked: "border-blue-200 bg-blue-100/70", checking: "border-blue-200 bg-blue-100/70",
  estimate_sent: "border-blue-200 bg-blue-100/70", approved: "border-blue-200 bg-blue-100/70",
  in_progress: "border-orange-200 bg-orange-100/70", waiting_parts: "border-orange-200 bg-orange-100/70",
  quality_check: "border-orange-200 bg-orange-100/70",
  ready: "border-emerald-200 bg-emerald-100/70", closed: "border-emerald-200 bg-emerald-100/70",
};

export const OVERALL_PHASES: Array<{ label: string; hint: string; columns: JobStatus[]; className: string }> = [
  { label: "Reception / Advisor", hint: "Booking, checking, estimate, approval", columns: ["booked", "checking", "estimate_sent", "approved"], className: "border-blue-200 bg-blue-50 text-blue-900" },
  { label: "Workshop", hint: "Production, parts, quality control", columns: ["in_progress", "waiting_parts", "quality_check"], className: "border-orange-200 bg-orange-50 text-orange-900" },
  { label: "Delivery", hint: "Ready and closed", columns: ["ready", "closed"], className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
];

// ─── Parts / Customer / Workshop Stage ─────────────────────────
export const CUSTOMER_SENSITIVITY_META: Record<CustomerSensitivity, { label: string; score: number; tone: string }> = {
  normal: { label: "Normal", score: 0, tone: "bg-slate-100 text-slate-700" },
  vip: { label: "VIP", score: 20, tone: "bg-purple-100 text-purple-800" },
  angry: { label: "Angry", score: 20, tone: "bg-red-100 text-red-800" },
  comeback: { label: "Comeback", score: 15, tone: "bg-amber-100 text-amber-800" },
};

export const PARTS_STATUS_META: Record<PartsStatus, { label: string; tone: string }> = {
  no_parts: { label: "No Parts", tone: "bg-slate-100 text-slate-700" },
  order_parts: { label: "Order Parts", tone: "bg-amber-100 text-amber-800" },
  waiting_warehouse: { label: "Waiting Warehouse", tone: "bg-purple-100 text-purple-800" },
  backorder: { label: "Backorder", tone: "bg-red-100 text-red-800" },
  parts_ready: { label: "Parts Ready", tone: "bg-emerald-100 text-emerald-800" },
};

export const WORKSHOP_STAGE_META: Record<WorkshopStage, { label: string; sub: string; tone: string }> = {
  waiting_technician: { label: "Waiting to Start", sub: "Received, waiting technician/bay", tone: "border-orange-200/70 bg-orange-50/35" },
  received: { label: "Waiting to Start", sub: "Received, waiting technician/bay", tone: "border-orange-200/70 bg-orange-50/35" },
  diagnosis: { label: "Diagnosis", sub: "Inspection / diagnosis active", tone: "border-amber-200/70 bg-amber-50/35" },
  estimate_prep: { label: "Estimate Prep", sub: "Technician/advisor quote prep", tone: "border-blue-200/70 bg-blue-50/35" },
  customer_approval: { label: "Advisor / Approval", sub: "Advisor follow-up + customer approval", tone: "border-rose-200/70 bg-rose-50/35" },
  work_in_progress: { label: "WIP", sub: "Work in progress", tone: "border-sky-200/70 bg-sky-50/35" },
  final_test: { label: "Final Test", sub: "Road/final test", tone: "border-cyan-200/70 bg-cyan-50/35" },
  quality_check: { label: "QC", sub: "Quality check", tone: "border-violet-200/70 bg-violet-50/35" },
  ready_handover: { label: "Ready Handover", sub: "Ready for delivery", tone: "border-emerald-200/70 bg-emerald-50/35" },
};

export const WORKSHOP_STAGE_ACCENT: Record<WorkshopStage, string> = {
  waiting_technician: "border-l-orange-400", received: "border-l-orange-400",
  diagnosis: "border-l-amber-400", estimate_prep: "border-l-blue-400",
  customer_approval: "border-l-rose-400", work_in_progress: "border-l-sky-400",
  final_test: "border-l-cyan-400", quality_check: "border-l-violet-400",
  ready_handover: "border-l-emerald-400",
};

export const WORKSHOP_STAGE_HEADER_TONE: Record<WorkshopStage, string> = {
  waiting_technician: "bg-orange-50/60", received: "bg-orange-50/60",
  diagnosis: "bg-amber-50/60", estimate_prep: "bg-blue-50/60",
  customer_approval: "bg-rose-50/60", work_in_progress: "bg-sky-50/60",
  final_test: "bg-cyan-50/60", quality_check: "bg-violet-50/60",
  ready_handover: "bg-emerald-50/60",
};

export const WORKSHOP_STAGES = (Object.keys(WORKSHOP_STAGE_META) as WorkshopStage[]).filter(
  (stage) => !["received", "advisor_review", "parts_check"].includes(stage),
);

// ─── Helpers ───────────────────────────────────────────────────
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
  if (job.workshop_stage === "received") return "waiting_technician";
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

export function isOverdue(job: Job, nowTs?: number | null) {
  if (!job.promised_at) return false;
  if (["ready", "closed"].includes(job.status)) return false;
  if (!nowTs) return false;
  return new Date(job.promised_at).getTime() < nowTs;
}

export function getEstimateTotal(job: Job) {
  return (job.estimate_lines ?? []).reduce((sum, line) => sum + Number(line.line_total ?? 0), 0);
}

export function getPriorityTone(score?: number) {
  if (!score && score !== 0) return "bg-slate-100 text-slate-600 ring-slate-200";
  if (score >= 85) return "bg-red-100 text-red-800 ring-red-200";
  if (score >= 65) return "bg-amber-100 text-amber-800 ring-amber-200";
  if (score >= 40) return "bg-blue-100 text-blue-800 ring-blue-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function getActionUrgencyClass(urgency: string) {
  if (urgency === "critical") return "bg-red-50 text-red-800 border-red-100";
  if (urgency === "high") return "bg-amber-50 text-amber-800 border-amber-100";
  if (urgency === "normal") return "bg-blue-50 text-blue-800 border-blue-100";
  return "bg-slate-50 text-slate-700 border-slate-100";
}

// ─── Next Best Action ──────────────────────────────────────────
export type NextActionOwner = "advisor" | "workshop" | "parts" | "customer";
export type NextActionUrgency = "low" | "normal" | "high" | "critical";

export type NextBestAction = {
  title: string;
  reason: string;
  urgency: NextActionUrgency;
  owner: NextActionOwner;
  actionType: string;
  score: number;
  signals: string[];
};

export function buildNextBestAction(job: Job, nowTs?: number | null): NextBestAction {
  const now = nowTs ?? Date.now();
  const promisedTs = job.promised_at ? new Date(job.promised_at).getTime() : null;
  const hoursToPromise = promisedTs ? (promisedTs - now) / 36e5 : null;
  const promiseOverdue = isOverdue(job, now);
  const promiseDueSoon = hoursToPromise !== null && hoursToPromise <= 2 && !promiseOverdue;
  const promiseDueToday = hoursToPromise !== null && hoursToPromise <= 6 && !promiseOverdue;
  const idleHours = Math.max(0, (now - new Date(job.updated_at).getTime()) / 36e5);
  const partsStatus = job.parts_status ?? "no_parts";
  const sensitivity = job.customer_sensitivity ?? "normal";
  const estimateTotal = getEstimateTotal(job);
  const workshopStage = getWorkshopStage(job);

  const signals = [
    promiseOverdue ? "promise overdue" : null,
    promiseDueSoon ? "promise due within 2h" : null,
    promiseDueToday && !promiseDueSoon ? "promise due within 6h" : null,
    job.is_customer_waiting ? "customer waiting" : null,
    sensitivity !== "normal" ? `${CUSTOMER_SENSITIVITY_META[sensitivity]?.label ?? sensitivity} customer` : null,
    idleHours >= 12 ? "idle 12h+" : idleHours >= 6 ? "idle 6h+" : null,
    partsStatus !== "no_parts" ? `parts: ${partsStatus}` : null,
    estimateTotal >= 10000 ? "high estimate value" : estimateTotal >= 5000 ? "medium estimate value" : null,
  ].filter(Boolean) as string[];

  const riskBoost =
    (promiseOverdue ? 22 : promiseDueSoon ? 14 : promiseDueToday ? 7 : 0) +
    (job.is_customer_waiting ? 10 : 0) +
    (sensitivity === "angry" ? 8 : sensitivity === "vip" ? 6 : sensitivity === "comeback" ? 5 : 0) +
    (idleHours >= 12 ? 8 : idleHours >= 6 ? 4 : 0) +
    (partsStatus === "backorder" ? 10 : partsStatus === "waiting_warehouse" ? 7 : partsStatus === "order_parts" ? 5 : 0);

  const urgencyFromScore = (score: number): NextActionUrgency => (
    score >= 55 ? "critical" : score >= 38 ? "high" : score >= 22 ? "normal" : "low"
  );

  const makeAction = ({ title, reason, owner, actionType, baseScore, extraSignals = [] }: {
    title: string; reason: string; owner: NextActionOwner; actionType: string; baseScore: number; extraSignals?: string[];
  }): NextBestAction => {
    const score = Math.max(0, Math.min(100, Math.round(baseScore + riskBoost)));
    const riskReason = signals.length ? ` Risk signals: ${signals.join(", ")}.` : "";
    return { title, reason: `${reason}${riskReason}`, urgency: urgencyFromScore(score), owner, actionType, score, signals: [...signals, ...extraSignals] };
  };

  if (job.status === "booked") return makeAction({ title: "Receive vehicle and start check-in", reason: "Booking is still in reception phase. Receive the vehicle before it enters workshop flow.", owner: "advisor", actionType: "vehicle_check_in", baseScore: 16, extraSignals: ["booked/reception phase"] });
  if (job.status === "checking") return makeAction({ title: "Complete diagnosis and prepare estimate", reason: "Vehicle is in checking/diagnosis. Confirm findings and prepare the estimate for customer decision.", owner: "advisor", actionType: "diagnosis_to_estimate", baseScore: 24, extraSignals: ["checking/diagnosis phase"] });
  if (job.status === "estimate_sent") return makeAction({ title: "Follow up customer decision", reason: "Estimate has been sent. The vehicle cannot move forward until the customer approves, rejects, or asks a question.", owner: "advisor", actionType: "customer_decision_follow_up", baseScore: 30, extraSignals: ["waiting customer decision"] });
  if (job.status === "approved") return makeAction({ title: "Print job card and release to workshop", reason: "Customer approval is received. The next operational step is to print/open the job card and hand it to workshop control.", owner: "advisor", actionType: "print_job_card_release_workshop", baseScore: 26, extraSignals: ["approved phase", "ready for workshop release"] });
  if (job.status === "waiting_parts") return makeAction({ title: "Check parts ETA and update plan", reason: "Job is blocked by parts. Confirm ETA/status and update advisor, workshop, and customer plan if needed.", owner: "parts", actionType: "parts_eta_check", baseScore: 28, extraSignals: ["waiting parts phase"] });
  if (job.status === "in_progress") {
    if (workshopStage === "waiting_technician" || !job.technician_id) return makeAction({ title: "Assign technician and start work", reason: "Job is already in workshop phase but still needs a clear technician/workshop owner.", owner: "workshop", actionType: "assign_technician", baseScore: 26, extraSignals: ["workshop phase", "needs technician"] });
    if (workshopStage === "customer_approval") return makeAction({ title: "Resolve advisor / approval blocker", reason: "Workshop progress is blocked by advisor/customer approval. Clear the decision before work continues.", owner: "advisor", actionType: "workshop_approval_blocker", baseScore: 30, extraSignals: ["workshop approval blocker"] });
    if (["order_parts", "waiting_warehouse", "backorder"].includes(partsStatus)) return makeAction({ title: "Check parts ETA and unblock technician", reason: "Work is active but parts are blocking progress. Confirm ETA and update workshop plan.", owner: "parts", actionType: "parts_eta_check", baseScore: 30, extraSignals: ["parts blocking active work"] });
    return makeAction({ title: "Check technician progress", reason: "Work is in progress. Confirm progress, blockers, and expected finish time.", owner: "workshop", actionType: "technician_progress_check", baseScore: 22, extraSignals: ["work in progress"] });
  }
  if (job.status === "quality_check") return makeAction({ title: "Complete QC and prepare delivery", reason: "Vehicle is near delivery. Finish quality check, confirm readiness, and prepare handover.", owner: "workshop", actionType: "qc_completion", baseScore: 28, extraSignals: ["QC / near delivery"] });
  if (job.status === "ready") return makeAction({ title: "Notify customer for collection", reason: "Vehicle is ready. Contact the customer and arrange delivery/collection.", owner: "advisor", actionType: "ready_collection_notice", baseScore: 24, extraSignals: ["ready for delivery"] });
  return makeAction({ title: "Review job", reason: "No specific phase action was detected. Review the job for normal follow-up.", owner: "advisor", actionType: "general_review", baseScore: 5 });
}