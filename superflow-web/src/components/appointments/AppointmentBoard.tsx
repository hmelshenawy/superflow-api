"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api, { getApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Appointment, SlotInfo, StaffMember } from "@/types/appointments";
import { addDays, appointmentLocalTime, displaySlotTime, formatDateShort, timeToMinutes, toDateString } from "@/utils/appointments";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentDetailDrawer } from "./AppointmentDetailDrawer";
import { BookingModal } from "./BookingModal";
import { APPOINTMENT_STATUS_META } from "./AppointmentStatusBadge";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";

const advisorColWidth = 128;
const slotWidth = 76;

function normalizeAppointment(item: Appointment): Appointment {
  return { ...item, staff: item.staff || item.staff_members, job_type: item.job_type || item.job_types, customer: item.customer || item.customers };
}

export function AppointmentBoard() {
  const { workshops, currentWorkshopId } = useAuthStore();
  const currentWorkshop = workshops.find((item) => item.id === currentWorkshopId) ?? (workshops.length === 1 ? workshops[0] : null);
  const timezone = currentWorkshop?.timezone || "Asia/Dubai";
  const [date, setDate] = useState(() => new Date());
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingPrefill, setBookingPrefill] = useState<{ staff_id?: string; date?: string; start_time?: string } | undefined>();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const dateString = toDateString(date, timezone);
  const todayString = toDateString(new Date(), timezone);
  const maxDateString = toDateString(addDays(new Date(), 14), timezone);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [slotsRes, staffRes, appointmentsRes] = await Promise.all([
        api.get<SlotInfo[]>("/schedule/slots", { params: { date: dateString } }),
        api.get<StaffMember[]>("/staff", { params: { is_active: true } }),
        api.get<Appointment[]>("/appointments", { params: { date: dateString } }),
      ]);
      setSlots(slotsRes.data || []);
      setStaff(staffRes.data || []);
      setAppointments((appointmentsRes.data || []).map(normalizeAppointment));
    } catch (err) {
      const message = getApiError(err).message;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dateString]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const appointmentsByStaff = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      const list = map.get(appointment.staff_id) || [];
      list.push(appointment);
      map.set(appointment.staff_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return map;
  }, [appointments]);

  const slotDuration = useMemo(() => {
    if (slots.length > 1) return Math.max(1, timeToMinutes(slots[1].time) - timeToMinutes(slots[0].time));
    return 30;
  }, [slots]);

  const currentSlotIndex = useMemo(() => {
    if (dateString !== todayString) return -1;
    const nowTime = appointmentLocalTime(new Date().toISOString(), timezone);
    const minutes = timeToMinutes(nowTime);
    return slots.findIndex((slot, index) => {
      const start = timeToMinutes(slot.time);
      const end = index + 1 < slots.length ? timeToMinutes(slots[index + 1].time) : start + slotDuration;
      return minutes >= start && minutes < end;
    });
  }, [dateString, slotDuration, slots, timezone, todayString]);

  const openBooking = (staffId: string, time: string) => {
    setBookingPrefill({ staff_id: staffId, date: dateString, start_time: time.slice(0, 5) });
    setBookingOpen(true);
  };

  const prevDisabled = dateString <= todayString;
  const nextDisabled = dateString >= maxDateString;

  const tableMinWidth = advisorColWidth + slots.length * slotWidth;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={prevDisabled} onClick={() => setDate((d) => addDays(d, -1))}><ChevronLeft className="h-4 w-4" /> Prev</Button>
          <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>Today</Button>
          <Button variant="outline" size="sm" disabled={nextDisabled} onClick={() => setDate((d) => addDays(d, 1))}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="text-base font-semibold text-foreground">{formatDateShort(date, timezone)}</div>
        <Button variant="ghost" size="sm" onClick={fetchBoard} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh</Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="border-collapse text-sm" style={{ minWidth: tableMinWidth || "100%" }}>
          <thead className="sticky top-0 z-20 bg-card shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 h-11 border-b border-r border-border bg-card px-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: advisorColWidth }}>Advisor</th>
              {slots.map((slot, index) => (
                <th key={slot.time} className={cn("h-11 border-b border-r border-border px-2 text-center text-xs font-semibold text-muted-foreground", currentSlotIndex === index && "border-b-2 border-blue-500 bg-blue-50 text-blue-700")} style={{ width: slotWidth }}>{displaySlotTime(slot.time)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, row) => <tr key={row}><td className="sticky left-0 z-10 h-[52px] border-b border-r border-border bg-card p-3"><Skeleton className="h-4 w-24" /><Skeleton className="mt-2 h-3 w-16" /></td>{Array.from({ length: Math.max(slots.length, 8) }).map((__, col) => <td key={col} className="h-[52px] border-b border-r border-border p-1"><Skeleton className="h-8 w-full" /></td>)}</tr>) : null}
            {!loading && staff.length === 0 ? <tr><td colSpan={Math.max(1, slots.length + 1)} className="py-16 text-center text-sm text-muted-foreground">No staff added yet. Go to <Link className="font-medium text-blue-600 hover:underline" href="/settings/schedule">Settings → Staff</Link> to add advisors.</td></tr> : null}
            {!loading && staff.map((member) => <StaffRow key={member.id} member={member} slots={slots} appointments={appointmentsByStaff.get(member.id) || []} slotDuration={slotDuration} timezone={timezone} onEmptyClick={openBooking} onAppointmentClick={setSelectedAppointmentId} />)}
          </tbody>
        </table>
      </div>

      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} prefill={bookingPrefill} onSuccess={(created) => { setAppointments((prev) => [...prev, normalizeAppointment(created)]); fetchBoard(); }} />
      <AppointmentDetailDrawer isOpen={!!selectedAppointmentId} appointmentId={selectedAppointmentId} timezone={timezone} onClose={() => setSelectedAppointmentId(null)} onUpdated={(updated) => setAppointments((prev) => prev.map((item) => item.id === updated.id ? normalizeAppointment(updated) : item))} onDeleted={(id) => setAppointments((prev) => prev.filter((item) => item.id !== id))} />
    </div>
  );
}

function StaffRow({ member, slots, appointments, slotDuration, timezone, onEmptyClick, onAppointmentClick }: { member: StaffMember; slots: SlotInfo[]; appointments: Appointment[]; slotDuration: number; timezone: string; onEmptyClick: (staffId: string, time: string) => void; onAppointmentClick: (id: string) => void }) {
  const cells: React.ReactNode[] = [];
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    const appointment = appointments.find((item) => appointmentLocalTime(item.start_time, timezone) === slot.time.slice(0, 5));
    if (appointment) {
      const span = Math.max(1, Math.round(appointment.duration_min / slotDuration));
      const meta = APPOINTMENT_STATUS_META[appointment.status] || APPOINTMENT_STATUS_META.scheduled;
      const narrow = span === 1 && slotWidth < 80;
      cells.push(<td key={`${slot.time}-${appointment.id}`} colSpan={span} className="relative h-[52px] border-b border-r border-border p-0"><button title={`${appointment.title} · ${appointment.customer?.name || "No customer"}`} onClick={() => onAppointmentClick(appointment.id)} className={cn("absolute inset-[3px] overflow-hidden rounded-md border px-2 py-1 text-left transition hover:shadow-sm", appointment.status === "cancelled" && "opacity-60")} style={{ backgroundColor: meta.bg, color: meta.text, borderColor: meta.border }}>{narrow ? <span className="block h-full w-1 rounded bg-current" /> : <><span className="block truncate text-xs font-bold">{appointment.job_type?.name || appointment.title}</span><span className="block truncate text-[11px] opacity-75">{appointment.customer?.name || "No customer"}</span></>}</button></td>);
      index += span - 1;
    } else {
      cells.push(<td key={slot.time} className={cn("h-[52px] border-b border-r border-border p-1", !slot.is_available && "cursor-not-allowed")} style={!slot.is_available ? { background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)" } : undefined}>{slot.is_available ? <button className="h-full w-full rounded-md border border-dashed border-transparent hover:border-blue-300 hover:bg-blue-50/60" onClick={() => onEmptyClick(member.id, slot.time)} aria-label={`Book ${member.name} at ${slot.time}`} /> : <span title={slot.blocked_reason} className="block h-full w-full" />}</td>);
    }
  }
  return <tr><td className="sticky left-0 z-10 h-[52px] border-b border-r border-border bg-card px-3"><div className="truncate text-sm font-bold text-foreground">{member.name}</div><div className="text-xs capitalize text-muted-foreground">{member.role}</div></td>{cells}</tr>;
}
