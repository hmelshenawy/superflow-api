"use client";

import { useCallback, useEffect, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { AssignableUser, Holiday, ScheduleBreak, ScheduleConfig, ScheduleResponse, StaffLeave, StaffMember, StaffRole } from "@/types/appointments";
import { formatDateLong, formatTime, toDateString } from "@/utils/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayChips = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function normTime(value: string) { return value?.slice(0, 5) || "08:00"; }
function dateOnly(value: string | Date) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value?.slice(0, 10) || value;
}
function formatBreakTime(time: string) {
  const [h, m] = (time || "00:00").slice(0, 5).split(":").map(Number);
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function ScheduleSettingsPage() {
  const [schedule, setSchedule] = useState<ScheduleResponse>({ days: [], breaks: [], holidays: [] });
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [dayDrafts, setDayDrafts] = useState<Record<number, Partial<ScheduleConfig>>>({});
  const [breakDraft, setBreakDraft] = useState<Record<number, { start_time: string; end_time: string; label: string } | undefined>>({});
  const [holidayDraft, setHolidayDraft] = useState({ date: "", label: "", is_full_day: true });
  const [staffDraft, setStaffDraft] = useState<{ user_id: string; name: string; role: StaffRole; working_days: number[]; max_concurrent_jobs: number }>({ user_id: "", name: "", role: "advisor", working_days: [1,2,3,4,5], max_concurrent_jobs: 1 });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [expandedLeaves, setExpandedLeaves] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<Record<string, StaffLeave[]>>({});
  const [leaveDraft, setLeaveDraft] = useState({ start_date: "", end_date: "", reason: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduleRes, staffRes, usersRes] = await Promise.all([
        api.get<ScheduleResponse>("/schedule"),
        api.get<StaffMember[]>("/staff"),
        api.get<AssignableUser[]>("/users/assignable").catch(() => ({ data: [] as AssignableUser[] })),
      ]);
      setSchedule(scheduleRes.data);
      setStaff(staffRes.data || []);
      setAssignableUsers(usersRes.data || []);
      const drafts: Record<number, Partial<ScheduleConfig>> = {};
      for (const day of scheduleRes.data.days || []) drafts[day.day_of_week] = { ...day, open_time: normTime(day.open_time), close_time: normTime(day.close_time) };
      setDayDrafts(drafts);
    } catch (err) {
      toast.error(getApiError(err).message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveDay = async (day: number) => {
    setSavingKey(`day-${day}`);
    try { await api.put(`/schedule/days/${day}`, dayDrafts[day]); toast.success("Working hours saved"); await load(); }
    catch (err) { toast.error(getApiError(err).message); }
    finally { setSavingKey(null); }
  };
  const addBreak = async (day: number) => {
    const draft = breakDraft[day]; if (!draft) return;
    try { await api.post("/schedule/breaks", { day_of_week: day, ...draft }); setBreakDraft((p) => ({ ...p, [day]: undefined })); await load(); }
    catch (err) { toast.error(getApiError(err).message); }
  };
  const deleteBreak = async (id: string) => { await api.delete(`/schedule/breaks/${id}`).then(load).catch((err) => toast.error(getApiError(err).message)); };
  const addHoliday = async () => { await api.post("/schedule/holidays", holidayDraft).then(() => { setHolidayDraft({ date: "", label: "", is_full_day: true }); return load(); }).catch((err) => toast.error(getApiError(err).message)); };
  const deleteHoliday = async (id: string) => { await api.delete(`/schedule/holidays/${id}`).then(load).catch((err) => toast.error(getApiError(err).message)); };
  const saveStaff = async (payload: Partial<StaffMember> & { user_id?: string | null; name?: string; role?: StaffRole; working_days?: number[]; max_concurrent_jobs?: number }) => {
    const body = {
      user_id: payload.user_id || undefined,
      name: payload.name || undefined,
      role: payload.role,
      working_days: payload.working_days,
      max_concurrent_jobs: payload.max_concurrent_jobs,
      is_active: payload.is_active,
    };
    try { editingStaffId ? await api.patch(`/staff/${editingStaffId}`, body) : await api.post("/staff", body); setEditingStaffId(null); setStaffDraft({ user_id: "", name: "", role: "advisor", working_days: [1,2,3,4,5], max_concurrent_jobs: 1 }); await load(); }
    catch (err) { toast.error(getApiError(err).message); }
  };
  const loadLeaves = async (staffId: string) => { setExpandedLeaves(expandedLeaves === staffId ? null : staffId); if (!leaves[staffId]) api.get<StaffLeave[]>(`/staff/${staffId}/leaves`).then(({ data }) => setLeaves((p) => ({ ...p, [staffId]: data || [] }))).catch((err) => toast.error(getApiError(err).message)); };
  const addLeave = async (staffId: string) => { await api.post(`/staff/${staffId}/leaves`, leaveDraft).then(async () => { setLeaveDraft({ start_date: "", end_date: "", reason: "" }); const { data } = await api.get<StaffLeave[]>(`/staff/${staffId}/leaves`); setLeaves((p) => ({ ...p, [staffId]: data || [] })); }).catch((err) => toast.error(getApiError(err).message)); };
  const deleteLeave = async (staffId: string, leaveId: string) => { await api.delete(`/staff/${staffId}/leaves/${leaveId}`).then(() => setLeaves((p) => ({ ...p, [staffId]: (p[staffId] || []).filter((l) => l.id !== leaveId) }))).catch((err) => toast.error(getApiError(err).message)); };

  if (loading) return <div className="space-y-6 p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;

  const today = toDateString(new Date());
  return <div className="space-y-8 p-4 md:p-6"><div><h1 className="text-2xl font-bold">Schedule settings</h1><p className="text-sm text-muted-foreground">Working hours, closures, staff, and leaves.</p></div>
    <section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 text-lg font-semibold">Working hours</h2><div className="space-y-4">{dayNames.map((name, day) => { const draft = dayDrafts[day] || { day_of_week: day, is_open: true, open_time: "08:00", close_time: "17:00", slot_duration_min: 30 }; const breaks = schedule.breaks.filter((b) => b.day_of_week === day); return <div key={day} className="rounded-xl border border-border p-4"><div className="grid gap-3 lg:grid-cols-[120px_90px_1fr_1fr_130px_90px] lg:items-center"><strong>{name}</strong><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_open !== false} onChange={(e) => setDayDrafts((p) => ({ ...p, [day]: { ...draft, is_open: e.target.checked } }))} /> Open</label><Input type="time" step="1800" disabled={draft.is_open === false} value={normTime(String(draft.open_time))} onChange={(e) => setDayDrafts((p) => ({ ...p, [day]: { ...draft, open_time: e.target.value } }))} /><Input type="time" step="1800" disabled={draft.is_open === false} value={normTime(String(draft.close_time))} onChange={(e) => setDayDrafts((p) => ({ ...p, [day]: { ...draft, close_time: e.target.value } }))} /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={draft.slot_duration_min || 30} onChange={(e) => setDayDrafts((p) => ({ ...p, [day]: { ...draft, slot_duration_min: Number(e.target.value) } }))}><option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>60 min</option></select><Button size="sm" onClick={() => saveDay(day)} disabled={savingKey === `day-${day}`}>{savingKey === `day-${day}` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button></div>{draft.is_open !== false && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">{breaks.map((b) => <span key={b.id} className="rounded-full bg-muted px-3 py-1">{formatBreakTime(b.start_time)} – {formatBreakTime(b.end_time)} {b.label || "Break"} <button onClick={() => deleteBreak(b.id)} className="ml-1 text-red-600">×</button></span>)}{breakDraft[day] ? <span className="flex flex-wrap items-center gap-2"><Input className="h-8 w-28" type="time" value={breakDraft[day]?.start_time || ""} onChange={(e) => setBreakDraft((p) => ({ ...p, [day]: { ...(p[day] || { end_time: "", label: "" }), start_time: e.target.value } }))} /><Input className="h-8 w-28" type="time" value={breakDraft[day]?.end_time || ""} onChange={(e) => setBreakDraft((p) => ({ ...p, [day]: { ...(p[day] || { start_time: "", label: "" }), end_time: e.target.value } }))} /><Input className="h-8 w-32" placeholder="Label" value={breakDraft[day]?.label || ""} onChange={(e) => setBreakDraft((p) => ({ ...p, [day]: { ...(p[day] || { start_time: "", end_time: "" }), label: e.target.value } }))} /><Button size="xs" onClick={() => addBreak(day)}>Add</Button></span> : <Button size="xs" variant="ghost" onClick={() => setBreakDraft((p) => ({ ...p, [day]: { start_time: "13:00", end_time: "14:00", label: "Lunch" } }))}><Plus className="h-3 w-3" /> Add break</Button>}</div>}</div>; })}</div></section>
    <section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 text-lg font-semibold">Holidays & closures</h2><div className="mb-4 grid gap-2 md:grid-cols-[180px_1fr_120px_100px]"><Input type="date" value={holidayDraft.date} onChange={(e) => setHolidayDraft((p) => ({ ...p, date: e.target.value }))} /><Input placeholder="Label" value={holidayDraft.label} onChange={(e) => setHolidayDraft((p) => ({ ...p, label: e.target.value }))} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={holidayDraft.is_full_day} onChange={(e) => setHolidayDraft((p) => ({ ...p, is_full_day: e.target.checked }))} /> Full day</label><Button onClick={addHoliday}>Add</Button></div><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Label</TableHead><TableHead>Full day?</TableHead><TableHead /></TableRow></TableHeader><TableBody>{[...schedule.holidays].sort((a,b) => dateOnly(a.date).localeCompare(dateOnly(b.date))).map((h) => { const past = dateOnly(h.date) < today; return <TableRow key={h.id} className={past ? "opacity-50" : ""}><TableCell>{formatDateLong(h.date)}</TableCell><TableCell>{h.label || "—"}</TableCell><TableCell>{h.is_full_day ? "Yes" : "No"}</TableCell><TableCell>{!past && <Button variant="ghost" size="sm" onClick={() => deleteHoliday(h.id)}><Trash2 className="h-4 w-4" /></Button>}</TableCell></TableRow>; })}</TableBody></Table></section>
    <section className="rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 text-lg font-semibold">Staff members</h2><div className="mb-4 grid gap-2 md:grid-cols-[1fr_150px_1fr_120px_100px]"><select className="h-10 rounded-md border bg-background px-3 text-sm" value={staffDraft.user_id} onChange={(e) => { const selected = assignableUsers.find((user) => user.id === e.target.value); setStaffDraft((p) => ({ ...p, user_id: e.target.value, name: selected?.name || "" })); }}><option value="">Select advisor/staff</option>{assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}{user.role ? ` · ${user.role}` : ""}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={staffDraft.role} onChange={(e) => setStaffDraft((p) => ({ ...p, role: e.target.value as StaffRole }))}><option value="advisor">Advisor</option><option value="technician">Technician</option><option value="both">Both</option></select><DayPicker value={staffDraft.working_days} onChange={(working_days) => setStaffDraft((p) => ({ ...p, working_days }))} /><Input type="number" min={1} max={5} value={staffDraft.max_concurrent_jobs} onChange={(e) => setStaffDraft((p) => ({ ...p, max_concurrent_jobs: Number(e.target.value) }))} /><Button onClick={() => saveStaff(staffDraft)}>Add</Button></div><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Working days</TableHead><TableHead>Max jobs</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{staff.map((s) => <><TableRow key={s.id}><TableCell><div className="font-medium">{s.name}</div>{s.users?.email && <div className="text-xs text-muted-foreground">{s.users.email}</div>}</TableCell><TableCell className="capitalize">{s.role}</TableCell><TableCell><DayPicker value={s.working_days} readOnly /></TableCell><TableCell><span className="rounded-full bg-muted px-2 py-1 text-xs">{s.max_concurrent_jobs}</span></TableCell><TableCell><input type="checkbox" checked={s.is_active !== false} onChange={(e) => saveStaff({ ...s, is_active: e.target.checked })} /></TableCell><TableCell className="space-x-2"><Button size="xs" variant="outline" onClick={() => loadLeaves(s.id)}>Leaves</Button><Button size="xs" variant="ghost" onClick={() => saveStaff({ ...s, is_active: false })}>Delete</Button></TableCell></TableRow>{expandedLeaves === s.id && <TableRow><TableCell colSpan={6}><div className="space-y-2 rounded-lg bg-muted/40 p-3"><div className="grid gap-2 md:grid-cols-[160px_160px_1fr_80px]"><Input type="date" value={leaveDraft.start_date} onChange={(e) => setLeaveDraft((p) => ({ ...p, start_date: e.target.value }))} /><Input type="date" value={leaveDraft.end_date} onChange={(e) => setLeaveDraft((p) => ({ ...p, end_date: e.target.value }))} /><Input placeholder="Reason" value={leaveDraft.reason} onChange={(e) => setLeaveDraft((p) => ({ ...p, reason: e.target.value }))} /><Button size="sm" onClick={() => addLeave(s.id)}>Add</Button></div>{(leaves[s.id] || []).map((l) => <div key={l.id} className="flex justify-between rounded bg-background px-3 py-2 text-sm"><span>{dateOnly(l.start_date)} – {dateOnly(l.end_date)} | {l.reason || "Leave"}</span><button className="text-red-600" onClick={() => deleteLeave(s.id, l.id)}>Delete</button></div>)}</div></TableCell></TableRow>}</> )}</TableBody></Table></section>
  </div>;
}

function DayPicker({ value, onChange, readOnly = false }: { value: number[]; onChange?: (days: number[]) => void; readOnly?: boolean }) {
  return <div className="flex flex-wrap gap-1">{dayChips.map((label, day) => { const active = value?.includes(day); return <button key={day} type="button" disabled={readOnly} onClick={() => onChange?.(active ? value.filter((d) => d !== day) : [...(value || []), day].sort())} className={`rounded-full border px-2 py-1 text-xs ${active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-border text-muted-foreground"}`}>{label}</button>; })}</div>;
}
