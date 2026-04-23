"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Job, JobStatus, PaginatedResponse } from "@/types";
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
  Clock3,
  GripVertical,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

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
  completed: {
    label: "Completed",
    tone: "border-teal-200 bg-teal-50 text-teal-800",
    chip: "bg-teal-100 text-teal-800",
    dot: "bg-teal-500",
  },
  invoiced: {
    label: "Invoiced",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-800",
    chip: "bg-indigo-100 text-indigo-800",
    dot: "bg-indigo-500",
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
  "completed",
  "invoiced",
  "closed",
];

function getVehicleLabel(job: Job) {
  if (!job.vehicle) return "Vehicle pending";
  return [job.vehicle.year, job.vehicle.make, job.vehicle.model]
    .filter(Boolean)
    .join(" ");
}

function getPlate(job: Job) {
  return job.vehicle?.plate || "No plate";
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
  if (["completed", "invoiced", "closed"].includes(job.status)) return false;
  if (!nowTs) return false;
  return new Date(job.promised_at).getTime() < nowTs;
}

function getEstimateTotal(job: Job) {
  return (job.estimate_lines ?? []).reduce(
    (sum, line) => sum + Number(line.line_total ?? 0),
    0,
  );
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
  const [view, setView] = useState<"board" | "list">("board");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<JobStatus | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState<number | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<JobStatus>>(new Set());

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
      const { data } = await api.get<PaginatedResponse<Job>>("/jobs", { params });
      setJobs(data.data ?? data.items ?? []);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, search]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchJobs();
  }, [fetchJobs, mounted]);

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

  const stats = useMemo(() => {
    const awaitingApproval = jobs.filter((job) => job.status === "estimate_sent").length;
    const inWorkshop = jobs.filter((job) => ["checking", "approved", "in_progress", "waiting_parts", "quality_check"].includes(job.status)).length;
    const overdue = jobs.filter((job) => isOverdue(job, nowTs)).length;
    const totalEstimate = jobs.reduce((sum, job) => sum + getEstimateTotal(job), 0);
    return { awaitingApproval, inWorkshop, overdue, totalEstimate };
  }, [jobs, nowTs]);

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
              Workshop board
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setView("board")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition",
                  view === "board"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Board
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition",
                  view === "list"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                <List className="h-3.5 w-3.5" /> List
              </button>
            </div>
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
            <p className="mt-0.5 text-xl font-semibold text-red-950">{stats.overdue}</p>
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
          </div>
        </div>

        {view === "board" ? (
          <div className="mt-4 overflow-x-auto pb-1">
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
                      "flex shrink-0 flex-col rounded-[14px] border border-slate-200 bg-slate-50 transition-all duration-200",
                      isCollapsed ? "w-[44px]" : "w-[200px]",
                      dropColumn === column && "border-slate-400 bg-slate-100",
                    )}
                  >
                    <div
                      className="border-b border-slate-200 px-2.5 py-2 cursor-pointer select-none"
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
                              </div>

                              <div className="mt-auto grid grid-cols-2 gap-1 text-[11px]">
                                <div className="rounded-lg bg-slate-50 px-1.5 py-1">
                                  <p className="text-[9px] uppercase tracking-wide text-slate-400">Advisor</p>
                                  <p className="truncate font-medium text-slate-800">{job.advisor?.name || "—"}</p>
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
