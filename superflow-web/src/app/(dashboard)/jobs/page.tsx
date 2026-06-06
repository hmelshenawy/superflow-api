"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api, { getApiError } from "@/lib/api";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { Job, JobStatus, PaginatedResponse, WorkflowStageConfig, WorkshopStage } from "@/types";
import { getJobWorkflowStage } from "@/lib/workflow";

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
  getValidTransitions,
} from "@/lib/jobs-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WorkshopToolbar } from "@/components/workshop/WorkshopToolbar";
import { WorkshopView } from "@/components/workshop/WorkshopView";
import type { WorkshopJobInsight } from "@/lib/workshop-mappers";
import type { WorkshopBoardStage } from "@/lib/workshop-stage-groups";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, ChevronDown, ChevronRight, CheckCircle2, Clock3, GripVertical,
  LayoutGrid, List, Plus, RefreshCw, Search, TriangleAlert, Package,
  PhoneCall, TimerReset, Wrench, AlertTriangle,
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<JobStatus | null>(null);

  // @dnd-kit sensors for touch + pointer support
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const [dropWorkshopStage, setDropWorkshopStage] = useState<WorkshopBoardStage | null>(null);
  const [dropWorkflowStage, setDropWorkflowStage] = useState<string | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState<number | null>(null);
  const [priorityMap, setPriorityMap] = useState<Map<string, PriorityResult>>(new Map());
  const [blockerCounts, setBlockerCounts] = useState<Map<string, number>>(new Map());
  const [collapsedColumns, setCollapsedColumns] = useState<Set<JobStatus>>(new Set());
  const [collapsedWorkshopStages, setCollapsedWorkshopStages] = useState<Set<WorkshopBoardStage>>(new Set());
  const [collapsedWorkflowStages, setCollapsedWorkflowStages] = useState<Set<string>>(new Set());
  const [workflowStages, setWorkflowStages] = useState<WorkflowStageConfig[]>([]);
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

  const toggleWorkshopStage = useCallback((stage: WorkshopBoardStage) => {
    setCollapsedWorkshopStages((prev) => { const next = new Set(prev); if (next.has(stage)) next.delete(stage); else next.add(stage); localStorage.setItem("superflow-collapsed-workshop-stages", JSON.stringify([...next])); return next; });
  }, []);

  const toggleWorkflowStage = useCallback((stageKey: string) => {
    setCollapsedWorkflowStages((prev) => { const next = new Set(prev); if (next.has(stageKey)) next.delete(stageKey); else next.add(stageKey); localStorage.setItem("superflow-collapsed-workflow-stages", JSON.stringify([...next])); return next; });
  }, []);

  const fetchWorkflow = useCallback(async () => {
    try {
      const { data } = await api.get<{ stages: WorkflowStageConfig[] }>("/admin/workflow");
      setWorkflowStages((data.stages || []).filter((stage) => stage.isActive).sort((a, b) => a.sortOrder - b.sortOrder));
    } catch {
      setWorkflowStages([]);
    }
  }, []);

  const fetchPriority = useCallback(async () => {
    try {
      const { data } = await api.get<{ results: PriorityResult[]; computedAt: string }>("/priority");
      const map = new Map<string, PriorityResult>();
      for (const r of (data.results ?? [])) map.set(r.jobId, r);
      setPriorityMap(map);
    } catch { /* fallback: client-side scoring will handle it */ }
  }, []);

  const fetchBlockers = useCallback(async () => {
    try {
      const { data } = await api.get("/blockers?status=active&limit=200");
      const items = data?.items || data?.data || [];
      const counts = new Map<string, number>();
      for (const b of items) counts.set(b.job_id, (counts.get(b.job_id) || 0) + 1);
      setBlockerCounts(counts);
    } catch { /* non-critical: just don't show badges */ }
  }, []);
useEffect(() => { if (!mounted) return; fetchPriority(); fetchBlockers(); fetchWorkflow(); }, [fetchPriority, fetchBlockers, fetchWorkflow, mounted]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (status !== "all") params.status = status;
      if (search) params.search = search;
      if (showArchived) params.archived = "true";
      const { data } = await api.get<PaginatedResponse<Job>>("/jobs", { params });
      setJobs(data.data ?? data.items ?? []);
      setTotal(data.total);
    } catch (err: any) {
      const { message } = getApiError(err);
      setLoadError(message);
      toast.error(message);
    } finally { setLoading(false); fetchPriority(); fetchBlockers(); }
  }, [page, limit, status, search, showArchived, fetchPriority]);

  useEffect(() => { setMounted(true); if (typeof window !== "undefined" && window.innerWidth < 768) switchOverallView("list"); }, []);

  useEffect(() => { if (!mounted) return; fetchJobs(); }, [fetchJobs, mounted]);




  useEffect(() => {
    const hasAwaiting = jobs.some((j) => j.status === "estimate_sent");
    if (!hasAwaiting || !mounted) return;
    const interval = setInterval(() => fetchJobs(), 45000);
    return () => clearInterval(interval);
  }, [jobs.length, mounted, fetchJobs, jobs.some((j) => j.status === "estimate_sent")]);

  // Refresh on window focus so status changes from portal/other tabs appear quickly
  useEffect(() => {
    if (!mounted) return;
    const onFocus = () => fetchJobs();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [mounted, fetchJobs]);

  // Poll every 30s for active jobs (catches portal approvals, etc.)
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => fetchJobs(), 30000);
    return () => clearInterval(interval);
  }, [mounted, fetchJobs]);

  useEffect(() => { setNowTs(Date.now()); }, []);

  useEffect(() => {
    try { const saved = localStorage.getItem("superflow-collapsed-columns"); setCollapsedColumns(saved ? new Set(JSON.parse(saved) as JobStatus[]) : new Set()); } catch { setCollapsedColumns(new Set()); }
    try { const saved = localStorage.getItem("superflow-collapsed-workshop-stages"); setCollapsedWorkshopStages(saved ? new Set(JSON.parse(saved) as WorkshopBoardStage[]) : new Set()); } catch { setCollapsedWorkshopStages(new Set()); }
    try { const saved = localStorage.getItem("superflow-collapsed-workflow-stages"); setCollapsedWorkflowStages(saved ? new Set(JSON.parse(saved) as string[]) : new Set()); } catch { setCollapsedWorkflowStages(new Set()); }
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
      const estimateTotal = job.meta?.estimateTotal ?? (job.estimate_lines ?? []).reduce((sum: number, line: any) => sum + Number(line.line_total ?? 0), 0);
      const nextAction: any = pr?.nextAction ?? { title: "Review job", reason: "", urgency: "low", owner: "advisor", actionType: "general_review", score: 0, signals: [] };
      return { job, priorityScore, priorityLevel, reasons, idleHours, hoursToPromise, estimateTotal, nextAction, isOverdue: pr?.isOverdue ?? false };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [activeJobs, priorityMap]);

  const advisorActions = useMemo(() => [...enrichedJobs].sort((a, b) => b.priorityScore !== a.priorityScore ? b.priorityScore - a.priorityScore : b.nextAction.score - a.nextAction.score).slice(0, 8), [enrichedJobs]);
  const priorityByJobId = useMemo(() => new Map(enrichedJobs.map((item) => [item.job.id, item])), [enrichedJobs]);
  const workshopEnrichedJobs = useMemo(() => enrichedJobs.filter((item) => isWorkshopPhaseJob(item.job)), [enrichedJobs]);
  const workflowJobs = useMemo(() => {
    const grouped = new Map<string, Job[]>();
    for (const stage of workflowStages) grouped.set(stage.key, []);
    for (const job of jobs) {
      const stage = getJobWorkflowStage(job, workflowStages);
      if (stage) grouped.set(stage.key, [...(grouped.get(stage.key) || []), job]);
    }
    return grouped;
  }, [jobs, workflowStages]);

  const stats = useMemo(() => ({
    awaitingApproval: jobs.filter((job) => job.status === "estimate_sent").length,
    inWorkshop: workshopJobs.length,
    overdue: enrichedJobs.filter((item) => item.isOverdue).length,
    totalEstimate: enrichedJobs.reduce((sum, item) => sum + item.estimateTotal, 0),
    critical: enrichedJobs.filter((item) => item.priorityScore >= 60).length,
  }), [jobs, enrichedJobs]);

  const totalPages = Math.ceil(total / limit);

  const workshopInsights = useMemo<WorkshopJobInsight[]>(() => {
    return workshopEnrichedJobs.map((item) => ({
      job: item.job,
      idleHours: item.idleHours,
      priorityScore: item.priorityScore,
      isOverdue: item.isOverdue,
      nextAction: item.nextAction,
    }));
  }, [workshopEnrichedJobs]);

  if (!mounted) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;

  const moveJobToStatus = async (jobId: string, nextStatus: JobStatus) => {
    const currentJob = jobs.find((job) => job.id === jobId);
    if (!currentJob || currentJob.status === nextStatus) return;
    if (!getValidTransitions(currentJob).includes(nextStatus)) {
      toast.error(`Cannot move from ${STATUS_META[currentJob.status].label} to ${STATUS_META[nextStatus].label}`);
      setDraggedJobId(null); setDropColumn(null);
      return;
    }
    const previousJobs = jobs;
    setJobs(jobs.map((job) => job.id === jobId ? { ...job, status: nextStatus } : job));
    setUpdatingJobId(jobId); setDraggedJobId(null); setDropColumn(null);
    try { await api.patch(`/jobs/${jobId}/status`, { to_status: nextStatus }); toast.success(`${currentJob.job_number || "Job"} moved to ${STATUS_META[nextStatus].label}`); await fetchJobs(); }
    catch (err: any) { setJobs(previousJobs); toast.error(getApiError(err).message || "Failed to update job status"); }
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

  const moveJobToWorkflowStage = async (jobId: string, nextStage: WorkflowStageConfig) => {
    const currentJob = jobs.find((job) => job.id === jobId);
    if (!currentJob || currentJob.workflow_stage_key === nextStage.key) return;
    const previousJobs = jobs;
    setJobs(jobs.map((job) => job.id === jobId ? { ...job, status: nextStage.systemStatus, workflow_stage_key: nextStage.key } : job));
    setUpdatingJobId(jobId); setDraggedJobId(null);
    try { await api.patch(`/jobs/${jobId}`, { workflow_stage_key: nextStage.key }); toast.success(`${currentJob.job_number || "Job"} moved to ${nextStage.label}`); await fetchJobs(); }
    catch (err: any) { setJobs(previousJobs); toast.error(getApiError(err).message || "Failed to update workflow stage"); }
    finally { setUpdatingJobId(null); }
  };

  // @dnd-kit handlers for overall board
  const handleDndStart = (event: DragStartEvent) => {
    setDraggedJobId(String(event.active.id));
  };

  const handleDndEnd = async (event: DragEndEvent) => {
    const jobId = String(event.active.id);
    const overId = event.over?.id as string | undefined;
    setDraggedJobId(null);
    setDropColumn(null);
    if (!overId || !jobId) return;
    // overId is a JobStatus column key like "booked", "checking", etc.
    if (OVERALL_COLUMN_TONE[overId as JobStatus]) {
      await moveJobToStatus(jobId, overId as JobStatus);
    }
  };

  const markCustomerInformed = async (jobId: string) => {
    try {
      await api.patch(`/jobs/${jobId}`, { customer_informed: true });
      fetchJobs();
    } catch {}
  };

  return (
    <div className="space-y-4">
      <WorkshopToolbar
        dashboardView={dashboardView}
        overallView={overallView}
        search={search}
        status={status}
        totalEstimate={stats.totalEstimate}
        loading={loading}
        showArchived={showArchived}
        onDashboardViewChange={switchDashboardView}
        onOverallViewChange={switchOverallView}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        onStatusChange={(value) => { setStatus(value); setPage(1); }}
        onRefresh={fetchJobs}
        onToggleArchived={() => setShowArchived(!showArchived)}
      />

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load jobs</p>
                <p className="mt-1">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading}>Retry</Button>
          </div>
        </div>
      )}

      <div>
        {dashboardView === "advisor" ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted p-3">
                <div className="flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Advisor cockpit</p><h2 className="text-lg font-semibold text-foreground">My urgent now</h2></div><span className="rounded-full bg-red-50 dark:bg-red-950/15 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300">{stats.critical} critical</span></div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {enrichedJobs.slice(0, 6).map(({ job, priorityScore, priorityLevel, reasons, nextAction }) => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="rounded-xl border border-border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md">
                      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{job.job_number || "Draft"}</p><h3 className="truncate text-sm font-semibold text-foreground">{job.customer?.name || "Walk-in"}</h3><p className="truncate text-xs text-muted-foreground">{getVehicleLabel(job)} · {getPlate(job)}</p></div><span className={cn("rounded-full px-2 py-1 text-[11px] font-bold", priorityScore >= 60 ? "bg-red-100 text-red-800" : priorityScore >= 40 ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200" : "bg-muted text-foreground/80")}>{priorityScore}</span></div>
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
                    {jobs.filter((job) => job.status === "estimate_sent").slice(0, 5).map((job) => (<Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between rounded-xl bg-card dark:bg-card px-3 py-2 text-sm shadow-sm"><span className="min-w-0 truncate font-medium text-foreground">{job.customer?.name || "Walk-in"}</span><span className="text-xs font-semibold text-rose-700 dark:text-rose-300">{(job.meta?.estimateTotal ?? (job.estimate_lines ?? []).reduce((s: number, l: any) => s + Number(l.line_total ?? 0), 0)).toFixed(0)} AED</span></Link>))}
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
                    <div className="flex items-start gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="text-sm font-semibold text-foreground">{nextAction.title}</p><span className={cn("rounded-full border px-1.5 py-0.5 text-[11px] font-bold uppercase", getActionUrgencyClass(nextAction.urgency))}>{nextAction.urgency}</span></div><p className="truncate text-xs text-muted-foreground">{job.customer?.name || "Walk-in"} · {job.job_number || "Draft"} · Owner: {nextAction.owner}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{nextAction.reason}</p></div><span className="rounded-full bg-card px-2 py-1 text-[11px] font-bold text-foreground/80">{priorityScore}</span></div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

        ) : dashboardView === "workshop" ? (
          <WorkshopView
            jobs={workshopJobs}
            insights={workshopInsights}
            blockerCounts={blockerCounts}
            collapsedStages={collapsedWorkshopStages}
            dropStage={dropWorkshopStage}
            draggedJobId={draggedJobId}
            updatingJobId={updatingJobId}
            onToggleStage={toggleWorkshopStage}
            onDropJob={async (jobId, stage) => {
              setDropWorkshopStage(null);
              if (stage === "waiting_parts") {
                await moveJobToStatus(jobId, "waiting_parts");
              } else {
                await moveJobToWorkshopStage(jobId, stage);
              }
            }}
            onDragStart={setDraggedJobId}
            onDragEnd={() => { setDraggedJobId(null); setDropWorkshopStage(null); }}
            onDragOverStage={setDropWorkshopStage}
            onDragLeaveStage={() => setDropWorkshopStage(null)}
            onCustomerInformed={markCustomerInformed}
          />

        ) : overallView === "board" ? (
          <DndContext sensors={dndSensors} collisionDetection={closestCorners} onDragStart={handleDndStart} onDragEnd={handleDndEnd}>
          <div className="mt-4 overflow-x-auto pb-2">
            <div className="mb-3 flex min-w-max gap-3">
              {OVERALL_PHASES.map((phase) => {
                const phaseStages = workflowStages.filter((stage) => phase.columns.includes(stage.systemStatus));
                const width = phaseStages.reduce((sum, stage) => sum + (collapsedWorkflowStages.has(stage.key) ? BOARD_COLUMN_COLLAPSED_WIDTH : BOARD_COLUMN_WIDTH), 0) + Math.max(0, phaseStages.length - 1) * BOARD_COLUMN_GAP;
                const count = phaseStages.reduce((sum, stage) => sum + (workflowJobs.get(stage.key)?.length || 0), 0);
                return (<div key={phase.label} style={{ width }} className={cn("rounded-2xl border px-3.5 py-2.5 shadow-sm ring-1 ring-border/60", phase.className)}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-[11px] font-bold uppercase tracking-[0.18em]">{phase.label}</p><p className="truncate text-[11px] opacity-75">{phase.hint}</p></div><span className="shrink-0 rounded-full bg-card/80 px-2 py-0.5 text-[11px] font-bold shadow-sm">{count}</span></div></div>);
              })}
            </div>
            <div className="flex min-w-max gap-3">
              {workflowStages.map((stage) => {
                const stageJobs = workflowJobs.get(stage.key) || [];
                const isCollapsed = collapsedWorkflowStages.has(stage.key);
                return (
                  <div key={stage.key} id={`workflow-${stage.key}`} onDragOver={(event) => { event.preventDefault(); if (draggedJobId) setDropWorkflowStage(stage.key); }} onDragLeave={() => { if (dropWorkflowStage === stage.key) setDropWorkflowStage(null); }} onDrop={async (event) => { event.preventDefault(); const jobId = event.dataTransfer.getData("text/plain") || draggedJobId; setDropWorkflowStage(null); if (!jobId) return; await moveJobToWorkflowStage(jobId, stage); }}
                    className={cn("flex shrink-0 flex-col rounded-[18px] border shadow-sm transition-all duration-200", OVERALL_COLUMN_TONE[stage.systemStatus], isCollapsed ? "w-[46px]" : "w-[248px] min-w-[240px]", dropWorkflowStage === stage.key && "border-slate-400 dark:border-slate-600 bg-muted")}>
                    <div className={cn("cursor-pointer select-none border-b px-3 py-2.5", OVERALL_COLUMN_HEADER_TONE[stage.systemStatus])} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleWorkflowStage(stage.key); } }} onClick={() => toggleWorkflowStage(stage.key)}>
                      <div className={cn("flex items-center gap-2", isCollapsed && "flex-col")}>
                        {isCollapsed ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_META[stage.systemStatus].dot)} />
                        {!isCollapsed && <h2 className="truncate text-[12px] font-semibold text-foreground">{stage.label}</h2>}
                        <span className="rounded-full bg-card px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{stageJobs.length}</span>
                      </div>
                    </div>
                    {!isCollapsed && (
                      <div className="flex flex-1 flex-col gap-2 p-2.5 overflow-y-auto">
                        {loading ? (<div className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">Loading jobs...</div>)
                        : stageJobs.length === 0 ? (<div className="rounded-xl border border-dashed border-border bg-card p-4 text-center text-xs text-muted-foreground">No jobs in this stage</div>)
                        : stageJobs.map((job) => {
                          const estimateTotal = job.meta?.estimateTotal ?? (job.estimate_lines ?? []).reduce((s: number, l: any) => s + Number(l.line_total ?? 0), 0);
                          const overdue = !!priorityMap.get(job.id)?.isOverdue;
                          const priority = priorityByJobId.get(job.id);
                          const partsStatus = job.parts_status ?? "no_parts";
                          const hasPartsSignal = partsStatus !== "no_parts" || job.status === "waiting_parts";
                          const promiseLabel = job.promised_at ? new Intl.DateTimeFormat("en-GB", { month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(job.promised_at)) : "No promise";
                          return (
                            <Link key={job.id} href={`/jobs/${job.id}`} draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", job.id); event.dataTransfer.effectAllowed = "move"; setDraggedJobId(job.id); }} onDragEnd={() => { setDraggedJobId(null); setDropWorkflowStage(null); }}
                              className={cn("group flex min-h-[172px] flex-col rounded-2xl border border-l-4 border-border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg", BOARD_CARD_ACCENT[job.status], overdue && "border-l-red-500 dark:border-l-red-500 bg-red-50/40 dark:bg-red-950/15", job.is_customer_waiting && !overdue && "border-l-red-400", draggedJobId === job.id && "opacity-60", updatingJobId === job.id && "ring-2 ring-border")}>
                              <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-1.5"><span className="shrink-0 rounded-md border border-border bg-muted p-1 text-muted-foreground cursor-grab" title="Drag to move" onClick={(event) => event.preventDefault()}><GripVertical className="h-3 w-3" /></span><div className="min-w-0"><p className="inline-flex max-w-full rounded-md border border-blue-200 dark:border-blue-800/40 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 text-[13px] font-black leading-none tracking-[0.08em] text-blue-950 dark:text-blue-200 shadow-sm"><span className="truncate tabular-nums">#{job.job_number || "Draft"}</span></p>{overdue ? <span className="mt-0.5 inline-flex rounded-full bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-300">Overdue</span> : null}</div></div><span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-black tabular-nums ring-1", getPriorityTone(priority?.priorityScore))}>{priority?.priorityScore ?? "—"}</span></div>
                              <div className="mt-2 min-w-0"><h3 className="truncate text-[14px] font-bold leading-tight text-foreground">{job.customer?.name || "Walk-in"}</h3><div className="mt-1 rounded-xl bg-muted px-2.5 py-1.5 ring-1 ring-border"><p className="truncate text-[11px] font-medium text-muted-foreground">{getVehicleLabel(job)}</p><p className="mt-0.5 truncate text-[12px] font-black tracking-[0.12em] text-foreground tabular-nums">{getPlate(job)}</p></div></div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {job.is_customer_waiting ? <span className="rounded-full bg-red-100 dark:bg-red-900/50 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-300">Waiting customer</span> : null}
                                {job.customer_sensitivity && job.customer_sensitivity !== "normal" ? <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", CUSTOMER_SENSITIVITY_META[job.customer_sensitivity]?.tone)}>{CUSTOMER_SENSITIVITY_META[job.customer_sensitivity]?.label}</span> : null}
                                {hasPartsSignal ? <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", PARTS_STATUS_META[partsStatus]?.tone ?? "bg-purple-100 text-purple-800")}>{PARTS_STATUS_META[partsStatus]?.label ?? "Parts"}</span> : null}
                                {job.status === "ready" && (job.customer_informed ? <span className="rounded-full border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-200">✓ Informed</span> : <button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); try { await api.patch(`/jobs/${job.id}`, { customer_informed: true }); fetchJobs(); } catch {} }} className="rounded-full border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-100">🔔 Inform</button>)}
                                {job.status === "booked" && <div className="mt-2 grid grid-cols-2 gap-1.5"><button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); try { await api.patch(`/jobs/${job.id}/status`, { to_status: 'checking' }); fetchJobs(); toast.success('Customer arrived — moved to Checking'); } catch (err: any) { toast.error(getApiError(err).message); } }} className="rounded-lg border border-emerald-300 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-center">✓ Arrived</button><button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (!confirm('Mark this booking as No Show?')) return; try { await api.patch(`/jobs/${job.id}/status`, { to_status: 'no_show' }); fetchJobs(); toast.success('Marked as No Show'); } catch (err: any) { toast.error(getApiError(err).message); } }} className="rounded-lg border border-slate-300 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-900/40 px-2 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-center">✗ No Show</button></div>}
                              </div>
                              {priority?.nextAction?.title ? (<div className={cn("mt-2 rounded-xl border px-2 py-1.5 text-[11px] font-semibold leading-snug", getActionUrgencyClass(priority.nextAction.urgency))}><span className="opacity-70">Next:</span> {priority.nextAction.title}</div>) : job.customer_concern ? <p className="mt-2 line-clamp-2 text-[11px] leading-tight text-muted-foreground">{job.customer_concern}</p> : null}
                              <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-2 pt-2 text-[11px]"><div className="min-w-0 rounded-xl bg-muted px-2 py-1.5 ring-1 ring-border"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Advisor</p><p className="truncate font-semibold text-foreground">{job.advisor?.name || job.owner_code || "—"}</p></div><div className="text-right"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Est.</p><p className="font-bold text-foreground">{estimateTotal > 0 ? `${estimateTotal.toFixed(0)}` : "—"}</p></div></div>
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
          </DndContext>

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
