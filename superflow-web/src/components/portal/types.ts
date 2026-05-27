export type PortalDecision = "approved" | "declined" | "deferred";

export interface PortalPhoto {
  id: string;
  url?: string;
  mime_type?: string;
  filename?: string;
}

export interface Finding {
  id: string;
  label: string;
  value?: string | null;
  urgency?: string | null;
  severity: "red" | "amber" | null;
  tech_notes?: string | null;
  photos: PortalPhoto[];
}

export interface QuoteLine {
  id: string;
  type: "labour" | "part" | "sublet";
  description?: string | null;
  part_number?: string | null;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_rate_pct: number;
  line_total: number;
  is_actionable: boolean;
}

export interface PortalConcern {
  id: string;
  code?: string | null;
  title: string;
  description?: string | null;
  status?: string | null;
  technician_finding?: string | null;
  work_note?: string | null;
  qc_note?: string | null;
  customer_decision?: string | null;
  photos?: PortalPhoto[];
}

export interface QuoteGroup {
  key: string;
  title: string;
  severity: "red" | "amber" | null;
  finding: Finding | null;
  concern?: PortalConcern | null;
  lines: QuoteLine[];
  total: number;
  group_decision_summary: "pending" | "approved" | "declined" | "deferred" | "mixed";
  is_locked: boolean;
}

export interface ExistingDecision {
  estimate_line_id: string;
  decision: PortalDecision;
  customer_comment?: string | null;
}

export type GroupDecisionState = {
  decision: PortalDecision;
  comment: string;
};

export interface PortalData {
  token: {
    expires_at: string;
    first_opened_at?: string | null;
    is_revoked: boolean;
    used_at: string | null;
    is_expired: boolean;
  };
  job: {
    id: string;
    job_number: string;
    status: string;
    customer_concern?: string | null;
    customer: { name?: string | null; phone?: string | null; email?: string | null } | null;
    vehicle: { make?: string | null; model?: string | null; plate?: string | null; vin?: string | null; year?: number | null } | null;
  };
  stage?: string;
  released_snapshot?: { version: number; stage?: string | null; released_at?: string | null; release_note?: string | null };
  concerns?: PortalConcern[];
  findings?: Finding[];
  job_photos?: PortalPhoto[];
  grouped_estimate: QuoteGroup[];
  grand_total: number;
  approved_total: number;
  has_actionable_lines: boolean;
  can_submit: boolean;
  existing_decisions: ExistingDecision[];
  currency: string;
}
