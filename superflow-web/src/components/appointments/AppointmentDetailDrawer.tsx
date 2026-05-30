"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api, { getApiError } from "@/lib/api";
import type { Appointment, AppointmentStatus } from "@/types/appointments";
import { formatDateLong, formatDuration, formatTimeRange } from "@/utils/appointments";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { Loader2, X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  appointmentId: string | null;
  timezone?: string;
  onClose: () => void;
  onUpdated: (appointment: Appointment) => void;
  onDeleted: (appointmentId: string) => void;
}

const nextStatuses: AppointmentStatus[] = ["waiting", "in_progress", "on_hold", "done", "cancelled"];

function normalizeAppointment(item: Appointment): Appointment {
  return { ...item, staff: item.staff || item.staff_members, job_type: item.job_type || item.job_types, customer: item.customer || item.customers };
}

export function AppointmentDetailDrawer({ isOpen, appointmentId, timezone, onClose, onUpdated, onDeleted }: DrawerProps) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<AppointmentStatus | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [edit, setEdit] = useState({ title: "", duration_min: 60, notes: "" });

  useEffect(() => {
    if (!isOpen || !appointmentId) return;
    setLoading(true);
    setError(null);
    api.get<Appointment>(`/appointments/${appointmentId}`)
      .then(({ data }) => {
        const item = normalizeAppointment(data);
        setAppointment(item);
        setEdit({ title: item.title, duration_min: item.duration_min, notes: item.notes || "" });
      })
      .catch((err) => setError(getApiError(err).message))
      .finally(() => setLoading(false));
  }, [appointmentId, isOpen]);

  if (!isOpen) return null;

  const changeStatus = async (status: AppointmentStatus) => {
    if (!appointment) return;
    const previous = appointment;
    const optimistic = { ...appointment, status };
    setAppointment(optimistic);
    setSavingStatus(status);
    try {
      const { data } = await api.patch<Appointment>(`/appointments/${appointment.id}/status`, { status });
      const updated = normalizeAppointment(data);
      setAppointment(updated);
      onUpdated(updated);
    } catch (err) {
      setAppointment(previous);
      setError(getApiError(err).message);
    } finally {
      setSavingStatus(null);
    }
  };

  const saveEdit = async () => {
    if (!appointment) return;
    setError(null);
    try {
      const { data } = await api.patch<Appointment>(`/appointments/${appointment.id}`, edit);
      const updated = normalizeAppointment(data);
      setAppointment(updated);
      onUpdated(updated);
      setEditMode(false);
    } catch (err) {
      setError(getApiError(err).message);
    }
  };

  const deleteAppointment = async () => {
    if (!appointment) return;
    setError(null);
    try {
      await api.delete(`/appointments/${appointment.id}`);
      onDeleted(appointment.id);
      onClose();
    } catch (err) {
      setError(getApiError(err).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/20" aria-label="Close drawer" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-foreground">{appointment?.title || "Appointment"}</h2>
            {appointment && <div className="mt-2"><AppointmentStatusBadge status={appointment.status} size="md" /></div>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : null}
          {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {appointment && !loading ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.filter((status) => status !== appointment.status).map((status) => (
                    <Button key={status} variant="outline" size="sm" onClick={() => changeStatus(status)} disabled={!!savingStatus}>
                      {savingStatus === status && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {status.replace(/_/g, " ")}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Details</h3>
                <Button variant="outline" size="sm" onClick={() => setEditMode((v) => !v)}>{editMode ? "Cancel" : "Edit"}</Button>
              </div>

              {editMode ? (
                <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="grid gap-2"><Label>Title</Label><Input value={edit.title} onChange={(e) => setEdit((prev) => ({ ...prev, title: e.target.value }))} /></div>
                  <div className="grid gap-2"><Label>Duration</Label><Input type="number" min={15} step={15} value={edit.duration_min} onChange={(e) => setEdit((prev) => ({ ...prev, duration_min: Number(e.target.value) }))} /></div>
                  <div className="grid gap-2"><Label>Notes</Label><Textarea rows={4} value={edit.notes} onChange={(e) => setEdit((prev) => ({ ...prev, notes: e.target.value }))} /></div>
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button><Button onClick={saveEdit}>Save</Button></div>
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  <Detail label="Staff" value={`${appointment.staff?.name || "—"}${appointment.staff?.role ? ` · ${appointment.staff.role}` : ""}`} />
                  <Detail label="Date" value={formatDateLong(appointment.start_time, timezone)} />
                  <Detail label="Time" value={formatTimeRange(appointment.start_time, appointment.duration_min, timezone)} />
                  <Detail label="Duration" value={formatDuration(appointment.duration_min)} />
                  <Detail label="Job type" value={appointment.job_type?.name || "—"} dot={appointment.job_type?.color_hex} />
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Customer</dt><dd className="text-right font-medium">{appointment.customer ? <Link className="text-blue-600 hover:underline" href={`/crm/customers/${appointment.customer.id}`}>{appointment.customer.name}</Link> : "—"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Work order</dt><dd className="text-right font-medium">{appointment.work_order_id ? <Link className="text-blue-600 hover:underline" href={`/work-orders/${appointment.work_order_id}`}>{appointment.work_order?.work_order_number || appointment.work_order?.number || appointment.work_order_id}</Link> : "—"}</dd></div>
                  <div><dt className="mb-1 text-muted-foreground">Notes</dt><dd className="rounded-lg bg-muted/50 p-3 text-foreground">{appointment.notes || "No notes"}</dd></div>
                </dl>
              )}
            </div>
          ) : null}
        </div>
        {appointment && ["scheduled", "cancelled"].includes(appointment.status) ? (
          <div className="border-t border-border p-5">
            {confirmDelete ? <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><p>Are you sure? This cannot be undone.</p><div className="flex gap-2"><Button variant="destructive" size="sm" onClick={deleteAppointment}>Delete</Button><Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button></div></div> : <Button variant="outline" className="w-full text-red-600" onClick={() => setConfirmDelete(true)}>Delete appointment</Button>}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Detail({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className={cn("text-right font-medium", dot && "inline-flex items-center gap-2")} style={{ color: undefined }}>{dot && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dot }} />}{value}</dd></div>;
}
