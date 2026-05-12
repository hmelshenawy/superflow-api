"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, AlertTriangle, Lock } from "lucide-react";

const FEATURE_LABELS: Record<string, string> = {
  job_board: "Job Board",
  stages: "Stages",
  customer_approval: "Customer Approval",
  dvi_reports: "DVI Reports",
  estimates: "Estimates",
  ai_scored_jobs: "AI-Scored Jobs",
  customer_approval_sms: "Approval SMS",
  priority_engine: "Priority Engine",
  nba: "Next Best Actions",
  delivery_risk: "Delivery Risk",
  multi_shop: "Multi-Shop",
  advisor_workload: "Advisor Workload",
  ai_message_drafts: "AI Message Drafts",
  analytics: "Analytics",
  jobs: "Jobs",
  max_users: "Users",
  max_locations: "Locations",
};

interface UsageItem {
  featureKey: string;
  count: number;
  ceiling: number | null;
  isIncluded: boolean;
}

interface WorkshopUsage {
  workshopId: string;
  workshopName: string;
  planId: string;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  usage: UsageItem[];
}

function formatPlan(id: string) {
  if (id === "free_trial") return "Free Trial";
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function statusBadge(status: string | null) {
  if (!status) return <Badge variant="secondary">None</Badge>;
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    paid: "default",
    manual_active: "default",
    trialing: "outline",
    comped: "secondary",
    past_due: "destructive",
    cancelled: "destructive",
    replaced: "secondary",
  };
  return <Badge variant={map[status] ?? "secondary"}>{status.replace(/_/g, " ")}</Badge>;
}

function usageBar(count: number, ceiling: number | null) {
  if (ceiling === null) {
    return (
      <span className="text-muted-foreground">{count} / ∞</span>
    );
  }
  const pct = Math.min((count / ceiling) * 100, 100);
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {count} / {ceiling}
      </span>
      {pct >= 100 && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
    </div>
  );
}

export default function UsageOverviewPage() {
  const [data, setData] = useState<WorkshopUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await api.get("/billing/admin/usage-overview");
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load usage data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsage(); }, []);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Key metrics to show in the summary row (only ceiling-tracked features)
  const keyFeatures = ["jobs", "max_users", "max_locations", "dvi_reports", "ai_scored_jobs", "customer_approval_sms"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading usage data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-destructive gap-2">
        <AlertTriangle className="h-8 w-8" />
        <p>{error}</p>
        <Button variant="outline" onClick={fetchUsage}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor plan usage and ceilings across all workshops
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsage}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[240px]">Workshop</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>DVI Reports</TableHead>
              <TableHead>AI Jobs</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No workshops found
                </TableCell>
              </TableRow>
            )}
            {data.map((w) => {
              const usageMap = new Map(w.usage.map(u => [u.featureKey, u]));
              const getUsage = (key: string) => usageMap.get(key);
              const jobsUsage = getUsage("jobs");
              const usersUsage = getUsage("max_users");
              const dviUsage = getUsage("dvi_reports");
              const aiUsage = getUsage("ai_scored_jobs");
              const isExpanded = expanded.has(w.workshopId);

              return (
                <>
                  <TableRow
                    key={w.workshopId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(w.workshopId)}
                  >
                    <TableCell className="font-medium">{w.workshopName}</TableCell>
                    <TableCell>{formatPlan(w.planId)}</TableCell>
                    <TableCell>{statusBadge(w.subscriptionStatus)}</TableCell>
                    <TableCell>
                      {jobsUsage ? usageBar(jobsUsage.count, jobsUsage.ceiling) : "—"}
                    </TableCell>
                    <TableCell>
                      {usersUsage ? usageBar(usersUsage.count, usersUsage.ceiling) : "—"}
                    </TableCell>
                    <TableCell>
                      {dviUsage ? usageBar(dviUsage.count, dviUsage.ceiling) : "—"}
                    </TableCell>
                    <TableCell>
                      {aiUsage ? usageBar(aiUsage.count, aiUsage.ceiling) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {isExpanded ? "▲" : "▼"}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${w.workshopId}-detail`} className="bg-muted/30">
                      <TableCell colSpan={7} className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {w.usage.map(u => (
                            <div key={u.featureKey} className="flex flex-col gap-1 p-3 rounded-lg border bg-background">
                              <span className="text-xs text-muted-foreground">
                                {FEATURE_LABELS[u.featureKey] || u.featureKey}
                              </span>
                              {u.isIncluded ? usageBar(u.count, u.ceiling) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Lock className="h-3 w-3" /> Not included
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}