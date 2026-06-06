# Tasks: Invoice Generator

**Input**: Design documents from `/specs/001-invoice-generator/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit and integration tests are included per plan.md testing requirements.

**Organization**: Tasks follow the requested backend-first 13-phase order. Each task is tagged with its user story: [US1] = Create/Issue/PDF (P1), [US2] = Search/List (P2), [US3] = Cancel (P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Prisma Schema & Migration

**Purpose**: Define all new database tables and extend existing models

**⚠️ CRITICAL**: No service/controller work can begin until this phase is complete

- [ ] T001 [P] [US1] Extend `workshops` model in `prisma/schema.prisma` with `code` field (`String @unique @db.VarChar(20)`) and branding fields (`logo_url`, `vat_trn`, `footer_notes`, `terms_conditions`)
- [ ] T002 [P] [US1] Create `branches` model in `prisma/schema.prisma` with `workshop_id`, mandatory `code` (`String @db.VarChar(20)`), `name`, and unique constraint on `workshop_id + code`
- [ ] T003 [P] [US1] Extend `jobs` model in `prisma/schema.prisma` with `branch_id` field (`String? @db.Char(36)`) referencing `branches`
- [ ] T004 [P] [US1] Create `workshop_invoices` model in `prisma/schema.prisma` with all fields including `branch_id`, `invoice_year`, `invoice_serial_number`, `workshop_code_snapshot`, `branch_code_snapshot`, and snapshot columns
- [ ] T005 [P] [US1] Create `workshop_invoice_items` model in `prisma/schema.prisma` with line item fields (`line_total_cents`, `line_vat_cents`, `vat_applicable`, `vat_rate`, `sort_order`)
- [ ] T006 [P] [US1] Create `workshop_invoice_sequences` model in `prisma/schema.prisma` with `workshop_id`, `branch_id`, `year`, `last_serial_number`, and unique constraint on `workshop_id + branch_id + year`
- [ ] T007 [US1] Generate and apply Prisma migration for invoice generator schema changes (`npm run prisma:generate` and `npx prisma migrate dev`)

**Checkpoint**: Database schema ready — `prisma.tenant` can query all new invoice tables and sequences

---

## Phase 2: Tenant Scoping & Permissions

**Purpose**: Register new models in tenant extension and add permission constants

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 [P] [US1] Add `workshop_invoices`, `workshop_invoice_items`, and `workshop_invoice_sequences` to `TENANT_SCOPED_MODELS` in `src/prisma/prisma-tenant.extension.ts`
- [ ] T009 [P] [US1] Add `INVOICES_READ`, `INVOICES_CREATE`, `INVOICES_UPDATE`, `INVOICES_CANCEL`, `INVOICES_EXPORT` constants to `src/common/permissions/permissions.ts`
- [ ] T010 [US1] Add new `INVOICES_*` permissions to `ALL_PERMISSIONS` array and to relevant `DEFAULT_ROLES` (Service Advisor, Manager, Admin) in `src/common/permissions/permissions.ts`

**Checkpoint**: Tenant isolation and authorization framework ready for invoice endpoints

---

## Phase 3: DTO Validation

**Purpose**: Define request/response contracts with class-validator decorators

- [ ] T011 [P] [US1] Create `CreateInvoiceDto` with nested `CreateLineItemDto` array validation in `src/invoices/dto/create-invoice.dto.ts` — **must NOT accept `invoice_number`**; accepts optional `branch_id`
- [ ] T012 [P] [US1] Create `UpdateInvoiceDto` with partial update support and line item replacement in `src/invoices/dto/update-invoice.dto.ts` — **must NOT accept `invoice_number`**
- [ ] T013 [P] [US1] Create `IssueInvoiceDto` (empty body, class-validator placeholder) in `src/invoices/dto/issue-invoice.dto.ts`
- [ ] T014 [P] [US3] Create `CancelInvoiceDto` (empty body, class-validator placeholder) in `src/invoices/dto/cancel-invoice.dto.ts`
- [ ] T015 [P] [US2] Create `ListInvoicesDto` with pagination, filters, and search query params in `src/invoices/dto/list-invoices.dto.ts`
- [ ] T016 [P] [US1] Create `InvoiceResponseDto` (flat, serializable) in `src/invoices/dto/invoice-response.dto.ts` — includes `invoice_number`, `invoice_year`, `invoice_serial_number`, `workshop_code_snapshot`, `branch_code_snapshot`

**Checkpoint**: All request/response contracts validated and typed; Swagger reflects DTOs. No endpoint accepts a user-supplied `invoice_number`.

---

## Phase 4: Calculation Service

**Purpose**: Centralize all monetary math to prevent floating-point drift

- [ ] T017 [US1] Implement `InvoiceCalcService` in `src/invoices/invoices-calc.service.ts` — methods for `calculateLineTotal`, `calculateLineVat`, `calculateSubtotal`, `calculateDiscountTotal`, `calculateTaxTotal`, `calculateGrandTotal`. All values in integer cents.

**Checkpoint**: Calculation engine unit-testable and deterministic

---

## Phase 5: Invoice Service & Number Generator

**Purpose**: Core business logic, Prisma operations, and atomic invoice number generation

- [ ] T018 [US1] Implement `InvoiceNumberService` in `src/invoices/invoice-number.service.ts` — responsibilities:
  - Validate `workshops.code` and `branches.code` exist before generation; throw `BadRequestException` immediately if either is missing. No fallback values.
  - Generate invoice number in format `{WORKSHOP_CODE}-{BRANCH_CODE}-{YEAR}-{SERIAL}`
  - Read `workshops.code` and `branches.code` from Prisma
  - Increment `last_serial_number` safely inside a Prisma transaction (upsert `workshop_invoice_sequences` row, then increment)
  - Reset serial per new year (new row for new year starts at 0)
  - Prevent duplicate invoice numbers during concurrent requests via transaction isolation + unique constraint fallback
- [ ] T019 [US1] Implement `InvoicesService.create()` in `src/invoices/invoices.service.ts` — manual invoice creation with line items; delegates to `InvoiceNumberService` for `invoice_number` generation; captures `workshop_code_snapshot` and `branch_code_snapshot` at creation time; total recalculation via `InvoiceCalcService`
- [ ] T020 [US1] Implement `InvoicesService.findOne()` and `InvoicesService.findAll()` in `src/invoices/invoices.service.ts` — workshop-scoped queries with Prisma `include` for line items
- [ ] T021 [US1] Implement `InvoicesService.update()` in `src/invoices/invoices.service.ts` — draft-only edits, line item replacement strategy, total recalculation; **rejects attempts to change `invoice_number`**
- [ ] T022 [US1] Implement `InvoicesService.issue()` in `src/invoices/invoices.service.ts` — status transition `draft → issued`, snapshot locking (copy live customer/vehicle fields to `snapshot_*` + `workshop_code_snapshot` + `branch_code_snapshot`), final total recalculation, set `issued_at`
- [ ] T023 [US3] Implement `InvoicesService.cancel()` in `src/invoices/invoices.service.ts` — status transition to `cancelled`, set `cancelled_at`, make read-only
- [ ] T024 [US1] Implement `InvoicesService.generateFromJob()` in `src/invoices/invoices.service.ts` — prefill customer, vehicle, branch_id from job, job link, and line items from job labor/parts; delegate to `InvoiceNumberService` for number generation; set status to `draft`

**Checkpoint**: All CRUD + lifecycle transitions functional via service layer; invoice numbers generated atomically and immutably

---

## Phase 6: PDF Service

**Purpose**: Server-side A4 PDF generation with workshop branding

- [ ] T025 [US1] Implement `InvoicesPdfService` in `src/invoices/invoices-pdf.service.ts` — A4 portrait layout using `pdfkit`, workshop branding header (logo from `workshops.logo_url`, name, address, VAT/TRN), customer/vehicle snapshot block including `workshop_code_snapshot` and `branch_code_snapshot` in invoice metadata, line item table with columns: Description, Type, Qty, Unit Price, Discount, VAT, Line Total
- [ ] T026 [US1] Add totals section to PDF (subtotal, discount, tax, grand total) with currency formatting (AED)
- [ ] T027 [US1] Handle missing logo gracefully (render workshop name only); ensure no PrioraFlow branding appears on PDF

**Checkpoint**: PDF endpoint renders branded, legally-snapshot invoices

---

## Phase 7: API Controller

**Purpose**: HTTP routes, guards, decorators for all invoice endpoints

- [ ] T028 [US1] Register `InvoicesModule` in `src/app.module.ts`
- [ ] T029 [P] [US1] Implement `POST /api/invoices` in `src/invoices/invoices.controller.ts` with `@RequirePermission('invoices:create')` and `WorkshopGuard` — backend generates `invoice_number`; request body must not contain `invoice_number`
- [ ] T030 [P] [US2] Implement `GET /api/invoices` in `src/invoices/invoices.controller.ts` with `@RequirePermission('invoices:read')`, pagination, filters, search
- [ ] T031 [P] [US1] Implement `GET /api/invoices/:id` in `src/invoices/invoices.controller.ts` with `@RequirePermission('invoices:read')`
- [ ] T032 [P] [US1] Implement `PATCH /api/invoices/:id` in `src/invoices/invoices.controller.ts` with `@RequirePermission('invoices:update')` and draft-status enforcement
- [ ] T033 [P] [US1] Implement `PATCH /api/invoices/:id/issue` in `src/invoices/invoices.controller.ts` with `@RequirePermission('invoices:update')`
- [ ] T034 [P] [US3] Implement `PATCH /api/invoices/:id/cancel` in `src/invoices/invoices.controller.ts` with `@RequirePermission('invoices:cancel')`
- [ ] T035 [P] [US1] Implement `GET /api/invoices/:id/pdf` in `src/invoices/invoices.controller.ts` with `@RequirePermission('invoices:export')`, returns `application/pdf` stream

**Checkpoint**: All 7 v1 controller endpoints wired, guarded, and Swagger-documented. No endpoint accepts user-supplied invoice numbers.

---

## Phase 8: Job-to-Invoice Endpoint

**Purpose**: One-click invoice generation from a Job

- [ ] T036 [US1] Add `POST /api/jobs/:job_id/invoice` route to `src/jobs/jobs.controller.ts` with `@RequirePermission('invoices:create')` and `WorkshopGuard`
- [ ] T037 [US1] Add `JobsController.generateInvoice()` handler that reads job's `branch_id`, delegates to `InvoicesService.generateFromJob()`, and returns `InvoiceDetail` with auto-generated invoice number

**Checkpoint**: Job detail page can trigger invoice creation via API; invoice number generated from job's workshop and branch

---

## Phase 9: Backend Tests

**Purpose**: Verify calculations, tenant isolation, invoice number generation, and PDF output

- [ ] T038 [P] [US1] Unit tests for `InvoiceCalcService` in `src/invoices/tests/invoices-calc.service.spec.ts` — edge cases: zero quantity, max discount, VAT exempt line, mixed VAT rates
- [ ] T039 [P] [US1] Unit tests for `InvoiceNumberService` in `src/invoices/tests/invoice-number.service.spec.ts`:
  - Generates correct format `{WORKSHOP_CODE}-{BRANCH_CODE}-{YEAR}-{SERIAL}`
  - Serial increments per workshop + branch + year
  - Serial resets in new year
  - Different branches have independent serials
  - Different workshops have independent serials
  - Concurrent requests do not create duplicate invoice numbers (simulate with Promise.all)
  - Rejects when workshop code is missing
  - Rejects when branch code is missing
  - Verifies no fallback invoice numbers are produced (e.g., `WS-{id}`, `UNKNOWN`, `DEFAULT`)
- [ ] T040 [P] [US1] Integration test for tenant isolation in `src/invoices/tests/invoices-tenant.integration.spec.ts` — attempt to access another workshop's invoice → expect 404; verify `prisma.tenant` auto-scoping
- [ ] T041 [P] [US1] Integration test for PDF generation in `src/invoices/tests/invoices-pdf.integration.spec.ts` — verify PDF renders, contains invoice number, and includes workshop branding
- [ ] T042 [P] [US3] Integration test for cancel lifecycle in `src/invoices/tests/invoices-lifecycle.integration.spec.ts` — draft → issued → cancelled transitions, snapshot locking on issue, read-only after cancel, invoice number immutability
- [ ] T042a [P] [US1] Integration test for missing workshop code in `src/invoices/tests/invoices-code-validation.integration.spec.ts` — `POST /api/invoices` with workshop missing `code` → expect `400 Bad Request` with message `"Workshop code is required before invoices can be generated"`
- [ ] T042b [P] [US1] Integration test for missing branch code in `src/invoices/tests/invoices-code-validation.integration.spec.ts` — `POST /api/invoices` with branch missing `code` → expect `400 Bad Request` with message `"Branch code is required before invoices can be generated"`; verify no fallback invoice number is created

**Checkpoint**: Backend test suite passes; invoice number generator verified under concurrency; code validation verified; tenant isolation verified

---

## Phase 10: Frontend Invoice Pages

**Purpose**: Dashboard UI for list, creation, and detail views

- [ ] T043 [P] [US2] Create invoice list page at `superflow-web/src/app/(dashboard)/invoices/page.tsx` — searchable, paginated table with status badges
- [ ] T044 [P] [US1] Create new manual invoice form page at `superflow-web/src/app/(dashboard)/invoices/new/page.tsx` — invoice number field is read-only; before save shows "Auto-generated on save"; after save displays generated invoice number
- [ ] T045 [P] [US1] Create invoice detail/edit/preview page at `superflow-web/src/app/(dashboard)/invoices/[id]/page.tsx` — show status, auto-generated invoice number, line items, totals, actions (Issue, Cancel, Export PDF)

**Checkpoint**: Frontend routes exist and hit backend endpoints; invoice number displayed as read-only

---

## Phase 11: Job Detail Integration Button

**Purpose**: Service Advisor can generate an invoice directly from a job

- [ ] T046 [US1] Add "Generate Invoice" button to `superflow-web/src/app/(dashboard)/jobs/[id]/page.tsx` — visible when job exists and user has `invoices:create` permission; calls `POST /api/jobs/:job_id/invoice`; redirects to new invoice edit page on success; displays auto-generated invoice number after creation

**Checkpoint**: Job-to-invoice flow functional end-to-end

---

## Phase 12: Frontend Components & Validation

**Purpose**: Reusable components for forms, line items, preview, and status

- [ ] T047 [P] [US1] Create `InvoiceForm` component in `superflow-web/src/components/invoices/InvoiceForm.tsx` — customer/vehicle selector, branch selector, notes, live totals from backend; invoice number field rendered read-only with placeholder "Auto-generated on save"
- [ ] T048 [P] [US1] Create `LineItemEditor` component in `superflow-web/src/components/invoices/LineItemEditor.tsx` — add/remove/edit line items with type, qty, unit price, discount, VAT toggle
- [ ] T049 [P] [US1] Create `InvoicePreview` component in `superflow-web/src/components/invoices/InvoicePreview.tsx` — live preview panel showing line totals, subtotal, discount, tax, grand total (all from backend DTO); displays generated invoice number after save
- [ ] T050 [P] [US2] Create `InvoiceList` component in `superflow-web/src/components/invoices/InvoiceList.tsx` — searchable list with filters (status, date range, customer, vehicle plate)
- [ ] T051 [P] [US1] Create `StatusBadge` component in `superflow-web/src/components/invoices/StatusBadge.tsx` — color-coded badges for `draft` (gray), `issued` (green), `cancelled` (red)

**Checkpoint**: Frontend forms validate inputs; previews display backend-computed totals; invoice number read-only; no client-side arithmetic

---

## Phase 13: Polish & Security Audit

**Purpose**: Cross-cutting verification against Constitution principles

- [ ] T052 [P] Final tenant isolation audit (Constitution Principle XI): verify every `InvoicesService` query uses `prisma.tenant`, never `prisma.raw`; verify PDF generation checks `workshop_id` before streaming; verify `InvoiceNumberService` scopes sequence rows to workshop
- [ ] T053 [P] Permission guard audit: verify all 7 invoice endpoints have `@RequirePermission()` and `@UseGuards(PermissionsGuard, WorkshopGuard)`; verify `PlanFeatureGuard` applied if invoice feature is plan-gated
- [ ] T054 [P] Observability audit (Constitution Principle XII): verify `issued_at`, `cancelled_at`, `created_at`, `updated_at` are set; verify status transitions are traceable; add `AuditInterceptor` coverage if mutations are not already logged
- [ ] T055 [P] Calculation audit: verify all monetary fields are integers (cents); verify no floating-point math in `InvoiceCalcService`; verify VAT calculation matches `line_total_cents * vat_rate` rounding behavior
- [ ] T056 [P] Data integrity audit: verify snapshot columns are populated on issue and never overwritten; verify draft invoices display live data; verify cancelled invoices are read-only; verify `invoice_number` is immutable after creation
- [ ] T057 [P] Invoice number generator audit: verify no endpoint accepts user-supplied `invoice_number`; verify unique constraint `workshop_id + invoice_number` exists in schema; verify concurrent creation produces no duplicates; verify `InvoiceNumberService` rejects missing workshop code and missing branch code with `BadRequestException`; verify no fallback invoice numbers are ever produced
- [ ] T058 [P] Run `quickstart.md` validation — execute all 5 curl commands and verify responses match API contracts
- [ ] T059 [P] Run `npm run lint` and `npm run build` in backend; run `cd superflow-web && npm run build` in frontend — zero errors
- [ ] T060 Update `CLAUDE.md` SPECKIT section if feature state changed; ensure active plan pointer remains accurate

**Checkpoint**: All Constitution gates pass; feature ready for merge to `dev`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Schema)**: No dependencies — can start immediately
- **Phase 2 (Tenant/Permissions)**: Depends on Phase 1 completion — BLOCKS all service/controller work
- **Phase 3 (DTOs)**: Depends on Phase 2 completion — needs permissions constants for `@RequirePermission` decorators
- **Phase 4 (Calc Service)**: Depends on Phase 2 — can run in parallel with Phase 3 (different files)
- **Phase 5 (Invoice Service + Number Generator)**: Depends on Phase 3 + Phase 4 — needs DTOs and calc engine
- **Phase 6 (PDF Service)**: Depends on Phase 2 — can run in parallel with Phase 3–5 (different file, no service dependency)
- **Phase 7 (Controller)**: Depends on Phase 3 + Phase 5 + Phase 6 — needs DTOs, service methods, PDF service
- **Phase 8 (Job-to-Invoice)**: Depends on Phase 5 + Phase 7 — needs `generateFromJob` and controller pattern
- **Phase 9 (Tests)**: Depends on Phase 5 + Phase 6 + Phase 7 — needs service and controller to test
- **Phase 10 (Frontend Pages)**: Depends on Phase 7 — needs API endpoints
- **Phase 11 (Job Button)**: Depends on Phase 8 + Phase 10 — needs job-to-invoice endpoint and invoice pages
- **Phase 12 (Frontend Components)**: Depends on Phase 10 — page shells exist before components are integrated
- **Phase 13 (Audit)**: Depends on all prior phases

### User Story Dependencies

- **US1 (P1)**: Phases 1–8, 10–12. Can be delivered as MVP after Phase 9 tests pass.
- **US2 (P2)**: Phases 1–3, 7 (`GET /invoices`), 10 (list page), 12 (InvoiceList component). Can be worked in parallel with US1 after Phase 7.
- **US3 (P3)**: Phases 1–3, 5 (`cancel` method), 7 (`PATCH /cancel`), 10 (detail page cancel action), 9 (lifecycle tests). Can be worked in parallel with US1 after Phase 7.

### Parallel Opportunities

- Within **Phase 1**: T001, T002, T003, T004, T005, T006 can run in parallel (different model additions)
- Within **Phase 2**: T008, T009 can run in parallel (different files)
- Within **Phase 3**: All DTO tasks (T011–T016) can run in parallel
- Within **Phase 5**: T018 (InvoiceNumberService) and T019–T024 (InvoicesService methods) are in same file but different methods — coordinate to avoid merge conflicts
- Within **Phase 7**: All controller endpoint tasks (T029–T035) can run in parallel (same file but different methods — coordinate to avoid merge conflicts)
- Within **Phase 9**: All test tasks (T038–T042) can run in parallel
- Within **Phase 10**: All page tasks (T043–T045) can run in parallel
- Within **Phase 12**: All component tasks (T047–T051) can run in parallel
- Within **Phase 13**: All audit tasks (T052–T060) can run in parallel (different verification dimensions)

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Prisma Schema & Migration
2. Complete Phase 2: Tenant Scoping & Permissions
3. Complete Phase 3: DTO Validation
4. Complete Phase 4: Calculation Service
5. Complete Phase 5: Invoice Service + InvoiceNumberService (create, update, issue, findOne, findAll, generateFromJob)
6. Complete Phase 6: PDF Service
7. Complete Phase 7: API Controller (all 7 endpoints)
8. Complete Phase 8: Job-to-Invoice Endpoint
9. Complete Phase 9: Backend Tests
10. **STOP and VALIDATE**: Test US1 independently — create invoice (verify auto-generated number format), issue, export PDF
11. Deploy/demo if ready

### Incremental Delivery

1. Complete Phases 1–9 → Backend ready for US1
2. Add Phase 10 (list page) + Phase 12 (components) → US2 delivered → Deploy/Demo
3. Add Phase 11 (job button) → US1 fully wired → Deploy/Demo
4. Complete Phase 13 (audit) → All stories polished → Merge to `dev`

### Parallel Team Strategy

With multiple developers:

1. Team completes Phases 1–2 together (schema + tenant)
2. Once Phase 2 is done:
   - Developer A: Phase 3 (DTOs) → Phase 4 (Calc) → Phase 5 (Service + InvoiceNumberService)
   - Developer B: Phase 6 (PDF Service) → Phase 7 (Controller endpoints)
   - Developer C: Phase 10 (Frontend pages) → Phase 12 (Components)
3. Phase 8 (Job-to-Invoice) and Phase 9 (Tests) integrate A and B's work
4. Phase 11 (Job Button) and Phase 13 (Audit) finalize delivery

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Payment tracking is excluded from v1** — no tasks reference `paid`, `partially_paid`, `amount_paid_cents`, `balance_due_cents`, or payment methods
- **Invoice numbers are auto-generated only** — no task allows manual invoice number entry or editing
