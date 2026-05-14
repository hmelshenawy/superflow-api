"use client";

import { useEffect, useState } from "react";
import api, { getApiError } from "@/lib/api";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Wrench,
  UserX,
  Clock,
  HelpCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  parts: "Parts",
  customer_approval: "Customer Approval",
  workshop_approval: "Workshop Approval",
  technician_unavailable: "Technician Unavailable",
  customer_decision: "Customer Decision",
  other: "Other",
};

const TYPE_ICONS: Record<string, typeof Wrench> = {
  parts: Wrench,
  customer_approval: ShieldAlert,
  workshop_approval: ShieldAlert,
  technician_unavailable: UserX,
  customer_decision: ShieldAlert,
  other: HelpCircle,
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-500",
  medium: "bg-amber-500/10 text-amber-500",
  high: "bg-orange-500/10 text-orange-500",
  critical: "bg-red-500/10 text-red-500",
};

interface Blocker {
  id: string;
  job_id: string;
  type: string;
  description: string;
  severity: string;
  status: string;
  blocked_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  workshop_id: string | null;
  job?: { id: string; job_number: string; status: string; customer_concern: string };
  blocked_by_user?: { id: string; name: string } | null;
  resolved_by_user?: { id: string; name: string } | null;
}

interface Summary {
  totalBlocked: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}

export default function BlockersPage() {
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create blocker dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newJobId, setNewJobId] = useState("");
  const [newType, setNewType] = useState("parts");
  const [newSeverity, setNewSeverity] = useState("medium");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Resolve dialog
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterSeverity) params.set("severity", filterSeverity);
      const [{ data: blockersData }, { data: summaryData }] = await Promise.all([
        api.get(`/blockers?${params.toString()}`),
        api.get("/blockers/summary"),
      ]);
      setBlockers(blockersData?.items || blockersData?.data || []);
      setSummary(summaryData);
    } catch (err: any) {
      setError(getApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus, filterSeverity]);

  const handleCreate = async () => {
    if (!newJobId.trim() || !newDescription.trim()) return;
    setCreating(true);
    try {
      await api.post("/blockers", {
        job_id: newJobId.trim(),
        type: newType,
        severity: newSeverity,
        description: newDescription.trim(),
      });
      setCreateOpen(false);
      setNewJobId("");
      setNewType("parts");
      setNewSeverity("medium");
      setNewDescription("");
      fetchData();
    } catch (err: any) {
      setError(getApiError(err).message);
    } finally {
      setCreating(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveId) return;
    setResolving(true);
    try {
      await api.patch(`/blockers/${resolveId}/resolve`, {
        resolution_note: resolveNote || undefined,
      });
      setResolveId(null);
      setResolveNote("");
      fetchData();
    } catch (err: any) {
      setError(getApiError(err).message);
    } finally {
      setResolving(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.delete(`/blockers/${id}`);
      fetchData();
    } catch (err: any) {
      setError(getApiError(err).message);
    }
  };

  const statusIcon = (status: string) => {
    if (status === "resolved") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === "dismissed") return <XCircle className="h-4 w-4 text-slate-400" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  if (loading && !blockers.length) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> Loading blockers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blockers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and resolve issues blocking job progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger>
              <Button size="sm">Add Blocker</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Blocker</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Job ID or Number</label>
                  <Input
                    placeholder="Enter job ID"
                    value={newJobId}
                    onChange={(e) => setNewJobId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={newType} onValueChange={(v) => v && setNewType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <Select value={newSeverity} onValueChange={(v) => v && setNewSeverity(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="What's blocking this job?"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? "Creating..." : "Create Blocker"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Active Blockers</p>
            <p className="text-2xl font-bold">{summary.totalBlocked}</p>
          </div>
          {Object.entries(summary.bySeverity).map(([sev, count]) => (
            <div key={sev} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground capitalize">{sev}</p>
              <p className={`text-2xl font-bold ${sev === "critical" ? "text-red-500" : sev === "high" ? "text-orange-500" : sev === "medium" ? "text-amber-500" : "text-blue-500"}`}>
                {count}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "")}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={(v) => setFilterSeverity(v ?? "")}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Blockers table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Job</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Blocked By</TableHead>
              <TableHead>Since</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {blockers.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No blockers found
                </TableCell>
              </TableRow>
            )}
            {blockers.map((b) => {
              const isExpanded = expandedId === b.id;
              const TypeIcon = TYPE_ICONS[b.type] || HelpCircle;
              return (
                <>
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                  >
                    <TableCell>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium">
                      {b.job?.job_number || b.job_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{TYPE_LABELS[b.type] || b.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${SEVERITY_COLORS[b.severity] || "bg-slate-500/10 text-slate-500"}`}>
                        {b.severity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {statusIcon(b.status)}
                        <span className="text-sm capitalize">{b.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {b.description}
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.blocked_by_user?.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {b.status === "active" && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setResolveId(b.id); setResolveNote(""); }}
                          >
                            Resolve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => handleDismiss(b.id)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${b.id}-detail`} className="bg-muted/30">
                      <TableCell colSpan={9} className="p-4">
                        <div className="space-y-2">
                          <p className="text-sm">{b.description}</p>
                          {b.resolved_at && (
                            <p className="text-xs text-muted-foreground">
                              Resolved by {b.resolved_by_user?.name || "Unknown"} on{" "}
                              {new Date(b.resolved_at).toLocaleString()}
                              {b.resolution_note && ` — "${b.resolution_note}"`}
                            </p>
                          )}
                          {b.job && (
                            <p className="text-xs text-muted-foreground">
                              Job: {b.job.job_number} — Status: {b.job.status}
                              {b.job.customer_concern && ` — ${b.job.customer_concern}`}
                            </p>
                          )}
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

      {/* Resolve dialog */}
      <Dialog open={!!resolveId} onOpenChange={(open) => { if (!open) setResolveId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Blocker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Resolution Note (optional)</label>
              <Textarea
                placeholder="How was this blocker resolved?"
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={handleResolve} disabled={resolving} className="w-full">
              {resolving ? "Resolving..." : "Resolve Blocker"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}