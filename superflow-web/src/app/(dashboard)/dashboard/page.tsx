"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { PRODUCT_LABELS, getWorkshopProductMode } from "@/lib/product-modes";
import { AlertTriangle, BarChart3, CalendarDays, Clock3, Gauge, Package, Receipt, Target, Wrench, Zap } from "lucide-react";

type DashboardStats = {
  totals?: { jobs?: number; customers?: number; vehicles?: number; estimateLines?: number };
  jobs?: { open?: number; in_progress?: number; completed?: number; by_status?: Array<{ status: string; _count: number }> };
  deferred?: { pending?: number };
};

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: typeof Gauge; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function roleView(roleName?: string | null) {
  if (roleName === "service_advisor") return "Advisor view";
  if (roleName === "general_manager" || roleName === "admin" || roleName === "workshop_admin") return "Management view";
  if (roleName === "workshop_manager" || roleName === "manager" || roleName === "workshop_teamleader") return "Workshop manager view";
  return "Team view";
}

export default function ProductDashboardPage() {
  const { user, workshops, currentWorkshopId } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const currentWorkshop = workshops.find((item) => item.id === currentWorkshopId) ?? (workshops.length === 1 ? workshops[0] : null);
  const mode = getWorkshopProductMode(currentWorkshop);

  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => setStats(null));
  }, []);

  const statusCount = useMemo(() => {
    const rows = stats?.jobs?.by_status || [];
    return Object.fromEntries(rows.map((row: any) => [row.status, row._count || row.count || 0])) as Record<string, number>;
  }, [stats]);

  const productName = currentWorkshop?.packageName || currentWorkshop?.package_name || PRODUCT_LABELS[mode];

  if (mode === "CONNECT") {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-blue-600">{productName} · {roleView(user?.role?.name)}</p>
          <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">DMS-connected operational intelligence, WIP visibility, bottlenecks, and next best actions.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Live WIP" value={(stats?.totals?.jobs ?? 0) - (statusCount.closed ?? 0)} icon={Gauge} hint="Open repair orders and active jobs" />
          <StatCard label="Workshop loading" value="78%" icon={Wrench} hint="Mock capacity signal until bay data syncs" />
          <StatCard label="Capacity vs demand" value="+6 hrs" icon={BarChart3} hint="Projected demand over available capacity" />
          <StatCard label="Aged jobs" value={(statusCount.waiting_parts ?? 0) + (stats?.deferred?.pending ?? 0)} icon={Clock3} hint="Waiting parts, approvals, or no recent movement" />
          <StatCard label="Delayed jobs" value={statusCount.waiting_parts ?? 0} icon={AlertTriangle} hint="Jobs currently blocked by parts or status delay" />
          <StatCard label="Idle vehicles/jobs" value={stats?.deferred?.pending ?? 0} icon={Zap} hint="Needs follow-up or next best action" />
          <StatCard label="Priority jobs" value={statusCount.estimate_sent ?? 0} icon={Target} hint="Awaiting approval or advisor action" />
          <StatCard label="Branch comparison" value="1 branch" icon={BarChart3} hint="Multi-branch comparison appears when locations sync" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">{productName} · {roleView(user?.role?.name)}</p>
        <h1 className="text-2xl font-bold text-foreground">Workshop Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Standalone workshop operations from booking through handover and invoicing.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's appointments" value={statusCount.booked ?? stats?.jobs?.open ?? 0} icon={CalendarDays} hint="Booked jobs due to arrive" />
        <StatCard label="Open job cards" value={(stats?.totals?.jobs ?? 0) - (statusCount.closed ?? 0)} icon={Gauge} hint="Active workshop workload" />
        <StatCard label="Technician load" value={`${statusCount.in_progress ?? stats?.jobs?.in_progress ?? 0} active`} icon={Wrench} hint="Jobs currently in progress" />
        <StatCard label="Pending estimates" value={statusCount.estimate_sent ?? stats?.totals?.estimateLines ?? 0} icon={Target} hint="Awaiting customer decision" />
        <StatCard label="Low stock alerts" value="0" icon={Package} hint="Shown when parts fall below minimum stock" />
        <StatCard label="Invoices summary" value={statusCount.closed ?? stats?.jobs?.completed ?? 0} icon={Receipt} hint="Closed jobs ready for billing review" />
        <StatCard label="Turnaround time" value="2.4 days" icon={Clock3} hint="Operational KPI placeholder until SLA history fills" />
        <StatCard label="Bay utilization" value="72%" icon={BarChart3} hint="Workshop utilization estimate" />
      </div>
    </div>
  );
}
