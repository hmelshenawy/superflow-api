"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Job, JobStatus, PaginatedResponse, WorkshopStage } from "@/types";

// ─── Priority API result shape (mirrors backend) ──────────
interface PriorityFactor { key: string; weight: number; description: string; category: string; }
interface NextActionResult { title: string; reason: string; urgency: "low"|"normal"|"high"|"critical"; owner: string; actionType: string; score: number; signals: string[]; }
interface PriorityResult { jobId: string; jobNumber: string | null; score: number; level: "low"|"normal"|"high"|"critical"; factors: PriorityFactor[]; idleHours: number; hoursToPromise: number | null; isOverdue: boolean; nextAction: NextActionResult; }
import {

  STATUS_META,
  BOARD_COLUMNS,
  BOARD_CARD_ACCENT,
  BOARD_COLUMN_WIDTH,
  BOARD_COLUMN_COLLAPSED_WIDTH,
  BOARD_COLUMN_GAP,
  OVERALL_COLUMN_TONE,
  OVERALL_COLUMN_HEADER_TONE,
  OVERALL_PHASES,
  CUSTOMER_SENSITIVITY_META,
  PARTS_STATUS_META,
  WORKSHOP_STAGE_META,
  WORKSHOP_STAGE_ACCENT,
  WORKSHOP_STAGE_HEADER_TONE,
  WORKSHOP_STAGES,
  getVehicleLabel,
  getPlate,
  isWorkshopPhaseJob,
  getWorkshopStage,
  getPromisedLabel,
  getPriorityTone,
  getActionUrgencyClass,
} from "@/lib/jobs-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, ChevronDown, ChevronRight, CheckCircle2, Clock3, GripVertical,
  LayoutGrid, List, Plus, RefreshCw, Search, TriangleAlert, Package,
  PhoneCall, TimerReset, Wrench,
} from "lucide-react";
import { toast } from "sonner";

// ─── Inline sub-components ──────────────────────────────────

function StatusPill({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status];
  return (
    <span aria-label={meta.label} className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold", meta.tone)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

// ─── Main page ──────────────────────────────────────────────

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dashboardView, setDashboardView] = useState<"overall" | "advisor" | "workshop">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("sf_dashboard_view") as "overall" | "advisor" | "workshop") || "overall";
    }
    return "overall";
  });
  const [overallView, setOverallView] = useState<"board" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("sf_overall_view") as "board" | "list") || "board";
    }
    return "board";
  });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<JobStatus | null>(null);
  const [dropWorkshopStage, setDropWorkshopStage] = useState<WorkshopStage | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState<number | null>(null);
  const [priorityMap, setPriorityMap] = useState<Map<string, PriorityResult>>(new Map());
  const [collapsedColumns, setCollapsedColumns] = useState<Set<JobStatus>>(new Set());
  const [collapsedWorkshopStages, setCollapsedWorkshopStages] = useState<Set<WorkshopStage>>(new Set());
  const [showArchived, setShowArchived] = useState(false);

  const switchDashboardView = useCallback((view: "overall" | "advisor" | "workshop") => {
    setDashboardView(view);
    localStorage.setItem("sf_dashboard_view", view);
  }, []);

  const switchOverallView = useCallback((view: "board" | "list") => {
    setOverallView(view);
    localStorage.setItem("sf_overall_view", view);
  }, []);

  const toggleColumn = useCallback((column: JobStatus) => {
    setCollapsedColumns((prev) => { const next = new Set(prev); if (next.has(column)) next.delete(column); else next.add(column); localStorage.setItem("superflow-collapsed-columns", JSON.stringify([...next])); return next; });
  }, []);

  const toggleWorkshopStage = useCallback((stage: WorkshopStage) => {
    setCollapsedWorkshopStages((prev) => { const next = new Set(prev); if (next.has(stage)) next.delete(stage); else next.add(stage); localStorage.setItem("superflow-collapsed-workshop-stages", JSON.stringify([...next])); return next; });
  }, []);

  const fetchPriority = useCallback(async () => {
    try {
      const { data } = await api.get<{ results: PriorityResult[]; computedAt: string }>("/priority");
      const map = new Map<string, PriorityResult>();
      for (const r of (data.results ?? [])) map.set(r.jobId, r);
      setPriorityMap(map);
    } catch { /* fallback: client-side scoring will handle it */ }
  }, []);
useEffect(() => { if (!mounted) return; fetchPriority(); }, [fetchPriority, mounted]);

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
    } finally { setLoading(false); fetchPriority(); }
  }, [page, limit, status, search, showArchived, fetchPriority]);

  useEffect(() => { setMounted(true); if (typeof window !== "undefined" && window.innerWidth < 768) switchOverallView("list"); }, []);

  useEffect(() => { if (!mounted) return; fetchJobs(); }, [fetchJobs, mounted]);




  useEffect(() => {
    const hasAwaiting = jobs.some((j) => j.status === "estimate_sent");
    if (!hasAwaiting || !mounted) return;
    const interval = setInterval(() => fetchJobs(), 45000);
    return () => clearInterval(interval);
  }, [jobs.length, mounted, fetchJobs, jobs.some((j) => j.status === "estimate_sent")]);

  useEffect(() => { setNowTs(Date.now()); }, []);

  useEffect(() => {
    try { const saved = localStorage.getItem("superflow-collapsed-columns"); setCollapsedColumns(saved ? new Set(JSON.parse(saved) as JobStatus[]) : new Set()); } catch { setCollapsedColumns(new Set()); }
    try { const saved = localStorage.getItem("superflow-collapsed-workshop-stages"); setCollapsedWorkshopStages(saved ? new Set(JSON.parse(saved) as WorkshopStage[]) : new Set()); } catch { setCollapsedWorkshopStages(new Set()); }
  }, []);

  const boardJobs = useMemo(() => {
    const grouped = Object.fromEntries(BOARD_COLUMNS.map((column) => [column, [] as Job[]])) as Record<JobStatus, Job[]>;
    for (const job of jobs) {
      if (grouped[job.status]) grouped[job.status].push(job);
    }
    return grouped;
  }, [jobs]);

  const activeJobs = useMemo(() => jobs.filter((job) => job.status !== "closed" && job.status !== "no_show"), [jobs]);
  const workshopJobs = useMemo(() => jobs.filter(isWorkshopPhaseJob), [jobs]);

  const enrichedJobs = useMemo(() => {
    return activeJobs.map((job) => {
      const pr = priorityMap.get(job.id);
      const priorityScore = pr?.score ?? 0;
      const priorityLevel = pr ? (pr.level === "critical" ? "Critical" : pr.level === "high" ? "High" : pr.level === "normal" ? "Normal" : "Low") : "Low";
      const reasons = pr?.factors?.map((f) => f.description) ?? [];
      const idleHours = pr?.idleHours ?? 0;
      const hoursToPromise = pr?.hoursToPromise ?? null;
      const estimateTotal = (job.estimate_lines ?? []).reduce((sum: number, line: any) => sum + Number(line.line_total ?? 0), 0);
      const nextAction: any = pr?.nextAction ?? { title: "Review job", reason: "", urgency: "low", owner: "advisor", actionType: "general_review", score: 0, signals: [] };
      return { job, priorityScore, priorityLevel, reasons, idleHours, hoursToPromise, estimateTotal, nextAction, isOverdue: pr?.isOverdue ?? false };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [activeJobs, priorityMap]);

  const advisorActions = useMemo(() => [...enrichedJobs].sort((a, b) => b.priorityScore !== a.priorityScore ? b.priorityScore - a.priorityScore : b.nextAction.score - a.nextAction.score).slice(0, 8), [enrichedJobs]);
  const priorityByJobId = useMemo(() => new Map(enrichedJobs.map((item) => [item.job.id, item])), [enrichedJobs]);
  const workshopEnrichedJobs = useMemo(() => enrichedJobs.filter((item) => isWorkshopPhaseJob(item.job)), [enrichedJobs]);

  const stats = useMemo(() => ({
    awaitingApproval: jobs.filter((job) => job.status === "estimate_sent").length,
    inWorkshop: workshopJobs.length,
    overdue: enrichedJobs.filter((item) => item.isOverdue).length,
    totalEstimate: enrichedJobs.reduce((sum, item) => sum + item.estimateTotal, 0),
    critical: enrichedJobs.filter((item) => item.priorityScore >= 60).length,
  }), [jobs, enrichedJobs]);

  const totalPages = Math.ceil(total / limit);

  if (!mounted) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;

  const moveJobToStatus = async (jobId: string, nextStatus: JobStatus) => {
    const currentJob = jobs.find((job) => job.id === jobId);
    if (!currentJob || currentJob.status === nextStatus) return;
    const previousJobs = jobs;
    setJobs(jobs.map((job) => job.id === jobId ? { ...job, status: nextStatus } : job));
    setUpdatingJobId(jobId); setDraggedJobId(null); setDropColumn(null);
    try { await api.patch(`/jobs/${jobId}/status`, { to_status: nextStatus }); toast.success(`${currentJob.job_number || "Job"} moved to ${STATUS_META[nextStatus].label}`); await fetchJobs(); }
    catch { setJobs(previousJobs); toast.error("Failed to update job status"); }
    finally { setUpdatingJobId(null); }
  };

  const moveJobToWorkshopStage = async (jobId: string, nextStage: WorkshopStage) => {
    const currentJob = jobs.find((job) => job.id === jobId);
    const currentStage = currentJob ? getWorkshopStage(currentJob) : null;
    if (!currentJob || currentStage === nextStage) return;
    const nextStatus: JobStatus = nextStage === "quality_check" ? "quality_check" : nextStage === "ready_handover" ? "ready" : "in_progress";
    const previousJobs = jobs;
    setJobs(jobs.map((job) => job.id === jobId ? { ...job, status: nextStatus, workshop_stage: nextStage } : job));
    setUpdatingJobId(jobId); setDraggedJobId(null); setDropWorkshopStage(null);
    try { await api.patch(`/jobs/${jobId}`, { workshop_stage: nextStage }); toast.success(`${currentJob.job_number || "Job"} moved to ${WORKSHOP_STAGE_META[nextStage].label}`); await fetchJobs(); }
    catch { setJobs(previousJobs); toast.error("Failed to update workshop stage"); }
    finally { setUpdatingJobId(null); }
  };

  return (
    <div className="space-y-4">
      {/* ── Header + Stats ── */}
      <div className="rounded-[24px] border border-border bg-card p-3 shadow-sm lg:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Service operations</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">PrioraFlow</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
              {[["overall", "Overall"], ["advisor", "Advisor"], ["workshop", "Workshop"]].map(([value, label]) => (
                <button key={value} type="button" onClick={() => switchDashboardView(value as "overall" | "advisor" | "workshop")}
                  className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition", dashboardView === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {label}
                </button>
              ))}
            </div>
            {dashboardView === "overall" && (
              <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
                <button type="button" onClick={() => switchOverallView("board")} className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition", overallView === "board" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><LayoutGrid className="h-3.5 w-3.5" /> Board</button>
                <button type="button" onClick={() => switchOverallView("list")} className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition", overallView === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}><List className="h-3.5 w-3.5" /> List</button>
              </div>
            )}
            <Link href="/jobs/new"><Button className="h-9 rounded-lg bg-slate-950 px-3 text-[13px] text-white hover:bg-slate-800"><Plus className="mr-1.5 h-3.5 w-3.5" /> New job</Button></Link>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted p-2.5"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</p><p className="mt-0.5 text-xl font-semibold text-foreground">{total}</p></div>
          <div className="rounded-lg border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/15 p-2.5"><p className="text-[10px] font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">Awaiting</p><p className="mt-0.5 text-xl font-semibold text-rose-950 dark:text-rose-200">{stats.awaitingApproval}</p></div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/15 p-2.5"><p className="text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">In workshop</p><p className="mt-0.5 text-xl font-semibold text-amber-950 dark:text-amber-200">{stats.inWorkshop}</p></div>
          <div className="rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/15 p-2.5"><p className="text-[10px] font-medium uppercase tracking-wide text-red-700 dark:text-red-300">Overdue</p><p className="mt-0.5 text-xl font-semibold text-red-950 dark:text-red-200">{workshopEnrichedJobs.filter((item) => item.nextAction?.signals?.some((s: any) => String(s).includes("overdue"))).length}</p></div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="rounded-[24px] border border-border bg-card p-3 shadow-sm lg:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search jobs, customers, vehicles..." aria-label="Search jobs" className="h-9 rounded-lg border-border bg-card pl-8 text-[13px]" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={status} onValueChange={(value) => { setStatus(value ?? "all"); setPage(1); }}>
              <SelectTrigger className="h-9 w-full rounded-lg border-border text-[13px] md:w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {BOARD_COLUMNS.map((value) => (<SelectItem key={value} value={value}>{STATUS_META[value].label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-border bg-muted px-2 py-1.5 text-[13px] text-muted-foreground">Value: <span className="font-semibold text-foreground">{stats.totalEstimate.toFixed(0)}</span></div>
            <Button variant="outline" className="h-9 rounded-lg text-[13px]" onClick={fetchJobs}><RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />Refresh</Button>
            <Button variant={showArchived ? "default" : "outline"} className="h-9 rounded-lg text-[13px]" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Showing Archive" : "Archive"}</Button>
          </div>
        </div>

        {dashboardView === "advisor" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted p-3">
                <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Advisor cockpit</p><h2 className="text-lg font-semibold text-foreground">My urgent now</h2></div><span className="rounded-full bg-red-50 dark:bg-red-950/15 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300">{stats.critical} critical</span></div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {enrichedJobs.slice(0, 6).map(({ job, priorityScore, priorityLevel, reasons, nextAction }) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="rounded-xl border border-border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md">
                      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{job.job_number || "Draft"}</p><h3 className="truncate text-sm font-semibold text-foreground">{job.customer?.name || "Walk-in"}</h3><p className="truncate text-xs text-muted-foreground">{getVehicleLabel(job)} · {getPlate(job)}</p></div><span className={cn("rounded-full px-2 py-1 text-[11px] font-bold", priorityScore >= 60 ? "bg-red-100 text-red-800" : priorityScore >= 40 ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200" : "bg-muted text-foreground/80")}>{priorityScore}</span></div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><TriangleAlert className="h-3.5 w-3.5 text-amber-500" /><span className="truncate">{priorityLevel}: {reasons.slice(0, 2).join(" + ") || "normal follow-up"}</span></div>
                      <div className={cn("mt-2 rounded-lg border px-2 py-1.5 text-xs font-semibold", getActionUrgencyClass(nextAction.urgency))}>Next: {nextAction.title}<span className="ml-1 font-normal opacity-80">({nextAction.owner})</span></div>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/15 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-950 dark:text-rose-200"><PhoneCall className="h-4 w-4" /> Pending approvals</h3>
                  <div className="mt-3 space-y-2">
                    {jobs.filter((job) => job.status === "estimate_sent").slice(0, 5).map((job) => (<Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between rounded-xl bg-card dark:bg-card px-3 py-2 text-sm shadow-sm"><span className="min-w-0 truncate font-medium text-foreground">{job.customer?.name || "Walk-in"}</span><span className="text-xs font-semibold text-rose-700 dark:text-rose-300">{((job.estimate_lines ?? []).reduce((s: number, l: any) => s + Number(l.line_total ?? 0), 0)).toFixed(0)} AED</span></Link>))}
                    {jobs.filter((job) => job.status === "estimate_sent").length === 0 && <p className="text-xs text-rose-700 dark:text-rose-300">No approvals pending.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/15 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-red-950 dark:text-red-200"><TimerReset className="h-4 w-4" /> Promised delivery risk</h3>
                  <div className="mt-3 space-y-2">
                    {enrichedJobs.filter(({ job, isOverdue: jobOverdue, hoursToPromise }) => !(job.status === "ready" && job.customer_informed) && (jobOverdue || (hoursToPromise !== null && hoursToPromise <= 6))).slice(0, 5).map(({ job, hoursToPromise }) => (<Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-card dark:bg-card px-3 py-2 text-sm shadow-sm"><span className="min-w-0 truncate font-medium text-foreground">{job.job_number || "Draft"} · {STATUS_META[job.status].label}</span><span className="shrink-0 text-xs font-semibold text-red-700 dark:text-red-300">{(priorityMap.get(job.id)?.isOverdue) ? "Overdue" : `${Math.max(0, Math.round(hoursToPromise ?? 0))}h left`}</span></Link>))}
                    {enrichedJobs.filter(({ job, isOverdue: jobOverdue, hoursToPromise }) => !(job.status === "ready" && job.customer_informed) && (jobOverdue || (hoursToPromise !== null && hoursToPromise <= 6))).length === 0 && <p className="text-xs text-red-700 dark:text-red-300">No delivery risks in this list.</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-foreground">Next best actions</h2><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
              <div className="mt-3 space-y-2">
                {advisorActions.map(({ job, nextAction, priorityScore }, index) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block rounded-xl border border-border bg-muted p-3 transition hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                    <div className="flex items-start gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="text-sm font-semibold text-foreground">{nextAction.title}</p><span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase", getActionUrgencyClass(nextAction.urgency))}>{nextAction.urgency}</span></div><p className="truncate text-xs text-muted-foreground">{job.customer?.name || "Walk-in"} · {job.job_number || "Draft"} · Owner: {nextAction.owner}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{nextAction.reason}</p></div><span className="rounded-full bg-card px-2 py-1 text-[11px] font-bold text-foreground/80">{priorityScore}</span></div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

        ) : dashboardView === "workshop" ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border bg-slate-950 p-4 text-white shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Workshop control</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Vehicle flow by workshop state</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Focused on production movement: received cars, technician assignment, diagnosis, approval, parts, work in progress, QC, and ready handover.</p></div>
                <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
                  <div className="rounded-xl bg-card/10 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Blocked</p><p className="text-xl font-semibold">{workshopJobs.filter((job) => job.status === "waiting_parts" || ["order_parts", "waiting_warehouse", "backorder"].includes(job.parts_status ?? "")).length}</p></div>
                  <div className="rounded-xl bg-card/10 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Idle +6h</p><p className="text-xl font-semibold">{workshopEnrichedJobs.filter((item) => !["ready", "closed"].includes(item.job.status) && item.idleHours >= 6).length}</p></div>
                  <div className="rounded-xl bg-card/10 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">At risk</p><p className="text-xl font-semibold">{workshopEnrichedJobs.filter((item) => item.nextAction?.signals?.some((s: any) => String(s).includes("overdue"))).length}</p></div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[{ label: "Waiting technician", value: workshopJobs.filter((job) => getWorkshopStage(job) === "waiting_technician").length, hint: "Assign tech / controller", color: "border-border bg-card" }, { label: "Diagnosis active", value: workshopJobs.filter((job) => getWorkshopStage(job) === "diagnosis").length, hint: "Check diagnosis ageing", color: "border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/15" }, { label: "Approval blocking", value: workshopJobs.filter((job) => getWorkshopStage(job) === "customer_approval").length, hint: "Advisor/customer decision", color: "border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/15" }, { label: "Parts blocking", value: workshopJobs.filter((job) => job.status === "waiting_parts" || ["order_parts", "waiting_warehouse", "backorder"].includes(job.parts_status ?? "")).length, hint: "Use Overall Waiting Parts", color: "border-purple-200 dark:border-purple-800/40 bg-purple-50 dark:bg-purple-950/15" }].map((item) => (
                <div key={item.label} className={cn("rounded-2xl border p-3 shadow-sm", item.color)}><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p><div className="mt-1 flex items-end justify-between gap-2"><p className="text-2xl font-semibold text-foreground">{item.value}</p><p className="text-right text-[11px] font-medium text-muted-foreground">{item.hint}</p></div></div>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-muted p-3">
              <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Live flow</p><h2 className="text-lg font-semibold text-foreground">Waiting to Start → Diagnosis → Estimate → Advisor / Approval → Parts → WIP → Final Test → QC → Ready</h2></div><Wrench className="h-5 w-5 text-muted-foreground" /></div>
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-max gap-3">
                  {WORKSHOP_STAGES.map((stageKey) => ({ key: stageKey, ...WORKSHOP_STAGE_META[stageKey], jobs: workshopJobs.filter((job) => getWorkshopStage(job) === stageKey) })).map((stage) => {
                    const isCollapsed = collapsedWorkshopStages.has(stage.key);
                    return (
                      <div key={stage.key} onDragOver={(event) => { event.preventDefault(); if (draggedJobId) setDropWorkshopStage(stage.key); }} onDragLeave={() => setDropWorkshopStage(null)} onDrop={async (event) => { event.preventDefault(); const jobId = event.dataTransfer.getData("text/plain") || draggedJobId; if (!jobId) return; await moveJobToWorkshopStage(jobId, stage.key); }}
                        className={cn("flex h-[520px] shrink-0 flex-col rounded-[16px] border shadow-sm ring-1 ring-border/70 transition-all", stage.tone, isCollapsed ? "w-[46px]" : "w-[230px]", dropWorkshopStage === stage.key && "border-blue-400 bg-blue-50/50 ring-2 ring-blue-200")}>
                        <div className={cn("cursor-pointer select-none border-b border-border/70 px-3 py-2.5", WORKSHOP_STAGE_HEADER_TONE[stage.key])} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleWorkshopStage(stage.key); } }} onClick={() => toggleWorkshopStage(stage.key)}>
                          <div className={cn("flex items-start justify-between gap-2", isCollapsed && "flex-col items-center")}>
                            {isCollapsed ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
                            <span className={cn("h-2 w-2 rounded-full shrink-0", WORKSHOP_STAGE_ACCENT[stage.key].replace("border-l-", "bg-"))} />
                            {!isCollapsed && (<div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-foreground">{stage.label}</h3><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{stage.sub}</p></div>)}
                            <span className="rounded-full bg-card px-2 py-1 text-[11px] font-bold text-foreground/80 shadow-sm">{stage.jobs.length}</span>
                          </div>
                        </div>
                        {!isCollapsed && (
                          <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
                            {stage.jobs.length === 0 ? (<div className="rounded-xl border border-dashed border-border bg-card/70 p-4 text-center text-xs text-muted-foreground">No vehicles</div>) : (
                              stage.jobs.map((job) => {
                                const item = enrichedJobs.find((entry) => entry.job.id === job.id);
                                const overdue = !!priorityMap.get(job.id)?.isOverdue;
                                return (
                                  <Link key={`${stage.key}-${job.id}`} href={`/jobs/${job.id}`} draggable onDragStart={(event) => { setDraggedJobId(job.id); event.dataTransfer.setData("text/plain", job.id); event.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDraggedJobId(null); setDropWorkshopStage(null); }}
                                    className={cn("block rounded-xl border border-l-4 border-border bg-card p-2.5 text-xs shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md", WORKSHOP_STAGE_ACCENT[stage.key], overdue && "border-l-red-500 dark:border-l-red-500 bg-red-50/40 dark:bg-red-950/15", draggedJobId === job.id && "opacity-60", updatingJobId === job.id && "ring-2 ring-border")}>
                                    <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-start gap-1.5"><span className="mt-0.5 shrink-0 rounded-md border border-border bg-muted p-1 text-muted-foreground cursor-grab" title="Drag to move" onClick={(event) => event.preventDefault()}><GripVertical className="h-3 w-3" /></span><div className="min-w-0"><p className="inline-flex max-w-full rounded-md border border-blue-200 dark:border-blue-800/40 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 text-[13px] font-black leading-none tracking-[0.08em] text-blue-950 dark:text-blue-200 shadow-sm"><span className="truncate tabular-nums">#{job.job_number || "Draft"}</span></p><p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">{getVehicleLabel(job)}</p><p className="mt-0.5 truncate text-[12px] font-black tracking-[0.12em] text-foreground tabular-nums">{getPlate(job)}</p></div></div><span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", overdue ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300" : (item?.priorityScore ?? 0) >= 40 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground")}>{item?.priorityScore ?? 0}</span></div>
                                    {job.parts_status && job.parts_status !== "no_parts" ? (<div className={cn("mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold", PARTS_STATUS_META[job.parts_status]?.tone)}>{PARTS_STATUS_META[job.parts_status]?.label}</div>) : null}
                                    <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground"><span className="truncate">Advisor: {job.advisor?.name || "—"}</span><span className="truncate">Tech: {job.technician?.name || "—"}</span><span className="truncate">Idle: {Math.round(item?.idleHours ?? 0)}h</span><span className={cn("truncate font-semibold", overdue ? "text-red-700 dark:text-red-300" : "text-muted-foreground")}>{overdue ? "Overdue" : job.promised_at ? getPromisedLabel(job.promised_at) : "No promise"}</span></div>
                                    <div className={cn("mt-2 rounded-lg border px-2 py-1 text-[11px] font-semibold", getActionUrgencyClass(item?.nextAction.urgency ?? "low"))}>{stage.key === "waiting_technician" ? "Assign technician" : stage.key === "customer_approval" ? "Advisor / customer approval" : item?.nextAction.title ?? "Review job"}</div>
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
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-950/40 p-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-orange-950 dark:text-orange-200"><TriangleAlert className="h-4 w-4" /> Stuck / idle vehicles</h3><div className="mt-3 space-y-2">{workshopEnrichedJobs.filter((item) => !["ready", "closed"].includes(item.job.status) && item.idleHours >= 6).slice(0, 6).map(({ job, idleHours }) => (<Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between rounded-xl bg-card dark:bg-card px-3 py-2 text-sm shadow-sm"><span className="truncate font-medium text-foreground">{job.job_number || "Draft"}</span><span className="text-xs font-semibold text-orange-700 dark:text-orange-300">{Math.round(idleHours)}h idle</span></Link>))}{workshopEnrichedJobs.filter((item) => !["ready", "closed"].includes(item.job.status) && item.idleHours >= 6).length === 0 && <p className="text-xs text-orange-700 dark:text-orange-300">No stuck vehicles detected.</p>}</div></div>
              <div className="rounded-2xl border border-purple-200 dark:border-purple-800/40 bg-purple-50 dark:bg-purple-950/40 p-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-purple-950 dark:text-purple-200"><Package className="h-4 w-4" /> Parts blockers</h3><div className="mt-3 space-y-2">{workshopJobs.filter((job) => job.status === "waiting_parts" || ["order_parts", "waiting_warehouse", "backorder"].includes(job.parts_status ?? "")).slice(0, 6).map((job) => (<Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-card dark:bg-card px-3 py-2 text-sm shadow-sm"><span className="truncate font-medium text-foreground">{job.job_number || "Draft"}</span><span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", PARTS_STATUS_META[job.parts_status ?? "order_parts"]?.tone)}>{PARTS_STATUS_META[job.parts_status ?? "order_parts"]?.label}</span></Link>))}{workshopJobs.filter((job) => job.status === "waiting_parts" || ["order_parts", "waiting_warehouse", "backorder"].includes(job.parts_status ?? "")).length === 0 && <p className="text-xs text-purple-700 dark:text-purple-300">No parts blockers.</p>}</div></div>
              <div className="rounded-2xl border border-cyan-200 dark:border-cyan-800/40 bg-cyan-50 dark:bg-cyan-950/40 p-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-cyan-950 dark:text-cyan-200"><CheckCircle2 className="h-4 w-4" /> QC & delivery handover</h3><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-card p-3 text-center shadow-sm"><p className="text-2xl font-semibold text-cyan-950 dark:text-cyan-200">{boardJobs.quality_check.length}</p><p className="text-[11px] font-medium text-cyan-700 dark:text-cyan-300">in QC</p></div><div className="rounded-xl bg-card p-3 text-center shadow-sm"><p className="text-2xl font-semibold text-cyan-950">{boardJobs.ready.length}</p><p className="text-[11px] font-medium text-cyan-700">ready</p></div></div></div>
            </div>
          </div>

        ) : overallView === "board" ? (
          <div className="mt-4 overflow-x-auto pb-2">
            <div className="mb-3 flex min-w-max gap-3">
              {OVERALL_PHASES.map((phase) => {
                const width = phase.columns.reduce((sum, column) => sum + (collapsedColumns.has(column) ? BOARD_COLUMN_COLLAPSED_WIDTH : BOARD_COLUMN_WIDTH), 0) + Math.max(0, phase.columns.length - 1) * BOARD_COLUMN_GAP;
                const count = phase.columns.reduce((sum, column) => sum + boardJobs[column].length, 0);
                return (<div key={phase.label} style={{ width }} className={cn("rounded-2xl border px-3.5 py-2.5 shadow-sm ring-1 ring-border/60", phase.className)}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-[11px] font-bold uppercase tracking-[0.18em]">{phase.label}</p><p className="truncate text-[11px] opacity-75">{phase.hint}</p></div><span className="shrink-0 rounded-full bg-card/80 px-2 py-0.5 text-[11px] font-bold shadow-sm">{count}</span></div></div>);
              })}
            </div>
            <div className="flex min-w-max gap-3">
              {BOARD_COLUMNS.map((column) => {
                const columnJobs = boardJobs[column];
                const isCollapsed = collapsedColumns.has(column);
                return (
                  <div key={column} onDragOver={(event) => { event.preventDefault(); if (draggedJobId) setDropColumn(column); }} onDragLeave={() => { if (dropColumn === column) setDropColumn(null); }} onDrop={async (event) => { event.preventDefault(); const jobId = event.dataTransfer.getData("text/plain") || draggedJobId; setDropColumn(null); if (!jobId) return; await moveJobToStatus(jobId, column); }}
                    className={cn("flex shrink-0 flex-col rounded-[18px] border shadow-sm transition-all duration-200", OVERALL_COLUMN_TONE[column], isCollapsed ? "w-[46px]" : "w-[248px]", dropColumn === column && "border-slate-400 dark:border-slate-600 bg-muted")}>
                    <div className={cn("cursor-pointer select-none border-b px-3 py-2.5", OVERALL_COLUMN_HEADER_TONE[column])} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleColumn(column); } }} onClick={() => toggleColumn(column)}>
                      <div className={cn("flex items-center gap-2", isCollapsed && "flex-col")}>
                        {isCollapsed ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_META[column].dot)} />
                        {!isCollapsed && <h2 className="text-[12px] font-semibold text-foreground truncate">{STATUS_META[column].label}</h2>}
                        <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{columnJobs.length}</span>
                      </div>
                    </div>
                    {!isCollapsed && (
                      <div className="flex flex-1 flex-col gap-2 p-2.5 overflow-y-auto">
                        {loading ? (<div className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">Loading jobs...</div>)
                        : columnJobs.length === 0 ? (<div className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">No jobs in this stage</div>)
                        : columnJobs.map((job) => {
                          const estimateTotal = (job.estimate_lines ?? []).reduce((s: number, l: any) => s + Number(l.line_total ?? 0), 0);
                          const overdue = !!priorityMap.get(job.id)?.isOverdue;
                          const priority = priorityByJobId.get(job.id);
                          const partsStatus = job.parts_status ?? "no_parts";
                          const hasPartsSignal = partsStatus !== "no_parts" || job.status === "waiting_parts";
                          const promiseLabel = job.promised_at ? new Intl.DateTimeFormat("en-GB", { month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(job.promised_at)) : "No promise";
                          return (
                            <Link key={job.id} href={`/jobs/${job.id}`} draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", job.id); event.dataTransfer.effectAllowed = "move"; setDraggedJobId(job.id); }} onDragEnd={() => { setDraggedJobId(null); setDropColumn(null); }}
                              className={cn("group flex min-h-[172px] flex-col rounded-2xl border border-l-4 border-border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg", BOARD_CARD_ACCENT[job.status], overdue && "border-l-red-500 dark:border-l-red-500 bg-red-50/40 dark:bg-red-950/15", job.is_customer_waiting && !overdue && "border-l-red-400", draggedJobId === job.id && "opacity-60", updatingJobId === job.id && "ring-2 ring-border")}>
                              <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-1.5"><span className="shrink-0 rounded-md border border-border bg-muted p-1 text-muted-foreground cursor-grab" title="Drag to move" onClick={(event) => event.preventDefault()}><GripVertical className="h-3 w-3" /></span><div className="min-w-0"><p className="inline-flex max-w-full rounded-md border border-blue-200 dark:border-blue-800/40 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 text-[13px] font-black leading-none tracking-[0.08em] text-blue-950 dark:text-blue-200 shadow-sm"><span className="truncate tabular-nums">#{job.job_number || "Draft"}</span></p>{overdue ? <span className="mt-0.5 inline-flex rounded-full bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300">Overdue</span> : null}</div></div><span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-black tabular-nums ring-1", getPriorityTone(priority?.priorityScore))}>{priority?.priorityScore ?? "—"}</span></div>
                              <div className="mt-2 min-w-0"><h3 className="truncate text-[14px] font-bold leading-tight text-foreground">{job.customer?.name || "Walk-in"}</h3><div className="mt-1 rounded-xl bg-muted px-2.5 py-1.5 ring-1 ring-border"><p className="truncate text-[11px] font-medium text-muted-foreground">{getVehicleLabel(job)}</p><p className="mt-0.5 truncate text-[12px] font-black tracking-[0.12em] text-foreground tabular-nums">{getPlate(job)}</p></div></div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {job.is_customer_waiting ? <span className="rounded-full bg-red-100 dark:bg-red-900/50 px-2 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300">Waiting customer</span> : null}
                                {job.customer_sensitivity && job.customer_sensitivity !== "normal" ? <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", CUSTOMER_SENSITIVITY_META[job.customer_sensitivity]?.tone)}>{CUSTOMER_SENSITIVITY_META[job.customer_sensitivity]?.label}</span> : null}
                                {hasPartsSignal ? <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", PARTS_STATUS_META[partsStatus]?.tone ?? "bg-purple-100 text-purple-800")}>{PARTS_STATUS_META[partsStatus]?.label ?? "Parts"}</span> : null}
                                {job.status === "ready" && (job.customer_informed ? <span className="rounded-full border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-200">✓ Informed</span> : <button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); try { await api.patch(`/jobs/${job.id}`, { customer_informed: true }); fetchJobs(); } catch {} }} className="rounded-full border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-100">🔔 Inform</button>)}
                                {job.status === "booked" && <div className="mt-2 grid grid-cols-2 gap-1.5"><button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); try { await api.patch(`/jobs/${job.id}/status`, { to_status: 'checking' }); fetchJobs(); toast.success('Customer arrived — moved to Checking'); } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to move to Checking'); } }} className="rounded-lg border border-emerald-300 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-center">✓ Arrived</button><button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (!confirm('Mark this booking as No Show?')) return; try { await api.patch(`/jobs/${job.id}/status`, { to_status: 'no_show' }); fetchJobs(); toast.success('Marked as No Show'); } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to mark as No Show'); } }} className="rounded-lg border border-slate-300 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-900/40 px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-center">✗ No Show</button></div>}
                              </div>
                              {priority?.nextAction?.title ? (<div className={cn("mt-2 rounded-xl border px-2 py-1.5 text-[11px] font-semibold leading-snug", getActionUrgencyClass(priority.nextAction.urgency))}><span className="opacity-70">Next:</span> {priority.nextAction.title}</div>) : job.customer_concern ? <p className="mt-2 line-clamp-2 text-[11px] leading-tight text-muted-foreground">{job.customer_concern}</p> : null}
                              <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-2 pt-2 text-[11px]"><div className="min-w-0 rounded-xl bg-muted px-2 py-1.5 ring-1 ring-border"><p className="text-[9px] uppercase tracking-wide text-muted-foreground">Advisor</p><p className="truncate font-semibold text-foreground">{job.advisor?.name || job.owner_code || "—"}</p></div><div className="text-right"><p className="text-[9px] uppercase tracking-wide text-muted-foreground">Est.</p><p className="font-bold text-foreground">{estimateTotal > 0 ? `${estimateTotal.toFixed(0)}` : "—"}</p></div></div>
                              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground"><div className={cn("flex min-w-0 items-center gap-1 rounded-full px-2 py-1", overdue ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300" : "bg-muted text-muted-foreground")}><Clock3 className="h-3 w-3 shrink-0" /><span className="truncate font-semibold">{promiseLabel}</span></div><span className="inline-flex shrink-0 items-center gap-0.5 font-bold text-foreground group-hover:text-blue-700">{updatingJobId === job.id ? "Moving..." : "Details"}<ArrowRight className="h-3 w-3" /></span></div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        ) : (
          <div className="mt-6 overflow-x-auto rounded-[24px] border border-border">
            <Table>
              <TableHeader><TableRow className="bg-muted"><TableHead>Job</TableHead><TableHead>Customer</TableHead><TableHead className="hidden sm:table-cell">Vehicle</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Advisor</TableHead><TableHead className="hidden md:table-cell">Promise</TableHead><TableHead className="text-right">Risk</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? (<TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading...</TableCell></TableRow>)
                : jobs.length === 0 ? (<TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No jobs found</TableCell></TableRow>)
                : jobs.map((job) => (
                  <TableRow key={job.id} className="bg-card">
                    <TableCell><Link href={`/jobs/${job.id}`} className="font-semibold text-foreground hover:text-blue-700">{job.job_number || "Draft job"}</Link></TableCell>
                    <TableCell>{job.customer?.name || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{getVehicleLabel(job)}</TableCell>
                    <TableCell><StatusPill status={job.status} /></TableCell>
                    <TableCell className="hidden md:table-cell">{job.advisor?.name || "Unassigned"}</TableCell>
                    <TableCell className="hidden md:table-cell">{job.promised_at ? new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(job.promised_at)) : "—"}</TableCell>
                    <TableCell className="text-right">{(priorityMap.get(job.id)?.isOverdue) ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/40 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300"><TriangleAlert className="h-3.5 w-3.5" /> Overdue</span> : <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"><Wrench className="h-3.5 w-3.5" /> Normal</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p><div className="flex gap-2"><Button variant="outline" className="rounded-xl" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button variant="outline" className="rounded-xl" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>
        )}
      </div>
    </div>
  );
}