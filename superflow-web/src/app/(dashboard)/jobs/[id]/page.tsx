"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Job, JobAuthorisationStatus, JobStatus, WorkshopStage, PartsStatus, CustomerSensitivity } from "@/types";
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
import { SendApprovalButton } from "@/components/estimates/send-approval-button";
import { MediaUploader } from "@/components/media/media-uploader";
import { MediaThumbnail } from "@/components/media/media-thumbnail";
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Image as ImageIcon,
  Pencil,
  RotateCcw,
  Save,
  Send,
  User,
  Wrench,
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
  checking: { label: "Checking", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-900" },
  estimate_sent: { label: "Estimate Sent", dot: "bg-rose-500", badge: "bg-rose-100 text-rose-800" },
  approved: { label: "Approved", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
  in_progress: { label: "In Progress", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800" },
  waiting_parts: { label: "Waiting Parts", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-800" },
  quality_check: { label: "Quality Check", dot: "bg-cyan-500", badge: "bg-cyan-100 text-cyan-800" },
  ready: { label: "Ready", dot: "bg-teal-500", badge: "bg-teal-100 text-teal-800" },
  closed: { label: "Closed", dot: "bg-slate-600", badge: "bg-slate-200 text-foreground/80" },
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
};

const PARTS_STATUSES = Object.keys(PARTS_STATUS_META) as PartsStatus[];

const WORKSHOP_STAGE_META: Record<WorkshopStage, { label: string; hint: string }> = {
  waiting_technician: { label: "Waiting to Start", hint: "Received car waiting for technician/bay to start" },
  received: { label: "Waiting to Start", hint: "Received car waiting for technician/bay to start" },
  diagnosis: { label: "Diagnosis", hint: "Inspection / diagnosis active" },
  estimate_prep: { label: "Estimate Prep", hint: "Preparing quote" },
  customer_approval: { label: "Advisor / Approval", hint: "Advisor follow-up and customer approval" },
  work_in_progress: { label: "Work In Progress", hint: "Repair work active" },
  final_test: { label: "Final Test", hint: "Final/road test" },
  quality_check: { label: "Quality Check", hint: "QC before handover" },
  ready_handover: { label: "Ready Handover", hint: "Ready for delivery" },
};

const WORKSHOP_STAGES = (Object.keys(WORKSHOP_STAGE_META) as WorkshopStage[]).filter((stage) => !["received", "advisor_review", "parts_check"].includes(stage));

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

function estimateTotal(job: Job) {
  return (job.estimate_lines ?? []).reduce(
    (sum, line) => sum + Number(line.line_total ?? 0),
    0,
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", meta.badge)}>
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [inspectionDetail, setInspectionDetail] = useState<any | null>(null);
  const [authStatus, setAuthStatus] = useState<JobAuthorisationStatus | null>(null);
  const [inspectionRev, setInspectionRev] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startingInspection, setStartingInspection] = useState(false);
  const [reopeningInspection, setReopeningInspection] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  /** Most logical next status in the forward flow */
  const nextFlowStatus = useMemo(() => {
    if (!job) return "";
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
  }, [job?.status]);
  const [users, setUsers] = useState<any[]>([]);
  const [assigningAdvisor, setAssigningAdvisor] = useState(false);
  const [assigningTech, setAssigningTech] = useState(false);
  const [savingWorkshopStage, setSavingWorkshopStage] = useState(false);
  const [savingPartsStatus, setSavingPartsStatus] = useState(false);
  const [savingCustomerInformed, setSavingCustomerInformed] = useState(false);

  /** True when the job is still in reception / advisor phase - workshop fields are irrelevant. */
  const isWorkshopStageDisabled = job ? WORKSHOP_STAGE_DISABLED_STATUSES.includes(job.status) : false;
  const isPartsStatusDisabled = job ? PARTS_STATUS_DISABLED_STATUSES.includes(job.status) : false;
  const [savingCustomerPriority, setSavingCustomerPriority] = useState(false);

  // Inline editing states
  const [editingConcern, setEditingConcern] = useState(false);
  const [draftConcern, setDraftConcern] = useState("");
  const [savingConcern, setSavingConcern] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingPromise, setEditingPromise] = useState(false);
  const [draftPromise, setDraftPromise] = useState("");
  const [savingPromise, setSavingPromise] = useState(false);

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

  const advisors = users.filter((u: any) => ["admin", "service_advisor"].includes(u.role?.name ?? ""));
  const technicians = users.filter((u: any) => ["technician"].includes(u.role?.name ?? ""));

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

  const refreshJob = async () => {
    const [{ data }, authRes] = await Promise.all([
      api.get<Job>(`/jobs/${id}`),
      api.get<JobAuthorisationStatus>(`/jobs/${id}/auth-status`).catch(() => ({ data: null })),
    ]);

    setJob(data);
    setAuthStatus(authRes?.data ?? null);
    if (data.inspection?.id) {
      const inspectionRes = await api.get(`/inspections/${data.inspection.id}`);
      setInspectionDetail(inspectionRes.data);
      setInspectionRev((r) => r + 1);
    } else {
      setInspectionDetail(null);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await api.get("/users");
      const list = data.items ?? data ?? [];
      setUsers(list.filter((u: any) => u.is_active));
    } catch {
      // ignore
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
  }, [id]);

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
    () => (job ? ALL_STATUSES.filter((status) => status !== job.status) : []),
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
      const message = err?.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(", ") : message || "Failed to reopen inspection");
    } finally {
      setReopeningInspection(false);
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
                  } catch {
                    toast.error("Failed to change status");
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
                    } catch {
                      toast.error("Failed to change status");
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
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
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
                    <p className="mt-2 min-h-[88px] whitespace-pre-wrap text-sm leading-6 text-foreground/80 hover:cursor-pointer hover:text-foreground" onClick={() => { setDraftConcern(job.customer_concern || ""); setEditingConcern(true); }}>
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
                    <p className="mt-2 min-h-[88px] whitespace-pre-wrap text-sm leading-6 text-foreground/80 hover:cursor-pointer hover:text-foreground" onClick={() => { setDraftNotes(job.internal_notes || ""); setEditingNotes(true); }}>
                      {job.internal_notes || "Click to add internal notes."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Button variant="outline" className="h-12 rounded-2xl border-border bg-card shadow-sm" onClick={() => router.push(`/jobs/${job.id}#inspection`)}>
                <ClipboardList className="mr-2 h-4 w-4" /> Inspection
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl border-border bg-card shadow-sm" onClick={() => router.push(`/jobs/${job.id}#media`)}>
                <ImageIcon className="mr-2 h-4 w-4" /> Media
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
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Workshop stage {isWorkshopStageDisabled && <span className="ml-1 text-[10px] normal-case text-muted-foreground">— not available</span>}</p>
                  <Select value={job.workshop_stage === "received" ? "waiting_technician" : String(job.workshop_stage) === "advisor_review" ? "customer_approval" : job.workshop_stage ?? "waiting_technician"} onValueChange={async (value) => {
                    const workshopStage = value as WorkshopStage;
                    setSavingWorkshopStage(true);
                    try {
                      await api.patch(`/jobs/${job.id}`, { workshop_stage: workshopStage });
                      await refreshJob();
                      const syncMsg = workshopStage === 'work_in_progress' ? ' - Overall moved to In Progress' : workshopStage === 'quality_check' ? ' - Overall moved to Quality Check' : workshopStage === 'ready_handover' ? ' - Overall moved to Ready' : '';
                      toast.success(`Workshop stage updated to ${WORKSHOP_STAGE_META[workshopStage].label}${syncMsg}`);
                    } catch { toast.error("Failed to update workshop stage"); } finally { setSavingWorkshopStage(false); }
                  }} disabled={savingWorkshopStage || isWorkshopStageDisabled}>
                    <SelectTrigger className="h-11 w-full rounded-xl border-border bg-muted"><SelectValue placeholder="Workshop stage">{WORKSHOP_STAGE_META[((job.workshop_stage === "received" ? "waiting_technician" : String(job.workshop_stage) === "advisor_review" ? "customer_approval" : job.workshop_stage) ?? "waiting_technician") as WorkshopStage]?.label ?? "Workshop stage"}</SelectValue></SelectTrigger>
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
                      <Input type="datetime-local" className="h-9 rounded-lg border-border bg-card text-sm" value={draftPromise} onChange={(e) => setDraftPromise(e.target.value)} />
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
          <TabsTrigger value="estimate" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <Wrench className="mr-2 h-4 w-4" /> Quote & authorization
          </TabsTrigger>
          <TabsTrigger value="inspection" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <ClipboardList className="mr-2 h-4 w-4" /> Inspection
          </TabsTrigger>
          <TabsTrigger value="media" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <ImageIcon className="mr-2 h-4 w-4" /> Media
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
              <CardHeader className="border-b border-border bg-gradient-to-r from-card to-blue-500/50/5">
                <CardTitle className="text-lg">Recommended next move</CardTitle>
                <p className="text-sm text-muted-foreground">A clean action brief without repeating the full job record above.</p>
              </CardHeader>
              <CardContent className="space-y-4 p-5 text-sm text-foreground/80">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 leading-6">
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
                <Button variant="outline" className="h-11 w-full justify-start rounded-xl" onClick={() => router.push(`/jobs/${job.id}#inspection`)}>
                  <ClipboardList className="mr-2 h-4 w-4" /> Open inspection workspace
                </Button>
                <Button variant="outline" className="h-11 w-full justify-start rounded-xl" onClick={() => router.push(`/jobs/${job.id}#media`)}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Open media evidence
                </Button>
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
                  <p className="break-all text-right text-sm font-semibold leading-5 text-foreground">{job.customer?.phone || "No phone"}</p>
                </div>
                <div className="grid grid-cols-[100px_1fr] items-start gap-3 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Email</p>
                  <p className="break-all text-right text-sm font-semibold leading-5 text-foreground">{job.customer?.email || "No email"}</p>
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
          </div>
        </TabsContent>


        <TabsContent value="estimate" className="space-y-4">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <CardTitle className="text-lg">Quote builder & authorization</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Parts, labour, totals, and customer approval in one workspace.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Quote total</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">AED {total.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Live total from estimate lines</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Authorization</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{approvalStatusLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {approvalCounts
                        ? `${approvalCounts.approved} approved · ${approvalCounts.declined} rejected · ${approvalCounts.deferred} deferred · ${approvalCounts.pending} pending`
                        : `${estimateCount} line item${estimateCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted p-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-muted-foreground">
                  Send the customer approval link once the quote and media evidence are ready.
                </p>
                <div className="w-full lg:w-auto">
                  {estimateCount > 0 ? <SendApprovalButton jobId={job.id} onSent={refreshJob} /> : <Button disabled className="w-full rounded-xl">Add estimate lines first</Button>}
                </div>
              </div>

              {authStatus ? (
                <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Customer approval feedback</p>
                      <p className="text-xs text-muted-foreground">
                        {latestApprovalToken?.used_at
                          ? `Customer submitted a response on ${formatDate(latestApprovalToken.used_at, true)}.`
                          : latestApprovalToken?.first_opened_at
                            ? `Customer viewed the quote on ${formatDate(latestApprovalToken.first_opened_at, true)} but has not submitted yet.`
                            : latestApprovalToken?.issued_at
                              ? `Approval link sent on ${formatDate(latestApprovalToken.issued_at, true)}.`
                              : "No approval request has been sent yet."}
                      </p>
                    </div>
                    {approvalCounts ? (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">Approved: {approvalCounts.approved}</span>
                        <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-800">Rejected: {approvalCounts.declined}</span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">Deferred: {approvalCounts.deferred}</span>
                        <span className="rounded-full bg-muted px-3 py-1 font-semibold text-foreground/80">Pending: {approvalCounts.pending}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              <EstimateBuilder jobId={job.id} lines={job.estimate_lines ?? []} inspection={inspectionDetail} onUpdate={refreshJob} decisionByLine={authStatus?.decisionByLine ?? {}} />
            </CardContent>
          </Card>
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
                <InspectionWorkspace key={inspectionRev} inspection={inspectionDetail} onChanged={refreshJob} />
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


        <TabsContent value="media" className="space-y-4" id="media">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Media evidence</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Attach photos, videos, or documents that support the quote and inspection.</p>
              </div>
              <MediaUploader jobId={job.id} onUploaded={refreshJob} />
            </CardHeader>
            <CardContent>
              {job.media_files && job.media_files.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {job.media_files.map((file: any) => (
                    <MediaThumbnail key={file.id} file={file} onDeleted={refreshJob} />
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
