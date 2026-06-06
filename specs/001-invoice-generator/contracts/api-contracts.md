# API Contracts: Invoice Generator

**Feature**: Invoice Generator
**Date**: 2026-06-05
**Base Path**: `/api/invoices`
**Auth**: JWT Bearer + PermissionsGuard + WorkshopGuard

## Common Types

### InvoiceStatus
`"draft" | "issued" | "cancelled"`

### LineItemType
`"labor" | "part" | "other"`

### InvoiceListItem
```json
{
  "id": "uuid",
  "invoice_number": "GAR-DEI-2026-000001",
  "status": "draft",
  "invoice_date": "2026-06-05",
  "customer_name": "John Doe",
  "vehicle_plate": "ABC-123",
  "total_cents": 52500,
  "job_id": "uuid | null",
  "created_at": "2026-06-05T10:00:00Z"
}
```

### InvoiceLineItem
```json
{
  "id": "uuid",
  "description": "Oil Change",
  "type": "labor",
  "quantity": 1,
  "unit_price_cents": 15000,
  "discount_cents": 0,
  "vat_applicable": true,
  "vat_rate": 0.05,
  "line_total_cents": 15000,
  "line_vat_cents": 750,
  "sort_order": 0
}
```

### InvoiceDetail (extends InvoiceListItem)
```json
{
  ...InvoiceListItem,
  "vehicle_vin": "WVWZZZ1JZ3D000000",
  "vehicle_model": "Toyota Camry",
  "vehicle_year": 2022,
  "customer_phone": "+971501234567",
  "customer_email": "john@example.com",
  "service_advisor": "Jane Smith",
  "mileage": 45000,
  "subtotal_cents": 50000,
  "discount_cents": 0,
  "tax_cents": 2500,
  "vat_rate": 0.05,
  "notes": "Payment due within 14 days",
  "snapshot_customer_name": "John Doe",
  "snapshot_customer_phone": "+971501234567",
  "snapshot_customer_email": "john@example.com",
  "snapshot_vehicle_plate": "ABC-123",
  "snapshot_vehicle_vin": "WVWZZZ1JZ3D000000",
  "snapshot_vehicle_model": "Toyota Camry",
  "snapshot_vehicle_year": 2022,
  "workshop_code_snapshot": "GAR",
  "branch_code_snapshot": "DEI",
  "line_items": [InvoiceLineItem],
  "issued_at": null,
  "cancelled_at": null
}
```

---

## Endpoints

### POST /api/invoices
**Permission**: `invoices:create`
**Summary**: Create a manual invoice

**Request Body**:
```json
{
  "invoice_date": "2026-06-05",
  "customer_id": "uuid",
  "vehicle_id": "uuid",
  "branch_id": "uuid | null",
  "job_id": "uuid | null",
  "notes": "Payment due within 14 days",
  "line_items": [
    {
      "description": "Oil Change",
      "type": "labor",
      "quantity": 1,
      "unit_price_cents": 15000,
      "discount_cents": 0,
      "vat_applicable": true
    }
  ]
}
```

**Response**: `201 Created` → `InvoiceDetail` (includes auto-generated `invoice_number`)

**Behavior**:
- Backend automatically generates `invoice_number` in format `{WORKSHOP_CODE}-{BRANCH_CODE}-{YEAR}-{SERIAL}`
- `workshop_code_snapshot` and `branch_code_snapshot` are captured from the current workshop/branch codes
- Users MUST NOT supply `invoice_number` in the request body

**Errors**:
- `400 Bad Request` — workshop code is missing: `{ "message": "Workshop code is required before invoices can be generated" }`
- `400 Bad Request` — branch code is missing: `{ "message": "Branch code is required before invoices can be generated" }`
- `400 Bad Request` — negative quantity or unit_price
- `404 Not Found` — customer_id or vehicle_id not found in workshop

---

### POST /api/jobs/:job_id/invoice
**Permission**: `invoices:create`
**Summary**: Generate a draft invoice prefilled from a Job

**Path Params**: `job_id` — UUID of existing job

**Request Body**: `{}` (empty) or optional overrides:
```json
{
  "notes": "Optional override notes"
}
```

**Behavior**:
- Validates job exists and belongs to current workshop
- Prefills: customer_id, vehicle_id, job_id, branch_id from job, service advisor from job
- Creates line items from job labor operations and parts
- Backend auto-generates `invoice_number` using the job's workshop and branch
- Sets status to `draft`
- Returns editable invoice for review

**Response**: `201 Created` → `InvoiceDetail`

**Errors**:
- `400 Bad Request` — workshop code is missing: `{ "message": "Workshop code is required before invoices can be generated" }`
- `400 Bad Request` — branch code is missing: `{ "message": "Branch code is required before invoices can be generated" }`
- `404 Not Found` — job not found in workshop
- `409 Conflict` — job already has an invoice (optional validation)

---

### GET /api/invoices
**Permission**: `invoices:read`
**Summary**: List invoices (workshop-scoped, paginated, filterable)

**Query Params**:
| Param | Type | Description |
|-------|------|-------------|
| page | number | Default 1 |
| limit | number | Default 20, max 100 |
| status | InvoiceStatus | Optional filter |
| search | string | Searches invoice_number, customer_name, vehicle_plate |
| date_from | ISO date | Optional |
| date_to | ISO date | Optional |
| job_id | UUID | Optional |
| customer_id | UUID | Optional |

**Response**: `200 OK`
```json
{
  "data": [InvoiceListItem],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

---

### GET /api/invoices/:id
**Permission**: `invoices:read`
**Summary**: Get full invoice details

**Response**: `200 OK` → `InvoiceDetail`

**Errors**:
- `404 Not Found` — invoice not found in current workshop

---

### PATCH /api/invoices/:id
**Permission**: `invoices:update`
**Summary**: Update a draft invoice

**Constraints**:
- Only `status === "draft"` invoices are editable by Service Advisors
- Managers can edit notes on `issued` invoices

**Request Body** (partial update):
```json
{
  "invoice_date": "2026-06-05",
  "notes": "Updated notes",
  "line_items": [
    {
      "id": "uuid | null",
      "description": "Oil Change",
      "type": "labor",
      "quantity": 1,
      "unit_price_cents": 15000,
      "discount_cents": 0,
      "vat_applicable": true
    }
  ]
}
```

**Response**: `200 OK` → `InvoiceDetail`

**Errors**:
- `403 Forbidden` — invoice is not in draft status (for non-managers)

---

### PATCH /api/invoices/:id/issue
**Permission**: `invoices:update`
**Summary**: Issue a draft invoice

**Request Body**: `{}`

**Behavior**:
- Validates invoice is in `draft` status
- Locks customer and vehicle snapshots onto the invoice record
- Sets `status` to `issued`, `issued_at` to now
- Recalculates all totals one final time
- Returns updated `InvoiceDetail`

**Response**: `200 OK` → `InvoiceDetail`

**Errors**:
- `400 Bad Request` — invoice is not in draft status
- `400 Bad Request` — no line items

---

### PATCH /api/invoices/:id/cancel
**Permission**: `invoices:cancel`
**Summary**: Cancel an invoice

**Request Body**: `{}`

**Behavior**:
- Validates invoice is in `draft` or `issued` status
- Sets `status` to `cancelled`, `cancelled_at` to now
- Invoice becomes read-only

**Response**: `200 OK` → `InvoiceDetail`

**Errors**:
- `400 Bad Request` — invoice is already cancelled

---

### GET /api/invoices/:id/pdf
**Permission**: `invoices:export`
**Summary**: Export invoice as branded PDF

**Response**: `200 OK` with `Content-Type: application/pdf`

**Behavior**:
- Verifies invoice belongs to current workshop
- Generates PDF with workshop branding (logo, name, address, VAT/TRN)
- Displays snapshot values for customer and vehicle
- Does NOT display PrioraFlow branding
- Gracefully handles missing logo (workshop name only)

**Errors**:
- `404 Not Found` — invoice not found in workshop
- `500 Internal Server Error` — PDF generation failure (with retry guidance)

---

## Future Endpoints (Post-v1)

Payment tracking is intentionally excluded from v1. A future Payments or Receivables module may add:

### PATCH /api/invoices/:id/payment
Record a payment against an invoice, updating `amount_paid_cents`, `balance_due_cents`, and status to `paid` or `partially_paid`.
