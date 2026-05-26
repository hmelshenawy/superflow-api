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
  workshops?: Workshop[];
}

export interface Role {
  id: string;
  name: string | null;
  permissions: string[] | string | null;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthTokens {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
  workshopId?: string;
  workshops?: Workshop[];
}

export interface LoginRequest {
  email: string;
  password: string;
}


// ─── Workshops ─────────────────────────────────────────
export interface Workshop {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string | null;
  region?: string | null;
  plan_id?: string | null;
  trial_ends_at?: string | null;
}

// ─── Billing ───────────────────────────────────────────────

export interface PlanFeature {
  key: string;
  isIncluded: boolean;
  ceiling: number | null;
  overageUnitCents: number;
}

export interface Subscription {
  id: string;
  status: string;
  plan_id: string;
  region: string;
  additional_locations: number;
  billing_model: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  cancel_at_period_end: boolean;
  plan: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    features: PlanFeature[];
  };
}

export interface UsageRecord {
  featureKey: string;
  count: number;
  ceiling: number | null;
  isIncluded: boolean;
  overageUnitCents: number;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  displayName?: string;
  features: PlanFeature[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitAmountCents: number;
  totalCents: number;
  type: string;
  period: string | null;
}

export interface InvoicePayment {
  id: string;
  status: string;
  amountCents: number;
  currency: string | null;
  method: string | null;
  providerName: string | null;
  paidAt: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalCents: number;
  currency: string | null;
  dueAt: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

export interface WorkshopBillingOverview {
  subscription: {
    id: string;
    status: string;
    planId: string;
    region: string;
    additionalLocations: number;
    billingModel: string;
    trialEndsAt: string | null;
    currentPeriodStartsAt: string | null;
    currentPeriodEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    priceOverrideCents: number | null;
    discountPct: number | null;
    internalNotes: string | null;
  } | null;
  plan: {
    id: string | null;
    name: string | null;
    description: string | null;
    price: number | null;
    currency: string | null;
  };
  features: PlanFeature[];
  usage: Record<string, UsageRecord>;
  invoices: Invoice[];
}
// ─── Jobs ───────────────────────────────────────────────

export type CustomerSensitivity = "normal" | "vip" | "angry" | "comeback";

export type PartsStatus =
  | "no_parts"
  | "order_parts"
  | "waiting_warehouse"
  | "backorder"
  | "parts_ready"
  | "issued";

export type WorkshopStage =
  | "waiting_technician"
  | "diagnosis"
  | "estimate_prep"
  | "customer_approval"
  | "work_in_progress"
  | "final_test"
  | "quality_check"
  | "ready_handover";

export type WorkflowSystemCategory = "booked" | "active" | "ready" | "closed" | "cancelled";

export interface WorkflowStageConfig {
  key: string;
  label: string;
  description?: string;
  systemStatus: JobStatus;
  systemCategory: WorkflowSystemCategory;
  color: string;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
}

export interface WorkflowTemplate {
  key: string;
  label: string;
  description: string;
  stages: WorkflowStageConfig[];
}

export type JobStatus =
  | "booked"
  | "checking"
  | "estimate_sent"
  | "approved"
  | "in_progress"
  | "waiting_parts"
  | "quality_check"
  | "ready"
  | "closed"
  | "no_show";

export interface JobMeta {
  phaseIndex: number;
  phaseLabel: string;
  phaseTotal?: number;
  isOverdue: boolean;
  hoursToPromise?: number | null;
  idleHours: number;
  idleTier?: "none" | "6h" | "12h" | "24h";
  priorityScore: number;
  priorityLevel: string;
  priorityFactors?: Array<{ key: string; weight: number; description: string; category: string }>;
  nextAction: { title: string; reason?: string; urgency: string; owner: string; actionType: string; signals?: string[] } | null;
  isWorkshopPhase: boolean;
  resolvedWorkshopStage: WorkshopStage | null;
  resolvedWorkflowStageKey: string | null;
  validTransitions: JobStatus[];
  nextFlowStatus: JobStatus | null;
  availableActions?: string[];
  editableFields: string[];
  blockedReason?: string | null;
  estimateTotal: number;
  concernsSummary?: { total: number; inspected: number; pending: number };
  partsSummary?: { requested: number; arrived: number; pending: number };
}

export interface Job {
  id: string;
  job_number: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  advisor_id: string | null;
  owner_code: string | null;
  technician_id: string | null;
  status: JobStatus;
  workshop_stage: WorkshopStage | null;
  workflow_stage_key: string | null;
  parts_status: PartsStatus | null;
  customer_informed: boolean | null;
  is_customer_waiting: boolean | null;
  customer_sensitivity: CustomerSensitivity | null;
  customer_concern: string | null;
  internal_notes: string | null;
  odometer_in: number | null;
  promised_at: string | null;
  arrived_at: string | null;
  dms_ro_number: string | null;
  dms_synced_at: string | null;
  completed_at: string | null;
  invoiced_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  vehicle?: Vehicle;
  advisor?: User;
  technician?: User;
  estimate_lines?: EstimateLine[];
  inspection?: Inspection;
  qc_checklists?: { id: string; status: string | null } | null;
  media_files?: MediaFile[];
  job_status_history?: JobStatusHistory[];
  job_concerns?: JobConcern[];
  job_parts?: JobPart[];
  latest_portal_snapshot?: CustomerPortalSnapshot | null;
  meta?: JobMeta;
}


export interface JobConcern {
  id: string;
  job_id: string;
  code: string | null;
  title: string;
  description: string | null;
  status: string | null;
  technician_finding: string | null;
  work_note: string | null;
  qc_note: string | null;
  customer_decision: string | null;
  advisor_decision: string | null;
  advisor_decision_note: string | null;
  sort_order: number | null;
  inspection_response_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  media_files?: MediaFile[];
  photos?: MediaFile[];
}

export interface CustomerPortalSnapshot {
  id: string;
  job_id: string;
  version: number;
  stage: string | null;
  release_note: string | null;
  released_at: string | null;
}

export interface JobStatusHistory {
  id: string;
  job_id: string | null;
  from_status: JobStatus | null;
  to_status: JobStatus | null;
  changed_by: string | null;
  reason: string | null;
  changed_at: string | null;
  users?: Pick<User, "id" | "name" | "email"> | null;
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

export interface QuoteGroup {
  id: string;
  job_id: string | null;
  title: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface EstimateLine {
  id: string;
  job_id: string | null;
  inspection_response_id: string | null;
  quote_group_id: string | null;
  concern_id?: string | null;
  quote_group?: QuoteGroup | null;
  concern?: JobConcern | null;
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
  is_actionable: boolean;
  group_decision_summary: "pending" | "approved" | "declined" | "deferred" | "mixed";
  sort_order: number | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AuthorisationDecisionType = "approved" | "declined" | "deferred";

export interface JobAuthorisationDecision {
  id: string;
  estimate_line_id: string | null;
  decision: AuthorisationDecisionType;
  customer_comment: string | null;
  decided_at: string | null;
}

export interface JobAuthorisationStatus {
  jobId: string;
  counts: {
    totalLines: number;
    approved: number;
    declined: number;
    deferred: number;
    pending: number;
  };
  hasActiveToken: boolean;
  latestSnapshot?: CustomerPortalSnapshot | null;
  latestToken: {
    id: string;
    issued_at: string | null;
    expires_at: string | null;
    first_opened_at: string | null;
    used_at: string | null;
    is_revoked: boolean | null;
  } | null;
  decisions: JobAuthorisationDecision[];
  decisionByLine: Record<string, JobAuthorisationDecision>;
  concernApprovals: ConcernApprovalStatus[];
}

export interface ConcernApprovalStatus {
  concernId: string;
  advisorDecision: string | null;
  advisorDecisionNote: string | null;
  customerDecision: "approved" | "declined" | "deferred" | "mixed" | null;
  isLocked: boolean;
}

export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  reviewing: "Under inspection",
  finding_ready: "Diagnosis ready",
  priced: "Pending approval",
  in_progress: "In progress",
  qc_complete: "Completed",
};

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
  is_locked: boolean;
  summary: { green: number; amber: number; red: number; unset: number };
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  inspection_responses?: InspectionResponse[];
  responses?: InspectionResponse[];
  inspection_templates?: InspectionTemplate;
}

export interface InspectionResponse {
  id: string;
  inspection_id: string | null;
  item_id: string | null;
  value: string | null;
  urgency: string | null;
  tech_notes: string | null;
  media_count: number | null;
  traffic_light: "green" | "amber" | "red" | "none" | null;
  media_files?: MediaFile[];
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
  available_actions: string[];
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
  scan_status?: string | null;
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
export interface InspectionItem {
  id: string;
  section_id: string;
  label: string;
  input_type: string;
  options: string | null;
  unit: string | null;
  requires_photo: boolean;
  requires_note_on: string | null;
  help_text: string | null;
  sort_order: number;
  is_active: boolean;
  is_informational: boolean;
  available_options: string[];
}

export interface InspectionSection {
  id: string;
  template_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  inspection_items: InspectionItem[];
}

export interface InspectionTemplate {
  id: string;
  name: string | null;
  vehicle_type: string | null;
  description: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  inspection_sections?: InspectionSection[];
  created_by?: string;
}

// ─── QC Checklists ────────────────────────────────────────
export type QcChecklistStatus = "draft" | "in_progress" | "submitted" | "approved";
export type QcChecklistResult = "pass" | "fail" | "na";
export type QcChecklistItemInputType = "pass_fail" | "yes_no" | "ok_fail" | "photo" | "text";

export interface QcChecklistTemplate {
  id: string;
  name: string | null;
  description: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  qc_checklist_sections?: QcChecklistSection[];
}

export interface QcChecklistSection {
  id: string;
  template_id: string;
  name: string | null;
  icon: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  qc_checklist_items: QcChecklistItem[];
}

export interface QcChecklistItem {
  id: string;
  section_id: string;
  label: string | null;
  input_type: QcChecklistItemInputType | null;
  requires_photo: boolean | null;
  requires_note_on_fail: boolean | null;
  help_text: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  is_informational: boolean;
  available_options: string[];
}

export interface QcChecklist {
  id: string;
  job_id: string | null;
  template_id: string | null;
  checker_id: string | null;
  status: QcChecklistStatus | null;
  overall_result: QcChecklistResult | null;
  is_locked: boolean;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  qc_checklist_responses?: QcChecklistResponse[];
  qc_checklist_templates?: QcChecklistTemplate;
  jobs?: any;
  users?: any;
}

export interface QcChecklistResponse {
  id: string;
  checklist_id: string | null;
  item_id: string | null;
  value: string | null;
  notes: string | null;
  media_count: number | null;
  traffic_light: "green" | "red" | "none" | null;
  recorded_at: string | null;
  qc_checklist_items?: QcChecklistItem;
  media_files?: any[];
}

// ─── API Envelope ───────────────────────────────────────
export interface PaginatedResponse<T> {
  data?: T[];
  items?: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── API Errors ─────────────────────────────────────────
export type ErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_FORBIDDEN'
  | 'AUTH_PERMISSION_DENIED'
  | 'AUTH_TRIAL_EXPIRED'
  | 'AUTH_WORKSHOP_REQUIRED'
  | 'PLAN_FEATURE_REQUIRED'
  | 'PLAN_LIMIT_REACHED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'MEDIA_FILE_BLOCKED'
  | 'MEDIA_FILE_PENDING'
  | 'MEDIA_FILE_TYPE_NOT_ALLOWED'
  | 'MEDIA_FILE_TOO_LARGE'
  | 'INTERNAL_ERROR';

export interface ApiErrorResponse {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  method: string;
  path: string;
  timestamp: string;
}

// ─── Parts & Stock ───────────────────────────────────────
export interface PartFitment {
  id: string;
  part_id: string;
  make: string;
  model: string | null;
  variant: string | null;
  engine: string | null;
  year_from: number | null;
  year_to: number | null;
  notes: string | null;
  workshop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: string;
  part_number: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  unit: string | null;
  cost_price: number | null;
  selling_price: number | null;
  barcode: string | null;
  supplier_id: string | null;
  min_stock: number | null;
  is_low_stock: boolean;
  is_active: boolean | null;
  workshop_id: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: Supplier;
  inventory?: Inventory[];
  part_fitments?: PartFitment[];
  _count?: { inventory: number };
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms: string | null;
  workshop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  is_default: boolean | null;
  workshop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  part_id: string;
  warehouse_id: string;
  quantity_on_hand: number;
  reserved_quantity: number;
  available_quantity: number;
  workshop_id: string | null;
  created_at: string;
  updated_at: string;
  parts?: Part;
  warehouses?: Warehouse;
}

export type StockMovementType =
  | 'purchase_in'
  | 'job_reserve'
  | 'job_consume'
  | 'job_return'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'transfer_in'
  | 'transfer_out';

export interface StockMovement {
  id: string;
  part_id: string;
  warehouse_id: string;
  type: StockMovementType;
  quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  workshop_id: string | null;
  created_at: string;
  parts?: Part;
  warehouses?: Warehouse;
  users?: User;
}

export type JobPartStatus = 'reserved' | 'used' | 'returned' | 'cancelled';

export interface JobPart {
  id: string;
  job_id: string;
  part_id: string | null;
  partId?: string | null;
  part_name?: string | null;
  partName?: string | null;
  part_number?: string | null;
  partNumber?: string | null;
  source?: 'catalog' | 'adhoc';
  warehouse_id: string | null;
  quantity: number;
  unit_cost: number | null;
  unit_price: number | null;
  status: JobPartStatus;
  workshop_id: string | null;
  created_at: string;
  updated_at: string;
  parts?: Part;
  warehouses?: Warehouse;
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  supplier_id: string | null;
  status: PurchaseOrderStatus;
  total_cost: number | null;
  workshop_id: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: Supplier;
  purchase_order_items?: PurchaseOrderItem[];
  _count?: { purchase_order_items: number };
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  part_id: string;
  ordered_qty: number;
  received_qty: number;
  unit_cost: number | null;
  workshop_id: string | null;
  created_at: string;
  updated_at: string;
  parts?: Part;
}
