"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import api, { getApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import type { PaginatedResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";

interface AuditUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface AuditWorkshop {
  id: string;
  name: string | null;
  slug: string | null;
}

interface AuditLog {
  id: string;
  user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action: string | null;
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  workshop_id: string | null;
  created_at: string | null;
  users?: AuditUser | null;
  workshops?: AuditWorkshop | null;
}

const PAGE_SIZE = 25;

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSummary(log: AuditLog) {
  const details = log.new_values as any;
  const path = details?.path ? String(details.path) : "";
  const status = details?.status ? String(details.status) : "";
  if (path && status) return `${status} ${path}`;
  if (path) return path;
  return log.entity_id || "-";
}

function getActionTone(action?: string | null): "default" | "secondary" | "destructive" | "outline" {
  const normalized = action?.toUpperCase();
  if (normalized === "DELETE") return "destructive";
  if (normalized === "POST") return "default";
  if (normalized === "PATCH" || normalized === "PUT") return "secondary";
  return "outline";
}

function JsonBlock({ value }: { value: unknown }) {
  if (value == null) return <span className="text-muted-foreground">No details</span>;
  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AuditPage() {
  const { user } = useAuthStore();
  const isPlatformAdmin = user?.role?.name === "platform_admin";
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const emptyFilters = {
    action: "",
    entityType: "",
    userId: "",
    entityId: "",
    workshopId: "",
    dateFrom: "",
    dateTo: "",
  };
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeParams = useMemo(() => {
    const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
    for (const [key, value] of Object.entries(appliedFilters)) {
      if (value.trim()) params[key] = value.trim();
    }
    return params;
  }, [appliedFilters, page]);

  const hasActiveFilters = useMemo(
    () => Object.values(appliedFilters).some((value) => value.trim().length > 0),
    [appliedFilters],
  );

  const fetchAuditLogs = useCallback(async () => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get<PaginatedResponse<AuditLog>>("/audit-logs", { params: activeParams });
      setItems(data.items ?? data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err: any) {
      const message = getApiError(err).message;
      setLoadError(Array.isArray(message) ? message.join(", ") : message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activeParams, isPlatformAdmin]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
    setExpandedId(null);
    setLoadError(null);
  };

  if (!isPlatformAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h1 className="text-base font-semibold">Platform admin only</h1>
              <p className="mt-1 text-sm">Audit logs are restricted to platform administrators.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Platform-wide record of sensitive actions across workshops.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Action, e.g. POST" value={filters.action} onChange={(e) => updateFilter("action", e.target.value)} />
          <Input placeholder="Entity type, e.g. jobs" value={filters.entityType} onChange={(e) => updateFilter("entityType", e.target.value)} />
          <Input placeholder="User ID" value={filters.userId} onChange={(e) => updateFilter("userId", e.target.value)} />
          <Input placeholder="Workshop ID" value={filters.workshopId} onChange={(e) => updateFilter("workshopId", e.target.value)} />
          <Input placeholder="Entity ID" value={filters.entityId} onChange={(e) => updateFilter("entityId", e.target.value)} />
          <Input type="datetime-local" value={filters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} aria-label="Date from" />
          <Input type="datetime-local" value={filters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} aria-label="Date to" />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => { setAppliedFilters(filters); setPage(1); }} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Searching..." : "Search"}
            </Button>
            <Button variant="outline" size="icon" onClick={clearFilters} aria-label="Clear filters" disabled={loading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load audit logs</p>
                <p className="mt-1">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loading}>Retry</Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Workshop</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead className="hidden lg:table-cell">IP</TableHead>
              <TableHead className="hidden xl:table-cell">Summary</TableHead>
              <TableHead className="w-12 text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">Loading audit logs...</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                  {hasActiveFilters ? "No audit events match these filters." : "No audit events found yet."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((log) => {
                const expanded = expandedId === log.id;
                return (
                  <Fragment key={log.id}>
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                      <TableCell>
                        <div className="max-w-44 truncate font-medium">{log.users?.name || log.users?.email || "System"}</div>
                        <div className="max-w-44 truncate text-xs text-muted-foreground">{log.user_id || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-40 truncate">{log.workshops?.name || "Global"}</div>
                        <div className="max-w-40 truncate text-xs text-muted-foreground">{log.workshop_id || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionTone(log.action)}>{log.action || "-"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.entity_type || "-"}</div>
                        <div className="max-w-44 truncate text-xs text-muted-foreground">{log.entity_id || "-"}</div>
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">{log.ip_address || "-"}</TableCell>
                      <TableCell className="hidden max-w-72 truncate text-xs text-muted-foreground xl:table-cell">{getSummary(log)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setExpandedId(expanded ? null : log.id)} aria-label="Toggle audit details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow key={`${log.id}-details`}>
                        <TableCell colSpan={8} className="bg-muted/40 p-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Request / Response</p>
                              <JsonBlock value={log.new_values} />
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Previous Values</p>
                              <JsonBlock value={log.old_values} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} event{total === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span>Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
