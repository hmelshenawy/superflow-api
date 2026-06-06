# Feature Specification: Invoice Generator

**Feature Branch**: `001-invoice-generator`

**Created**: 2026-06-05

**Status**: Draft

**Input**: User description: "# Feature Spec: Invoice Generator..."

## Problem Statement *(mandatory)*

Workshops currently create customer invoices manually using Excel or external templates. This is slow, error-prone, and produces inconsistent branding. Service advisors need a fast, in-app way to generate professional invoices from job details — labor, parts, discounts, VAT — directly within PrioraFlow, linked to the job, customer, and vehicle records. This solves the workshop problem of spending too much time on post-service paperwork instead of moving the next vehicle through the bay.

## Target User *(mandatory)*

- **Primary**: Service Advisor — creates invoices at job completion, needs speed and accuracy.
- **Secondary**: Workshop Admin — manages invoice numbering, branding, and cancellation.
- **Tertiary**: Manager — reviews invoice volume and financial completeness for KPIs.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Issue an Invoice (Priority: P1)

As a service advisor, I want to generate a complete invoice from job, customer, vehicle, labor, and parts details so that I can hand the customer a clear, professional invoice quickly.

**Why this priority**: This is the core value of the feature. Without invoice creation, the entire feature is useless. It directly reduces post-service paperwork time and eliminates Excel.

**Independent Test**: Can be fully tested by navigating to a completed job, clicking "Generate Invoice", verifying that customer, vehicle, labor, and parts are prefilled, adjusting line items if needed, saving as Draft, and exporting a PDF. Delivers value even without search or payment tracking.

**Acceptance Scenarios**:

1. **Given** a completed job with a customer, vehicle, labor operations, and parts, **When** the service advisor clicks "Generate Invoice" from the job page, **Then** the invoice form opens with customer, vehicle, labor, parts, and advisor prefilled; the advisor can review, add/remove line items, and save the invoice as Draft.
2. **Given** a saved draft invoice generated from a Job, **When** the service advisor reviews the preview and clicks "Issue Invoice", **Then** the status changes to Issued, the invoice becomes read-only to the advisor (except for managers), the customer and vehicle snapshots are locked, and the PDF can be exported.
3. **Given** an issued invoice, **When** the customer pays, **Then** the workshop records the payment outside PrioraFlow; the invoice remains in Issued status within the system.

---

### User Story 2 - Search and View Invoice History (Priority: P2)

As a service advisor or manager, I want to find past invoices by customer, vehicle, or invoice number so that I can answer customer questions and review financial records without scrolling through the entire job board.

**Why this priority**: Search turns the invoice feature from a one-off tool into a operational record system. It supports follow-up and dispute resolution.

**Independent Test**: Can be tested by creating multiple invoices and then using each search filter (invoice number, customer name, vehicle plate, status, date range). The search returns only invoices from the current workshop.

**Acceptance Scenarios**:

1. **Given** 5 invoices in the workshop, **When** the user searches by customer name "John", **Then** only invoices matching that customer are returned, scoped to the current workshop.
2. **Given** an invoice list, **When** the user filters by status "Issued" and a date range, **Then** the list updates to show only matching invoices within that range.

---

### User Story 3 - Cancel an Invoice (Priority: P3)

As a workshop admin or manager, I want to cancel an issued invoice so that erroneous or disputed invoices remain in the record without being hard-deleted, preserving audit history.

**Why this priority**: Cancellation supports data integrity and audit trails. It prevents the need to delete records while maintaining operational accuracy.

**Independent Test**: Can be tested by creating an invoice, issuing it, then cancelling it. The invoice remains searchable with status "Cancelled" and is no longer editable.

**Acceptance Scenarios**:

1. **Given** an issued invoice, **When** a manager clicks "Cancel Invoice", **Then** the status changes to Cancelled, the invoice becomes read-only, and it remains visible in search results.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create an invoice manually with the following fields: invoice date, customer name, customer phone, customer email, vehicle details, job/order number, mileage, service advisor name, notes/terms. The backend MUST automatically generate the invoice number in format `{WORKSHOP_CODE}-{BRANCH_CODE}-{YEAR}-{SERIAL}`.
- **FR-002**: System MUST support invoice line items, each containing: description, type (Labor / Part / Other), quantity, unit price, discount amount/percentage, VAT applicable flag, and line total.
- **FR-003**: System MUST automatically calculate and display: subtotal, total discount, VAT amount, and grand total. All calculations MUST be explainable and visible.
- **FR-004**: System MUST support invoice statuses: Draft, Issued, Cancelled. Drafts are editable; Issued is read-only for Service Advisors; Cancelled is read-only for all.
- **FR-005**: System MUST allow users to export an invoice as a PDF containing: workshop branding (not PrioraFlow branding), invoice number, customer and vehicle details, itemized line-item table, totals breakdown, and terms/notes.
- **FR-006**: System MUST persist every invoice linked to: the workshop, the customer, the vehicle, the job (if available), and the user who created it.
- **FR-007**: System MUST allow searching invoices by: invoice number, customer name, vehicle plate/VIN, job number, status, and date range. Results MUST be workshop-scoped.
- **FR-008**: System MUST generate invoice numbers atomically via a database sequence tracker (`workshop_invoice_sequences`) per workshop + branch + year. A unique constraint on `workshop_id + invoice_number` prevents collisions. Concurrent creation MUST not produce duplicates.
- **FR-009**: System MUST reject negative quantity or unit price values on line items.
- **FR-010**: System MUST make cancelled invoices visible in history and MUST NOT hard-delete them.
- **FR-011**: [MOVED TO FUTURE SCOPE: Payment tracking is intentionally excluded from v1.]
- **FR-012**: System MUST allow invoice creation directly from an existing Job. When generating from a Job: customer information is prefilled, vehicle information is prefilled, job reference is linked automatically, labor operations are prefilled, parts are prefilled, service advisor is prefilled, workshop information is prefilled. The user MAY review and modify invoice details before issuing. The standalone `/invoice` page remains available for fully manual invoice creation.
- **FR-013**: Each workshop MUST be able to configure: company name, logo, address, phone number, email address, VAT/TRN number, footer notes, and terms & conditions. PDF invoices MUST use workshop branding. Customer-facing invoices MUST NOT display PrioraFlow branding.
- **FR-014**: Generated PDF invoices MUST display: workshop logo, workshop company name, workshop contact information, VAT/TRN number, customer details, vehicle details, invoice details, itemized invoice table, totals summary, terms and conditions, and footer notes. PDF layout MUST remain readable across A4 portrait format, long descriptions, and large numbers of line items.
- **FR-015**: System MUST generate invoice numbers automatically on creation only. Users MUST NOT manually edit the generated invoice number in v1. The invoice number MUST be unique within the workshop and MUST remain stable even if workshop or branch codes change later.
- **FR-016**: System MUST require a valid workshop code and branch code before generating any invoice number. Invoice creation MUST be rejected with a `400 Bad Request` if the workshop code is missing or if the branch code is missing. No fallback or auto-generated replacement values (e.g., `WS-{id}`, `UNKNOWN`, `DEFAULT`) are permitted.

### Key Entities

- **Invoice**: Represents a workshop customer invoice. Key attributes: invoice number, date, status, customer reference, vehicle reference, job reference, subtotal, discount, tax/VAT, total, notes, created_by, workshop.
- **Invoice Line Item**: A single row on an invoice. Key attributes: description, type (Labor/Part/Other), quantity, unit price, discount, VAT flag, line total, invoice parent.
- **Customer**: Existing entity; referenced by invoice for billing details.
- **Vehicle**: Existing entity; referenced by invoice for service details.
- **Job**: Existing entity; optionally linked to invoice for traceability.

### Data Requirements *(mandatory if feature involves data)*

- **DR-001**: System MUST persist each Invoice with: invoice_number, invoice_date, status, workshop_id, customer_id, vehicle_id, job_id (nullable), created_by_user_id, subtotal_cents, discount_cents, tax_cents, total_cents, notes, created_at, updated_at.
- **DR-002**: System MUST persist each Invoice Line Item with: invoice_id, description, type (Labor/Part/Other), quantity, unit_price_cents, discount_cents, vat_applicable, vat_rate, line_total_cents, created_at, updated_at.
- **DR-003**: All invoice and line-item queries MUST be scoped to the requesting workshop_id per Constitution Principle XI.
- **DR-004**: Invoice numbers MUST be unique within a workshop (composite unique on `workshop_id + invoice_number`). The backend generates the number atomically using a per-workshop+branch+year sequence tracker.
- **DR-005**: System MUST store customer and vehicle snapshots at the time the invoice is Issued. Customer snapshot fields: customer_name, customer_phone, customer_email. Vehicle snapshot fields: vehicle_plate, vehicle_vin, vehicle_model, vehicle_year. Historical invoices MUST remain unchanged even if customer or vehicle records are modified, merged, or deleted later.
- **DR-006**: System MUST require valid workshop and branch codes before generating invoice numbers. Invoice creation MUST be rejected when the workshop code is missing or the branch code is missing. No fallback values are allowed. Rationale: Invoice numbers are financial references and must remain consistent, professional, and human-readable.

### API Requirements *(mandatory if feature exposes endpoints)*

- **API-001**: Endpoint `POST /api/invoices` MUST create a new invoice with line items, returning the created invoice with all calculated totals.
- **API-002**: Endpoint `GET /api/invoices` MUST return a paginated, workshop-scoped list of invoices with optional filters (status, date range, customer, vehicle, job).
- **API-003**: Endpoint `GET /api/invoices/:id` MUST return full invoice details including line items, customer snapshot, vehicle snapshot, and job reference.
- **API-004**: Endpoint `PATCH /api/invoices/:id` MUST update a Draft invoice only; MUST reject updates to non-Draft invoices for non-manager users.
- **API-005**: Endpoint `PATCH /api/invoices/:id/cancel` MUST transition an invoice to Cancelled status, preserving audit history.
- **API-006**: Endpoint `GET /api/invoices/:id/pdf` MUST generate and return a PDF of the invoice, verifying workshop ownership before generation.
- **API-007**: [API-first requirement per Constitution Principle XIII]: All API contracts MUST be stable; frontend MUST NOT duplicate business logic; calculation logic MUST exist only in the backend.
- **API-008**: Endpoint `POST /api/jobs/:job_id/invoice` MUST generate a draft invoice prefilled from the job's customer, vehicle, labor, parts, and advisor data. The user MAY then PATCH the draft before issuing.
- **API-009**: When creating an invoice, the backend MUST validate that the workshop code and branch code exist before invoice number generation. If the workshop code is missing, return `400 Bad Request` with message `"Workshop code is required before invoices can be generated"`. If the branch code is missing, return `400 Bad Request` with message `"Branch code is required before invoices can be generated"`.

### UI Requirements *(mandatory if feature has UI)*

- **UI-001**: The /invoice page MUST display: a searchable invoice list, a "Create Invoice" button, an invoice form with add/remove line-item controls, a live preview panel, and an "Export PDF" button. The invoice number field MUST be read-only; before save it shows "Auto-generated on save", after save it displays the generated invoice number.
- **UI-002**: The invoice form MUST auto-calculate totals as line items are added, removed, or edited. Totals MUST be visible at all times.
- **UI-003**: Status badges MUST use clear, color-coded labels: Draft (gray), Issued (blue), Cancelled (red).
- **UI-004**: The form MUST allow the user to save as Draft or Issue the invoice with a single click.
- **UI-005**: Tables MUST be scrollable on mobile viewports.
- **UI-006**: The job detail page MUST include a "Generate Invoice" button that pre-fills the invoice form and opens the invoice editor for review before issuance.
- **UI-007**: The invoice PDF preview and exported PDF MUST display workshop branding (logo, name, address, contact, VAT/TRN) and MUST NOT display PrioraFlow branding.

---

## Edge Cases *(mandatory)*

- **EC-001**: Invoice with zero VAT — line items marked non-VAT must not contribute to tax calculation.
- **EC-002**: Invoice with 100% discount — grand total must be zero; status can still be Issued.
- **EC-003**: [MOVED TO FUTURE SCOPE: Payment tracking excluded from v1.]
- **EC-004**: Invoice cancelled after being issued — cancelled invoice remains in history; no refunds handled in v1.
- **EC-005**: Empty customer email — invoice can still be created and issued; PDF export is unaffected.
- **EC-006**: Concurrent invoice creation — database transaction and unique constraint on `workshop_id + invoice_number` MUST prevent duplicate numbers; retry logic handled by generator service.
- **EC-007**: Negative quantity or unit price — system MUST reject with validation error before saving.
- **EC-008**: PDF export failure — system MUST show an error message and allow retry; invoice data is not lost.
- **EC-009**: Very long item descriptions — PDF must wrap text without breaking table layout.
- **EC-010**: Job deleted after invoice creation — invoice must remain intact with customer and vehicle snapshots preserved.
- **EC-011**: Customer record updated after invoice issuance — invoice continues displaying original snapshot values.
- **EC-012**: Vehicle record deleted after invoice issuance — invoice remains accessible and displays preserved vehicle snapshot.
- **EC-013**: Workshop logo missing — PDF generates successfully using workshop name only.
- **EC-014**: Workshop code missing — invoice creation MUST be rejected with `400 Bad Request` and clear error message. No fallback invoice number is generated.
- **EC-015**: Branch code missing — invoice creation MUST be rejected with `400 Bad Request` and clear error message. No fallback invoice number is generated.

---

## Permission Rules *(mandatory if feature enforces access control)*

- **PERM-001**: Service Advisor MUST be able to create invoices, edit their own Draft invoices, and export PDFs.
- **PERM-002**: Service Advisor MUST NOT be able to cancel invoices, edit Issued/Paid/Partially Paid invoices, or view invoices from another workshop.
- **PERM-003**: Manager and Admin MUST be able to create, edit, cancel, and view all invoices within their workshop, and export PDFs.
- **PERM-004**: All roles MUST NOT be able to access invoices from another workshop per Constitution Principle XI.

---

## Risk to Existing System *(mandatory)*

- **RISK-001**: Incorrect financial calculations (subtotal, VAT, discount stacking) could lead to billing errors and customer disputes.
  - **MITIGATION**: All calculations MUST be centralized in backend services with unit tests for every combination (with/without VAT, with/without discount). Frontend MUST display backend-computed totals only.
- **RISK-002**: Tenant isolation mistakes could expose one workshop's invoices to another.
  - **MITIGATION**: Every query MUST use `prisma.tenant` (workshop-scoped). Add integration tests that verify cross-workshop access is blocked at the API level.
- **RISK-003**: PDF formatting issues on different browsers or mobile devices.
  - **MITIGATION**: Use a server-side PDF generation library (e.g., Puppeteer, PDFKit) rather than client-side print-to-PDF. Test PDF output with long descriptions and many line items.
- **RISK-004**: Overcomplicating the invoice flow by adding payment gateway or ERP sync in v1.
  - **MITIGATION**: Explicitly exclude payment gateway integration, automatic ERP sync, and accounting system integration from v1 scope per Implementation Notes.
- **RISK-005**: The existing `invoices` model in the schema is for SaaS subscription billing (platform-level). Reusing or conflicting with it could corrupt platform billing data.
  - **MITIGATION**: Create a new, separate entity (e.g., `workshop_invoices` or `service_invoices`) distinct from the existing `invoices` table. Document this separation in the data model.
- **RISK-006**: Customer or vehicle data changes may alter historical invoices.
  - **MITIGATION**: Use immutable invoice snapshots stored at issuance time (DR-005). Display snapshot values on issued invoices, not live entity data.
- **RISK-007**: Missing workshop branding configuration may result in incomplete PDF output.
  - **MITIGATION**: Provide branding defaults (workshop name from workshops table, blank optional fields) and validate required branding fields before issuing invoices.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A service advisor can create a complete invoice with 3+ line items in under 2 minutes.
- **SC-002**: 90% of invoices created in the system are exported as PDF within the same session.
- **SC-003**: Workshop invoice records replace at least 50% of manual Excel invoices within 30 days of feature release.
- **SC-004**: Zero cross-workshop invoice data leaks detected in security tests.
- **SC-005**: Invoice calculations (subtotal, discount, VAT, grand total) are 100% accurate across all tested edge cases.
- **SC-006**: At least 80% of invoices are generated directly from Jobs rather than fully manual creation.

## Testing Requirements *(mandatory)*

### InvoiceNumberService Tests

- **TEST-001**: `InvoiceNumberService` MUST reject invoice generation when workshop code is missing, throwing `BadRequestException` with message `"Workshop code is required before invoices can be generated"`.
- **TEST-002**: `InvoiceNumberService` MUST reject invoice generation when branch code is missing, throwing `BadRequestException` with message `"Branch code is required before invoices can be generated"`.
- **TEST-003**: `InvoiceNumberService` MUST generate a correct invoice number when both workshop code and branch code exist.
- **TEST-004**: `InvoiceNumberService` MUST never produce fallback invoice numbers (e.g., `WS-{id}`, `BR-{id}`, `UNKNOWN`, `DEFAULT`) under any circumstances.

### Integration Tests

- **TEST-005**: `POST /api/invoices` with a workshop that has no `code` configured MUST return `400 Bad Request`.
- **TEST-006**: `POST /api/jobs/:job_id/invoice` where the job's branch has no `code` configured MUST return `400 Bad Request`.

## Out of Scope (Version 1)

The following are not included in v1:

- Payment gateway integration
- Accounting software integration
- ERP integration
- Customer portal invoice viewing
- Email invoice delivery
- SMS invoice delivery
- WhatsApp invoice delivery
- QR code payments
- Credit notes
- Refund workflows
- Multi-currency support
- Multi-language invoices

These may be considered in future versions.

## Assumptions

- **AS-001**: A new database entity separate from the existing `invoices` model (which handles SaaS subscription billing) will be created for workshop customer invoices. The existing `invoices` model remains untouched.
- **AS-002**: Workshop VAT rate is configurable per workshop settings (default 5% for UAE/AED). The system will read the VAT rate from workshop configuration.
- **AS-003**: Payment recording is excluded from v1. Invoices display grand total only. Workshops track payments outside PrioraFlow.
- **AS-004**: Currency is inherited from workshop settings (default AED). No multi-currency support in v1.
- **AS-005**: Invoice numbers are auto-generated by the backend in format `{WORKSHOP_CODE}-{BRANCH_CODE}-{YEAR}-{SERIAL}` (e.g., `GAR-DEI-2026-000001`). Serial numbers are sequential per workshop + branch + year and reset annually. Users cannot manually edit invoice numbers in v1.
- **AS-006**: Customer portal invoice viewing is out of scope for v1.
- **AS-007**: Existing job, customer, and vehicle data models are reused; no changes to their schemas required.
- **AS-008**: Workshop branding configuration (logo, address, phone, email, VAT/TRN, terms) is stored in an extended workshop settings area. Default values are derived from existing workshops table fields where available.
- **AS-009**: Payment tracking is intentionally excluded from v1. A future Payments or Receivables module may add Paid status, payment history, payment methods, and balance due.
