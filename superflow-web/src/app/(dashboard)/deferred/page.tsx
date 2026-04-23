"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
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
import { Clock, RefreshCw } from "lucide-react";
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

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status !== "all") params.status = status;
      const { data } = await api.get<PaginatedResponse<DeferredWork>>("/deferred", { params });
      setItems(data.data ?? data.items ?? []);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load deferred work");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [status]);

  const sendReminder = async (id: string) => {
    try {
      await api.post(`/deferred/${id}/remind`);
      toast.success("Reminder sent");
      fetchItems();
    } catch {
      toast.error("Failed to send reminder");
    }
  };

  const closeItem = async (id: string) => {
    try {
      await api.patch(`/deferred/${id}`, { status: "closed" });
      toast.success("Item closed");
      fetchItems();
    } catch {
      toast.error("Failed to close item");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deferred Work</h1>
          <p className="text-sm text-slate-500">{total} items</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchItems}>
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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Est. Value</TableHead>
              <TableHead>Remind After</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-400">
                  Loading…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-400">
                  No deferred work items
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
                    {item.estimated_value ? `AED ${Number(item.estimated_value).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>
                    {item.remind_after
                      ? new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(item.remind_after))
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {(item.status === "pending" || item.status === "reminded") && (
                        <Button size="sm" variant="outline" onClick={() => sendReminder(item.id)}>
                          <Clock className="mr-1 h-3 w-3" /> Remind
                        </Button>
                      )}
                      {item.status !== "closed" && (
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => closeItem(item.id)}>
                          Close
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