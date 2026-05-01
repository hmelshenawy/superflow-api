"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Job, JobStatus, PaginatedResponse, WorkshopStage, PartsStatus, CustomerSensitivity } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock3,
  GripVertical,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  Package,
  PhoneCall,
  TimerReset,
  UserRound,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";


const DEFAULT_PRIORITY_WEIGHTS = {
  promiseOverdue: 30,
  promiseDue2h: 20,
  promiseDue6h: 10,
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
  highEstimateValue: 8,
  mediumEstimateValue: 4,
};

type PriorityWeights = typeof DEFAULT_PRIORITY_WEIGHTS;

function normalizePriorityWeights(value: unknown): PriorityWeights {
  const source = typeof value === "object" && value !== null ? value as Partial<Record<keyof PriorityWeights, unknown>> : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_PRIORITY_WEIGHTS).map(([key, fallback]) => {
      const raw = source[key as keyof PriorityWeights];
      const parsed = typeof raw === "number" ? raw : Number(raw);
      return [key, Number.isFinite(parsed) ? Math.max(0, Math.min(30, parsed)) : fallback];
    }),
  ) as PriorityWeights;
}

const STATUS_META: Record<
  JobStatus,
  {
    label: string;
    tone: string;
    chip: string;
    dot: string;
  }
> = {
  booked: {
    label: "Booked",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    chip: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
  },
  checking: {
    label: "Checking",
    tone: "border-amber-300 bg-amber-50 text-amber-900",
    chip: "bg-amber-100 text-amber-900",
    dot: "bg-amber-500",
  },
  estimate_sent: {
    label: "Estimate Sent",
    tone: "border-rose-200 bg-rose-50 text-rose-800",
    chip: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
  },
  approved: {
    label: "Approved",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    chip: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  in_progress: {
    label: "In Progress",
    tone: "border-blue-200 bg-blue-50 text-blue-800",
    chip: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500",
  },
  waiting_parts: {
    label: "Waiting Parts",
    tone: "border-purple-200 bg-purple-50 text-purple-800",
    chip: "bg-purple-100 text-purple-800",
    dot: "bg-purple-500",
  },
  quality_check: {
    label: "Quality Check",
    tone: "border-cyan-200 bg-cyan-50 text-cyan-800",
    chip: "bg-cyan-100 text-cyan-800",
    dot: "bg-cyan-500",
  },
  ready: {
    label: "Ready",
    tone: "border-teal-200 bg-teal-50 text-teal-800",
    chip: "bg-teal-100 text-teal-800",
    dot: "bg-teal-500",
  },
  closed: {
    label: "Closed",
    tone: "border-slate-300 bg-slate-100 text-slate-700",
    chip: "bg-slate-200 text-slate-700",
    dot: "bg-slate-600",
  },
};

const BOARD_COLUMNS: JobStatus[] = [
  "booked",
  "checking",
  "estimate_sent",
  "approved",
  "in_progress",
  "waiting_parts",
  "quality_check",
  "ready",
  "closed",
];

const OVERALL_PHASES: Array<{
  label: string;
  hint: string;
  columns: JobStatus[];
  className: string;
}> = [
  {
    label: "Reception / Advisor",
    hint: "Booking, checking, estimate, approval",
    columns: ["booked", "checking", "estimate_sent", "approved"],
    className: "border-blue-200 bg-blue-50 text-blue-900",
  },
  {
    label: "Workshop",
    hint: "Production, parts, quality control",
    columns: ["in_progress", "waiting_parts", "quality_check"],
    className: "border-orange-200 bg-orange-50 text-orange-900",
  },
  {
    label: "Delivery",
    hint: "Ready and closed",
    columns: ["ready", "closed"],
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
];


const OVERALL_COLUMN_TONE: Record<JobStatus, string> = {
  booked: "border-blue-200 bg-blue-50/70",
  checking: "border-blue-200 bg-blue-50/70",
  estimate_sent: "border-blue-200 bg-blue-50/70",
  approved: "border-blue-200 bg-blue-50/70",
  in_progress: "border-orange-200 bg-orange-50/70",
  waiting_parts: "border-orange-200 bg-orange-50/70",
  quality_check: "border-orange-200 bg-orange-50/70",
  ready: "border-emerald-200 bg-emerald-50/70",
  closed: "border-emerald-200 bg-emerald-50/70",
};

const OVERALL_COLUMN_HEADER_TONE: Record<JobStatus, string> = {
  booked: "border-blue-200 bg-blue-100/70",
  checking: "border-blue-200 bg-blue-100/70",
  estimate_sent: "border-blue-200 bg-blue-100/70",
  approved: "border-blue-200 bg-blue-100/70",
  in_progress: "border-orange-200 bg-orange-100/70",
  waiting_parts: "border-orange-200 bg-orange-100/70",
  quality_check: "border-orange-200 bg-orange-100/70",
  ready: "border-emerald-200 bg-emerald-100/70",
  closed: "border-emerald-200 bg-emerald-100/70",
};


const CUSTOMER_SENSITIVITY_META: Record<CustomerSensitivity, { label: string; score: number; tone: string }> = {
  normal: { label: "Normal", score: 0, tone: "bg-slate-100 text-slate-700" },
  vip: { label: "VIP", score: 20, tone: "bg-purple-100 text-purple-800" },
  angry: { label: "Angry", score: 20, tone: "bg-red-100 text-red-800" },
  comeback: { label: "Comeback", score: 15, tone: "bg-amber-100 text-amber-800" },
};

const PARTS_STATUS_META: Record<PartsStatus, { label: string; tone: string }> = {
  no_parts: { label: "No Parts", tone: "bg-slate-100 text-slate-700" },
  order_parts: { label: "Order Parts", tone: "bg-amber-100 text-amber-800" },
  waiting_warehouse: { label: "Waiting Warehouse", tone: "bg-purple-100 text-purple-800" },
  backorder: { label: "Backorder", tone: "bg-red-100 text-red-800" },
  parts_ready: { label: "Parts Ready", tone: "bg-emerald-100 text-emerald-800" },
};

const WORKSHOP_STAGE_META: Record<
  WorkshopStage,
  { label: string; sub: string; tone: string }
> = {
  waiting_technician: { label: "Waiting to Start", sub: "Received, waiting technician/bay", tone: "border-orange-200 bg-orange-50" },
  received: { label: "Waiting to Start", sub: "Received, waiting technician/bay", tone: "border-orange-200 bg-orange-50" },
  diagnosis: { label: "Diagnosis", sub: "Inspection / diagnosis active", tone: "border-amber-200 bg-amber-50" },
  estimate_prep: { label: "Estimate Prep", sub: "Technician/advisor quote prep", tone: "border-blue-200 bg-blue-50" },
  customer_approval: { label: "Advisor / Approval", sub: "Advisor follow-up + customer approval", tone: "border-rose-200 bg-rose-50" },
  work_in_progress: { label: "WIP", sub: "Work in progress", tone: "border-sky-200 bg-sky-50" },
  final_test: { label: "Final Test", sub: "Road/final test", tone: "border-cyan-200 bg-cyan-50" },
  quality_check: { label: "QC", sub: "Quality check", tone: "border-cyan-200 bg-cyan-50" },
  ready_handover: { label: "Ready Handover", sub: "Ready for delivery", tone: "border-emerald-200 bg-emerald-50" },
};

const WORKSHOP_STAGES = (Object.keys(WORKSHOP_STAGE_META) as WorkshopStage[]).filter((stage) => !["received", "advisor_review", "parts_check"].includes(stage));

function getWorkshopStage(job: Job): WorkshopStage | null {
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

function getVehicleLabel(job: Job) {
  if (!job.vehicle) return "Vehicle pending";
  return [job.vehicle.year, job.vehicle.make, job.vehicle.model]
    .filter(Boolean)
    .join(" ");
}

function getPlate(job: Job) {
  return job.vehicle?.plate || "No plate";
}

function isWorkshopPhaseJob(job: Job) {
  return ["in_progress", "waiting_parts", "quality_check", "ready"].includes(job.status);
}

function getPromisedLabel(value: string | null) {
  if (!value) return "No promise set";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}

function isOverdue(job: Job, nowTs?: number | null) {
  if (!job.promised_at) return false;
  if (["ready", "closed"].includes(job.status)) return false;
  if (!nowTs) return false;
  return new Date(job.promised_at).getTime() < nowTs;
}

function getEstimateTotal(job: Job) {
  return (job.estimate_lines ?? []).reduce(
    (sum, line) => sum + Number(line.line_total ?? 0),
    0,
  );
}


type NextActionOwner = "advisor" | "workshop" | "parts" | "customer";
type NextActionUrgency = "low" | "normal" | "high" | "critical";

type NextBestAction = {
  title: string;
  reason: string;
  urgency: NextActionUrgency;
  owner: NextActionOwner;
  actionType: string;
  score: number;
  signals: string[];
};

function buildNextBestAction(job: Job, nowTs?: number | null): NextBestAction {
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

  const makeAction = ({
    title,
    reason,
    owner,
    actionType,
    baseScore,
    extraSignals = [],
  }: {
    title: string;
    reason: string;
    owner: NextActionOwner;
    actionType: string;
    baseScore: number;
    extraSignals?: string[];
  }): NextBestAction => {
    const score = Math.max(0, Math.min(100, Math.round(baseScore + riskBoost)));
    const riskReason = signals.length ? ` Risk signals: ${signals.join(", ")}.` : "";
    return {
      title,
      reason: `${reason}${riskReason}`,
      urgency: urgencyFromScore(score),
      owner,
      actionType,
      score,
      signals: [...signals, ...extraSignals],
    };
  };

  // Phase-first selector: job status decides the operational next step.
  // Risk signals only raise urgency and explain why the step matters now.
  if (job.status === "booked") {
    return makeAction({
      title: "Receive vehicle and start check-in",
      reason: "Booking is still in reception phase. Receive the vehicle before it enters workshop flow.",
      owner: "advisor",
      actionType: "vehicle_check_in",
      baseScore: 16,
      extraSignals: ["booked/reception phase"],
    });
  }

  if (job.status === "checking") {
    return makeAction({
      title: "Complete diagnosis and prepare estimate",
      reason: "Vehicle is in checking/diagnosis. Confirm findings and prepare the estimate for customer decision.",
      owner: "advisor",
      actionType: "diagnosis_to_estimate",
      baseScore: 24,
      extraSignals: ["checking/diagnosis phase"],
    });
  }

  if (job.status === "estimate_sent") {
    return makeAction({
      title: "Follow up customer decision",
      reason: "Estimate has been sent. The vehicle cannot move forward until the customer approves, rejects, or asks a question.",
      owner: "advisor",
      actionType: "customer_decision_follow_up",
      baseScore: 30,
      extraSignals: ["waiting customer decision"],
    });
  }

  if (job.status === "approved") {
    return makeAction({
      title: "Print job card and release to workshop",
      reason: "Customer approval is received. The next operational step is to print/open the job card and hand it to workshop control.",
      owner: "advisor",
      actionType: "print_job_card_release_workshop",
      baseScore: 26,
      extraSignals: ["approved phase", "ready for workshop release"],
    });
  }

  if (job.status === "waiting_parts") {
    return makeAction({
      title: "Check parts ETA and update plan",
      reason: "Job is blocked by parts. Confirm ETA/status and update advisor, workshop, and customer plan if needed.",
      owner: "parts",
      actionType: "parts_eta_check",
      baseScore: 28,
      extraSignals: ["waiting parts phase"],
    });
  }

  if (job.status === "in_progress") {
    if (workshopStage === "waiting_technician" || !job.technician_id) {
      return makeAction({
        title: "Assign technician and start work",
        reason: "Job is already in workshop phase but still needs a clear technician/workshop owner.",
        owner: "workshop",
        actionType: "assign_technician",
        baseScore: 26,
        extraSignals: ["workshop phase", "needs technician"],
      });
    }

    if (workshopStage === "customer_approval") {
      return makeAction({
        title: "Resolve advisor / approval blocker",
        reason: "Workshop progress is blocked by advisor/customer approval. Clear the decision before work continues.",
        owner: "advisor",
        actionType: "workshop_approval_blocker",
        baseScore: 30,
        extraSignals: ["workshop approval blocker"],
      });
    }

    if (["order_parts", "waiting_warehouse", "backorder"].includes(partsStatus)) {
      return makeAction({
        title: "Check parts ETA and unblock technician",
        reason: "Work is active but parts are blocking progress. Confirm ETA and update workshop plan.",
        owner: "parts",
        actionType: "parts_eta_check",
        baseScore: 30,
        extraSignals: ["parts blocking active work"],
      });
    }

    return makeAction({
      title: "Check technician progress",
      reason: "Work is in progress. Confirm progress, blockers, and expected finish time.",
      owner: "workshop",
      actionType: "technician_progress_check",
      baseScore: 22,
      extraSignals: ["work in progress"],
    });
  }

  if (job.status === "quality_check") {
    return makeAction({
      title: "Complete QC and prepare delivery",
      reason: "Vehicle is near delivery. Finish quality check, confirm readiness, and prepare handover.",
      owner: "workshop",
      actionType: "qc_completion",
      baseScore: 28,
      extraSignals: ["QC / near delivery"],
    });
  }

  if (job.status === "ready") {
    return makeAction({
      title: "Notify customer for collection",
      reason: "Vehicle is ready. Contact the customer and arrange delivery/collection.",
      owner: "advisor",
      actionType: "ready_collection_notice",
      baseScore: 24,
      extraSignals: ["ready for delivery"],
    });
  }

  return makeAction({
    title: "Review job",
    reason: "No specific phase action was detected. Review the job for normal follow-up.",
    owner: "advisor",
    actionType: "general_review",
    baseScore: 5,
  });
}

function getActionUrgencyClass(urgency: NextActionUrgency) {
  if (urgency === "critical") return "bg-red-50 text-red-800 border-red-100";
  if (urgency === "high") return "bg-amber-50 text-amber-800 border-amber-100";
  if (urgency === "normal") return "bg-blue-50 text-blue-800 border-blue-100";
  return "bg-slate-50 text-slate-700 border-slate-100";
}

function StatusPill({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        meta.tone,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dashboardView, setDashboardView] = useState<"overall" | "advisor" | "workshop">("overall");
  const [overallView, setOverallView] = useState<"board" | "list">("board");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<JobStatus | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState<number | null>(null);
  const [priorityWeights, setPriorityWeights] = useState<PriorityWeights>(DEFAULT_PRIORITY_WEIGHTS);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<JobStatus>>(new Set());
  const [showArchived, setShowArchived] = useState(false);

  const toggleColumn = useCallback((column: JobStatus) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      localStorage.setItem("superflow-collapsed-columns", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (status !== "all") params.status = status;
      if (search) params.search = search;
      if (showArchived) params.archived = "true";
      const { data } = await api.get<PaginatedResponse<Job>>("/jobs", { params });
      setJobs(data.data ?? data.items ?? []);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, search, showArchived]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchJobs();
  }, [fetchJobs, mounted]);

  useEffect(() => {
    if (!mounted) return;
    api.get("/admin/settings")
      .then(({ data }) => {
        const setting = Array.isArray(data) ? data.find((item: any) => item.key === "priority_matrix_weights") : null;
        if (setting?.parsed_value) setPriorityWeights(normalizePriorityWeights(setting.parsed_value));
      })
      .catch(() => setPriorityWeights(DEFAULT_PRIORITY_WEIGHTS));
  }, [mounted]);

  /* ── Auto-poll jobs board when awaiting approval ────────── */
  useEffect(() => {
    const hasAwaiting = jobs.some((j) => j.status === 'estimate_sent');
    if (!hasAwaiting || !mounted) return;
    const interval = setInterval(() => fetchJobs(), 45000);
    return () => clearInterval(interval);
  }, [jobs.length, mounted, fetchJobs, jobs.some((j) => j.status === 'estimate_sent')]);

  useEffect(() => {
    setNowTs(Date.now());
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("superflow-collapsed-columns");
      setCollapsedColumns(saved ? new Set(JSON.parse(saved) as JobStatus[]) : new Set());
    } catch {
      setCollapsedColumns(new Set());
    }
  }, []);

  const boardJobs = useMemo(() => {
    const grouped = Object.fromEntries(BOARD_COLUMNS.map((column) => [column, [] as Job[]])) as Record<JobStatus, Job[]>;
    for (const job of jobs) grouped[job.status].push(job);
    return grouped;
  }, [jobs]);

  const activeJobs = useMemo(() => jobs.filter((job) => job.status !== "closed"), [jobs]);
  const workshopJobs = useMemo(() => jobs.filter(isWorkshopPhaseJob), [jobs]);

  const enrichedJobs = useMemo(() => {
    const now = nowTs ?? Date.now();
    return activeJobs
      .map((job) => {
        const promisedTs = job.promised_at ? new Date(job.promised_at).getTime() : null;
        const hoursToPromise = promisedTs ? (promisedTs - now) / 36e5 : null;
        const idleHours = Math.max(0, (now - new Date(job.updated_at).getTime()) / 36e5);
        const estimateTotal = getEstimateTotal(job);
        let score = 10;
        const reasons: string[] = [];

        const partsStatus = job.parts_status ?? "no_parts";
        const customerSensitivity = job.customer_sensitivity ?? "normal";

        if (isOverdue(job, now)) { score += priorityWeights.promiseOverdue; reasons.push(`Promise risk: overdue +${priorityWeights.promiseOverdue}`); }
        else if (hoursToPromise !== null && hoursToPromise <= 2) { score += priorityWeights.promiseDue2h; reasons.push(`Promise risk: due ≤2h +${priorityWeights.promiseDue2h}`); }
        else if (hoursToPromise !== null && hoursToPromise <= 6) { score += priorityWeights.promiseDue6h; reasons.push(`Promise risk: due ≤6h +${priorityWeights.promiseDue6h}`); }

        if (job.is_customer_waiting) { score += priorityWeights.customerWaiting; reasons.push(`Customer waiting +${priorityWeights.customerWaiting}`); }
        if (customerSensitivity === "angry") { score += priorityWeights.customerAngry; reasons.push(`Customer sensitivity: angry +${priorityWeights.customerAngry}`); }
        else if (customerSensitivity === "vip") { score += priorityWeights.customerVip; reasons.push(`Customer sensitivity: VIP +${priorityWeights.customerVip}`); }
        else if (customerSensitivity === "comeback") { score += priorityWeights.customerComeback; reasons.push(`Customer sensitivity: comeback +${priorityWeights.customerComeback}`); }

        if (job.status === "estimate_sent") { score += priorityWeights.waitingCustomerDecision; reasons.push(`Customer decision: waiting +${priorityWeights.waitingCustomerDecision}`); }

        if (partsStatus === "backorder") { score += priorityWeights.partsBackorder; reasons.push(`Parts risk: backorder +${priorityWeights.partsBackorder}`); }
        else if (partsStatus === "waiting_warehouse") { score += priorityWeights.partsWaitingWarehouse; reasons.push(`Parts risk: waiting warehouse +${priorityWeights.partsWaitingWarehouse}`); }
        else if (partsStatus === "order_parts" || job.status === "waiting_parts") { score += priorityWeights.partsNeedOrder; reasons.push(`Parts risk: need order +${priorityWeights.partsNeedOrder}`); }

        if (idleHours >= 12) { score += priorityWeights.idle12h; reasons.push(`Idle risk: 12h+ +${priorityWeights.idle12h}`); }
        else if (idleHours >= 6) { score += priorityWeights.idle6h; reasons.push(`Idle risk: 6h+ +${priorityWeights.idle6h}`); }

        if (job.status === "checking") { score += priorityWeights.stageCheckingDiagnosis; reasons.push(`Stage urgency: checking/diagnosis +${priorityWeights.stageCheckingDiagnosis}`); }
        else if (job.status === "quality_check") { score += priorityWeights.stageQcNearDelivery; reasons.push(`Stage urgency: QC/near delivery +${priorityWeights.stageQcNearDelivery}`); }

        if (estimateTotal >= 10000) { score += priorityWeights.highEstimateValue; reasons.push(`Value: high estimate +${priorityWeights.highEstimateValue}`); }
        else if (estimateTotal >= 5000) { score += priorityWeights.mediumEstimateValue; reasons.push(`Value: medium estimate +${priorityWeights.mediumEstimateValue}`); }

        const priorityScore = Math.min(100, score);
        const priorityLevel = priorityScore >= 85 ? "Critical" : priorityScore >= 65 ? "High" : priorityScore >= 40 ? "Normal" : "Low";
        const nextAction = buildNextBestAction(job, now);
        return { job, priorityScore, priorityLevel, reasons, idleHours, hoursToPromise, estimateTotal, nextAction };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [activeJobs, nowTs, priorityWeights]);

  const advisorActions = useMemo(() => (
    [...enrichedJobs]
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        return b.nextAction.score - a.nextAction.score;
      })
      .slice(0, 8)
  ), [enrichedJobs]);

  const workshopEnrichedJobs = useMemo(() => (
    enrichedJobs.filter((item) => isWorkshopPhaseJob(item.job))
  ), [enrichedJobs]);

  const stats = useMemo(() => {
    const awaitingApproval = jobs.filter((job) => job.status === "estimate_sent").length;
    const inWorkshop = jobs.filter((job) => ["checking", "approved", "in_progress", "waiting_parts", "quality_check"].includes(job.status)).length;
    const overdue = jobs.filter((job) => isOverdue(job, nowTs)).length;
    const totalEstimate = jobs.reduce((sum, job) => sum + getEstimateTotal(job), 0);
    const critical = enrichedJobs.filter((item) => item.priorityScore >= 85).length;
    return { awaitingApproval, inWorkshop, overdue, totalEstimate, critical };
  }, [jobs, nowTs, enrichedJobs]);

  const totalPages = Math.ceil(total / limit);

  if (!mounted) {
    return <div className="py-20 text-center text-slate-400">Loading...</div>;
  }

  const moveJobToStatus = async (jobId: string, nextStatus: JobStatus) => {
    const currentJob = jobs.find((job) => job.id === jobId);
    if (!currentJob || currentJob.status === nextStatus) return;

    const previousJobs = jobs;
    const optimisticJobs = jobs.map((job) =>
      job.id === jobId ? { ...job, status: nextStatus } : job,
    );

    setJobs(optimisticJobs);
    setUpdatingJobId(jobId);
    setDraggedJobId(null);
    setDropColumn(null);

    try {
      await api.patch(`/jobs/${jobId}/status`, { to_status: nextStatus });
      toast.success(
        `${currentJob.job_number || "Job"} moved to ${STATUS_META[nextStatus].label}`,
      );
      await fetchJobs();
    } catch {
      setJobs(previousJobs);
      toast.error("Failed to update job status");
    } finally {
      setUpdatingJobId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm lg:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Service operations
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-950">
              PrioraFlow command center
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {[
                ["overall", "Overall"],
                ["advisor", "Advisor"],
                ["workshop", "Workshop"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDashboardView(value as "overall" | "advisor" | "workshop")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition",
                    dashboardView === value
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {dashboardView === "overall" && (
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setOverallView("board")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition",
                    overallView === "board"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Board
                </button>
                <button
                  type="button"
                  onClick={() => setOverallView("list")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition",
                    overallView === "list"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  <List className="h-3.5 w-3.5" /> List
                </button>
              </div>
            )}
            <Link href="/jobs/new">
              <Button className="h-9 rounded-lg bg-slate-950 px-3 text-[13px] text-white hover:bg-slate-800">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New job
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-0.5 text-xl font-semibold text-slate-950">{total}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-rose-700">Awaiting</p>
            <p className="mt-0.5 text-xl font-semibold text-rose-950">{stats.awaitingApproval}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700">In workshop</p>
            <p className="mt-0.5 text-xl font-semibold text-amber-950">{stats.inWorkshop}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-red-700">Overdue</p>
            <p className="mt-0.5 text-xl font-semibold text-red-950">{workshopEnrichedJobs.filter((item) => isOverdue(item.job, nowTs)).length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm lg:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search jobs, customers, vehicles..."
                className="h-9 rounded-lg border-slate-200 bg-white pl-8 text-[13px]"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value ?? "all");
                setPage(1);
              }}>
              <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 text-[13px] md:w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {BOARD_COLUMNS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_META[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[13px] text-slate-500">
              Value: <span className="font-semibold text-slate-900">{stats.totalEstimate.toFixed(0)}</span>
            </div>
            <Button variant="outline" className="h-9 rounded-lg text-[13px]" onClick={fetchJobs}>
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant={showArchived ? "default" : "outline"}
              className="h-9 rounded-lg text-[13px]"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? "Showing Archive" : "Archive"}
            </Button>
          </div>
        </div>

        {dashboardView === "advisor" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Advisor cockpit</p>
                    <h2 className="text-lg font-semibold text-slate-950">My urgent now</h2>
                  </div>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{stats.critical} critical</span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {enrichedJobs.slice(0, 6).map(({ job, priorityScore, priorityLevel, reasons, nextAction }) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="rounded-xl border border-white bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{job.job_number || "Draft"}</p>
                          <h3 className="truncate text-sm font-semibold text-slate-950">{job.customer?.name || "Walk-in"}</h3>
                          <p className="truncate text-xs text-slate-500">{getVehicleLabel(job)} · {getPlate(job)}</p>
                        </div>
                        <span className={cn("rounded-full px-2 py-1 text-[11px] font-bold", priorityScore >= 85 ? "bg-red-100 text-red-800" : priorityScore >= 65 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700")}>
                          {priorityScore}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                        <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
                        <span className="truncate">{priorityLevel}: {reasons.slice(0, 2).join(" + ") || "normal follow-up"}</span>
                      </div>
                      <div className={cn("mt-2 rounded-lg border px-2 py-1.5 text-xs font-semibold", getActionUrgencyClass(nextAction.urgency))}>
                        Next: {nextAction.title}
                        <span className="ml-1 font-normal opacity-80">({nextAction.owner})</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-950"><PhoneCall className="h-4 w-4" /> Pending approvals</h3>
                  <div className="mt-3 space-y-2">
                    {jobs.filter((job) => job.status === "estimate_sent").slice(0, 5).map((job) => (
                      <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
                        <span className="min-w-0 truncate font-medium text-slate-900">{job.customer?.name || "Walk-in"}</span>
                        <span className="text-xs font-semibold text-rose-700">{getEstimateTotal(job).toFixed(0)} AED</span>
                      </Link>
                    ))}
                    {jobs.filter((job) => job.status === "estimate_sent").length === 0 && <p className="text-xs text-rose-700">No approvals pending.</p>}
                  </div>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-red-950"><TimerReset className="h-4 w-4" /> Promised delivery risk</h3>
                  <div className="mt-3 space-y-2">
                    {enrichedJobs.filter(({ job, hoursToPromise }) => isOverdue(job, nowTs) || (hoursToPromise !== null && hoursToPromise <= 6)).slice(0, 5).map(({ job, hoursToPromise }) => (
                      <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
                        <span className="min-w-0 truncate font-medium text-slate-900">{job.job_number || "Draft"} · {STATUS_META[job.status].label}</span>
                        <span className="shrink-0 text-xs font-semibold text-red-700">{isOverdue(job, nowTs) ? "Overdue" : `${Math.max(0, Math.round(hoursToPromise ?? 0))}h left`}</span>
                      </Link>
                    ))}
                    {enrichedJobs.filter(({ job, hoursToPromise }) => isOverdue(job, nowTs) || (hoursToPromise !== null && hoursToPromise <= 6)).length === 0 && <p className="text-xs text-red-700">No delivery risks in this list.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-950">Next best actions</h2>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="mt-3 space-y-2">
                {advisorActions.map(({ job, nextAction, priorityScore }, index) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50">
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-950">{nextAction.title}</p>
                          <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase", getActionUrgencyClass(nextAction.urgency))}>{nextAction.urgency}</span>
                        </div>
                        <p className="truncate text-xs text-slate-500">{job.customer?.name || "Walk-in"} · {job.job_number || "Draft"} · Owner: {nextAction.owner}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{nextAction.reason}</p>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-700">{priorityScore}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : dashboardView === "workshop" ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Workshop control</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">Vehicle flow by workshop state</h2>
                  <p className="mt-1 max-w-3xl text-sm text-slate-400">
                    Focused on production movement: received cars, technician assignment, diagnosis, approval, parts, work in progress, QC, and ready handover.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
                  <div className="rounded-xl bg-white/10 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Blocked</p>
                    <p className="text-xl font-semibold">{workshopJobs.filter((job) => job.status === "waiting_parts" || ["order_parts", "waiting_warehouse", "backorder"].includes(job.parts_status ?? "")).length}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Idle +6h</p>
                    <p className="text-xl font-semibold">{workshopEnrichedJobs.filter((item) => item.idleHours >= 6).length}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">At risk</p>
                    <p className="text-xl font-semibold">{workshopEnrichedJobs.filter((item) => isOverdue(item.job, nowTs)).length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Waiting technician", value: workshopJobs.filter((job) => getWorkshopStage(job) === "waiting_technician").length, hint: "Assign tech / controller", color: "border-slate-200 bg-white" },
                { label: "Diagnosis active", value: workshopJobs.filter((job) => getWorkshopStage(job) === "diagnosis").length, hint: "Check diagnosis ageing", color: "border-amber-200 bg-amber-50" },
                { label: "Approval blocking", value: workshopJobs.filter((job) => getWorkshopStage(job) === "customer_approval").length, hint: "Advisor/customer decision", color: "border-rose-200 bg-rose-50" },
                { label: "Parts blocking", value: workshopJobs.filter((job) => job.status === "waiting_parts" || ["order_parts", "waiting_warehouse", "backorder"].includes(job.parts_status ?? "")).length, hint: "Use Overall Waiting Parts", color: "border-purple-200 bg-purple-50" },
              ].map((item) => (
                <div key={item.label} className={cn("rounded-2xl border p-3 shadow-sm", item.color)}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="text-2xl font-semibold text-slate-950">{item.value}</p>
                    <p className="text-right text-[11px] font-medium text-slate-500">{item.hint}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Live flow</p>
                  <h2 className="text-lg font-semibold text-slate-950">Waiting to Start → Diagnosis → Estimate → Advisor / Approval → Parts → WIP → Final Test → QC → Ready</h2>
                </div>
                <Wrench className="h-5 w-5 text-slate-500" />
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-max gap-3">
                  {WORKSHOP_STAGES.map((stageKey) => ({
                    key: stageKey,
                    ...WORKSHOP_STAGE_META[stageKey],
                    jobs: workshopJobs.filter((job) => getWorkshopStage(job) === stageKey),
                  })).map((stage) => (
                    <div key={stage.key} className={cn("flex h-[520px] w-[230px] shrink-0 flex-col rounded-[16px] border shadow-sm", stage.tone)}>
                      <div className="border-b border-black/5 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-slate-950">{stage.label}</h3>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">{stage.sub}</p>
                          </div>
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm">{stage.jobs.length}</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
                        {stage.jobs.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-center text-xs text-slate-400">
                            No vehicles
                          </div>
                        ) : (
                          stage.jobs.map((job) => {
                            const item = enrichedJobs.find((entry) => entry.job.id === job.id);
                            const overdue = isOverdue(job, nowTs);
                            return (
                              <Link key={`${stage.key}-${job.id}`} href={`/jobs/${job.id}`} className="block rounded-xl border border-white bg-white p-2.5 text-xs shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate font-bold text-slate-950">{job.job_number || "Draft job"}</p>
                                    <p className="truncate text-slate-500">{getVehicleLabel(job)}</p>
                                  </div>
                                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", overdue ? "bg-red-100 text-red-700" : (item?.priorityScore ?? 0) >= 65 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>{item?.priorityScore ?? 0}</span>
                                </div>
                                {job.parts_status && job.parts_status !== "no_parts" ? (
                                  <div className={cn("mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold", PARTS_STATUS_META[job.parts_status]?.tone)}>
                                    {PARTS_STATUS_META[job.parts_status]?.label}
                                  </div>
                                ) : null}
                                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                                  <span className="truncate">Advisor: {job.advisor?.name || "—"}</span>
                                  <span className="truncate">Tech: {job.technician?.name || "—"}</span>
                                  <span className="truncate">Idle: {Math.round(item?.idleHours ?? 0)}h</span>
                                  <span className={cn("truncate font-semibold", overdue ? "text-red-700" : "text-slate-500")}>{overdue ? "Overdue" : job.promised_at ? getPromisedLabel(job.promised_at) : "No promise"}</span>
                                </div>
                                <div className={cn("mt-2 rounded-lg border px-2 py-1 text-[11px] font-semibold", getActionUrgencyClass(item?.nextAction.urgency ?? "low"))}>
                                  {stage.key === "waiting_technician" ? "Assign technician" : stage.key === "customer_approval" ? "Advisor / customer approval" : item?.nextAction.title ?? "Review job"}
                                </div>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-orange-950"><TriangleAlert className="h-4 w-4" /> Stuck / idle vehicles</h3>
                <div className="mt-3 space-y-2">
                  {workshopEnrichedJobs.filter((item) => item.idleHours >= 6).slice(0, 6).map(({ job, idleHours }) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
                      <span className="truncate font-medium text-slate-900">{job.job_number || "Draft"}</span>
                      <span className="text-xs font-semibold text-orange-700">{Math.round(idleHours)}h idle</span>
                    </Link>
                  ))}
                  {workshopEnrichedJobs.filter((item) => item.idleHours >= 6).length === 0 && <p className="text-xs text-orange-700">No stuck vehicles detected.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-purple-950"><Package className="h-4 w-4" /> Parts blockers</h3>
                <div className="mt-3 space-y-2">
                  {workshopJobs.filter((job) => job.status === "waiting_parts" || ["order_parts", "waiting_warehouse", "backorder"].includes(job.parts_status ?? "")).slice(0, 6).map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
                      <span className="truncate font-medium text-slate-900">{job.job_number || "Draft"}</span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", PARTS_STATUS_META[job.parts_status ?? "order_parts"]?.tone)}>{PARTS_STATUS_META[job.parts_status ?? "order_parts"]?.label}</span>
                    </Link>
                  ))}
                  {workshopJobs.filter((job) => job.status === "waiting_parts" || ["order_parts", "waiting_warehouse", "backorder"].includes(job.parts_status ?? "")).length === 0 && <p className="text-xs text-purple-700">No parts blockers.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-cyan-950"><CheckCircle2 className="h-4 w-4" /> QC & delivery handover</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                    <p className="text-2xl font-semibold text-cyan-950">{boardJobs.quality_check.length}</p>
                    <p className="text-[11px] font-medium text-cyan-700">in QC</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 text-center shadow-sm">
                    <p className="text-2xl font-semibold text-cyan-950">{boardJobs.ready.length}</p>
                    <p className="text-[11px] font-medium text-cyan-700">ready</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : overallView === "board" ? (
          <div className="mt-4 overflow-x-auto pb-1">
            <div className="mb-2 flex min-w-max gap-2.5">
              {OVERALL_PHASES.map((phase) => {
                const width = phase.columns.reduce((sum, column) => sum + (collapsedColumns.has(column) ? 44 : 200), 0) + Math.max(0, phase.columns.length - 1) * 10;
                const count = phase.columns.reduce((sum, column) => sum + boardJobs[column].length, 0);
                return (
                  <div
                    key={phase.label}
                    style={{ width }}
                    className={cn("rounded-xl border px-3 py-2 shadow-sm", phase.className)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em]">{phase.label}</p>
                        <p className="truncate text-[11px] opacity-75">{phase.hint}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold shadow-sm">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex min-w-max gap-2.5">
              {BOARD_COLUMNS.map((column) => {
                const columnJobs = boardJobs[column];
                const isCollapsed = collapsedColumns.has(column);
                return (
                  <div
                    key={column}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggedJobId) setDropColumn(column);
                    }}
                    onDragLeave={() => {
                      if (dropColumn === column) setDropColumn(null);
                    }}
                    onDrop={async (event) => {
                      event.preventDefault();
                      const jobId = event.dataTransfer.getData("text/plain") || draggedJobId;
                      setDropColumn(null);
                      if (!jobId) return;
                      await moveJobToStatus(jobId, column);
                    }}
                    className={cn(
                      "flex shrink-0 flex-col rounded-[14px] border transition-all duration-200",
                      OVERALL_COLUMN_TONE[column],
                      isCollapsed ? "w-[44px]" : "w-[200px]",
                      dropColumn === column && "border-slate-400 bg-slate-100",
                    )}
                  >
                    <div
                      className={cn("cursor-pointer select-none border-b px-2.5 py-2", OVERALL_COLUMN_HEADER_TONE[column])}
                      onClick={() => toggleColumn(column)}
                    >
                      <div className={cn("flex items-center gap-2", isCollapsed && "flex-col")}>
                        {isCollapsed ? (
                          <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
                        )}
                        <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_META[column].dot)} />
                        {!isCollapsed && (
                          <h2 className="text-[12px] font-semibold text-slate-900 truncate">
                            {STATUS_META[column].label}
                          </h2>
                        )}
                        <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                          {columnJobs.length}
                        </span>
                      </div>
                    </div>

                    {!isCollapsed && (
                    <div className="flex flex-1 flex-col gap-1.5 p-2 overflow-y-auto">
                      {loading ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
                          Loading jobs...
                        </div>
                      ) : columnJobs.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
                          No jobs in this stage
                        </div>
                      ) : (
                        columnJobs.map((job) => {
                          const estimateTotal = getEstimateTotal(job);
                          const overdue = isOverdue(job, nowTs);
                          return (
                            <Link
                              key={job.id}
                              href={`/jobs/${job.id}`}
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", job.id);
                                event.dataTransfer.effectAllowed = "move";
                                setDraggedJobId(job.id);
                              }}
                              onDragEnd={() => {
                                setDraggedJobId(null);
                                setDropColumn(null);
                              }}
                              className={cn(
                                "group flex h-[160px] flex-col rounded-[12px] border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                                draggedJobId === job.id && "opacity-60",
                                updatingJobId === job.id && "ring-2 ring-slate-300",
                              )}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <span
                                    className="shrink-0 rounded border border-slate-200 bg-slate-50 p-0.5 text-slate-400 cursor-grab"
                                    title="Drag to move"
                                    onClick={(event) => event.preventDefault()}
                                  >
                                    <GripVertical className="h-3 w-3" />
                                  </span>
                                  <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                    {job.job_number || "Draft"}
                                  </p>
                                </div>
                                {overdue ? (
                                  <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                                    Overdue
                                  </span>
                                ) : (
                                  <StatusPill status={job.status} />
                                )}
                              </div>

                              <h3 className="mt-0.5 truncate text-[13px] font-semibold text-slate-950">
                                {job.customer?.name || "Walk-in"}
                              </h3>

                              <div className="mt-1 min-h-0 flex-1 space-y-0.5">
                                <p className="truncate text-[12px] font-medium text-slate-800">{getVehicleLabel(job)}</p>
                                <p className="truncate text-[11px] text-slate-500">{getPlate(job)}</p>
                                <p className="line-clamp-2 text-[11px] leading-tight text-slate-500">
                                  {job.customer_concern || "No concern added"}
                                </p>
                                {(job.is_customer_waiting || (job.customer_sensitivity && job.customer_sensitivity !== "normal")) ? (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {job.is_customer_waiting ? <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">Waiting</span> : null}
                                    {job.customer_sensitivity && job.customer_sensitivity !== "normal" ? (
                                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", CUSTOMER_SENSITIVITY_META[job.customer_sensitivity]?.tone)}>{CUSTOMER_SENSITIVITY_META[job.customer_sensitivity]?.label}</span>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>

                              <div className="mt-auto grid grid-cols-2 gap-1 text-[11px]">
                                <div className="rounded-lg bg-slate-50 px-1.5 py-1">
                                  <p className="text-[9px] uppercase tracking-wide text-slate-400">Advisor</p>
                                  <p className="truncate font-medium text-slate-800">{job.advisor?.name || job.owner_code || "—"}</p>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-1.5 py-1">
                                  <p className="text-[9px] uppercase tracking-wide text-slate-400">Est.</p>
                                  <p className="truncate font-medium text-slate-800">
                                    {estimateTotal > 0 ? estimateTotal.toFixed(0) : "—"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                                <div className="flex min-w-0 items-center gap-1">
                                  <Clock3 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{job.promised_at ? new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(job.promised_at)) : "—"}</span>
                                </div>
                                <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-slate-900 group-hover:text-blue-700">
                                  {updatingJobId === job.id ? "..." : "Open"}
                                  <ArrowRight className="h-3 w-3" />
                                </span>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Job</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Advisor</TableHead>
                  <TableHead>Promise</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-400">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-400">
                      No jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow key={job.id} className="bg-white">
                      <TableCell>
                        <Link href={`/jobs/${job.id}`} className="font-semibold text-slate-900 hover:text-blue-700">
                          {job.job_number || "Draft job"}
                        </Link>
                      </TableCell>
                      <TableCell>{job.customer?.name || "—"}</TableCell>
                      <TableCell>{getVehicleLabel(job)}</TableCell>
                      <TableCell>
                        <StatusPill status={job.status} />
                      </TableCell>
                      <TableCell>{job.advisor?.name || "Unassigned"}</TableCell>
                      <TableCell>{job.promised_at ? new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(job.promised_at)) : "—"}</TableCell>
                      <TableCell className="text-right">
                        {isOverdue(job, nowTs) ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                            <TriangleAlert className="h-3.5 w-3.5" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            <Wrench className="h-3.5 w-3.5" /> Normal
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
