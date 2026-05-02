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
import { EstimateBuilder } from "@/components/estimates/estimate-builder";
import { SendApprovalButton } from "@/components/estimates/send-approval-button";
import { InspectionWorkspace } from "@/components/inspections/inspection-workspace";
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
  booked: { label: "Booked", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700" },
  checking: { label: "Checking", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-900" },
  estimate_sent: { label: "Estimate Sent", dot: "bg-rose-500", badge: "bg-rose-100 text-rose-800" },
  approved: { label: "Approved", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
  in_progress: { label: "In Progress", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800" },
  waiting_parts: { label: "Waiting Parts", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-800" },
  quality_check: { label: "Quality Check", dot: "bg-cyan-500", badge: "bg-cyan-100 text-cyan-800" },
  ready: { label: "Ready", dot: "bg-teal-500", badge: "bg-teal-100 text-teal-800" },
  closed: { label: "Closed", dot: "bg-slate-600", badge: "bg-slate-200 text-slate-700" },
};

/** Overall statuses that belong to reception / service-advisor phase.
 *  Workshop stage & parts status are not applicable here - the car
 *  hasn't reached the workshop yet. */
const RECEPTION_STATUSES: JobStatus[] = ["booked", "checking", "estimate_sent", "approved"];

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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
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
  const isInReception = job ? RECEPTION_STATUSES.includes(job.status) : false;
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
    return <div className="py-20 text-center text-slate-400">Loading...</div>;
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
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="mt-1 h-10 w-10 rounded-xl"
              onClick={() => router.push("/jobs")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                360 job workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {job.job_number || "New Job"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Created {formatDate(job.created_at)} • Last updated {formatDate(job.updated_at, true)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
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
                <SelectTrigger className="h-11 w-[220px] rounded-xl border-slate-200">
                  <SelectValue placeholder="Change status" />
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
                <Button className="h-11 rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800" onClick={async () => {
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
                  {changingStatus ? "Moving…" : `Next → ${STATUS_META[nextFlowStatus].label}`}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {estimateCount > 0 ? <SendApprovalButton jobId={job.id} onSent={refreshJob} /> : null}
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => router.push(`/jobs/${job.id}#inspection`)}>
                <ClipboardList className="mr-2 h-4 w-4" /> Inspection
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => router.push(`/jobs/${job.id}#media`)}>
                <ImageIcon className="mr-2 h-4 w-4" /> Media
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
            {ALL_STATUSES.map((status, index) => {
              const complete = index < currentStep;
              const current = index === currentStep;
              return (
                <div key={status} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "inline-flex min-w-[146px] items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium",
                      complete
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : current
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-500",
                    )}
                  >
                    {complete ? <CheckCircle2 className="h-4 w-4" /> : <span className={cn("h-2 w-2 rounded-full", STATUS_META[status].dot)} />}
                    {STATUS_META[status].label}
                  </div>
                  {index < ALL_STATUSES.length - 1 ? <div className="h-px w-6 bg-slate-200" /> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_1.2fr_1.25fr]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Customer & vehicle</p>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">Context</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <User className="h-4.5 w-4.5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Customer</p>
                    <p className="text-base font-semibold text-slate-950">{job.customer?.name || "Walk-in"}</p>
                  </div>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Phone</p>
                    <p className="break-all font-mono text-[13px] font-semibold leading-5 text-slate-800">{job.customer?.phone || "No phone"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Email</p>
                    <p className="break-all font-mono text-[13px] font-semibold leading-5 text-slate-800">{job.customer?.email || "No email"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Car className="h-4.5 w-4.5 text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Vehicle</p>
                    <p className="truncate text-base font-semibold text-slate-950">{vehicle}</p>
                  </div>
                </div>
                <div className="grid gap-2 text-sm lg:grid-cols-[0.85fr_1.65fr]">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Plate</p>
                    <p className="whitespace-nowrap font-mono text-[13px] font-semibold leading-5 text-slate-800">{plate}</p>
                  </div>
                  <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">VIN</p>
                    <p className="break-all font-mono text-[13px] font-semibold leading-5 text-slate-800">{job.vehicle?.vin || "No VIN"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Customer priority</p>
                <div className="grid gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setSavingCustomerPriority(true);
                    try {
                      await api.patch(`/jobs/${job.id}`, { is_customer_waiting: !job.is_customer_waiting });
                      await refreshJob();
                      toast.success(!job.is_customer_waiting ? "Customer marked waiting" : "Customer waiting removed");
                    } catch {
                      toast.error("Failed to update customer waiting flag");
                    } finally {
                      setSavingCustomerPriority(false);
                    }
                  }}
                  disabled={savingCustomerPriority}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition",
                    job.is_customer_waiting ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50",
                  )}
                >
                  Customer waiting
                  <span className="mt-1 block text-xs font-normal opacity-70">{job.is_customer_waiting ? "Yes - prioritize" : "No"}</span>
                </button>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Sensitivity</p>
                  <Select
                    value={job.customer_sensitivity ?? "normal"}
                    onValueChange={async (value) => {
                      const sensitivity = value as CustomerSensitivity;
                      setSavingCustomerPriority(true);
                      try {
                        await api.patch(`/jobs/${job.id}`, { customer_sensitivity: sensitivity });
                        await refreshJob();
                        toast.success(`Sensitivity updated to ${CUSTOMER_SENSITIVITY_META[sensitivity].label}`);
                      } catch {
                        toast.error("Failed to update sensitivity");
                      } finally {
                        setSavingCustomerPriority(false);
                      }
                    }}
                    disabled={savingCustomerPriority}
                  >
                    <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Sensitivity">
                        {CUSTOMER_SENSITIVITY_META[(job.customer_sensitivity ?? "normal") as CustomerSensitivity]?.label ?? "Normal"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[280px]">
                      {CUSTOMER_SENSITIVITIES.map((sensitivity) => (
                        <SelectItem key={sensitivity} value={sensitivity}>
                          {CUSTOMER_SENSITIVITY_META[sensitivity].label} - {CUSTOMER_SENSITIVITY_META[sensitivity].hint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Job summary</p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Promised time</p>
                  {editingPromise ? null : (
                    <button
                      onClick={() => { setDraftPromise(job.promised_at ? new Date(job.promised_at).toISOString().slice(0, 16) : ""); setEditingPromise(true); }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {editingPromise ? (
                  <div className="mt-2 space-y-2">
                    <Input
                      type="datetime-local"
                      className="h-9 rounded-lg border-slate-200 text-sm"
                      value={draftPromise}
                      onChange={(e) => setDraftPromise(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 rounded-lg bg-slate-950 px-2 text-xs text-white hover:bg-slate-800" onClick={savePromise} disabled={savingPromise}>
                        <Save className="mr-1 h-3 w-3" /> {savingPromise ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={() => setEditingPromise(false)} disabled={savingPromise}>
                        <X className="mr-1 h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xl font-semibold text-slate-950">{formatDate(job.promised_at, true)}</p>
                )}
              </div>
              <StatCard label="Estimate total" value={`AED ${total.toFixed(2)}`} hint={`${estimateCount} line items`} />
              <StatCard label="Inspection" value={String(inspectionState).replaceAll("_", " ")} />
              <StatCard label="Media" value={`${mediaCount} file${mediaCount === 1 ? "" : "s"}`} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer concern</p>
                  {editingConcern ? null : (
                    <button
                      onClick={() => { setDraftConcern(job.customer_concern || ""); setEditingConcern(true); }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {editingConcern ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      className="min-h-[80px] rounded-lg border-slate-200 text-sm"
                      placeholder="Describe the customer's concern..."
                      value={draftConcern}
                      onChange={(e) => setDraftConcern(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 rounded-lg bg-slate-950 px-2 text-xs text-white hover:bg-slate-800" onClick={saveConcern} disabled={savingConcern}>
                        <Save className="mr-1 h-3 w-3" /> {savingConcern ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={() => setEditingConcern(false)} disabled={savingConcern}>
                        <X className="mr-1 h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 hover:cursor-pointer hover:text-slate-950"
                    onClick={() => { setDraftConcern(job.customer_concern || ""); setEditingConcern(true); }}
                  >
                    {job.customer_concern || "Click to add a customer concern."}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Internal notes</p>
                  {editingNotes ? null : (
                    <button
                      onClick={() => { setDraftNotes(job.internal_notes || ""); setEditingNotes(true); }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      className="min-h-[80px] rounded-lg border-slate-200 text-sm"
                      placeholder="Internal notes visible to the team..."
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 rounded-lg bg-slate-950 px-2 text-xs text-white hover:bg-slate-800" onClick={saveNotes} disabled={savingNotes}>
                        <Save className="mr-1 h-3 w-3" /> {savingNotes ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={() => setEditingNotes(false)} disabled={savingNotes}>
                        <X className="mr-1 h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 hover:cursor-pointer hover:text-slate-950"
                    onClick={() => { setDraftNotes(job.internal_notes || ""); setEditingNotes(true); }}
                  >
                    {job.internal_notes || "Click to add internal notes."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Assignment & control</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Service advisor</p>
                <Select
                  value={job.advisor_id ?? "unassigned"}
                  onValueChange={async (value) => {
                    const advisorId = value === "unassigned" ? undefined : value;
                    setAssigningAdvisor(true);
                    try {
                      await api.patch(`/jobs/${job.id}`, advisorId ? { advisor_id: advisorId } : { advisor_id: "" });
                      await refreshJob();
                      toast.success(advisorId ? "Advisor assigned" : "Advisor removed");
                    } catch {
                      toast.error("Failed to update advisor");
                    } finally {
                      setAssigningAdvisor(false);
                    }
                  }}
                  disabled={assigningAdvisor}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Unassigned">{advisorName(job.advisor_id)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="min-w-[280px]">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {advisors.map((entry: any) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Technician</p>
                <Select
                  value={job.technician_id ?? "unassigned"}
                  onValueChange={async (value) => {
                    const technicianId = value === "unassigned" ? null : value;
                    setAssigningTech(true);
                    try {
                      await api.post(`/jobs/${job.id}/assign`, { technician_id: technicianId });
                      await refreshJob();
                      toast.success(technicianId ? "Technician assigned" : "Technician removed");
                    } catch {
                      toast.error("Failed to update technician");
                    } finally {
                      setAssigningTech(false);
                    }
                  }}
                  disabled={assigningTech}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Unassigned">{techName(job.technician_id)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="min-w-[280px]">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {technicians.map((entry: any) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Workshop stage
                  {isInReception && <span className="ml-1 text-[10px] normal-case text-slate-400">- not available in {STATUS_META[job.status].label} phase</span>}
                </p>
                <Select
                  value={job.workshop_stage === "received" ? "waiting_technician" : String(job.workshop_stage) === "advisor_review" ? "customer_approval" : job.workshop_stage ?? "waiting_technician"}
                  onValueChange={async (value) => {
                    const workshopStage = value as WorkshopStage;
                    setSavingWorkshopStage(true);
                    try {
                      await api.patch(`/jobs/${job.id}`, { workshop_stage: workshopStage });
                      await refreshJob();
                      const syncMsg = workshopStage === 'work_in_progress' ? ' - Overall moved to In Progress'
                        : workshopStage === 'quality_check' ? ' - Overall moved to Quality Check'
                        : workshopStage === 'ready_handover' ? ' - Overall moved to Ready'
                        : '';
                      toast.success(`Workshop stage updated to ${WORKSHOP_STAGE_META[workshopStage].label}${syncMsg}`);
                    } catch {
                      toast.error("Failed to update workshop stage");
                    } finally {
                      setSavingWorkshopStage(false);
                    }
                  }}
                  disabled={savingWorkshopStage || isInReception}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Workshop stage">
                      {WORKSHOP_STAGE_META[((job.workshop_stage === "received" ? "waiting_technician" : String(job.workshop_stage) === "advisor_review" ? "customer_approval" : job.workshop_stage) ?? "waiting_technician") as WorkshopStage]?.label ?? "Workshop stage"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="min-w-[360px]">
                    {WORKSHOP_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {WORKSHOP_STAGE_META[stage].label} - {WORKSHOP_STAGE_META[stage].hint}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Parts status
                  {isInReception && <span className="ml-1 text-[10px] normal-case text-slate-400">- not available in {STATUS_META[job.status].label} phase</span>}
                </p>
                <Select
                  value={job.parts_status ?? "no_parts"}
                  onValueChange={async (value) => {
                    const partsStatus = value as PartsStatus;
                    setSavingPartsStatus(true);
                    try {
                      await api.patch(`/jobs/${job.id}`, { parts_status: partsStatus });
                      await refreshJob();
                      const msg = partsStatus === 'parts_ready'
                        ? `Parts status → Parts Ready. Workshop stage reset to Waiting to Start.`
                        : `Parts status updated to ${PARTS_STATUS_META[partsStatus].label}`;
                      toast.success(msg);
                    } catch {
                      toast.error("Failed to update parts status");
                    } finally {
                      setSavingPartsStatus(false);
                    }
                  }}
                  disabled={savingPartsStatus || isInReception}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Parts status">
                      {PARTS_STATUS_META[(job.parts_status ?? "no_parts") as PartsStatus]?.label ?? "Parts status"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="min-w-[320px]">
                    {PARTS_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {PARTS_STATUS_META[status].label} - {PARTS_STATUS_META[status].hint}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Informed button - only visible when job is Ready for Delivery */}
              {job.status === "ready" && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Customer notification</p>
                  <button
                    type="button"
                    disabled={savingCustomerInformed || !!job.customer_informed}
                    onClick={async () => {
                      setSavingCustomerInformed(true);
                      try {
                        await api.patch(`/jobs/${job.id}`, { customer_informed: true });
                        await refreshJob();
                        toast.success("Customer informed - urgency factors cleared from priority");
                      } catch {
                        toast.error("Failed to update");
                      } finally {
                        setSavingCustomerInformed(false);
                      }
                    }}
                    className={cn(
                      "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors",
                      job.customer_informed
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    )}
                  >
                    {savingCustomerInformed ? "Updating..." : job.customer_informed ? "✓ Customer Informed" : "🔔 Customer Informed"}
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-slate-400" /> Promised
                  </span>
                  <span className="font-medium text-slate-900">{formatDate(job.promised_at, true)}</span>
                </div>
                {!job.promised_at && job.status !== 'booked' && job.status !== 'closed' && (
                  <p className="mt-1 text-[10px] text-amber-600">💡 Setting a promised date removes +5 from priority</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <Send className="h-4 w-4 text-slate-400" /> Approval status
                  </span>
                  <span className="font-medium text-slate-900">{approvalStatusLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
          <TabsTrigger value="overview" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-slate-950 data-[state=active]:text-white">
            <FileText className="mr-2 h-4 w-4" /> Overview
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
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="rounded-[24px] border-slate-200 shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Operational snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <StatCard label="Current status" value={STATUS_META[job.status].label} />
                <StatCard label="Workshop stage" value={WORKSHOP_STAGE_META[((job.workshop_stage === "received" ? "waiting_technician" : String(job.workshop_stage) === "advisor_review" ? "customer_approval" : job.workshop_stage) ?? "waiting_technician") as WorkshopStage]?.label ?? "-"} />
                <StatCard label="Parts status" value={PARTS_STATUS_META[(job.parts_status ?? "no_parts") as PartsStatus]?.label ?? "-"} />
                <StatCard label="Priority flags" value={`${job.is_customer_waiting ? "Waiting" : "Not waiting"} · ${CUSTOMER_SENSITIVITY_META[(job.customer_sensitivity ?? "normal") as CustomerSensitivity]?.label ?? "Normal"}`} />
                <StatCard label="Advisor" value={job.advisor?.name || "Unassigned"} />
                <StatCard label="Technician" value={job.technician?.name || "Unassigned"} />
                <StatCard label="Odometer" value={job.odometer_in ? `${new Intl.NumberFormat("en-GB").format(Number(job.odometer_in))} km` : "-"} />
                <StatCard label="Media evidence" value={`${mediaCount}`} hint="photos, videos, documents" />
                <StatCard label="Estimate lines" value={`${estimateCount}`} hint="editable commercial items" />
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recommended next move</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                {job.status === "booked" && <p>Move the job into checking and assign the technician so the inspection can start.</p>}
                {job.status === "checking" && <p>Complete the inspection and convert findings into estimate lines for advisor review.</p>}
                {job.status === "estimate_sent" && <p>Follow up with the customer, confirm they saw the media evidence, and push toward approval.</p>}
                {job.status === "approved" && <p>Start workshop execution and keep ETA visible to avoid delays.</p>}
                {job.status === "in_progress" && <p>Track progress, parts, and blockers closely to protect promised time.</p>}
                {job.status === "waiting_parts" && <p>Update the customer, chase procurement, and keep the board honest about waiting time.</p>}
                {job.status === "quality_check" && <p>Finish QC fast, validate media if needed, and prepare customer-ready completion messaging.</p>}
                {job.status === "ready" && <p>Move to invoicing and collection steps so finished work does not sit idle.</p>}
                {job.status === "closed" && <p>This job is complete. Use it as a clean historical record.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estimate" className="space-y-4">
          <Card className="rounded-[24px] border-slate-200 shadow-sm">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <CardTitle className="text-lg">Quote builder & authorization</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Parts, labour, totals, and customer approval in one workspace.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Quote total</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">AED {total.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-slate-500">Live total from estimate lines</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Authorization</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{approvalStatusLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {approvalCounts
                        ? `${approvalCounts.approved} approved · ${approvalCounts.declined} rejected · ${approvalCounts.deferred} deferred · ${approvalCounts.pending} pending`
                        : `${estimateCount} line item${estimateCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-slate-600">
                  Send the customer approval link once the quote and media evidence are ready.
                </p>
                <div className="w-full lg:w-auto">
                  {estimateCount > 0 ? <SendApprovalButton jobId={job.id} onSent={refreshJob} /> : <Button disabled className="w-full rounded-xl">Add estimate lines first</Button>}
                </div>
              </div>

              {authStatus ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">Customer approval feedback</p>
                      <p className="text-xs text-slate-500">
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
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">Pending: {approvalCounts.pending}</span>
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
            <Card className="rounded-[24px] border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Inspection workspace</CardTitle>
                  {inspectionLocked ? (
                    <p className="mt-1 text-sm text-slate-500">
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
            <Card className="rounded-[24px] border-slate-200 shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                <div>
                  <p className="text-lg font-semibold text-slate-950">No inspection started yet</p>
                  <p className="mt-1 text-sm text-slate-500">
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
          <Card className="rounded-[24px] border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Media evidence</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Attach photos, videos, or documents that support the quote and inspection.</p>
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
                <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 py-14 text-center text-slate-400">
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
