"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Job, JobStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Image as ImageIcon,
  Send,
  User,
  Wrench,
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
  completed: { label: "Completed", dot: "bg-teal-500", badge: "bg-teal-100 text-teal-800" },
  invoiced: { label: "Invoiced", dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-800" },
  closed: { label: "Closed", dot: "bg-slate-600", badge: "bg-slate-200 text-slate-700" },
};

const ALL_STATUSES: JobStatus[] = [
  "booked",
  "checking",
  "estimate_sent",
  "approved",
  "in_progress",
  "waiting_parts",
  "quality_check",
  "completed",
  "invoiced",
  "closed",
];

function vehicleLabel(job: Job) {
  if (!job.vehicle) return "Vehicle pending";
  return [job.vehicle.year, job.vehicle.make, job.vehicle.model]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  return withTime
    ? new Date(value).toLocaleString()
    : new Date(value).toLocaleDateString();
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
  const [loading, setLoading] = useState(true);
  const [startingInspection, setStartingInspection] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [nextStatus, setNextStatus] = useState<JobStatus | "">("");
  const [users, setUsers] = useState<any[]>([]);
  const [assigningAdvisor, setAssigningAdvisor] = useState(false);
  const [assigningTech, setAssigningTech] = useState(false);

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
    const { data } = await api.get<Job>(`/jobs/${id}`);
    setJob(data);
    if (data.inspection?.id) {
      const inspectionRes = await api.get(`/inspections/${data.inspection.id}`);
      setInspectionDetail(inspectionRes.data);
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

  const availableStatuses = useMemo(
    () => (job ? ALL_STATUSES.filter((status) => status !== job.status) : []),
    [job],
  );

  useEffect(() => {
    setNextStatus(availableStatuses[0] ?? "");
  }, [availableStatuses]);

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

  const changeStatus = async () => {
    if (!job || !nextStatus) return;
    setChangingStatus(true);
    try {
      await api.patch(`/jobs/${job.id}/status`, { to_status: nextStatus });
      await refreshJob();
      toast.success(`Status changed to ${STATUS_META[nextStatus].label}`);
    } catch {
      toast.error("Failed to change status");
    } finally {
      setChangingStatus(false);
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
              <Select value={nextStatus} onValueChange={(value) => setNextStatus((value as JobStatus) ?? "")}>
                <SelectTrigger className="h-11 w-[220px] rounded-xl border-slate-200">
                  <SelectValue placeholder="Change status">
                    {nextStatus ? STATUS_META[nextStatus].label : "Change status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_META[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="h-11 rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800" onClick={changeStatus} disabled={!nextStatus || changingStatus}>
                {changingStatus ? "Updating..." : "Update status"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {estimateCount > 0 ? <SendApprovalButton jobId={job.id} /> : null}
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

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.5fr_1fr]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Customer & vehicle</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <User className="h-3.5 w-3.5 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-950">{job.customer?.name || "Walk-in"}</p>
                  <p className="truncate text-[11px] text-slate-500">{job.customer?.phone || job.customer?.email || "No contact"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Car className="h-3.5 w-3.5 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-950">{vehicle}</p>
                  <p className="truncate text-[11px] text-slate-500">{plate}{job.vehicle?.vin ? ` · VIN ${job.vehicle.vin}` : ""}</p>
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
              <StatCard label="Promised" value={formatDate(job.promised_at, true)} />
              <StatCard label="Estimate total" value={`AED ${total.toFixed(2)}`} hint={`${estimateCount} line items`} />
              <StatCard label="Inspection" value={String(inspectionState).replaceAll("_", " ")} />
              <StatCard label="Media" value={`${mediaCount} file${mediaCount === 1 ? "" : "s"}`} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer concern</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {job.customer_concern || "No customer concern added yet."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Internal notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {job.internal_notes || "No internal notes yet."}
                </p>
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
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Unassigned">{advisorName(job.advisor_id)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Unassigned">{techName(job.technician_id)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {technicians.map((entry: any) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-slate-400" /> Promised
                  </span>
                  <span className="font-medium text-slate-900">{formatDate(job.promised_at, true)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <Send className="h-4 w-4 text-slate-400" /> Approval status
                  </span>
                  <span className="font-medium text-slate-900">
                    {job.status === "estimate_sent" ? "Awaiting customer" : job.status === "approved" ? "Approved" : "Not sent"}
                  </span>
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
                <StatCard label="Advisor" value={job.advisor?.name || "Unassigned"} />
                <StatCard label="Technician" value={job.technician?.name || "Unassigned"} />
                <StatCard label="Odometer" value={job.odometer_in ? `${Number(job.odometer_in).toLocaleString()} km` : "—"} />
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
                {job.status === "completed" && <p>Move to invoicing and collection steps so finished work does not sit idle.</p>}
                {job.status === "invoiced" && <p>Close the loop with payment and delivery confirmation.</p>}
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
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      {job.status === "estimate_sent" ? "Awaiting customer" : job.status === "approved" ? "Approved" : "Not sent"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{estimateCount} line item{estimateCount === 1 ? "" : "s"}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-slate-600">
                  Send the customer approval link once the quote and media evidence are ready.
                </p>
                <div className="w-full lg:w-auto">
                  {estimateCount > 0 ? <SendApprovalButton jobId={job.id} /> : <Button disabled className="w-full rounded-xl">Add estimate lines first</Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <EstimateBuilder jobId={job.id} lines={job.estimate_lines ?? []} onUpdate={refreshJob} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspection" className="space-y-4" id="inspection">
          {inspectionDetail ? (
            <Card className="rounded-[24px] border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Inspection workspace</CardTitle>
              </CardHeader>
              <CardContent>
                <InspectionWorkspace inspection={inspectionDetail} onChanged={refreshJob} />
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
                  {job.media_files.map((file) => (
                    <div key={file.id} className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
                      <div className="flex h-36 items-center justify-center bg-white text-4xl">
                        {file.file_type === "photo" ? "📷" : file.file_type === "video" ? "🎬" : "📄"}
                      </div>
                      <div className="border-t border-slate-200 px-3 py-2">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {file.original_filename || file.id}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                          {file.file_type || "file"}
                        </p>
                      </div>
                    </div>
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
