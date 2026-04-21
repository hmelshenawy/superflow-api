// ─── Auth ───────────────────────────────────────────────
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  role_id: string | null;
  is_active: boolean;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  role?: Role;
}

export interface Role {
  id: string;
  name: string | null;
  permissions: string | null;
  description: string | null;
}

export interface AuthTokens {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ─── Jobs ───────────────────────────────────────────────
export type JobStatus =
  | "booked"
  | "checking"
  | "estimate_sent"
  | "approved"
  | "in_progress"
  | "waiting_parts"
  | "quality_check"
  | "completed"
  | "invoiced"
  | "closed";

export interface Job {
  id: string;
  job_number: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  advisor_id: string | null;
  technician_id: string | null;
  status: JobStatus;
  customer_concern: string | null;
  internal_notes: string | null;
  odometer_in: number | null;
  promised_at: string | null;
  dms_ro_number: string | null;
  dms_synced_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  vehicle?: Vehicle;
  advisor?: User;
  technician?: User;
  estimate_lines?: EstimateLine[];
  inspection?: Inspection;
  media_files?: MediaFile[];
}

// ─── Customers ──────────────────────────────────────────
export type PreferredContact = "phone" | "email" | "whatsapp" | "sms";

export interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  preferred_contact: PreferredContact | null;
  language: string | null;
  dms_customer_id: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

// ─── Vehicles ───────────────────────────────────────────
export type VehicleType =
  | "sedan"
  | "suv"
  | "coupe"
  | "hatchback"
  | "convertible"
  | "pickup"
  | "van"
  | "truck"
  | "motorcycle"
  | "other";

export interface Vehicle {
  id: string;
  customer_id: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  color: string | null;
  odometer_km: number | null;
  vehicle_type: VehicleType | null;
  engine: string | null;
  dms_vehicle_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Estimates ──────────────────────────────────────────
export type EstimateLineType = "labour" | "part" | "sublet";

export interface EstimateLine {
  id: string;
  job_id: string | null;
  inspection_response_id: string | null;
  type: EstimateLineType;
  description: string | null;
  part_number: string | null;
  quantity: number | null;
  unit_price: number | null;
  discount_pct: number | null;
  tax_rate_pct: number | null;
  line_total: number | null;
  tax_amount: number | null;
  is_recommended: boolean | null;
  sort_order: number | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Inspections ────────────────────────────────────────
export type InspectionStatus =
  | "draft"
  | "in_progress"
  | "submitted"
  | "reviewed"
  | "approved";

export interface Inspection {
  id: string;
  job_id: string | null;
  template_id: string | null;
  technician_id: string | null;
  status: InspectionStatus | null;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  responses?: InspectionResponse[];
}

export interface InspectionResponse {
  id: string;
  inspection_id: string | null;
  item_id: string | null;
  value: string | null;
  urgency: string | null;
  tech_notes: string | null;
  media_count: number | null;
  recorded_at: string | null;
}

// ─── Deferred Work ──────────────────────────────────────
export type DeferredStatus = "pending" | "reminded" | "booked" | "closed" | "expired";
export type DeferredUrgency = "none" | "low" | "medium" | "high" | "critical";

export interface DeferredWork {
  id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  original_job_id: string | null;
  estimate_line_id: string | null;
  status: DeferredStatus | null;
  urgency: DeferredUrgency | null;
  estimated_value: number | null;
  remind_after: string | null;
  remind_count: number | null;
  last_reminded_at: string | null;
  booked_job_id: string | null;
  closed_reason: string | null;
  created_at: string;
  customer?: Customer;
  vehicle?: Vehicle;
}

// ─── Media ──────────────────────────────────────────────
export type FileType = "photo" | "video" | "document";

export interface MediaFile {
  id: string;
  job_id: string | null;
  uploaded_by: string | null;
  file_type: FileType | null;
  mime_type: string | null;
  original_filename: string | null;
  size_bytes: number | null;
  thumbnail_key: string | null;
  uploaded_at: string;
}

// ─── Labour Rates ───────────────────────────────────────
export interface LabourRate {
  id: string;
  name: string | null;
  rate_per_hour: number | null;
  currency: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

// ─── Inspection Template ────────────────────────────────
export interface InspectionTemplate {
  id: string;
  name: string | null;
  vehicle_type: string | null;
  description: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

// ─── API Envelope ───────────────────────────────────────
export interface PaginatedResponse<T> {
  data?: T[];
  items?: T[];
  total: number;
  page: number;
  limit: number;
}