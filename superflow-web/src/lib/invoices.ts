import api from "@/lib/api";

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  type: "labour" | "part" | "other";
  description: string;
  sku?: string | null;
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  line_total_cents: number;
  vat_rate: number;
  vat_applicable: boolean;
  line_vat_cents: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  workshop_id: string;
  branch_id?: string | null;
  invoice_number: string;
  invoice_year: number;
  invoice_serial_number: number;
  workshop_code_snapshot: string;
  branch_code_snapshot: string;
  job_id?: string | null;
  customer_id?: string | null;
  vehicle_id?: string | null;
  status: "draft" | "issued" | "cancelled";
  notes?: string | null;
  internal_notes?: string | null;
  subtotal_cents: number;
  discount_total_cents: number;
  tax_total_cents: number;
  grand_total_cents: number;
  total_cents: number;
  issued_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  snapshot_customer_name?: string | null;
  snapshot_customer_email?: string | null;
  snapshot_customer_phone?: string | null;
  snapshot_vehicle_vin?: string | null;
  snapshot_vehicle_plate?: string | null;
  snapshot_vehicle_make?: string | null;
  snapshot_vehicle_model?: string | null;
  snapshot_vehicle_year?: number | null;
  snapshot_vehicle_color?: string | null;
  snapshot_advisor_name?: string | null;
  items?: InvoiceLineItem[];
  branch?: { id: string; name: string; code: string } | null;
  customer?: { id: string; name: string; email: string | null; phone: string | null } | null;
  vehicle?: { id: string; make: string | null; model: string | null; plate: string | null; year: number | null } | null;
  job?: { id: string; job_number: string | null } | null;
}

export interface CreateLineItemInput {
  type: "labour" | "part" | "other";
  description: string;
  sku?: string;
  quantity: number;
  unit_price_cents: number;
  discount_cents?: number;
  vat_rate?: number;
  vat_applicable?: boolean;
  sort_order?: number;
}

export interface CreateInvoiceInput {
  branch_id: string;
  job_id?: string;
  customer_id?: string;
  vehicle_id?: string;
  notes?: string;
  internal_notes?: string;
  discount_total_cents?: number;
  items: CreateLineItemInput[];
}

export interface UpdateInvoiceInput {
  branch_id?: string;
  customer_id?: string;
  vehicle_id?: string;
  notes?: string;
  internal_notes?: string;
  discount_total_cents?: number;
  items?: CreateLineItemInput[];
}

export interface InvoiceListFilters {
  status?: "all" | "draft" | "issued" | "cancelled";
  search?: string;
  customer_id?: string;
  vehicle_id?: string;
  branch_id?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedInvoices {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
}

// ─── API Functions ────────────────────────────────────────

export async function getInvoices(filters?: InvoiceListFilters): Promise<PaginatedInvoices> {
  const { data } = await api.get<PaginatedInvoices>("/invoices", { params: filters });
  return data;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await api.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function createInvoice(payload: CreateInvoiceInput): Promise<Invoice> {
  const { data } = await api.post<Invoice>("/invoices", payload);
  return data;
}

export async function updateInvoice(id: string, payload: UpdateInvoiceInput): Promise<Invoice> {
  const { data } = await api.patch<Invoice>(`/invoices/${id}`, payload);
  return data;
}

export async function issueInvoice(id: string): Promise<Invoice> {
  const { data } = await api.patch<Invoice>(`/invoices/${id}/issue`, {});
  return data;
}

export async function cancelInvoice(id: string): Promise<Invoice> {
  const { data } = await api.patch<Invoice>(`/invoices/${id}/cancel`, {});
  return data;
}

export async function generateInvoiceFromJob(jobId: string): Promise<Invoice> {
  const { data } = await api.post<Invoice>(`/jobs/${jobId}/invoice`, {});
  return data;
}

export async function downloadInvoicePdf(id: string): Promise<Blob> {
  const { data } = await api.get<Blob>(`/invoices/${id}/pdf`, {
    responseType: "blob",
  });
  return data;
}
