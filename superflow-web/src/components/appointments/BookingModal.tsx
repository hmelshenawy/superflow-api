"use client";

import { useEffect, useMemo, useState } from "react";
import api, { getApiError } from "@/lib/api";
import type { Appointment, JobType, SlotInfo, StaffMember } from "@/types/appointments";
import { addDays, formatDuration, toDateString } from "@/utils/appointments";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type CustomerOption = { id: string; name: string; phone?: string | null };
type WorkOrderOption = { id: string; job_number?: string; work_order_number?: string; status?: string };

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: Appointment) => void;
  prefill?: { staff_id?: string; date?: string; start_time?: string };
}

const durationOptions = [15, 30, 45, 60, 90, 120, 150, 180, 240];

function fieldClass(hasError?: boolean) {
  return hasError ? "border-red-400 focus-visible:ring-red-200" : "";
}

export function BookingModal({ isOpen, onClose, onSuccess, prefill }: BookingModalProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const today = toDateString(new Date());
  const maxDate = toDateString(addDays(new Date(), 14));
  const [form, setForm] = useState({
    staff_id: prefill?.staff_id || "",
    date: prefill?.date || today,
    start_time: prefill?.start_time || "",
    job_type_id: "",
    duration_min: 60,
    title: "",
    customer_id: "",
    work_order_id: "",
    notes: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm((prev) => ({ ...prev, staff_id: prefill?.staff_id || "", date: prefill?.date || today, start_time: prefill?.start_time || "" }));
    setErrors({});
    setServerError(null);
    setLoadingMeta(true);
    Promise.all([
      api.get<StaffMember[]>("/staff", { params: { is_active: true } }),
      api.get<JobType[]>("/job-types"),
    ])
      .then(([staffRes, jobTypeRes]) => {
        setStaff(staffRes.data || []);
        setJobTypes((jobTypeRes.data || []).filter((item) => item.is_active !== false));
      })
      .catch((err) => setServerError(getApiError(err).message))
      .finally(() => setLoadingMeta(false));
  }, [isOpen, prefill?.date, prefill?.staff_id, prefill?.start_time, today]);

  useEffect(() => {
    if (!isOpen || !form.date || !form.staff_id) return;
    setLoadingSlots(true);
    api.get<SlotInfo[]>("/schedule/slots", { params: { date: form.date, staff_id: form.staff_id } })
      .then(({ data }) => setSlots(data || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [isOpen, form.date, form.staff_id]);

  useEffect(() => {
    if (!isOpen || customerSearch.trim().length < 2) { setCustomers([]); return; }
    const timer = window.setTimeout(() => {
      api.get("/customers", { params: { search: customerSearch.trim() } })
        .then(({ data }) => setCustomers(data?.data || data?.items || data || []))
        .catch(() => setCustomers([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [customerSearch, isOpen]);

  useEffect(() => {
    if (!form.customer_id) { setWorkOrders([]); return; }
    api.get("/work-orders", { params: { customer_id: form.customer_id } })
      .then(({ data }) => setWorkOrders(data?.data || data?.items || data || []))
      .catch(() => setWorkOrders([]));
  }, [form.customer_id]);

  const groupedJobTypes = useMemo(() => {
    const groups: Record<string, JobType[]> = {};
    for (const jt of jobTypes) {
      const category = jt.category || jt.job_type_templates?.category || "Custom";
      groups[category] = groups[category] || [];
      groups[category].push(jt);
    }
    return groups;
  }, [jobTypes]);

  const selectedSlotUnavailable = Boolean(prefill?.start_time && form.start_time === prefill.start_time && slots.length && !slots.some((slot) => slot.time.slice(0, 5) === prefill.start_time && slot.is_available));

  const update = (key: keyof typeof form, value: string | number) => setForm((prev) => ({ ...prev, [key]: value }));

  const selectJobType = (id: string) => {
    const jt = jobTypes.find((item) => item.id === id);
    setForm((prev) => ({ ...prev, job_type_id: id, duration_min: jt?.duration_min || prev.duration_min, title: jt?.name || prev.title }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.staff_id) next.staff_id = "Staff is required";
    if (!form.date) next.date = "Date is required";
    if (!form.start_time) next.start_time = "Start time is required";
    if (!form.duration_min) next.duration_min = "Duration is required";
    if (!form.title.trim()) next.title = "Title is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const payload = {
        staff_id: form.staff_id,
        start_time: `${form.date}T${form.start_time}:00`,
        duration_min: Number(form.duration_min),
        job_type_id: form.job_type_id || undefined,
        customer_id: form.customer_id || undefined,
        work_order_id: form.work_order_id || undefined,
        title: form.title.trim(),
        notes: form.notes || undefined,
      };
      const { data } = await api.post<Appointment>("/appointments", payload);
      onSuccess(data);
      onClose();
    } catch (err) {
      setServerError(getApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Book appointment</DialogTitle></DialogHeader>
        {serverError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}
        {loadingMeta ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Staff</Label><select className={`h-10 rounded-md border bg-background px-3 text-sm ${fieldClass(!!errors.staff_id)}`} value={form.staff_id} onChange={(e) => update("staff_id", e.target.value)}><option value="">Select staff</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}</select>{errors.staff_id && <p className="text-xs text-red-600">{errors.staff_id}</p>}</div>
            <div className="grid gap-3 md:grid-cols-2"><div className="grid gap-2"><Label>Date</Label><Input type="date" min={today} max={maxDate} value={form.date} onChange={(e) => update("date", e.target.value)} className={fieldClass(!!errors.date)} />{errors.date && <p className="text-xs text-red-600">{errors.date}</p>}</div><div className="grid gap-2"><Label>Start time</Label><select className={`h-10 rounded-md border bg-background px-3 text-sm ${fieldClass(!!errors.start_time)}`} value={form.start_time} onChange={(e) => update("start_time", e.target.value)} disabled={!form.staff_id || loadingSlots}><option value="">{loadingSlots ? "Loading slots..." : "Select time"}</option>{slots.filter((slot) => slot.is_available || slot.time.slice(0, 5) === prefill?.start_time).map((slot) => <option key={slot.time} value={slot.time.slice(0, 5)} disabled={!slot.is_available}>{slot.time}</option>)}</select>{selectedSlotUnavailable && <p className="text-xs text-amber-600">This slot may already be taken — please verify</p>}{errors.start_time && <p className="text-xs text-red-600">{errors.start_time}</p>}</div></div>
            <div className="grid gap-2"><Label>Job type</Label><select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.job_type_id} onChange={(e) => selectJobType(e.target.value)}><option value="">Optional</option>{Object.entries(groupedJobTypes).map(([category, items]) => <optgroup key={category} label={category}>{items.map((jt) => <option key={jt.id} value={jt.id}>{jt.name} · {formatDuration(jt.duration_min)}</option>)}</optgroup>)}</select></div>
            <div className="grid gap-3 md:grid-cols-2"><div className="grid gap-2"><Label>Duration</Label><select className={`h-10 rounded-md border bg-background px-3 text-sm ${fieldClass(!!errors.duration_min)}`} value={form.duration_min} onChange={(e) => update("duration_min", Number(e.target.value))}>{durationOptions.map((duration) => <option key={duration} value={duration}>{formatDuration(duration)}</option>)}</select>{errors.duration_min && <p className="text-xs text-red-600">{errors.duration_min}</p>}</div><div className="grid gap-2"><Label>Title</Label><Input value={form.title} onChange={(e) => update("title", e.target.value)} className={fieldClass(!!errors.title)} />{errors.title && <p className="text-xs text-red-600">{errors.title}</p>}</div></div>
            <div className="grid gap-2"><Label>Customer</Label><Input placeholder="Search customer by name or phone" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.customer_id} onChange={(e) => update("customer_id", e.target.value)}><option value="">No customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} {customer.phone ? `· ${customer.phone}` : ""}</option>)}</select></div>
            <div className="grid gap-2"><Label>Work order</Label><select className="h-10 rounded-md border bg-background px-3 text-sm" disabled={!form.customer_id} value={form.work_order_id} onChange={(e) => update("work_order_id", e.target.value)}><option value="">No work order</option>{workOrders.map((wo) => <option key={wo.id} value={wo.id}>{wo.work_order_number || wo.job_number || wo.id} {wo.status ? `· ${wo.status}` : ""}</option>)}</select></div>
            <div className="grid gap-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button><Button onClick={submit} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create appointment</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
