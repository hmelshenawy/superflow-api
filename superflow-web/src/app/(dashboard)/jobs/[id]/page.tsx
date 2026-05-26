"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getValidTransitions, getPriorityTone, getActionUrgencyClass } from "@/lib/jobs-data";
import type { Job, JobAuthorisationStatus, JobStatus, WorkshopStage, PartsStatus, CustomerSensitivity, User as UserType, Part, Warehouse, JobPart } from "@/types";

// ─── Priority API result shape (mirrors backend) ──────────
interface PriorityFactor { key: string; weight: number; description: string; category: string; }
interface NextActionResult { title: string; reason: string; urgency: "low"|"normal"|"high"|"critical"; owner: string; actionType: string; score: number; signals: string[]; }
interface PriorityResult { jobId: string; jobNumber: string | null; score: number; level: "low"|"normal"|"high"|"critical"; factors: PriorityFactor[]; idleHours: number; hoursToPromise: number | null; isOverdue: boolean; nextAction: NextActionResult; }
interface VehicleServiceHistoryLine { id: string; type: string; description: string | null; quantity: number | null; line_total: number | string | null; is_recommended: boolean | null; }
interface VehicleServiceHistoryEntry {
  id: string;
  type: "job" | "manual";
  job_id: string | null;
  job_number: string | null;
  status: JobStatus | null;
  odometer_km: number | null;
  summary: string | null;
  service_date: string | null;
  completed_at: string | null;
  estimate_total: number | null;
  estimate_lines: VehicleServiceHistoryLine[];
  media_count: number;
  dms_ro_number: string | null;
  advisor?: Pick<UserType, "id" | "name" | "email"> | null;
  technician?: Pick<UserType, "id" | "name" | "email"> | null;
  inspection?: { id: string; status: string | null } | null;
}
interface VehicleServiceHistoryResponse {
  totals: { jobs: number; closedJobs: number; revenue: number };
  entries: VehicleServiceHistoryEntry[];
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";

const EstimateBuilder = dynamic(() => import("@/components/estimates/estimate-builder").then((m) => ({ default: m.EstimateBuilder })), { ssr: false });
const InspectionWorkspace = dynamic(() => import("@/components/inspections/inspection-workspace").then((m) => ({ default: m.InspectionWorkspace })), { ssr: false });
const QcChecklistWorkspace = dynamic(() => import("@/components/qc-checklists/qc-checklist-workspace").then((m) => ({ default: m.QcChecklistWorkspace })), { ssr: false });
import { SendApprovalButton } from "@/components/estimates/send-approval-button";
import { MediaUploader } from "@/components/media/media-uploader";
import { MediaThumbnail } from "@/components/media/media-thumbnail";
import { ComponentErrorBoundary } from "@/components/error-boundary";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  FileText,
  Image as ImageIcon,
  Pencil,
  RotateCcw,
  Save,
  Send,
  User,
  Wrench,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_META: Record<
  JobStatus,
  {
    label: string;
    dot: string;
    badge: string;
  }
> = {
  booked: { label: "Booked", dot: "bg-slate-400", badge: "bg-muted text-foreground/80" },
  checking: { label: "Checking", dot: "bg-amber-500", badge: "bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200" },
  estimate_sent: { label: "Estimate Sent", dot: "bg-rose-500", badge: "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200" },
  approved: { label: "Approved", dot: "bg-emerald-500", badge: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200" },
  in_progress: { label: "In Progress", dot: "bg-blue-500", badge: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200" },
  waiting_parts: { label: "Waiting Parts", dot: "bg-purple-500", badge: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200" },
  quality_check: { label: "Quality Check", dot: "bg-cyan-500", badge: "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200" },
  ready: { label: "Ready", dot: "bg-teal-500", badge: "bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200" },
  closed: { label: "Closed", dot: "bg-slate-600", badge: "bg-muted text-foreground/80" },
  no_show: { label: "No Show", dot: "bg-slate-300", badge: "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400" },
};

/** Overall statuses where workshop stage is not applicable.
 *  Reception: car hasn't reached the workshop yet.
 *  Waiting Parts: car is out of workshop awaiting parts, not in active workshop flow. */
const WORKSHOP_STAGE_DISABLED_STATUSES: JobStatus[] = ["booked", "checking", "estimate_sent", "approved", "waiting_parts"];

/** Statuses where parts status dropdown should be disabled (not in workshop/parts flow yet). */
const PARTS_STATUS_DISABLED_STATUSES: JobStatus[] = ["booked", "checking", "estimate_sent", "approved"];

const ALL_STATUSES: JobStatus[] = [
  "booked",
  "checking",
  "estimate_sent",
  "approved",
  "in_progress",
  "waiting_parts",
  "quality_check",
  "ready",
  "closed",
  "no_show",
];



const CUSTOMER_SENSITIVITY_META: Record<CustomerSensitivity, { label: string; hint: string }> = {
  normal: { label: "Normal", hint: "Standard priority" },
  vip: { label: "VIP", hint: "High-care customer" },
  angry: { label: "Angry", hint: "Complaint/escalation risk" },
  comeback: { label: "Comeback", hint: "Repeat repair / comeback" },
};

const CUSTOMER_SENSITIVITIES = Object.keys(CUSTOMER_SENSITIVITY_META) as CustomerSensitivity[];

const PARTS_STATUS_META: Record<PartsStatus, { label: string; hint: string }> = {
  no_parts: { label: "No Parts", hint: "No parts blocker" },
  order_parts: { label: "Order Parts", hint: "Parts required, not ordered yet" },
  waiting_warehouse: { label: "Waiting Warehouse", hint: "Waiting issue/receive from warehouse" },
  backorder: { label: "Backorder", hint: "Unavailable or no clear ETA" },
  parts_ready: { label: "Parts Ready", hint: "Parts available, workshop can continue" },
  issued: { label: "Issued", hint: "Parts issued to technician / workshop" },
};

const PARTS_STATUSES = Object.keys(PARTS_STATUS_META) as PartsStatus[];

const WORKSHOP_STAGE_META: Record<WorkshopStage, { label: string; hint: string }> = {
  waiting_technician: { label: "Waiting to Start", hint: "Received car waiting for technician/bay to start" },
  diagnosis: { label: "Diagnosis", hint: "Inspection / diagnosis active" },
  estimate_prep: { label: "Estimate Prep", hint: "Preparing quote" },
  customer_approval: { label: "Advisor / Approval", hint: "Advisor follow-up and customer approval" },
  work_in_progress: { label: "Work In Progress", hint: "Repair work active" },
  final_test: { label: "Final Test", hint: "Final/road test" },
  quality_check: { label: "Quality Check", hint: "QC before handover" },
  ready_handover: { label: "Ready Handover", hint: "Ready for delivery" },
};

const WORKSHOP_STAGES = (Object.keys(WORKSHOP_STAGE_META) as WorkshopStage[]);

function vehicleLabel(job: Job) {
  if (!job.vehicle) return "Vehicle pending";
  return [job.vehicle.year, job.vehicle.make, job.vehicle.model]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
        }
      : { timeZone: "UTC" }),
  }).format(date);
}

function estimateTotal(job: Job | null) {
  if (!job) return 0;
  const meta = job.meta;
  if (meta?.estimateTotal !== undefined) return meta.estimateTotal;
  return (job.estimate_lines ?? []).reduce(
    (sum, line) => sum + Number(line.line_total ?? 0),
    0,
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status];
  return (
    <span aria-label={meta.label} className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", meta.badge)}>
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [priority, setPriority] = useState<PriorityResult | null>(null);
  const [inspectionDetail, setInspectionDetail] = useState<any | null>(null);
  const [authStatus, setAuthStatus] = useState<JobAuthorisationStatus | null>(null);
  const [releasingPortal, setReleasingPortal] = useState(false);
  const [serviceHistory, setServiceHistory] = useState<VehicleServiceHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [inspectionRev, setInspectionRev] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startingInspection, setStartingInspection] = useState(false);
  const [reopeningInspection, setReopeningInspection] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [qcChecklistDetail, setQcChecklistDetail] = useState<any | null>(null);
  const [qcRev, setQcRev] = useState(0);
  const [startingQc, setStartingQc] = useState(false);
  const [reopeningQc, setReopeningQc] = useState(false);

  /** Most logical next status in the forward flow */
  const nextFlowStatus = useMemo(() => {
    if (!job) return "";
    const meta = job.meta;
    if (meta?.nextFlowStatus) return meta.nextFlowStatus as JobStatus | "";
    // Fallback (removed after meta is verified)
    const TRANSITIONS: Record<string, string[]> = {
      booked: ["checking"],
      checking: ["estimate_sent"],
      estimate_sent: ["approved"],
      approved: ["in_progress"],
      in_progress: ["quality_check"],
      waiting_parts: ["in_progress"],
      quality_check: ["ready"],
      ready: ["closed"],
      closed: [],
    };
    return (TRANSITIONS[job.status]?.[0] ?? "") as JobStatus | "";
  }, [job?.status, job?.meta?.nextFlowStatus]);
  const [users, setUsers] = useState<any[]>([]);
  const [assigningAdvisor, setAssigningAdvisor] = useState(false);
  const [assigningTech, setAssigningTech] = useState(false);
  const [savingWorkshopStage, setSavingWorkshopStage] = useState(false);
  const [savingPartsStatus, setSavingPartsStatus] = useState(false);
  const [savingCustomerInformed, setSavingCustomerInformed] = useState(false);

  /** True when the job is still in reception / advisor phase - workshop fields are irrelevant. */
  const meta = job?.meta ?? null;
  const isWorkshopStageDisabled = job ? !(meta?.editableFields?.includes("workshop_stage") ?? !WORKSHOP_STAGE_DISABLED_STATUSES.includes(job.status)) : false;
  const isPartsStatusDisabled = job ? !(meta?.editableFields?.includes("parts_status") ?? !PARTS_STATUS_DISABLED_STATUSES.includes(job.status)) : false;
  const [savingCustomerPriority, setSavingCustomerPriority] = useState(false);
  const currentWorkshopStage = useMemo<WorkshopStage | null>(() => {
    if (!job) return null;
    const stage = meta?.resolvedWorkshopStage ?? job.workshop_stage;
    return stage && WORKSHOP_STAGE_META[stage] ? stage : null;
  }, [job, meta?.resolvedWorkshopStage]);

  // Inline editing states
  const [editingConcern, setEditingConcern] = useState(false);
  const [draftConcern, setDraftConcern] = useState("");
  const [savingConcern, setSavingConcern] = useState(false);
  const [newConcernTitle, setNewConcernTitle] = useState("");
  const [newConcernFinding, setNewConcernFinding] = useState("");
  const [savingStructuredConcern, setSavingStructuredConcern] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingPromise, setEditingPromise] = useState(false);
  const [draftPromise, setDraftPromise] = useState("");
  const [savingPromise, setSavingPromise] = useState(false);
  const [editingCustomerContact, setEditingCustomerContact] = useState(false);
  const [draftCustomerEmail, setDraftCustomerEmail] = useState("");
  const [draftCustomerPhone, setDraftCustomerPhone] = useState("");
  const [savingCustomerContact, setSavingCustomerContact] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [partEntryMode, setPartEntryMode] = useState<"catalog" | "adhoc">("catalog");
  const [partSearch, setPartSearch] = useState("");
  const [partOptions, setPartOptions] = useState<Part[]>([]);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [selectedConcernId, setSelectedConcernId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [partQuantity, setPartQuantity] = useState("1");
  const [partUnitCost, setPartUnitCost] = useState("");
  const [partUnitPrice, setPartUnitPrice] = useState("");
  const [adhocPartName, setAdhocPartName] = useState("");
  const [adhocPartNumber, setAdhocPartNumber] = useState("");
  const [savingJobPart, setSavingJobPart] = useState(false);
  const [actingJobPartId, setActingJobPartId] = useState<string | null>(null);

  const saveConcern = async () => {
    if (!job) return;
    setSavingConcern(true);
    try {
      await api.patch(`/jobs/${job.id}`, { customer_concern: draftConcern });
      await refreshJob();
      setEditingConcern(false);
      toast.success("Customer concern updated");
    } catch {
      toast.error("Failed to update concern");
    } finally {
      setSavingConcern(false);
    }
  };

  const addStructuredConcern = async () => {
    if (!job || !newConcernTitle.trim()) return;
    setSavingStructuredConcern(true);
    try {
      await api.post(`/jobs/${job.id}/concerns`, {
        title: newConcernTitle.trim(),
        technician_finding: newConcernFinding.trim() || undefined,
      });
      setNewConcernTitle("");
      setNewConcernFinding("");
      await refreshJob();
      toast.success("Concern added to portal draft");
    } catch (error) {
      toast.error(getApiError(error).message || "Failed to add concern");
    } finally {
      setSavingStructuredConcern(false);
    }
  };

  const updateStructuredConcern = async (concernId: string, form: HTMLFormElement) => {
    if (!job) return;
    const values = new FormData(form);
    try {
      await api.patch(`/jobs/${job.id}/concerns/${concernId}`, {
        status: values.get("status") || undefined,
        technician_finding: values.get("technician_finding") || "",
        work_note: values.get("work_note") || "",
        qc_note: values.get("qc_note") || "",
      });
      await refreshJob();
      toast.success("Technician feedback saved");
    } catch (error) {
      toast.error(getApiError(error).message || "Failed to save feedback");
    }
  };

  const saveNotes = async () => {
    if (!job) return;
    setSavingNotes(true);
    try {
      await api.patch(`/jobs/${job.id}`, { internal_notes: draftNotes });
      await refreshJob();
      setEditingNotes(false);
      toast.success("Internal notes updated");
    } catch {
      toast.error("Failed to update notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const savePromise = async () => {
    if (!job) return;
    setSavingPromise(true);
    try {
      await api.patch(`/jobs/${job.id}`, { promised_at: draftPromise || null });
      await refreshJob();
      setEditingPromise(false);
      toast.success("Promise time updated");
    } catch {
      toast.error("Failed to update promise time");
    } finally {
      setSavingPromise(false);
    }
  };

  const saveCustomerContact = async () => {
    if (!job?.customer?.id) return;
    const email = draftCustomerEmail.trim();
    const phone = draftCustomerPhone.trim();

    setSavingCustomerContact(true);
    try {
      await api.patch(`/customers/${job.customer.id}`, {
        email: email || undefined,
        phone: phone || undefined,
      });
      await refreshJob();
      setEditingCustomerContact(false);
      toast.success("Customer contact updated");
    } catch (error) {
      toast.error(getApiError(error).message || "Failed to update customer contact");
    } finally {
      setSavingCustomerContact(false);
    }
  };


  const releasePortalUpdate = async () => {
    if (!job) return;
    setReleasingPortal(true);
    try {
      const { data } = await api.post(`/jobs/${job.id}/portal-release`, { note: `Released from job workspace` });
      await refreshJob();
      const url = data?.portalUrl;
      if (url && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url).catch(() => undefined);
      }
      toast.success(url ? "Portal update released. Link copied." : "Portal update released");
    } catch (error) {
      toast.error(getApiError(error).message || "Failed to release portal update");
    } finally {
      setReleasingPortal(false);
    }
  };

  const roleName = (u: any) => typeof u.role === "string" ? u.role : u.role?.name ?? "";
  const advisors = users.filter((u: any) => ["admin", "manager", "service_advisor", "workshop_teamleader"].includes(roleName(u)));
  const technicians = users.filter((u: any) => ["technician"].includes(roleName(u)));

  const advisorName = (value: string | null | undefined) => {
    if (!value) return "Unassigned";
    const matched = users.find((user: any) => user.id === value);
    if (matched) return matched.name;
    if (job?.advisor?.id === value) return job.advisor.name;
    return value;
  };

  const techName = (value: string | null | undefined) => {
    if (!value) return "Unassigned";
    const matched = users.find((user: any) => user.id === value);
    if (matched) return matched.name;
    if (job?.technician?.id === value) return job.technician.name;
    return value;
  };

  const fetchPriority = async (jobId: string) => {
    try {
      const { data } = await api.get<{ results: PriorityResult[] }>(`/priority?limit=200`);
      const found = (data.results ?? []).find((r: PriorityResult) => r.jobId === jobId);
      setPriority(found ?? null);
    } catch { /* ignore */ }
  };

  const refreshJob = async () => {
    const [{ data }, authRes] = await Promise.all([
      api.get<Job>(`/jobs/${id}`),
      api.get<JobAuthorisationStatus>(`/jobs/${id}/auth-status`).catch(() => ({ data: null })),
    ]);

    setJob(data); fetchPriority(data.id);
    setAuthStatus(authRes?.data ?? null);
    if (data.vehicle_id) {
      setHistoryLoading(true);
      api.get<VehicleServiceHistoryResponse>(`/vehicles/${data.vehicle_id}/service-history`)
        .then((res) => setServiceHistory(res.data))
        .catch(() => setServiceHistory(null))
        .finally(() => setHistoryLoading(false));
    } else {
      setServiceHistory(null);
    }
    if (data.inspection?.id) {
      const inspectionRes = await api.get(`/inspections/${data.inspection.id}`);
      setInspectionDetail(inspectionRes.data);
      setInspectionRev((r) => r + 1);
    } else {
      setInspectionDetail(null);
    }
    if (data.qc_checklists?.id) {
      const qcRes = await api.get(`/qc-checklists/${data.qc_checklists.id}`);
      setQcChecklistDetail(qcRes.data);
      setQcRev((r) => r + 1);
    } else {
      setQcChecklistDetail(null);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await api.get("/users/assignable");
      const list = Array.isArray(data) ? data : (data.items ?? []);
      setUsers(list);
    } catch {
      // ignore — may not have permission
    }
  };

  const loadWarehouses = async () => {
    try {
      const { data } = await api.get<Warehouse[]>("/warehouses");
      setWarehouses(Array.isArray(data) ? data : []);
    } catch {
      setWarehouses([]);
    }
  };

  const searchCatalogParts = async (query: string) => {
    setPartSearch(query);
    setSelectedPartId("");
    if (query.trim().length < 2) {
      setPartOptions([]);
      return;
    }
    try {
      const { data } = await api.get<Part[]>("/parts/search", { params: { q: query.trim() } });
      setPartOptions(data ?? []);
    } catch {
      setPartOptions([]);
    }
  };

  const resetJobPartForm = () => {
    setPartSearch("");
    setPartOptions([]);
    setSelectedPartId("");
    setSelectedWarehouseId("");
    setPartQuantity("1");
    setPartUnitCost("");
    setPartUnitPrice("");
    setAdhocPartName("");
    setAdhocPartNumber("");
  };

  const reserveJobPart = async () => {
    if (!job) return;
    const quantity = Number(partQuantity);
    const unitCost = partUnitCost.trim() ? Number(partUnitCost) : undefined;
    const unitPrice = partUnitPrice.trim() ? Number(partUnitPrice) : undefined;

    if (!Number.isFinite(quantity) || quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    if (!selectedConcernId) {
      toast.error("Select a quote concern");
      return;
    }

    const payload: Record<string, unknown> = {
      job_id: job.id,
      concernId: selectedConcernId,
      quantity,
    };
    if (unitCost !== undefined) payload.unit_cost = unitCost;

    if (partEntryMode === "catalog") {
      if (!selectedPartId) {
        toast.error("Select a catalog part");
        return;
      }
      if (!selectedWarehouseId) {
        toast.error("Select a warehouse");
        return;
      }
      payload.partId = selectedPartId;
      payload.warehouse_id = selectedWarehouseId;
      if (unitPrice !== undefined) payload.unitPrice = unitPrice;
    } else {
      if (!adhocPartName.trim()) {
        toast.error("Part name is required");
        return;
      }
      if (unitPrice === undefined || !Number.isFinite(unitPrice)) {
        toast.error("Unit price is required for ad-hoc parts");
        return;
      }
      payload.partName = adhocPartName.trim();
      if (adhocPartNumber.trim()) payload.partNumber = adhocPartNumber.trim();
      if (selectedWarehouseId) payload.warehouse_id = selectedWarehouseId;
      payload.unitPrice = unitPrice;
    }

    setSavingJobPart(true);
    try {
      await api.post("/job-parts/reserve", payload);
      resetJobPartForm();
      await refreshJob();
      toast.success(partEntryMode === "catalog" ? "Catalog part added to quote memo" : "Ad-hoc part added to quote memo");
    } catch (error) {
      toast.error(getApiError(error).message || "Failed to add part");
    } finally {
      setSavingJobPart(false);
    }
  };

  const updateJobPartStatus = async (jobPart: JobPart, action: "reserve" | "consume" | "return" | "cancel") => {
    setActingJobPartId(jobPart.id);
    try {
      if (action === "reserve") {
        await api.post(`/job-parts/${jobPart.id}/reserve`);
      } else if (action === "consume") {
        await api.post("/job-parts/consume", { job_part_id: jobPart.id });
      } else if (action === "return") {
        await api.post("/job-parts/return", { job_part_id: jobPart.id });
      } else {
        await api.post(`/job-parts/${jobPart.id}/cancel`);
      }
      await refreshJob();
      toast.success(action === "reserve" ? "Part reserved" : action === "consume" ? "Part marked used" : action === "return" ? "Part returned" : "Part cancelled");
    } catch (error) {
      toast.error(getApiError(error).message || "Failed to update part");
    } finally {
      setActingJobPartId(null);
    }
  };

  const addQuoteLineToPartsMemo = async (line: NonNullable<Job["estimate_lines"]>[number]) => {
    if (!job || !line.concern_id) {
      toast.error("Quote line must belong to a concern");
      return;
    }
    const unitPrice = Number(line.unit_price ?? 0);
    if (!line.description?.trim()) {
      toast.error("Quote line needs a part description");
      return;
    }
    setSavingJobPart(true);
    try {
      await api.post("/job-parts/reserve", {
        job_id: job.id,
        concernId: line.concern_id,
        estimateLineId: line.id,
        partName: line.description.trim(),
        partNumber: line.part_number || undefined,
        quantity: Math.max(1, Number(line.quantity ?? 1)),
        unitPrice,
      });
      await refreshJob();
      toast.success("Quote part linked to parts memo");
    } catch (error) {
      toast.error(getApiError(error).message || "Failed to link quote part");
    } finally {
      setSavingJobPart(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await refreshJob();
      } catch {
        toast.error("Failed to load job");
      } finally {
        setLoading(false);
      }
    })();
    loadUsers();
    loadWarehouses();
  }, [id]);

  useEffect(() => {
    setDraftCustomerEmail(job?.customer?.email || "");
    setDraftCustomerPhone(job?.customer?.phone || "");
  }, [job?.customer?.email, job?.customer?.phone]);

  useEffect(() => {
    const concerns = job?.job_concerns ?? [];
    if (!selectedConcernId && concerns.length > 0) {
      setSelectedConcernId(concerns[0].id);
    }
    if (selectedConcernId && concerns.length > 0 && !concerns.some((concern) => concern.id === selectedConcernId)) {
      setSelectedConcernId(concerns[0].id);
    }
  }, [job?.job_concerns, selectedConcernId]);

  /* ── Auto-poll auth status only while active token exists ── */
  const prevAuthCounts = useRef<{ approved: number; declined: number; deferred: number } | null>(null);

  useEffect(() => {
    if (!authStatus?.hasActiveToken) {
      prevAuthCounts.current = null;
      return;
    }
    const pollAuth = async () => {
      try {
        const { data } = await api.get<JobAuthorisationStatus>(`/jobs/${id}/auth-status`);
        setAuthStatus(data);
        const counts = data?.counts;
        if (counts && prevAuthCounts.current) {
          const prev = prevAuthCounts.current;
          if (counts.approved > prev.approved || counts.declined > prev.declined || counts.deferred > prev.deferred) {
            toast.success('Customer submitted estimate decisions!', { duration: 8000 });
            refreshJob();
          }
        }
        if (counts) prevAuthCounts.current = { approved: counts.approved, declined: counts.declined, deferred: counts.deferred };
      } catch {
        // ignore polling errors
      }
    };
    if (authStatus?.counts) prevAuthCounts.current = { ...authStatus.counts };
    const interval = setInterval(pollAuth, 30000);
    return () => clearInterval(interval);
  }, [authStatus?.hasActiveToken, id]);

  const availableStatuses = useMemo(
    () => (job ? getValidTransitions(job) : []),
    [job],
  );

  const startInspection = async () => {
    if (!job) return;
    setStartingInspection(true);
    try {
      const templateRes = await api.get<any[]>("/inspection-templates", {
        params: { vehicleType: job.vehicle?.vehicle_type || undefined },
      });
      const templates = templateRes.data || [];
      const template = templates.find((entry: any) => entry.is_default) || templates[0];
      if (!template) {
        toast.error("No inspection template available");
        return;
      }
      await api.post("/inspections", { jobId: job.id, templateId: template.id });
      await refreshJob();
      toast.success("Inspection started");
    } catch {
      toast.error("Failed to start inspection");
    } finally {
      setStartingInspection(false);
    }
  };

  const reopenInspection = async () => {
    if (!job?.inspection?.id && !inspectionDetail?.id) return;
    const inspectionId = inspectionDetail?.id || job?.inspection?.id;
    setReopeningInspection(true);
    try {
      await api.post(`/inspections/${inspectionId}/reopen`);
      await refreshJob();
      toast.success("Inspection reopened");
    } catch (err: any) {
      const { message } = getApiError(err);
      toast.error(message);
    } finally {
      setReopeningInspection(false);
    }
  };

  const startQcChecklist = async () => {
    if (!job) return;
    setStartingQc(true);
    try {
      const templateRes = await api.get<any[]>("/qc-checklist-templates");
      const templates = templateRes.data || [];
      const template = templates.find((entry: any) => entry.is_default) || templates[0];
      if (!template) {
        toast.error("No QC checklist template available");
        return;
      }
      await api.post("/qc-checklists", { jobId: job.id, templateId: template.id });
      await refreshJob();
      toast.success("QC checklist started");
    } catch (err: any) {
      toast.error(getApiError(err).message || "Failed to start QC checklist");
    } finally {
      setStartingQc(false);
    }
  };

  const reopenQcChecklist = async () => {
    if (!qcChecklistDetail?.id && !job?.qc_checklists?.id) return;
    const checklistId = qcChecklistDetail?.id || job?.qc_checklists?.id;
    setReopeningQc(true);
    try {
      await api.post(`/qc-checklists/${checklistId}/reopen`);
      await refreshJob();
      toast.success("QC checklist reopened");
    } catch (err: any) {
      const { message } = getApiError(err);
      toast.error(message);
    } finally {
      setReopeningQc(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  if (!job) {
    return <div className="py-20 text-center text-red-500">Job not found</div>;
  }

  const currentStep = ALL_STATUSES.indexOf(job.status);
  const total = estimateTotal(job);
  const vehicle = vehicleLabel(job);
  const plate = job.vehicle?.plate || "No plate";
  const mediaCount = job.media_files?.length ?? 0;
  const estimateCount = job.estimate_lines?.length ?? 0;
  const jobParts = job.job_parts ?? [];
  const jobConcerns = job.job_concerns ?? [];
  const concernById = new Map(jobConcerns.map((concern) => [concern.id, concern]));
  const concernLabel = (concernId: string | null | undefined) => {
    if (!concernId) return "-";
    const concern = concernById.get(concernId);
    if (!concern) return concernId.slice(0, 8);
    return `${concern.code ? `${concern.code} - ` : ""}${concern.title}`;
  };
  const quotePartLines = (job.estimate_lines ?? []).filter((line) => line.type === "part");
  const linkedEstimateLineIds = new Set(jobParts.map((part) => part.estimateLineId ?? part.estimate_line_id).filter(Boolean));
  const unfulfilledQuotePartLines = quotePartLines.filter((line) => line.id && !linkedEstimateLineIds.has(line.id));
  const inspectionState = inspectionDetail?.status || job.inspection?.status || "not started";
  const inspectionLocked = ["submitted", "reviewed", "approved"].includes(inspectionState);
  const approvalCounts = authStatus?.counts;
  const latestApprovalToken = authStatus?.latestToken;
  const approvalStatusLabel = latestApprovalToken?.used_at
    ? "Customer replied"
    : latestApprovalToken?.first_opened_at
      ? "Viewed by customer"
      : latestApprovalToken
        ? "Link sent"
        : job.status === "approved"
          ? "Approved"
          : "Not sent";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[30px] border border-border bg-card shadow-sm ring-1 ring-border">
        <div className="border-b border-border bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white lg:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                variant="outline"
                size="icon"
                aria-label="Back to jobs"
                className="mt-1 h-10 w-10 shrink-0 rounded-xl border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => router.push("/jobs")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-100/70">Premium job workspace</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-3xl font-black tracking-tight text-white shadow-inner">
                    #{job.job_number || "New"}
                  </h1>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold tracking-tight text-white">{vehicle}</p>
                    <p className="mt-1 text-sm text-slate-300">Created {formatDate(job.created_at)} • Updated {formatDate(job.updated_at, true)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-blue-100">
                  <span className="font-mono tracking-wider">{plate}</span>
                  {job.vehicle?.vin ? (
                    <span className="font-mono tracking-wider">{job.vehicle.vin}</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-3 backdrop-blur xl:min-w-[430px]">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={job.status} />
                <Select value={job.status} onValueChange={async (value) => {
                  const to = value as JobStatus;
                  if (to === job.status) return;
                  setChangingStatus(true);
                  try {
                    await api.patch(`/jobs/${job.id}/status`, { to_status: to });
                    await refreshJob();
                    toast.success(`Status changed to ${STATUS_META[to].label}`);
                  } catch (err: any) {
                    toast.error(getApiError(err).message || "Failed to change status");
                  } finally {
                    setChangingStatus(false);
                  }
                }} disabled={changingStatus}>
                  <SelectTrigger className="h-11 flex-1 rounded-xl border-white/15 bg-card text-foreground xl:w-[210px]">
                    <span>{STATUS_META[job.status].label}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((status) => (
                      <SelectItem key={status} value={status} disabled={status === job.status ? false : !availableStatuses.includes(status)}>
                        {STATUS_META[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {nextFlowStatus && (
                  <Button className="h-11 rounded-xl bg-blue-500 px-4 text-white shadow-sm hover:bg-blue-400" onClick={async () => {
                    setChangingStatus(true);
                    try {
                      await api.patch(`/jobs/${job.id}/status`, { to_status: nextFlowStatus });
                      await refreshJob();
                      toast.success(`Status changed to ${STATUS_META[nextFlowStatus].label}`);
                    } catch (err: any) {
                      toast.error(getApiError(err).message || "Failed to change status");
                    } finally {
                      setChangingStatus(false);
                    }
                  }} disabled={changingStatus}>
                    {changingStatus ? "Moving..." : `Next → ${STATUS_META[nextFlowStatus].label}`}
                  </Button>
                )}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-300">Advisor</p>
                  <p className="truncate text-sm font-semibold text-white">{job.advisor?.name || "Unassigned"}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-300">Technician</p>
                  <p className="truncate text-sm font-semibold text-white">{job.technician?.name || "Unassigned"}</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-300">Promise</p>
                  <p className="truncate text-sm font-semibold text-white">{formatDate(job.promised_at, true)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-1.5">
              {ALL_STATUSES.map((status, index) => {
                const complete = index < currentStep;
                const current = index === currentStep;
                return (
                  <div key={status} className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "inline-flex min-w-[118px] items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold",
                        complete
                          ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                          : current
                            ? "border-border bg-card text-foreground shadow-sm"
                            : "border-white/10 bg-white/5 text-slate-300",
                      )}
                    >
                      {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className={cn("h-1.5 w-1.5 rounded-full", current ? STATUS_META[status].dot : "bg-white/35")} />}
                      {STATUS_META[status].label}
                    </div>
                    {index < ALL_STATUSES.length - 1 ? <div className="h-px w-4 bg-white/15" /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-5 bg-muted/70 p-5 lg:p-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Estimate" value={`AED ${total.toFixed(2)}`} hint={`${estimateCount} lines`} />
              <StatCard label="Inspection" value={String(inspectionState).replaceAll("_", " ")} />
              <StatCard label="Media" value={`${mediaCount}`} hint="files" />
              <StatCard label="Approval" value={approvalStatusLabel} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Work focus</p>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-muted/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Customer concern</p>
                    {editingConcern ? null : (
                      <button
                        onClick={() => { setDraftConcern(job.customer_concern || ""); setEditingConcern(true); }}
                        aria-label="Edit customer concern"
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {editingConcern ? (
                    <div className="mt-2 space-y-2">
                      <Textarea className="min-h-[110px] rounded-lg border-border text-sm" placeholder="Describe the customer's concern..." value={draftConcern} onChange={(e) => setDraftConcern(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 rounded-lg bg-slate-950 px-2 text-xs text-white hover:bg-slate-800" onClick={saveConcern} disabled={savingConcern}><Save className="mr-1 h-3 w-3" /> {savingConcern ? "Saving..." : "Save"}</Button>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={() => setEditingConcern(false)} disabled={savingConcern}><X className="mr-1 h-3 w-3" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDraftConcern(job.customer_concern || ""); setEditingConcern(true); } }} className="mt-2 min-h-[88px] whitespace-pre-wrap text-sm leading-6 text-foreground/80 hover:cursor-pointer hover:text-foreground" onClick={() => { setDraftConcern(job.customer_concern || ""); setEditingConcern(true); }}>
                      {job.customer_concern || "Click to add a customer concern."}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-border bg-muted/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Internal notes</p>
                    {editingNotes ? null : (
                      <button
                        onClick={() => { setDraftNotes(job.internal_notes || ""); setEditingNotes(true); }}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="mt-2 space-y-2">
                      <Textarea className="min-h-[110px] rounded-lg border-border text-sm" placeholder="Internal notes visible to the team..." value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 rounded-lg bg-slate-950 px-2 text-xs text-white hover:bg-slate-800" onClick={saveNotes} disabled={savingNotes}><Save className="mr-1 h-3 w-3" /> {savingNotes ? "Saving..." : "Save"}</Button>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={() => setEditingNotes(false)} disabled={savingNotes}><X className="mr-1 h-3 w-3" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDraftNotes(job.internal_notes || ""); setEditingNotes(true); } }} className="mt-2 min-h-[88px] whitespace-pre-wrap text-sm leading-6 text-foreground/80 hover:cursor-pointer hover:text-foreground" onClick={() => { setDraftNotes(job.internal_notes || ""); setEditingNotes(true); }}>
                      {job.internal_notes || "Click to add internal notes."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="h-12 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm hover:bg-emerald-100" onClick={releasePortalUpdate} disabled={releasingPortal}>
                <Send className="mr-2 h-4 w-4" /> {releasingPortal ? "Releasing..." : "Release portal"}
              </Button>
              {estimateCount > 0 ? <SendApprovalButton jobId={job.id} onSent={refreshJob} /> : <Button disabled className="h-12 rounded-2xl">Approval link</Button>}
            </div>
          </div>

          <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Assignment & control</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Service advisor</p>
                  <Select value={job.advisor_id ?? "unassigned"} onValueChange={async (value) => {
                    const advisorId = value === "unassigned" ? undefined : value;
                    setAssigningAdvisor(true);
                    try {
                      await api.patch(`/jobs/${job.id}`, advisorId ? { advisor_id: advisorId } : { advisor_id: "" });
                      await refreshJob();
                      toast.success(advisorId ? "Advisor assigned" : "Advisor removed");
                    } catch { toast.error("Failed to update advisor"); } finally { setAssigningAdvisor(false); }
                  }} disabled={assigningAdvisor}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-border bg-muted"><SelectValue placeholder="Unassigned">{advisorName(job.advisor_id)}</SelectValue></SelectTrigger>
                    <SelectContent className="min-w-[280px]">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {advisors.map((entry: any) => (<SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Technician</p>
                  <Select value={job.technician_id ?? "unassigned"} onValueChange={async (value) => {
                    const technicianId = value === "unassigned" ? null : value;
                    setAssigningTech(true);
                    try {
                      await api.post(`/jobs/${job.id}/assign`, { technician_id: technicianId });
                      await refreshJob();
                      toast.success(technicianId ? "Technician assigned" : "Technician removed");
                    } catch { toast.error("Failed to update technician"); } finally { setAssigningTech(false); }
                  }} disabled={assigningTech}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-border bg-muted"><SelectValue placeholder="Unassigned">{techName(job.technician_id)}</SelectValue></SelectTrigger>
                    <SelectContent className="min-w-[280px]">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {technicians.map((entry: any) => (<SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Workshop phase {isWorkshopStageDisabled && <span className="ml-1 text-[10px] normal-case text-muted-foreground">- not available</span>}</p>
                  <Select value={currentWorkshopStage ?? ""} onValueChange={async (value) => {
                    const nextStage = value as WorkshopStage;
                    if (!WORKSHOP_STAGE_META[nextStage]) return;
                    setSavingWorkshopStage(true);
                    try {
                      await api.patch(`/jobs/${job.id}`, { workshop_stage: nextStage });
                      await refreshJob();
                      toast.success(`Workshop phase updated to ${WORKSHOP_STAGE_META[nextStage].label}`);
                    } catch { toast.error("Failed to update workshop stage"); } finally { setSavingWorkshopStage(false); }
                  }} disabled={savingWorkshopStage || isWorkshopStageDisabled}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-border bg-muted"><SelectValue placeholder="Workshop phase">{currentWorkshopStage ? WORKSHOP_STAGE_META[currentWorkshopStage].label : "Workshop phase"}</SelectValue></SelectTrigger>
                    <SelectContent className="min-w-[360px]">{WORKSHOP_STAGES.map((stage) => (<SelectItem key={stage} value={stage}>{WORKSHOP_STAGE_META[stage].label} - {WORKSHOP_STAGE_META[stage].hint}</SelectItem>))}</SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Parts status {isPartsStatusDisabled && <span className="ml-1 text-[10px] normal-case text-muted-foreground">- not available</span>}</p>
                  <Select value={job.parts_status ?? "no_parts"} onValueChange={async (value) => {
                    const partsStatus = value as PartsStatus;
                    setSavingPartsStatus(true);
                    try {
                      await api.patch(`/jobs/${job.id}`, { parts_status: partsStatus });
                      await refreshJob();
                      const msg = partsStatus === 'parts_ready' ? `Parts status → Parts Ready. Workshop stage reset to Waiting to Start.` : `Parts status updated to ${PARTS_STATUS_META[partsStatus].label}`;
                      toast.success(msg);
                    } catch { toast.error("Failed to update parts status"); } finally { setSavingPartsStatus(false); }
                  }} disabled={savingPartsStatus || isPartsStatusDisabled}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-border bg-muted"><SelectValue placeholder="Parts status">{PARTS_STATUS_META[(job.parts_status ?? "no_parts") as PartsStatus]?.label ?? "Parts status"}</SelectValue></SelectTrigger>
                    <SelectContent className="min-w-[320px]">{PARTS_STATUSES.map((status) => (<SelectItem key={status} value={status}>{PARTS_STATUS_META[status].label} - {PARTS_STATUS_META[status].hint}</SelectItem>))}</SelectContent>
                  </Select>
                </div>

                <div className="rounded-2xl border border-border bg-muted p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4 text-muted-foreground" /> Promised time</span>
                    {editingPromise ? null : (<button onClick={() => { setDraftPromise(job.promised_at ? new Date(job.promised_at).toISOString().slice(0, 16) : ""); setEditingPromise(true); }} aria-label="Edit promised time" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>)}
                  </div>
                  {editingPromise ? (
                    <div className="mt-2 space-y-2">
                      <Input type="datetime-local" aria-label="Promised date and time" className="h-9 rounded-lg border-border bg-card text-sm" value={draftPromise} onChange={(e) => setDraftPromise(e.target.value)} />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 rounded-lg bg-slate-950 px-2 text-xs text-white hover:bg-slate-800" onClick={savePromise} disabled={savingPromise}><Save className="mr-1 h-3 w-3" /> {savingPromise ? "Saving..." : "Save"}</Button>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={() => setEditingPromise(false)} disabled={savingPromise}><X className="mr-1 h-3 w-3" /> Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xl font-bold text-foreground">{formatDate(job.promised_at, true)}</p>
                  )}
                  {!job.promised_at && job.status !== 'booked' && job.status !== 'closed' && <p className="mt-1 text-[10px] text-amber-600">Setting a promised date removes +5 from priority</p>}
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="inline-flex items-center gap-2 text-muted-foreground"><Send className="h-4 w-4 text-muted-foreground" /> Approval</span>
                    <span className="font-semibold text-foreground">{approvalStatusLabel}</span>
                  </div>
                </div>
              </div>
            </div>




          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-2 rounded-2xl border border-border bg-card p-2">
          <TabsTrigger value="overview" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <FileText className="mr-2 h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="customer" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <User className="mr-2 h-4 w-4" /> Customer
          </TabsTrigger>
          <TabsTrigger value="service-history" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <History className="mr-2 h-4 w-4" /> Service history
          </TabsTrigger>
          <TabsTrigger value="estimate" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <Wrench className="mr-2 h-4 w-4" /> Quote & authorization
          </TabsTrigger>
          <TabsTrigger value="parts" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <Wrench className="mr-2 h-4 w-4" /> Parts
          </TabsTrigger>
          <TabsTrigger value="inspection" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <ClipboardList className="mr-2 h-4 w-4" /> Inspection
          </TabsTrigger>
          <TabsTrigger value="qc" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <ShieldCheck className="mr-2 h-4 w-4" /> QC
          </TabsTrigger>
          <TabsTrigger value="media" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <ImageIcon className="mr-2 h-4 w-4" /> Media
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <History className="mr-2 h-4 w-4" /> Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
              <CardHeader className="border-b border-border bg-gradient-to-r from-card to-blue-500/50/5">
                <CardTitle className="text-lg">Priority & Next Action</CardTitle>
                <p className="text-sm text-muted-foreground">Live risk score and recommended move from the Priority Engine.</p>
              </CardHeader>
              <CardContent className="space-y-4 p-5 text-sm text-foreground/80">
                {/* Priority Score + Level */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn("rounded-full px-3 py-1.5 text-sm font-black tabular-nums ring-1", getPriorityTone(priority?.score))}>{priority?.score ?? "—"}</span>
                    <span className={cn("rounded-full border px-2 py-1 text-[11px] font-bold uppercase", getActionUrgencyClass(priority?.level ?? "low"))}>{priority?.level ?? "low"}</span>
                  </div>
                  {priority?.isOverdue && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">Overdue</span>}
                </div>

                {/* Risk Factors */}
                {priority?.factors?.length ? (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Risk Factors</p>
                  <div className="flex flex-wrap gap-1">
                    {priority.factors.map((f) => (<span key={f.key} className="rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">{f.description} +{f.weight}</span>))}
                  </div>
                </div>
                ) : <p className="text-xs text-muted-foreground">No active risk factors.</p>}

                {/* Next Action */}
                {priority?.nextAction ? (
                <div className="rounded-2xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/30 p-4">
                  <div className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-semibold inline-block mb-2", getActionUrgencyClass(priority.nextAction.urgency))}>{priority.nextAction.title} <span className="ml-1 font-normal opacity-70">({priority.nextAction.owner})</span></div>
                  <p className="text-sm leading-6">{priority.nextAction.reason}</p>
                </div>
                ) : (
                <div className="rounded-2xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-950/30 p-4 leading-6">
                  {job.status === "booked" && <p>Move the job into checking and assign the technician so the inspection can start.</p>}
                  {job.status === "checking" && <p>Complete the inspection and convert findings into estimate lines for advisor review.</p>}
                  {job.status === "estimate_sent" && <p>Follow up with the customer, confirm they saw the media evidence, and push toward approval.</p>}
                  {job.status === "approved" && <p>Start workshop execution and keep ETA visible to avoid delays.</p>}
                  {job.status === "in_progress" && <p>Track progress, parts, and blockers closely to protect promised time.</p>}
                  {job.status === "waiting_parts" && <p>Update the customer, chase procurement, and keep the board honest about waiting time.</p>}
                  {job.status === "quality_check" && <p>Finish QC fast, validate media if needed, and prepare customer-ready completion messaging.</p>}
                  {job.status === "ready" && <p>Move to invoicing and collection steps so finished work does not sit idle.</p>}
                  {job.status === "closed" && <p>This job is complete. Use it as a clean historical record.</p>}
                </div>
                )}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Commercial readiness</p>
                    <p className="mt-2 text-lg font-bold text-foreground">{estimateCount} lines</p>
                    <p className="mt-1 text-xs text-muted-foreground">AED {total.toFixed(2)} quote total</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Evidence readiness</p>
                    <p className="mt-2 text-lg font-bold text-foreground">{mediaCount} files</p>
                    <p className="mt-1 text-xs text-muted-foreground">Inspection: {String(inspectionState).replaceAll("_", " ")}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Customer state</p>
                    <p className="mt-2 text-lg font-bold text-foreground">{job.is_customer_waiting ? "Waiting" : "Normal"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{CUSTOMER_SENSITIVITY_META[(job.customer_sensitivity ?? "normal") as CustomerSensitivity]?.label ?? "Normal"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {estimateCount > 0 ? <SendApprovalButton jobId={job.id} onSent={refreshJob} /> : <Button disabled className="h-11 w-full rounded-xl">Add quote lines before approval</Button>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="customer" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-gradient-to-br from-muted to-blue-500/50/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Customer details</p>
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="divide-y divide-slate-100 px-5 py-1.5">
                <div className="grid grid-cols-[100px_1fr] items-start gap-3 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Name</p>
                  <p className="text-right text-sm font-semibold leading-5 text-foreground">{job.customer?.name || "Walk-in"}</p>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-start gap-3 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Phone</p>
                  {editingCustomerContact ? (
                    <Input
                      className="h-9 text-right text-sm"
                      placeholder="Customer phone / WhatsApp"
                      value={draftCustomerPhone}
                      onChange={(event) => setDraftCustomerPhone(event.target.value)}
                    />
                  ) : (
                    <p className="break-all text-right text-sm font-semibold leading-5 text-foreground">{job.customer?.phone || "No phone"}</p>
                  )}
                </div>
                <div className="grid grid-cols-[100px_1fr] items-start gap-3 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Email</p>
                  {editingCustomerContact ? (
                    <Input
                      className="h-9 text-right text-sm"
                      placeholder="customer@example.com"
                      type="email"
                      value={draftCustomerEmail}
                      onChange={(event) => setDraftCustomerEmail(event.target.value)}
                    />
                  ) : (
                    <p className="break-all text-right text-sm font-semibold leading-5 text-foreground">{job.customer?.email || "No email"}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2 py-3">
                  {editingCustomerContact ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg"
                        onClick={() => {
                          setDraftCustomerEmail(job.customer?.email || "");
                          setDraftCustomerPhone(job.customer?.phone || "");
                          setEditingCustomerContact(false);
                        }}
                        disabled={savingCustomerContact}
                      >
                        Cancel
                      </Button>
                      <Button type="button" size="sm" className="h-8 rounded-lg" onClick={saveCustomerContact} disabled={savingCustomerContact || !job.customer?.id}>
                        {savingCustomerContact ? "Saving…" : "Save contact"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg"
                      onClick={() => setEditingCustomerContact(true)}
                      disabled={!job.customer?.id}
                      title={!job.customer?.id ? "No customer is linked to this job" : undefined}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit email / phone
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-gradient-to-br from-muted to-blue-500/50/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Vehicle & priority</p>
                  <Car className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="divide-y divide-slate-100 px-5 py-1.5">
                <div className="grid grid-cols-[100px_1fr] items-start gap-3 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">VIN</p>
                  <p className="break-all text-right font-mono text-sm font-semibold leading-5 text-foreground">{job.vehicle?.vin || "No VIN"}</p>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-3 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Odometer</p>
                  <p className="text-right text-sm font-semibold leading-5 text-foreground">{job.odometer_in ? `${new Intl.NumberFormat("en-GB").format(Number(job.odometer_in))} km` : "-"}</p>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-3 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Waiting</p>
                  <p className="text-right">
                    <button type="button" onClick={async () => {
                      setSavingCustomerPriority(true);
                      try { await api.patch(`/jobs/${job.id}`, { is_customer_waiting: !job.is_customer_waiting }); await refreshJob(); toast.success(!job.is_customer_waiting ? "Customer marked waiting" : "Customer waiting removed"); }
                      catch { toast.error("Failed to update customer waiting flag"); } finally { setSavingCustomerPriority(false); }
                    }} disabled={savingCustomerPriority} className={cn("rounded-lg border px-3 py-1 text-xs font-semibold transition", job.is_customer_waiting ? "border-red-200 bg-red-50 text-red-800" : "border-border bg-card text-muted-foreground hover:border-red-200 hover:bg-red-50")}>
                      {job.is_customer_waiting ? "Yes — prioritize" : "No"}
                    </button>
                  </p>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-center gap-3 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Sensitivity</p>
                  <div className="flex justify-end">
                    <Select value={job.customer_sensitivity ?? "normal"} onValueChange={async (value) => {
                      const sensitivity = value as CustomerSensitivity;
                      setSavingCustomerPriority(true);
                      try { await api.patch(`/jobs/${job.id}`, { customer_sensitivity: sensitivity }); await refreshJob(); toast.success(`Sensitivity updated to ${CUSTOMER_SENSITIVITY_META[sensitivity].label}`); }
                      catch { toast.error("Failed to update sensitivity"); } finally { setSavingCustomerPriority(false); }
                    }} disabled={savingCustomerPriority}>
                      <SelectTrigger className="h-9 w-[180px] rounded-lg border-border bg-card text-xs"><SelectValue placeholder="Sensitivity" /></SelectTrigger>
                      <SelectContent className="min-w-[240px]">{CUSTOMER_SENSITIVITIES.map((s) => (<SelectItem key={s} value={s}>{CUSTOMER_SENSITIVITY_META[s].label} - {CUSTOMER_SENSITIVITY_META[s].hint}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Customer portal concerns</CardTitle>
              <p className="text-sm text-muted-foreground">Build the structured customer journey. These stay draft until you release the portal update.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <Input placeholder="Concern title e.g. Brake noise" value={newConcernTitle} onChange={(e) => setNewConcernTitle(e.target.value)} />
                <Input placeholder="Technician finding (optional)" value={newConcernFinding} onChange={(e) => setNewConcernFinding(e.target.value)} />
                <Button className="rounded-xl" onClick={addStructuredConcern} disabled={savingStructuredConcern || !newConcernTitle.trim()}>
                  {savingStructuredConcern ? "Adding…" : "Add concern"}
                </Button>
              </div>
              {job.job_concerns?.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {job.job_concerns.map((concern) => (
                    <div key={concern.id} className="rounded-2xl border border-border bg-muted/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{concern.code || "Concern"}</p>
                          <p className="mt-1 font-semibold text-foreground">{concern.title}</p>
                        </div>
                        <span className="rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground">{concern.status || "reviewing"}</span>
                      </div>

                      <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); updateStructuredConcern(concern.id, event.currentTarget); }}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Status</p>
                            <Select name="status" defaultValue={concern.status || "reviewing"}>
                              <SelectTrigger className="h-10 rounded-xl bg-card"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="reviewing">Reviewing</SelectItem>
                                <SelectItem value="finding_ready">Finding ready</SelectItem>
                                <SelectItem value="priced">Priced</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="declined">Declined</SelectItem>
                                <SelectItem value="in_progress">In progress</SelectItem>
                                <SelectItem value="qc_complete">QC complete</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end justify-end">
                            <MediaUploader jobId={job.id} concernId={concern.id} onUploaded={refreshJob} />
                          </div>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Technician finding / feedback</p>
                          <Textarea name="technician_finding" defaultValue={concern.technician_finding || ""} placeholder="What did the technician find?" className="min-h-[80px] bg-card" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Work progress note</p>
                            <Textarea name="work_note" defaultValue={concern.work_note || ""} placeholder="What work is being done / progress update" className="min-h-[70px] bg-card" />
                          </div>
                          <div>
                            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">QC / final note</p>
                            <Textarea name="qc_note" defaultValue={concern.qc_note || ""} placeholder="QC result or final report note" className="min-h-[70px] bg-card" />
                          </div>
                        </div>
                        {concern.media_files?.length ? (
                          <div className="grid grid-cols-3 gap-2">
                            {concern.media_files.map((file) => (
                              <MediaThumbnail key={file.id} file={{ ...file, original_filename: file.original_filename || undefined, file_type: file.file_type || undefined, mime_type: file.mime_type || undefined, size_bytes: file.size_bytes == null ? undefined : Number(file.size_bytes), scan_status: file.scan_status || undefined }} onDeleted={refreshJob} />
                            ))}
                          </div>
                        ) : null}
                        <Button type="submit" size="sm" className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">Save feedback</Button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">No structured concerns yet. Add one from customer complaint or technician finding.</div>
              )}
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="service-history" className="space-y-4">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-lg">Vehicle service history</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  All previous jobs recorded for this vehicle, including concerns, odometer, quote value, inspection and media count.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[480px]">
                <StatCard label="Visits" value={String(serviceHistory?.totals.jobs ?? 0)} />
                <StatCard label="Closed jobs" value={String(serviceHistory?.totals.closedJobs ?? 0)} />
                <StatCard label="Total quoted" value={`AED ${Number(serviceHistory?.totals.revenue ?? 0).toFixed(2)}`} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {historyLoading ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">Loading service history...</div>
              ) : serviceHistory?.entries?.length ? (
                <div className="space-y-4">
                  {serviceHistory.entries.map((entry) => (
                    <div key={`${entry.type}-${entry.id}`} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-foreground">{entry.job_number || (entry.type === "manual" ? "Manual history" : "Job")}</span>
                            {entry.status ? <StatusBadge status={entry.status} /> : null}
                            {entry.dms_ro_number ? <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">RO {entry.dms_ro_number}</span> : null}
                          </div>
                          <p className="mt-3 text-base font-semibold text-foreground">{entry.summary || "No concern / summary recorded"}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>Service date: {formatDate(entry.service_date, true)}</span>
                            <span>Odometer: {entry.odometer_km ? `${new Intl.NumberFormat("en-GB").format(Number(entry.odometer_km))} km` : "-"}</span>
                            <span>Advisor: {entry.advisor?.name || "-"}</span>
                            <span>Technician: {entry.technician?.name || "-"}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center lg:min-w-[300px]">
                          <div className="rounded-xl bg-muted p-3">
                            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Quote</p>
                            <p className="mt-1 text-sm font-bold text-foreground">{typeof entry.estimate_total === "number" ? `AED ${entry.estimate_total.toFixed(2)}` : "-"}</p>
                          </div>
                          <div className="rounded-xl bg-muted p-3">
                            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Lines</p>
                            <p className="mt-1 text-sm font-bold text-foreground">{entry.estimate_lines?.length ?? 0}</p>
                          </div>
                          <div className="rounded-xl bg-muted p-3">
                            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Media</p>
                            <p className="mt-1 text-sm font-bold text-foreground">{entry.media_count ?? 0}</p>
                          </div>
                        </div>
                      </div>

                      {entry.estimate_lines?.length ? (
                        <div className="mt-4 overflow-hidden rounded-xl border border-border">
                          <div className="grid grid-cols-[1fr_90px_110px] bg-muted px-3 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            <span>Description</span><span className="text-right">Qty</span><span className="text-right">Total</span>
                          </div>
                          <div className="divide-y divide-border">
                            {entry.estimate_lines.slice(0, 6).map((line) => (
                              <div key={line.id} className="grid grid-cols-[1fr_90px_110px] gap-3 px-3 py-2 text-sm">
                                <span className="truncate text-foreground">{line.description || line.type}</span>
                                <span className="text-right text-muted-foreground">{line.quantity ?? "-"}</span>
                                <span className="text-right font-semibold text-foreground">AED {Number(line.line_total ?? 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          {entry.estimate_lines.length > 6 ? <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">+{entry.estimate_lines.length - 6} more lines</p> : null}
                        </div>
                      ) : null}

                      {entry.job_id ? (
                        <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => router.push(`/jobs/${entry.job_id}`)}>
                          Open job card
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
                  No previous service history found for this vehicle yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-lg">Job parts</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Add catalog stock or free-text ad-hoc parts to this job card.</p>
              </div>
              <div className="flex rounded-xl border border-border bg-muted p-1">
                <Button type="button" size="sm" variant={partEntryMode === "catalog" ? "default" : "ghost"} className="h-8 rounded-lg" onClick={() => setPartEntryMode("catalog")}>Catalog</Button>
                <Button type="button" size="sm" variant={partEntryMode === "adhoc" ? "default" : "ghost"} className="h-8 rounded-lg" onClick={() => setPartEntryMode("adhoc")}>Ad-hoc</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="mb-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Quote concern</p>
                  <Select value={selectedConcernId || "__none"} onValueChange={(value) => setSelectedConcernId(value && value !== "__none" ? value : "")}>
                    <SelectTrigger className="h-10 rounded-xl bg-card">
                      <SelectValue placeholder="Select concern">{selectedConcernId ? concernLabel(selectedConcernId) : "Select concern"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Select concern</SelectItem>
                      {jobConcerns.map((concern) => (
                        <SelectItem key={concern.id} value={concern.id}>
                          {concern.code ? `${concern.code} - ` : ""}{concern.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {partEntryMode === "catalog" ? (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Catalog part</p>
                      <Input value={partSearch} onChange={(event) => searchCatalogParts(event.target.value)} placeholder="Search by part name, number, barcode, brand..." className="bg-card" />
                      {partOptions.length > 0 && !selectedPartId ? (
                        <div className="mt-2 max-h-52 overflow-auto rounded-xl border border-border bg-card">
                          {partOptions.map((part) => (
                            <button
                              key={part.id}
                              type="button"
                              className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                              onClick={() => {
                                setSelectedPartId(part.id);
                                setPartSearch(`${part.name}${part.part_number ? ` (${part.part_number})` : ""}`);
                                setPartOptions([]);
                              }}
                            >
                              <span className="font-medium text-foreground">{part.name}</span>
                              <span className="text-xs text-muted-foreground">{part.part_number || part.brand || "Catalog"}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Part name</p>
                      <Input value={adhocPartName} onChange={(event) => setAdhocPartName(event.target.value)} placeholder="e.g. Custom bracket, trim clip, hose" className="bg-card" />
                    </div>
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Part number</p>
                      <Input value={adhocPartNumber} onChange={(event) => setAdhocPartNumber(event.target.value)} placeholder="Optional" className="bg-card" />
                    </div>
                  </div>
                )}

                <div className="mt-3 grid gap-3 md:grid-cols-5">
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Warehouse</p>
                    <Select value={selectedWarehouseId || "__none"} onValueChange={(value) => setSelectedWarehouseId(value && value !== "__none" ? value : "")}>
                      <SelectTrigger className="h-10 rounded-xl bg-card"><SelectValue placeholder="Warehouse" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">{partEntryMode === "catalog" ? "Select warehouse" : "No warehouse hint"}</SelectItem>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Qty</p>
                    <Input type="number" min="1" value={partQuantity} onChange={(event) => setPartQuantity(event.target.value)} className="bg-card" />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Unit cost</p>
                    <Input type="number" step="0.01" value={partUnitCost} onChange={(event) => setPartUnitCost(event.target.value)} placeholder="Optional" className="bg-card" />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Unit price</p>
                    <Input type="number" step="0.01" value={partUnitPrice} onChange={(event) => setPartUnitPrice(event.target.value)} placeholder={partEntryMode === "adhoc" ? "Required" : "Optional"} className="bg-card" />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" className="h-10 w-full rounded-xl" onClick={reserveJobPart} disabled={savingJobPart}>
                      {savingJobPart ? "Adding..." : "Add memo"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border">
                <div className="grid grid-cols-[1.3fr_1fr_80px_100px_100px_110px_1fr_200px] gap-3 bg-muted px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <span>Part</span>
                  <span>Concern</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Cost</span>
                  <span className="text-right">Price</span>
                  <span>Status</span>
                  <span>Warehouse</span>
                  <span className="text-right">Actions</span>
                </div>
                {jobParts.length === 0 && unfulfilledQuotePartLines.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No parts have been added to this job yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {jobParts.map((part) => {
                      const partName = part.partName ?? part.part_name ?? part.parts?.name ?? "Unnamed part";
                      const partNumber = part.partNumber ?? part.part_number ?? part.parts?.part_number ?? null;
                      const isAdhoc = part.source === "adhoc";
                      const isBusy = actingJobPartId === part.id;
                      return (
                        <div key={part.id} className="grid grid-cols-[1.3fr_1fr_80px_100px_100px_110px_1fr_200px] items-center gap-3 px-4 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold text-foreground">{partName}</span>
                              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", isAdhoc ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200")}>{isAdhoc ? "Ad-hoc" : "Catalog"}</span>
                            </div>
                            {partNumber ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{partNumber}</p> : null}
                          </div>
                          <div className="truncate text-muted-foreground">{concernLabel(part.concernId ?? part.concern_id)}</div>
                          <div className="text-right font-medium tabular-nums">{part.quantity}</div>
                          <div className="text-right tabular-nums">{part.unit_cost != null ? `AED ${Number(part.unit_cost).toFixed(2)}` : "-"}</div>
                          <div className="text-right tabular-nums">{part.unit_price != null ? `AED ${Number(part.unit_price).toFixed(2)}` : "-"}</div>
                          <div><span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold capitalize text-foreground/80">{part.status}</span></div>
                          <div className="truncate text-muted-foreground">{part.warehouses?.name || (part.warehouse_id ? part.warehouse_id.slice(0, 8) : "-")}</div>
                          <div className="flex justify-end gap-2">
                            {part.status === "memo" ? (
                              <>
                                {!isAdhoc ? <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" disabled={isBusy} onClick={() => updateJobPartStatus(part, "reserve")}>Reserve</Button> : null}
                                {isAdhoc ? <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" disabled={isBusy} onClick={() => updateJobPartStatus(part, "consume")}>Use</Button> : null}
                                <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg" disabled={isBusy} onClick={() => updateJobPartStatus(part, "cancel")}>Cancel</Button>
                              </>
                            ) : part.status === "reserved" ? (
                              <>
                                <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" disabled={isBusy} onClick={() => updateJobPartStatus(part, "consume")}>Use</Button>
                                {!isAdhoc ? <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" disabled={isBusy} onClick={() => updateJobPartStatus(part, "return")}>Return</Button> : null}
                                <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg" disabled={isBusy} onClick={() => updateJobPartStatus(part, "cancel")}>Cancel</Button>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">No actions</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {unfulfilledQuotePartLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-[1.3fr_1fr_80px_100px_100px_110px_1fr_200px] items-center gap-3 bg-muted/20 px-4 py-3 text-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-foreground">{line.description || "Quote part"}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-200">Quote line</span>
                          </div>
                          {line.part_number ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{line.part_number}</p> : null}
                        </div>
                        <div className="truncate text-muted-foreground">{concernLabel(line.concern_id)}</div>
                        <div className="text-right font-medium tabular-nums">{Number(line.quantity ?? 1)}</div>
                        <div className="text-right tabular-nums">-</div>
                        <div className="text-right tabular-nums">{line.unit_price != null ? `AED ${Number(line.unit_price).toFixed(2)}` : "-"}</div>
                        <div><span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground/80">quote only</span></div>
                        <div className="truncate text-muted-foreground">-</div>
                        <div className="flex justify-end">
                          <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg" disabled={savingJobPart} onClick={() => addQuoteLineToPartsMemo(line)}>Add memo</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="estimate" className="space-y-0">
          {(() => {
            const concerns = job.job_concerns ?? [];
            const ca = authStatus?.concernApprovals ?? [];
            const allLines = job.estimate_lines ?? [];
            const approvedConcerns = concerns.filter((c) => {
              const a = ca.find((x) => x.concernId === c.id);
              return a?.advisorDecision === "approved" || a?.customerDecision === "approved";
            });
            const approvedLines = approvedConcerns.flatMap((c) => allLines.filter((l) => l.concern_id === c.id));
            const approvedLabour = approvedLines.filter((l) => l.type === "labour").reduce((s, l) => s + Number(l.line_total ?? 0), 0);
            const approvedParts = approvedLines.filter((l) => l.type === "part").reduce((s, l) => s + Number(l.line_total ?? 0), 0);
            const approvedSublet = approvedLines.filter((l) => l.type === "sublet").reduce((s, l) => s + Number(l.line_total ?? 0), 0);
            const avgTaxRate = approvedLines.length > 0 ? approvedLines.reduce((s, l) => s + Number(l.tax_rate_pct ?? 0), 0) / approvedLines.length : 0;
            const approvedVat = (approvedLabour + approvedParts + approvedSublet) * (avgTaxRate / 100);
            const approvedTotal = approvedLines.reduce((s, l) => s + Number(l.line_total ?? 0), 0);
            const hasApproved = approvedConcerns.length > 0;
            return (
          <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
            {/* Zone 1 — Header */}
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[12px] text-muted-foreground">WO-{job.job_number ?? "..."} &middot; {job.vehicle ? [job.vehicle.year, job.vehicle.make, job.vehicle.model].filter(Boolean).join(" ") : "No vehicle"} &middot; {job.customer?.name || "Walk-in"}</p>
                  <p className="mt-0.5 text-[15px] font-medium text-foreground">Quote builder &amp; approval</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Quote total</p>
                    <p className="text-[22px] font-medium leading-tight text-foreground">AED {total.toFixed(2)}</p>
                  </div>
                  {estimateCount > 0 ? <SendApprovalButton jobId={job.id} onSent={refreshJob} /> : <Button disabled className="rounded-md">Add lines first</Button>}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {latestApprovalToken ? (
                  <>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${latestApprovalToken?.used_at ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200" : latestApprovalToken?.first_opened_at ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200" : "bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200"}`}>
                      {latestApprovalToken?.used_at ? "Replied" : latestApprovalToken?.first_opened_at ? "Viewed" : "Sent"}
                    </span>
                    <span className="text-[12px] text-muted-foreground">{formatDate(latestApprovalToken?.issued_at, true)}</span>
                  </>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">Draft</span>
                )}
                {approvalCounts ? (
                  <>
                    {approvalCounts.approved > 0 && <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">{approvalCounts.approved} approved</span>}
                    {approvalCounts.declined > 0 && <span className="rounded-full bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:text-rose-200">{approvalCounts.declined} rejected</span>}
                    {approvalCounts.deferred > 0 && <span className="rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">{approvalCounts.deferred} deferred</span>}
                    {approvalCounts.pending > 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/80">{approvalCounts.pending} pending</span>}
                  </>
                ) : null}
              </div>
            </div>

            {/* Zone 2 — Concerns list */}
            <div>
              <ComponentErrorBoundary label="Quote builder">
                <EstimateBuilder jobId={job.id} lines={job.estimate_lines ?? []} inspection={inspectionDetail} jobConcerns={job.job_concerns ?? []} onUpdate={refreshJob} decisionByLine={authStatus?.decisionByLine ?? {}} concernApprovals={authStatus?.concernApprovals ?? []} />
              </ComponentErrorBoundary>
            </div>

            {/* Zone 3 — Footer with totals */}
            <div className="border-t border-border px-5 py-4">
              <div className="grid grid-cols-2 gap-x-10">
                <div>
                  <p className="border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Quote</p>
                  <div className="mt-2 flex justify-between text-[14px] font-medium text-foreground">
                    <span>Grand total</span>
                    <span>AED {total.toFixed(2)}</span>
                  </div>
                </div>
                <div className={hasApproved ? "" : "opacity-40"}>
                  <p className="border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Approved</p>
                  {hasApproved ? (
                    <div className="mt-2 space-y-0.5">
                      <div className="flex justify-between text-[13px] text-muted-foreground"><span>Labour</span><span>AED {approvedLabour.toFixed(2)}</span></div>
                      <div className="flex justify-between text-[13px] text-muted-foreground"><span>Parts</span><span>AED {approvedParts.toFixed(2)}</span></div>
                      <div className="flex justify-between text-[13px] text-muted-foreground"><span>Sublet</span><span>AED {approvedSublet.toFixed(2)}</span></div>
                      <div className="flex justify-between text-[13px] text-muted-foreground"><span>VAT ({avgTaxRate.toFixed(1)}%)</span><span>AED {approvedVat.toFixed(2)}</span></div>
                      <div className="mt-1.5 flex justify-between border-t border-border pt-2 text-[14px] font-medium text-foreground"><span>Total approved</span><span>AED {(approvedTotal + approvedVat).toFixed(2)}</span></div>
                    </div>
                  ) : (
                    <p className="mt-2 text-[13px] text-muted-foreground">No concerns approved yet</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="inspection" className="space-y-4" id="inspection">
          {inspectionDetail ? (
            <Card className="rounded-2xl border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Inspection workspace</CardTitle>
                  {inspectionLocked ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      This inspection is locked. Re-open it to continue editing.
                    </p>
                  ) : null}
                </div>
                {inspectionLocked ? (
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={reopenInspection}
                    disabled={reopeningInspection}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {reopeningInspection ? "Re-opening..." : "Re-open inspection"}
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
<ComponentErrorBoundary label="Inspection">
                <InspectionWorkspace key={inspectionRev} inspection={inspectionDetail} onChanged={refreshJob} />
                </ComponentErrorBoundary>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-border shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                <div>
                  <p className="text-lg font-semibold text-foreground">No inspection started yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start an inspection to capture technician findings, urgency, notes, and evidence.
                  </p>
                </div>
                <Button className="rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800" onClick={startInspection} disabled={startingInspection}>
                  {startingInspection ? "Starting..." : "Start inspection"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="qc" className="space-y-4" id="qc">
          {qcChecklistDetail ? (
            <Card className="rounded-2xl border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Quality Control</CardTitle>
                  {["submitted", "approved"].includes(qcChecklistDetail.status) ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      This QC checklist is locked. Re-open it to continue editing.
                    </p>
                  ) : null}
                </div>
                {["submitted", "approved"].includes(qcChecklistDetail.status) ? (
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={reopenQcChecklist}
                    disabled={reopeningQc}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {reopeningQc ? "Re-opening..." : "Re-open QC checklist"}
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                <ComponentErrorBoundary label="QC Checklist">
                  <QcChecklistWorkspace key={qcRev} checklist={qcChecklistDetail} onChanged={refreshJob} />
                </ComponentErrorBoundary>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-border shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                <div>
                  <p className="text-lg font-semibold text-foreground">No QC checklist started yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start a quality control checklist to verify the work that was done on this job.
                  </p>
                </div>
                <Button className="rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800" onClick={startQcChecklist} disabled={startingQc}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {startingQc ? "Starting..." : "Start QC Checklist"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Status timeline</CardTitle>
              <p className="text-sm text-muted-foreground">A chronological audit trail for this job’s overall status changes.</p>
            </CardHeader>
            <CardContent className="p-5">
              {job.job_status_history?.length ? (
                <div className="relative space-y-4 before:absolute before:left-3 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                  {job.job_status_history.map((event) => (
                    <div key={event.id} className="relative flex gap-4 pl-8">
                      <span className="absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                        <Clock3 className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1 rounded-2xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {event.from_status ? <StatusBadge status={event.from_status} /> : <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">Created</span>}
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            {event.to_status ? <StatusBadge status={event.to_status} /> : null}
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">{formatDate(event.changed_at, true)}</span>
                        </div>
                        <div className="mt-3 text-sm text-muted-foreground">
                          <span>By {event.users?.name || event.users?.email || "System"}</span>
                          {event.reason ? <span> · {event.reason}</span> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
                  No status history yet. Future status changes will appear here.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-4" id="media">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Media evidence</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Attach photos, videos, or documents that support the quote and inspection.</p>
              </div>
              <ComponentErrorBoundary label="Media upload">
                <MediaUploader jobId={job.id} onUploaded={refreshJob} />
              </ComponentErrorBoundary>
            </CardHeader>
            <CardContent>
              {job.media_files && job.media_files.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {job.media_files.map((file: any) => (
                    <MediaThumbnail key={file.id} file={{ ...file, original_filename: file.original_filename || undefined, file_type: file.file_type || undefined, mime_type: file.mime_type || undefined, size_bytes: file.size_bytes == null ? undefined : Number(file.size_bytes), scan_status: file.scan_status || undefined }} onDeleted={refreshJob} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-border bg-muted py-14 text-center text-muted-foreground">
                  No media files yet. Upload evidence to strengthen customer approval.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
