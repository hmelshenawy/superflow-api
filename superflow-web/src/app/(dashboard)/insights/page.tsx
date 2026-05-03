"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import {
  BarChart3,
  Users,
  Car,
  ClipboardCheck,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  DollarSign,
  Wrench,
  Send,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
} from "recharts";

// ─── Types ────────────────────────────────────────────
interface DashboardData {
  counts: {
    jobs: number;
    customers: number;
    vehicles: number;
    inspections: number;
    estimateLines: number;
    notifications: number;
    sentNotifications: number;
    pendingDeferred: number;
  };
  jobsByStatus: { status: string; count: number }[];
  jobsOverTime: { date: string; created: number; closed: number }[];
  revenue: {
    total: number;
    approved: number;
    pending: number;
    byStatus: { status: string; lines: number; total: number; tax: number }[];
  };
  inspectionCompletionRate: number;
  approvalRate: number;
  approvalCounts: { approved: number; declined: number; total: number };
  deferredByStatus: { status: string; count: number }[];
  overdueReminders: number;
  avgTurnaroundHours: number | null;
  overdueJobs: number;
  recentActivity: {
    last7Days: {
      jobsCreated: number;
      jobsClosed: number;
      inspectionsSubmitted: number;
      approvalsSent: number;
    };
  };
}

// ─── Colors ───────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  booked: "#94a3b8",
  checking: "#f59e0b",
  estimate_sent: "#f43f5e",
  approved: "#10b981",
  in_progress: "#3b82f6",
  waiting_parts: "#8b5cf6",
  quality_check: "#06b6d4",
  ready: "#14b8a6",
  closed: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
  booked: "Booked",
  checking: "Checking",
  estimate_sent: "Estimate Sent",
  approved: "Approved",
  in_progress: "In Progress",
  waiting_parts: "Waiting Parts",
  quality_check: "QC",
  ready: "Ready",
  closed: "Closed",
};

const DEFERRED_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  reminded: "#3b82f6",
  booked: "#10b981",
  closed: "#64748b",
  expired: "#ef4444",
};

const PIE_COLORS = ["#10b981", "#f43f5e", "#94a3b8"];

// ─── Helpers ──────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtAED(n: number) {
  return "AED " + n.toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Stat Card ────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone?: string;
  sub?: string;
}) {
  const tones: Record<string, string> = {
    slate: "border-border bg-muted",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    rose: "border-rose-200 bg-rose-50",
    emerald: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
    purple: "border-purple-200 bg-purple-50",
  };
  const iconTones: Record<string, string> = {
    slate: "text-muted-foreground",
    blue: "text-blue-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    emerald: "text-emerald-600",
    red: "text-red-600",
    purple: "text-purple-600",
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${iconTones[tone]}`} />
      </div>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Chart Card ────────────────────────────────────────
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────
export default function InsightsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<DashboardData>("/insights/dashboard");
      setData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-8 w-8 text-rose-500" />
        <p className="text-sm text-rose-600">{error}</p>
        <button onClick={fetchDashboard} className="text-sm text-blue-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const notifRate = data.counts.notifications > 0
    ? Math.round((data.counts.sentNotifications / data.counts.notifications) * 100)
    : 0;

  // Pie data for approvals
  const approvalPieData = [
    { name: "Approved", value: data.approvalCounts.approved },
    { name: "Declined", value: data.approvalCounts.declined },
    { name: "Pending", value: Math.max(0, data.approvalCounts.total - data.approvalCounts.approved - data.approvalCounts.declined) },
  ].filter((d) => d.value > 0);

  // Pie data for inspections
  const inspectionPieData = [
    { name: "Completed", value: Math.round(data.inspectionCompletionRate * data.counts.inspections / 100) },
    { name: "In Progress", value: data.counts.inspections - Math.round(data.inspectionCompletionRate * data.counts.inspections / 100) },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Analytics
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">
            Workshop Insights
          </h1>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground/80 shadow-sm transition hover:bg-muted"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Top stat cards ─────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Active Jobs" value={data.counts.jobs} icon={Wrench} tone="blue" />
        <StatCard label="Customers" value={data.counts.customers} icon={Users} tone="slate" />
        <StatCard label="Vehicles" value={data.counts.vehicles} icon={Car} tone="slate" />
        <StatCard
          label="Overdue"
          value={data.overdueJobs}
          icon={AlertTriangle}
          tone={data.overdueJobs > 0 ? "red" : "slate"}
          sub={data.overdueJobs > 0 ? "Past promised date" : "All on track"}
        />
        <StatCard
          label="Avg Turnaround"
          value={data.avgTurnaroundHours !== null ? `${data.avgTurnaroundHours}h` : "—"}
          icon={Clock}
          tone="amber"
          sub="Closed jobs last 30d"
        />
        <StatCard
          label="Pending Deferred"
          value={data.counts.pendingDeferred}
          icon={Clock}
          tone="purple"
          sub={data.overdueReminders > 0 ? `${data.overdueReminders} overdue reminders` : undefined}
        />
      </div>

      {/* ── Revenue row ────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Estimate Value"
          value={fmtAED(data.revenue.total)}
          icon={DollarSign}
          tone="emerald"
          sub={`${data.counts.estimateLines} line items`}
        />
        <StatCard
          label="Approved Revenue"
          value={fmtAED(data.revenue.approved)}
          icon={CheckCircle2}
          tone="emerald"
          sub="Closed + Ready jobs"
        />
        <StatCard
          label="Pending Revenue"
          value={fmtAED(data.revenue.pending)}
          icon={Send}
          tone="rose"
          sub="Awaiting customer decision"
        />
      </div>

      {/* ── Charts row 1 ───────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Jobs by status bar chart */}
        <ChartCard title="Jobs by Status">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.jobsByStatus} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => STATUS_LABELS[v] || v}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: any) => [value, "Jobs"]}
                  labelFormatter={(label) => STATUS_LABELS[label] || label}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.jobsByStatus.map((entry, index) => (
                    <Cell key={index} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Jobs over time area chart */}
        <ChartCard title="Jobs Over Time (30 Days)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.jobsOverTime} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="created" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Created" />
                <Area type="monotone" dataKey="closed" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="Closed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Charts row 2 ───────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Approval rate pie */}
        <ChartCard title={`Customer Approval Rate (${data.approvalRate}%)`}>
          <div className="h-56">
            {approvalPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={approvalPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {approvalPieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No approval data yet
              </div>
            )}
          </div>
        </ChartCard>

        {/* Inspection completion pie */}
        <ChartCard title={`Inspection Completion (${data.inspectionCompletionRate}%)`}>
          <div className="h-56">
            {inspectionPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inspectionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No inspection data yet
              </div>
            )}
          </div>
        </ChartCard>

        {/* Deferred work pie */}
        <ChartCard title="Deferred Work Breakdown">
          <div className="h-56">
            {data.deferredByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.deferredByStatus.map((d) => ({
                      name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
                      value: d.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.deferredByStatus.map((entry, index) => (
                      <Cell key={index} fill={DEFERRED_COLORS[entry.status] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No deferred work
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* ── Revenue by job status bar ─────────────────── */}
      <ChartCard title="Revenue by Job Status">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.revenue.byStatus} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="status"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => STATUS_LABELS[v] || v}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
              <Tooltip formatter={(value: any) => fmtAED(Number(value))} />
              <Bar dataKey="total" name="Line Total" radius={[4, 4, 0, 0]}>
                {data.revenue.byStatus.map((entry, index) => (
                  <Cell key={index} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Recent activity row ────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Last 7 Days Activity</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-blue-600 dark:text-blue-400" />
            <p className="mt-1 text-2xl font-bold text-blue-950 dark:text-blue-200">{data.recentActivity.last7Days.jobsCreated}</p>
            <p className="text-[11px] text-blue-600 dark:text-blue-400">Jobs Created</p>
          </div>
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="mt-1 text-2xl font-bold text-emerald-950 dark:text-emerald-200">{data.recentActivity.last7Days.jobsClosed}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Jobs Closed</p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
            <ClipboardCheck className="mx-auto h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="mt-1 text-2xl font-bold text-amber-950 dark:text-amber-200">{data.recentActivity.last7Days.inspectionsSubmitted}</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">Inspections Submitted</p>
          </div>
          <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-center">
            <Send className="mx-auto h-5 w-5 text-rose-600 dark:text-rose-400" />
            <p className="mt-1 text-2xl font-bold text-rose-950 dark:text-rose-200">{data.recentActivity.last7Days.approvalsSent}</p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400">Approvals Sent</p>
          </div>
        </div>
      </div>

      {/* ── Notification delivery ─────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Notification Delivery Rate"
          value={`${notifRate}%`}
          icon={CheckCircle2}
          tone={notifRate >= 90 ? "emerald" : notifRate >= 70 ? "amber" : "rose"}
          sub={`${data.counts.sentNotifications} sent of ${data.counts.notifications} total`}
        />
        <StatCard
          label="Approval Decisions"
          value={data.approvalCounts.total}
          icon={BarChart3}
          tone="slate"
          sub={`${data.approvalCounts.approved} approved · ${data.approvalCounts.declined} declined`}
        />
      </div>
    </div>
  );
}