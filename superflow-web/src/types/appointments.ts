export type AppointmentStatus = "scheduled" | "waiting" | "in_progress" | "on_hold" | "done" | "cancelled";

export type StaffRole = "advisor" | "technician" | "both";

export interface JobTypeTemplate {
  id: string;
  name: string;
  category: string;
  default_duration_min: number;
  color_hex: string;
  description?: string;
  is_active: boolean;
}

export interface JobType {
  id: string;
  workshop_id: string;
  template_id?: string | null;
  name: string;
  category?: string;
  duration_min: number;
  color_hex: string;
  description?: string | null;
  is_active: boolean;
  job_type_templates?: JobTypeTemplate | null;
}

export interface ScheduleConfig {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
  slot_duration_min: number;
}

export interface ScheduleBreak {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label?: string | null;
}

export interface Holiday {
  id: string;
  date: string;
  label?: string | null;
  is_full_day: boolean;
}

export interface SlotInfo {
  time: string;
  is_available: boolean;
  blocked_reason?: string;
}

export interface AssignableUser {
  id: string;
  name: string;
  role?: string;
}

export interface StaffMember {
  id: string;
  workshop_id: string;
  user_id?: string | null;
  users?: { id: string; name?: string | null; email?: string | null } | null;
  name: string;
  role: StaffRole;
  working_days: number[];
  max_concurrent_jobs: number;
  is_active: boolean;
}

export interface StaffLeave {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export interface Appointment {
  id: string;
  workshop_id: string;
  staff_id: string;
  staff?: StaffMember;
  staff_members?: StaffMember;
  job_type_id?: string | null;
  job_type?: JobType;
  job_types?: JobType;
  customer_id?: string | null;
  customer?: { id: string; name: string; phone?: string | null };
  customers?: { id: string; name: string; phone?: string | null };
  work_order_id?: string | null;
  work_order?: { id: string; number?: string; work_order_number?: string; status?: string };
  title: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  status: AppointmentStatus;
  notes?: string | null;
  created_at: string;
}

export interface ScheduleResponse {
  days: ScheduleConfig[];
  breaks: ScheduleBreak[];
  holidays: Holiday[];
}
