# Implementation Plan: Invoice Generator

**Branch**: `001-invoice-generator` | **Date**: 2026-06-05 | **Spec**: [specs/001-invoice-generator/spec.md](spec.md)

**Input**: Feature specification from `/specs/001-invoice-generator/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a workshop-customer invoice generator to PrioraFlow. Service advisors can create invoices manually or generate them directly from Jobs, with prefilled customer/vehicle/labor/parts data. Invoices support line items (labor/part/other), per-line discounts and VAT, automatic calculations, branded PDF export, and a status lifecycle (Draft → Issued → Cancelled). Historical invoice integrity is preserved via immutable customer/vehicle snapshots locked at issuance time. Workshop branding (logo, name, address, VAT/TRN) appears on PDFs; PrioraFlow branding does not. Payment tracking is intentionally excluded from v1.

## Technical Context

**Language/Version**: TypeScript 5.7+, NestJS 11

**Primary Dependencies**: Prisma 6.6, pdfkit ^0.18.0 (already installed), class-validator, class-transformer

**Storage**: MySQL/MariaDB via Prisma; new models `workshop_invoices` and `workshop_invoice_items`

**Testing**: Jest (NestJS default); unit tests for calculation service; integration tests for tenant isolation and PDF generation

**Target Platform**: Linux server (Docker Compose), Node.js 22

**Project Type**: Web application (backend API + Next.js frontend)

**Performance Goals**: Invoice list < 200ms p95; PDF generation < 3s; job-based invoice creation < 500ms

**Constraints**: No payment gateway, no ERP sync, no accounting integration in v1; no repository abstraction unless required by existing patterns; direct Prisma access in services per Constitution v1.1.0 pragmatic guidance

**Scale/Scope**: Single-workshop invoices up to ~100 line items; PDF A4 portrait; sequential numbering per workshop + branch + year with annual reset

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify the feature aligns with the PrioraFlow Constitution principles:

1. **Workshop-First Design (I)**: ✅ Solves real workshop problem — eliminates Excel invoicing, reduces post-service paperwork time.
2. **Priority Over Data Display (II)**: ✅ Invoice list shows status and urgency (unpaid/issued invoices are visually prominent).
3. **Simple for Daily Users (III)**: ✅ One-click "Generate from Job" minimizes clicks; auto-calculated totals; clear status badges.
4. **Operational Accuracy (IV)**: ✅ Immutable snapshots at issuance; calculations centralized in backend; no silent overwrites.
5. **Current Version Safety (V)**: ✅ New module, new tables — does not modify existing jobs, customers, vehicles, or subscription billing tables.
6. **Role-Based Thinking (VI)**: ✅ Service Advisor (create, edit draft, export PDF), Manager/Admin (create, edit, cancel, view all).
7. **Explainable Intelligence (VII)**: ✅ All calculations visible and explainable (line totals, subtotal, discount, VAT, grand total).
8. **Performance Matters (VIII)**: ✅ Target < 200ms list, < 3s PDF; no N+1 queries (Prisma include for line items); PDF generated server-side with PDFKit.
9. **Clean Technical Structure (IX)**: ✅ Self-contained NestJS module (`invoices/`); Controller = HTTP, Service = business logic + Prisma, DTOs fully validated.
10. **Feature Specification Standard (X)**: ✅ Spec contains all mandated sections (see spec.md).
11. **Multi-Tenant First (XI)**: ✅ All queries workshop-scoped via `prisma.tenant`; new models added to `TENANT_SCOPED_MODELS`; PDF verifies workshop ownership.
12. **Observability & Auditability (XII)**: ✅ Snapshots preserve historical state; cancelled invoices retained; status transitions tracked with timestamps (issued_at, cancelled_at).
13. **API-First Development (XIII)**: ✅ API contracts defined before UI; `POST /api/jobs/:job_id/invoice` for job-based generation; all calculation logic in backend.
14. **AI Must Assist, Not Control (XIV)**: ✅ N/A — no AI involved in this feature.
15. **Revenue Before Features (XV)**: ✅ Solves workshop pain (Excel elimination); scoped to operational needs; nice-to-haves explicitly excluded.

**All gates pass. No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/001-invoice-generator/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api-contracts.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/src/
├── invoices/
│   ├── invoices.controller.ts    # HTTP routes, guards, decorators
│   ├── invoices.service.ts       # Business logic, Prisma calls, calculations
│   ├── invoices.module.ts        # NestJS module registration
│   ├── invoices-pdf.service.ts   # PDF generation with workshop branding
│   ├── invoices-calc.service.ts  # Centralized calculation engine
│   ├── invoice-number.service.ts # Auto-generates {WORKSHOP_CODE}-{BRANCH_CODE}-{YEAR}-{SERIAL}
│   └── dto/
│       ├── create-invoice.dto.ts
│       ├── update-invoice.dto.ts
│       ├── issue-invoice.dto.ts
│       ├── cancel-invoice.dto.ts
│       ├── list-invoices.dto.ts
│       ├── create-line-item.dto.ts
│       └── invoice-response.dto.ts
├── common/permissions/
│   └── permissions.ts            # Extended with INVOICES_* constants
├── prisma/
│   ├── prisma-tenant.extension.ts # Extended TENANT_SCOPED_MODELS
│   └── schema.prisma             # Extended with workshop_invoices, workshop_invoice_items, workshops branding fields
└── jobs/
    └── jobs.controller.ts        # Extended with POST /jobs/:id/invoice route

frontend/src/
├── app/(dashboard)/invoices/
│   ├── page.tsx                  # Invoice list + search
│   ├── new/page.tsx              # Manual invoice form
│   └── [id]/page.tsx             # Invoice detail / preview / edit
├── app/(dashboard)/jobs/
│   └── [id]/
│       └── page.tsx              # Extended with "Generate Invoice" button
└── components/invoices/
    ├── InvoiceForm.tsx           # Reusable form with line items
    ├── InvoicePreview.tsx        # Live preview panel
    ├── InvoiceList.tsx           # Searchable list with filters
    ├── LineItemEditor.tsx        # Add/remove/edit line items
    └── StatusBadge.tsx           # Color-coded status labels
```

**Structure Decision**: The backend follows the existing PrioraFlow module pattern (`invoices/` self-contained NestJS module). The frontend adds invoice pages under `(dashboard)/invoices/` and a job-page integration button. The `invoices-pdf.service.ts` is separate from `invoices.service.ts` to keep PDF rendering isolated, following the pattern established by `billing/invoice-pdf.service.ts`.

## Complexity Tracking

> **No Constitution Check violations to justify.**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Implementation Notes

### MVP Scope
- P1: Invoice creation (manual + from Job), issuance, and PDF export
- P2: Search and list invoices
- P3: Cancel invoice
- All v1 out-of-scope items are explicitly excluded (see spec.md Out of Scope section)

### Future Scope (Post-v1)
- Payment tracking is intentionally excluded from Invoice Generator v1. A future Payments or Receivables module may add Paid status, Partially Paid status, payment history, payment methods, balance due, and payment recording workflows.

### Calculation Engine
- All monetary values stored in **cents** (integer) to avoid floating-point errors
- `InvoiceCalcService` centralizes: line total, discount, VAT, subtotal, grand total
- Frontend displays backend-computed totals only — no client-side math

### PDF Generation
- Reuses existing `pdfkit` dependency
- `InvoicesPdfService` renders A4 portrait with workshop branding
- Gracefully handles missing logo (renders workshop name only)
- No client-side print-to-PDF — server-side generation only

### Snapshot Locking
- On `issue` transition: copy live customer/vehicle fields to `snapshot_*` columns; also copy `workshops.code` to `workshop_code_snapshot` and `branches.code` to `branch_code_snapshot`
- Issued invoices always display snapshot values, never live entity data
- Draft invoices display live data (allows corrections before locking)
- Invoice number itself is immutable once created and includes workshop/branch codes from creation time

### Invoice Number Generation
- `InvoiceNumberService` generates `{WORKSHOP_CODE}-{BRANCH_CODE}-{YEAR}-{SERIAL}` (e.g., `GAR-DEI-2026-000001`)
- Before generating, validates that `workshops.code` and `branches.code` exist; throws `BadRequestException` immediately if either is missing. No fallback values.
- Uses `workshop_invoice_sequences` table with row-level locking (Prisma transaction) to increment `last_serial_number` atomically
- Serial resets every new year per workshop + branch combination
- Unique constraint on `workshop_id + invoice_number` is the final safety net
- Invoice number is generated only at creation time and never changes

### Tenant Isolation
- `workshop_invoices`, `workshop_invoice_items`, and `workshop_invoice_sequences` added to `TENANT_SCOPED_MODELS`
- All queries via `prisma.tenant`
- PDF endpoint verifies `workshop_id` before generation
- Integration test: attempt to access another workshop's invoice → expect 404
