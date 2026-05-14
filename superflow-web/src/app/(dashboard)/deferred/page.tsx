"use client";

import { useEffect, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { DeferredWork, DeferredStatus, PaginatedResponse } from "@/types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<DeferredStatus, string> = {
  pending: "Pending",
  reminded: "Reminded",
  booked: "Booked",
  closed: "Closed",
  expired: "Expired",
};

const STATUS_VARIANTS: Record<DeferredStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  reminded: "secondary",
  booked: "default",
  closed: "secondary",
  expired: "destructive",
};

export default function DeferredWorkPage() {
  const [items, setItems] = useState<DeferredWork[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("AED");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Record<string, string> = {};
      if (status !== "all") params.status = status;
      const [res, defaultsRes] = await Promise.all([
        api.get<PaginatedResponse<DeferredWork>>("/deferred", { params }),
        api.get<{ currency: string }>("/estimates/defaults").catch(() => ({ data: { currency: "AED" } })),
      ]);
      setItems(res.data.data ?? res.data.items ?? []);
      setTotal(res.data.total);
      setCurrency(defaultsRes.data.currency || "AED");
    } catch (err: any) {
      const message = getApiError(err).message;
      setLoadError(Array.isArray(message) ? message.join(", ") : message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [status]);

  const sendReminder = async (id: string) => {
    setRemindingId(id);
    try {
      await api.post(`/deferred/${id}/remind`);
      toast.success("Reminder sent");
      fetchItems();
    } catch (err: any) {
      toast.error(getApiError(err).message);
    } finally {
      setRemindingId(null);
    }
  };

  const closeItem = async (id: string) => {
    if (!confirm("Close this deferred work item?")) return;
    setClosingId(id);
    try {
      await api.patch(`/deferred/${id}`, { status: "closed" });
      toast.success("Item closed");
      fetchItems();
    } catch (err: any) {
      toast.error(getApiError(err).message);
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deferred Work</h1>
          <p className="text-sm text-muted-foreground">{total} items</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchItems} aria-label="Refresh deferred items" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reminded">Reminded</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Could not load deferred work</p>
                <p className="mt-1">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading}>Retry</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Urgency</TableHead>
              <TableHead className="hidden sm:table-cell">Est. Value</TableHead>
              <TableHead className="hidden md:table-cell">Remind After</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {status === "all" ? "No deferred work items yet." : `No ${status} deferred work items.`}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.customer?.name || "—"}</TableCell>
                  <TableCell>
                    {item.vehicle
                      ? `${item.vehicle.year || ""} ${item.vehicle.make || ""} ${item.vehicle.model || ""}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[item.status ?? "pending"]}>
                      {STATUS_LABELS[item.status ?? "pending"]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.urgency === "critical" ? "destructive" : "secondary"}>
                      {item.urgency || "none"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.estimated_value ? `${currency} ${Number(item.estimated_value).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>
                    {item.remind_after
                      ? new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(item.remind_after))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {(item.status === "pending" || item.status === "reminded") && (
                        <Button size="sm" variant="outline" onClick={() => sendReminder(item.id)} disabled={remindingId === item.id || closingId === item.id}>
                          <Clock className="mr-1 h-3 w-3" /> {remindingId === item.id ? "Sending..." : "Remind"}
                        </Button>
                      )}
                      {item.status !== "closed" && (
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => closeItem(item.id)} disabled={closingId === item.id || remindingId === item.id}>
                          {closingId === item.id ? "Closing..." : "Close"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
