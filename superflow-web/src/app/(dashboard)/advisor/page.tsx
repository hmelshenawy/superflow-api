"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  TimerReset,
  TrendingUp,
  Wrench,
} from "lucide-react";

interface UrgentJob {
  jobId: string;
  jobNumber: string;
  score: number;
  level: string;
  idleHours: number;
  isOverdue: boolean;
  hoursToPromise: number | null;
  nextAction: string;
}

interface DashboardData {
  critical: number;
  high: number;
  awaitingApproval: number;
  atRisk: number;
  urgentJobs: UrgentJob[];
  pendingApprovals: UrgentJob[];
  promisesAtRisk: UrgentJob[];
  nextBestActions: {
    jobId: string;
    jobNumber: string;
    title: string;
    reason: string;
    urgency: string;
    score: number;
  }[];
}

const levelColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  normal: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

const urgencyIcon: Record<string, typeof AlertTriangle> = {
  critical: AlertTriangle,
  high: ShieldAlert,
  normal: Clock3,
  low: TrendingUp,
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof AlertTriangle; color: string }) {
  return (
    <div className={cn("rounded-xl border p-4", color)}>
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 opacity-60" />
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <p className="mt-1 text-xs font-medium opacity-70">{label}</p>
    </div>
  );
}

export default function AdvisorCockpitPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get("/priority/advisor-dashboard");
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading cockpit...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-destructive gap-2">
        <AlertTriangle className="h-8 w-8" />
        <p>{error}</p>
        <button onClick={fetchDashboard} className="mt-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Cockpit</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your priorities at a glance — updated every 60 seconds
          </p>
        </div>
        <button onClick={fetchDashboard} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Critical" value={data?.critical ?? 0} icon={AlertTriangle} color="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 text-red-700 dark:text-red-300" />
        <StatCard label="High Priority" value={data?.high ?? 0} icon={ShieldAlert} color="border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300" />
        <StatCard label="Awaiting Approval" value={data?.awaitingApproval ?? 0} icon={Clock3} color="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300" />
        <StatCard label="At Risk" value={data?.atRisk ?? 0} icon={TimerReset} color="border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300" />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Urgent jobs */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Urgent Jobs
              </h2>
            </div>
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {(data?.urgentJobs ?? []).length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">No urgent jobs right now</p>
              )}
              {(data?.urgentJobs ?? []).map((job) => (
                <Link key={job.jobId} href={`/jobs/${job.jobId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">#{job.jobNumber}</span>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", levelColors[job.level] || levelColors.low)}>
                        {job.level}
                      </span>
                      {job.isOverdue && <span className="rounded-full bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">OVERDUE</span>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.nextAction}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold">{job.score}</div>
                    <div className="text-[10px] text-muted-foreground">{Math.round(job.idleHours)}h idle</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Pending approvals */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-amber-500" /> Pending Customer Approval
              </h2>
            </div>
            <div className="divide-y max-h-[250px] overflow-y-auto">
              {(data?.pendingApprovals ?? []).length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">No pending approvals</p>
              )}
              {(data?.pendingApprovals ?? []).map((job) => (
                <Link key={job.jobId} href={`/jobs/${job.jobId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-sm">#{job.jobNumber}</span>
                    <p className="truncate text-xs text-muted-foreground">{job.nextAction}</p>
                  </div>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", levelColors[job.level] || levelColors.low)}>
                    {job.score}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Promises at risk */}
          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <TimerReset className="h-4 w-4 text-rose-500" /> Promises at Risk
              </h2>
            </div>
            <div className="divide-y max-h-[250px] overflow-y-auto">
              {(data?.promisesAtRisk ?? []).length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">No promises at risk</p>
              )}
              {(data?.promisesAtRisk ?? []).map((job) => (
                <Link key={job.jobId} href={`/jobs/${job.jobId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-sm">#{job.jobNumber}</span>
                    {job.isOverdue && <span className="ml-2 rounded-full bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">OVERDUE</span>}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {job.hoursToPromise !== null ? `${Math.round(job.hoursToPromise)}h left` : "—"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Next Best Actions
            </h2>
          </div>
          <div className="divide-y max-h-[700px] overflow-y-auto">
            {(data?.nextBestActions ?? []).length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No actions right now</p>
            )}
            {(data?.nextBestActions ?? []).map((action) => {
              const Icon = urgencyIcon[action.urgency] || TrendingUp;
              return (
                <Link key={action.jobId} href={`/jobs/${action.jobId}`} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition">
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", action.urgency === "critical" ? "text-red-500" : action.urgency === "high" ? "text-orange-500" : "text-amber-500")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">#{action.jobNumber}</span>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", levelColors[action.urgency] || levelColors.low)}>
                        {action.urgency}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.reason}</p>
                  </div>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}