# Quickstart: Invoice Generator

**Feature**: Invoice Generator
**Date**: 2026-06-05

## Prerequisites

- Backend running (`npm run start:dev`)
- Database migrated with new `workshop_invoices`, `workshop_invoice_items`, `workshop_invoice_sequences`, and `branches` tables
- Workshop `code` configured (e.g., "GAR")
- Branch `code` configured (e.g., "DEI")
- Workshop branding configured (at minimum: company name)

## 1. Create a Manual Invoice

```bash
# POST /api/invoices
# Backend auto-generates invoice_number in format {WORKSHOP_CODE}-{BRANCH_CODE}-{YEAR}-{SERIAL}
curl -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_date": "2026-06-05",
    "customer_id": "CUSTOMER_UUID",
    "vehicle_id": "VEHICLE_UUID",
    "branch_id": "BRANCH_UUID",
    "job_id": "JOB_UUID",
    "notes": "Payment due within 14 days",
    "line_items": [
      {
        "description": "Oil Change",
        "type": "labor",
        "quantity": 1,
        "unit_price_cents": 15000,
        "discount_cents": 0,
        "vat_applicable": true
      },
      {
        "description": "Oil Filter",
        "type": "part",
        "quantity": 1,
        "unit_price_cents": 3500,
        "discount_cents": 0,
        "vat_applicable": true
      }
    ]
  }'
```

Expected response: `201 Created` with full invoice details including `invoice_number: "GAR-DEI-2026-000001"` and calculated totals.

## 2. Generate Invoice From Job

```bash
# POST /api/jobs/:job_id/invoice
# Backend auto-generates invoice_number using the job's workshop and branch
curl -X POST http://localhost:3000/api/jobs/JOB_UUID/invoice \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response: `201 Created` with prefilled invoice (customer, vehicle, labor, parts) and auto-generated invoice number.

## 3. Issue Invoice

```bash
# PATCH /api/invoices/:id/issue
curl -X PATCH http://localhost:3000/api/invoices/INVOICE_UUID/issue \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response: `200 OK` with status `issued`, snapshots locked (including `workshop_code_snapshot` and `branch_code_snapshot`).

## 4. Export PDF

```bash
# GET /api/invoices/:id/pdf
curl -X GET http://localhost:3000/api/invoices/INVOICE_UUID/pdf \
  -H "Authorization: Bearer $JWT" \
  --output invoice.pdf
```

Expected response: `200 OK` with PDF file containing workshop branding and snapshot data.

## 5. Search Invoices

```bash
# GET /api/invoices?status=issued&search=John
curl -X GET "http://localhost:3000/api/invoices?status=issued&search=John" \
  -H "Authorization: Bearer $JWT"
```

Expected response: `200 OK` with paginated list of matching invoices.

## Verification Checklist

- [ ] Invoice creates with correct calculations (subtotal, VAT, grand total)
- [ ] Invoice number auto-generates in format `{WORKSHOP_CODE}-{BRANCH_CODE}-{YEAR}-{SERIAL}`
- [ ] Invoice from Job prefills all data including branch
- [ ] Issuing locks snapshots (customer, vehicle, workshop_code, branch_code)
- [ ] PDF contains workshop branding (no PrioraFlow branding)
- [ ] Search returns workshop-scoped results only
- [ ] Cancelled invoice remains in history
- [ ] Cross-workshop access is blocked (401/404)
- [ ] Concurrent creation does not produce duplicate invoice numbers
