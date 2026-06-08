"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import api, { getApiError } from "@/lib/api";
import { usePlanStore, FEATURES } from "@/hooks/use-plan-features";
import { LockedFeatureOverlay } from "@/components/locked-feature-overlay";
import {
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Car,
  Timer,
  Package,
  Play,
  Pause,
  LogIn,
  LogOut,
  Coffee,
  MoreHorizontal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────

interface TechnicianJob {
  id: string;
  job_number: string | null;
  vehicle: string;
  vehicle_plate: string;
  vehicle_color: string;
  workshop_stage: string | null;
  status: string;
  parts_status: string | null;
  customer_concern: string | null;
  promised_at: string | null;
  is_customer_waiting: boolean | null;
  stage_started_at: string;
  minutes_in_stage: number;
  is_promised_at_risk: boolean;
  priority_score: number | null;
}

interface TechnicianData {
  id: string;
  name: string | null;
  avatar_url: string | null;
  employee_code: string | null;
  clock_status: string;
  shift_started_at: string | null;
  total_jobs: number;
  job_counts: {
    in_progress: number;
    waiting: number;
    waiting_parts: number;
    completed_today: number;
  };
  jobs: TechnicianJob[];
}

interface UnassignedJob {
  id: string;
  job_number: string | null;
  vehicle: string;
  vehicle_plate: string;
  vehicle_color: string;
  workshop_stage: string | null;
  status: string;
  parts_status: string | null;
  customer_concern: string | null;
  promised_at: string | null;
  is_customer_waiting: boolean | null;
  minutes_waiting: number;
  priority_score: number | null;
}

interface BoardData {
  summary: {
    on_shift: number;
    total_technicians: number;
    jobs_in_progress: number;
    jobs_waiting_tech: number;
    avg_stage_time_minutes: number;
    promised_at_risk: number;
  };
  technicians: TechnicianData[];
  unassigned_jobs: UnassignedJob[];
}

// ─── Helpers ────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  waiting_technician: "Waiting Tech",
  diagnosis: "Diagnosis",
  estimate_prep: "Estimate Prep",
  customer_approval: "Customer Approval",
  work_in_progress: "WIP",
  final_test: "Final Test",
  quality_check: "QC",
  ready_handover: "Ready",
};

const STAGE_COLORS: Record<string, string> = {
  waiting_technician: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  diagnosis: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  estimate_prep: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  customer_approval: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  work_in_progress: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  final_test: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  quality_check: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  ready_handover: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function getTimeColor(minutes: number): string {
  if (minutes < 30) return "text-green-600 dark:text-green-400";
  if (minutes < 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getClockBadge(status: string) {
  switch (status) {
    case "on_shift":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"><CheckCircle2 className="w-3 h-3" /> On Shift</span>;
    case "on_break":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"><Coffee className="w-3 h-3" /> On Break</span>;
    case "off_shift":
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"><Pause className="w-3 h-3" /> Off Shift</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500">Unknown</span>;
  }
}

function getPriorityBadgeColor(score: number | null): string {
  if (score === null) return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
  if (score >= 60) return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
  if (score >= 40) return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
  if (score >= 22) return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}

// ─── Components ──────────────────────────────────────────

function SummaryStrip({ summary }: { summary: BoardData["summary"] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">On Shift</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {summary.on_shift}<span className="text-sm font-normal text-gray-400">/{summary.total_technicians}</span>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">In Progress</div>
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.jobs_in_progress}</div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Waiting for Tech</div>
        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.jobs_waiting_tech}</div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Stage Time</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(summary.avg_stage_time_minutes)}</div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Promised at Risk</div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.promised_at_risk}</div>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Active</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {summary.jobs_in_progress + summary.jobs_waiting_tech}
        </div>
      </div>
    </div>
  );
}

function JobCard({ job }: { job: TechnicianJob }) {
  const stageLabel = STAGE_LABELS[job.workshop_stage || ""] || job.workshop_stage || "—";
  const stageColor = STAGE_COLORS[job.workshop_stage || ""] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{job.job_number}</span>
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${getPriorityBadgeColor(job.priority_score)}`}>
            {job.priority_score ?? "-"}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColor}`}>{stageLabel}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-1">
        <Car className="w-3.5 h-3.5" />
        <span className="truncate">{job.vehicle}</span>
        {job.vehicle_color && (
          <span
            className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 inline-block shrink-0"
            style={{ backgroundColor: job.vehicle_color.toLowerCase() }}
            title={job.vehicle_color}
          />
        )}
      </div>
      {job.vehicle_plate && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{job.vehicle_plate}</div>
      )}
      <div className="flex items-center gap-2 text-xs">
        <Timer className="w-3 h-3 text-gray-400" />
        <span className={getTimeColor(job.minutes_in_stage)}>{formatDuration(job.minutes_in_stage)}</span>
        {job.promised_at && (
          <>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className={job.is_promised_at_risk ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-500 dark:text-gray-400"}>
              Due {new Date(job.promised_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </>
        )}
        {job.is_customer_waiting && (
          <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 font-medium">Waiting</span>
        )}
      </div>
      {job.parts_status && job.parts_status !== "no_parts" && job.parts_status !== "issued" && (
        <div className="flex items-center gap-1 mt-1 text-xs text-orange-600 dark:text-orange-400">
          <Package className="w-3 h-3" /> {job.parts_status.replace(/_/g, " ")}
        </div>
      )}
    </Link>
  );
}

function UnassignedJobCard({ job }: { job: UnassignedJob }) {
  return (
    <Link href={`/jobs/${job.id}`} className="block bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{job.job_number}</span>
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${getPriorityBadgeColor(job.priority_score)}`}>
            {job.priority_score ?? "-"}
          </span>
          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            Waiting {formatDuration(job.minutes_waiting)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-1">
        <Car className="w-3.5 h-3.5" />
        <span className="truncate">{job.vehicle}</span>
        {job.vehicle_color && (
          <span
            className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 inline-block shrink-0"
            style={{ backgroundColor: job.vehicle_color.toLowerCase() }}
            title={job.vehicle_color}
          />
        )}
      </div>
      {job.customer_concern && (
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{job.customer_concern}</div>
      )}
      {job.is_customer_waiting && (
        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 font-medium">Customer Waiting</span>
      )}
    </Link>
  );
}

function TechnicianCard({ tech, expanded, onToggle }: { tech: TechnicianData; expanded: boolean; onToggle: () => void }) {
  const inProgressJobs = tech.jobs.filter(j =>
    ["work_in_progress", "diagnosis", "estimate_prep", "final_test", "quality_check"].includes(j.workshop_stage || "")
  );
  const waitingJobs = tech.jobs.filter(j =>
    ["waiting_technician", "customer_approval"].includes(j.workshop_stage || "")
  );
  const partsBlockedJobs = tech.jobs.filter(j =>
    j.parts_status && ["order_parts", "waiting_warehouse", "backorder"].includes(j.parts_status)
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            {tech.avatar_url ? (
              <img src={tech.avatar_url} alt={tech.name || ""} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">{tech.name || "Unknown"}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {tech.employee_code && <span className="text-xs text-gray-500 dark:text-gray-400">{tech.employee_code}</span>}
              {getClockBadge(tech.clock_status)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-xs">
            {tech.job_counts.in_progress > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 font-medium">
                {tech.job_counts.in_progress} active
              </span>
            )}
            {tech.job_counts.waiting > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 font-medium">
                {tech.job_counts.waiting} queued
              </span>
            )}
            {tech.job_counts.completed_today > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 font-medium">
                {tech.job_counts.completed_today} done
              </span>
            )}
            {tech.job_counts.waiting_parts > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 font-medium">
                {tech.job_counts.waiting_parts} parts
              </span>
            )}
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-3">
          {inProgressJobs.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Play className="w-3 h-3" /> In Progress
              </div>
              <div className="space-y-2">
                {inProgressJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </div>
          )}
          {waitingJobs.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Queued / Waiting
              </div>
              <div className="space-y-2">
                {waitingJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </div>
          )}
          {partsBlockedJobs.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Package className="w-3 h-3" /> Parts Blocked
              </div>
              <div className="space-y-2">
                {partsBlockedJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </div>
          )}
          {tech.jobs.length === 0 && (
            <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No active jobs assigned</div>
          )}
        </div>
      )}

      {/* Collapsed mini-view */}
      {!expanded && tech.jobs.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 flex gap-2 overflow-x-auto">
          {inProgressJobs.slice(0, 3).map(job => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="shrink-0 px-2 py-1 rounded bg-green-50 dark:bg-green-900/30 text-xs text-green-700 dark:text-green-300 font-mono hover:underline">
              {job.job_number}
            </Link>
          ))}
          {waitingJobs.slice(0, 2).map(job => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="shrink-0 px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/30 text-xs text-yellow-700 dark:text-yellow-300 font-mono hover:underline">
              {job.job_number}
            </Link>
          ))}
          {tech.jobs.length > 5 && (
            <div className="shrink-0 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 text-xs text-gray-500">
              +{tech.jobs.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────

export default function TechniciansPage() {
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTechs, setExpandedTechs] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.get("/technicians/board");
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchBoard, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchBoard]);

  const toggleTech = (id: string) => {
    setExpandedTechs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (data) setExpandedTechs(new Set(data.technicians.map(t => t.id)));
  };
  const collapseAll = () => setExpandedTechs(new Set());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
        <p className="text-red-600 dark:text-red-400 font-medium">Failed to load technician board</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
        <button onClick={fetchBoard} className="mt-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Technician Board</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real-time workload & productivity view
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Collapse All
          </button>
          <button
            onClick={fetchBoard}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Auto-refresh
          </label>
        </div>
      </div>

      {/* Summary */}
      <SummaryStrip summary={data.summary} />

      {/* Technician Cards */}
      <div className="space-y-4">
        {data.technicians.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No technicians found for this workshop.</p>
            <p className="text-sm mt-1">Add technicians with the &quot;technician&quot; role to see them here.</p>
          </div>
        ) : (
          data.technicians.map(tech => (
            <TechnicianCard
              key={tech.id}
              tech={tech}
              expanded={expandedTechs.has(tech.id)}
              onToggle={() => toggleTech(tech.id)}
            />
          ))
        )}
      </div>

      {/* Unassigned Jobs */}
      {data.unassigned_jobs.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Unassigned Jobs ({data.unassigned_jobs.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.unassigned_jobs.map(job => (
              <UnassignedJobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
