# Backend entity map

This file is a fast orientation map for the main database entities in SuperFlow.

Use it to answer:
- which module owns a table
- what the table is for
- what other tables depend on it
- which screens/workflows are likely to break if it changes

## How to read this

- **Owner module** = the backend module/service that most clearly owns the business logic
- **Shared by** = other modules that read/write it as part of bigger workflows
- **High-risk changes** = places where a schema or behavior change can ripple into multiple flows

---

## 1) Core workshop flow

### `jobs`
- **Owner module:** `JobsModule`
- **Purpose:** the main workshop job / RO record
- **Key fields:** `job_number`, `customer_id`, `vehicle_id`, `advisor_id`, `technician_id`, `status`, `customer_concern`, `archived_at`
- **Related tables:**
  - belongs to `customers`
  - belongs to `vehicles`
  - has one `inspections`
  - has many `estimate_lines`
  - has many `approval_tokens`
  - has many `notifications`
  - has many `media_files`
  - has many `job_status_history`
  - can be linked from `deferred_work` as original job or booked job
- **Used by:** jobs board, job details, estimate builder, inspection flow, portal approval flow, archive flow
- **High-risk changes:** status logic, archive behavior, advisor/technician assignment, any response-shape change in job details

### `customers`
- **Owner module:** `CustomersModule`
- **Purpose:** customer master record
- **Key fields:** `name`, `email`, `phone`, `preferred_contact`, `language`, `is_active`
- **Related tables:**
  - has many `vehicles`
  - has many `jobs`
  - has many `deferred_work`
  - has many `notifications`
- **Used by:** customer search, job creation, deferred reminders, portal delivery target selection
- **High-risk changes:** soft-delete semantics, contact-preference handling, search fields

### `vehicles`
- **Owner module:** `VehiclesModule`
- **Purpose:** vehicle master record
- **Key fields:** `vin`, `make`, `model`, `year`, `plate`, `vehicle_type`, `odometer_km`
- **Related tables:**
  - belongs to `customers`
  - has many `jobs`
  - has many `deferred_work`
  - has many `vehicle_service_history`
- **Used by:** job creation, VIN lookup, customer history, portal/report context
- **High-risk changes:** VIN uniqueness, customer ownership, vehicle type used by template selection

### `job_status_history`
- **Owner module:** `JobsModule`
- **Purpose:** audit trail of job status transitions
- **Key fields:** `from_status`, `to_status`, `changed_by`, `reason`, `changed_at`
- **Related tables:** belongs to `jobs`, belongs to `users`
- **Used by:** debugging workflow transitions, future reporting/auditing
- **High-risk changes:** anything that stops status history from being written consistently

---

## 2) Inspection system

### `inspection_templates`
- **Owner module:** `InspectionsModule` / admin template management
- **Purpose:** reusable inspection template header
- **Key fields:** `name`, `vehicle_type`, `is_default`, `is_active`, `created_by`
- **Related tables:**
  - has many `inspection_sections`
  - has many `inspections`
- **Used by:** inspection template selector, admin template editor
- **High-risk changes:** template publish/default behavior, vehicle-type filtering

### `inspection_sections`
- **Owner module:** `InspectionsModule` / admin template management
- **Purpose:** sections inside a template
- **Key fields:** `template_id`, `name`, `icon`, `sort_order`, `is_active`
- **Related tables:** belongs to `inspection_templates`, has many `inspection_items`
- **Used by:** inspection UI section rendering, admin template editor
- **High-risk changes:** section ordering, cascade behavior when deleting/reordering

### `inspection_items`
- **Owner module:** `InspectionsModule` / admin template management
- **Purpose:** individual checklist items/questions
- **Key fields:** `label`, `input_type`, `options`, `unit`, `requires_photo`, `requires_note_on`, `sort_order`
- **Related tables:** belongs to `inspection_sections`, has many `inspection_responses`
- **Used by:** technician checklist UI, admin template editor
- **High-risk changes:** `input_type` meanings, required-photo/note rules

### `inspections`
- **Owner module:** `InspectionsModule`
- **Purpose:** one inspection session for one job
- **Key fields:** `job_id` (unique), `template_id`, `technician_id`, `status`, `offline_draft`, `started_at`, `submitted_at`
- **Related tables:**
  - belongs to `jobs`
  - belongs to `inspection_templates`
  - belongs to `users` as technician
  - has many `inspection_responses`
- **Used by:** technician workflow, inspection viewer, advisor handoff
- **High-risk changes:** one-inspection-per-job assumption, lock/reopen rules, offline draft storage

### `inspection_responses`
- **Owner module:** `InspectionsModule`
- **Purpose:** saved answers for each inspection item
- **Key fields:** `inspection_id`, `item_id`, `value`, `urgency`, `tech_notes`, `media_count`, `recorded_at`
- **Related tables:**
  - belongs to `inspections`
  - belongs to `inspection_items`
  - has many `media_files`
  - can have many `estimate_lines`
- **Used by:** findings view, quote generation, portal findings, technician re-edits
- **High-risk changes:** unique `(inspection_id, item_id)` behavior, urgency classification, media_count sync

---

## 3) Quote / estimate system

### `estimate_lines`
- **Owner module:** `EstimatesModule`
- **Purpose:** quote lines for labour, parts, or sublets
- **Key fields:** `job_id`, `inspection_response_id`, `quote_group_id`, `type`, `description`, `quantity`, `unit_price`, `discount_pct`, `tax_rate_pct`, `line_total`, `is_recommended`, `sort_order`
- **Related tables:**
  - belongs to `jobs`
  - optionally belongs to `inspection_responses`
  - belongs to `users` via `added_by`
  - has many `authorisation_decisions`
  - has many `estimate_line_history`
  - can be referenced by `deferred_work`
- **Used by:** quote builder, customer portal approvals, deferred work creation
- **High-risk changes:** money calculations, bulk replace semantics, quote grouping, deletion rules for referenced rows

### `estimate_line_history`
- **Owner module:** `EstimatesModule`
- **Purpose:** snapshot history before line edits
- **Key fields:** `line_id`, `snapshot`, `changed_by`, `changed_at`
- **Related tables:** belongs to `estimate_lines`, belongs to `users`
- **Used by:** historical trace, preserving referenced quote lines during bulk replace
- **High-risk changes:** if snapshots stop being written, stale-line preservation logic becomes weaker

---

## 4) Customer approval / portal

### `approval_tokens`
- **Owner module:** `AuthorisationModule`
- **Purpose:** public customer approval links per job
- **Key fields:** `job_id`, `token_hash`, `channel`, `sent_to`, `expires_at`, `used_at`, `is_revoked`
- **Related tables:** belongs to `jobs`, belongs to `users` via `revoked_by`, has many `authorisation_decisions`
- **Used by:** send/resend approval link, portal access control, auth-status polling
- **High-risk changes:** token expiry, single-use behavior, revocation, status checks

### `authorisation_decisions`
- **Owner module:** `AuthorisationModule`
- **Purpose:** customer decision per estimate line
- **Key fields:** `token_id`, `estimate_line_id`, `decision`, `customer_comment`, `decided_at`
- **Related tables:** belongs to `approval_tokens`, belongs to `estimate_lines`
- **Used by:** portal decision submit, advisor review, deferred work conversion
- **High-risk changes:** uniqueness per `(token_id, estimate_line_id)`, approved/declined/deferred mapping

---

## 5) Deferred work

### `deferred_work`
- **Owner module:** `DeferredModule`
- **Purpose:** estimate items the customer did not do now but may return for later
- **Key fields:** `customer_id`, `vehicle_id`, `original_job_id`, `estimate_line_id`, `status`, `urgency`, `remind_after`, `remind_count`, `booked_job_id`
- **Related tables:**
  - belongs to `customers`
  - belongs to `vehicles`
  - belongs to original `jobs`
  - can link to booked `jobs`
  - belongs to `estimate_lines`
  - has many `deferred_work_reminders`
- **Used by:** deferred tab/list, reminder flow, rebook-to-job flow
- **High-risk changes:** booked conversion, reminder timing, keeping link back to original estimate line

### `deferred_work_reminders`
- **Owner module:** `DeferredModule`
- **Purpose:** reminder delivery history for deferred items
- **Key fields:** `deferred_work_id`, `channel`, `sent_to`, `delivery_status`, `sent_at`
- **Related tables:** belongs to `deferred_work`
- **Used by:** reminder history, future follow-up reporting
- **High-risk changes:** if reminders are not logged, support/debugging gets harder

---

## 6) Media

### `media_files`
- **Owner module:** `MediaModule`
- **Purpose:** uploaded photos/videos/files tied to jobs or inspection responses
- **Key fields:** `job_id`, `inspection_response_id`, `s3_bucket`, `s3_key`, `file_type`, `mime_type`, `original_filename`, `scan_status`, `is_deleted`
- **Related tables:** belongs to `jobs`, belongs to `inspection_responses`, belongs to `users` as uploader
- **Used by:** inspection media, job photos, portal media proxy, file download flow
- **High-risk changes:** filename normalization, soft-delete behavior, S3/MinIO key layout, response media_count sync

---

## 7) Notifications

### `notifications`
- **Owner module:** `NotificationsModule`
- **Purpose:** durable notification queue/history row
- **Key fields:** `job_id`, `customer_id`, `channel`, `recipient`, `subject`, `body_rendered`, `status`, `provider`, `provider_message_id`
- **Related tables:** belongs to `jobs`, belongs to `customers`, optionally belongs to `notification_templates`
- **Used by:** advisor alerts, deferred reminders, approval link sends, provider retry logic
- **High-risk changes:** queued/sent/failed lifecycle, retry semantics, webhook provider behavior

### `notification_templates`
- **Owner module:** `NotificationsModule` / admin-owned data
- **Purpose:** reusable template metadata for notifications
- **Related tables:** has many `notifications`
- **Used by:** future/admin-driven templated notifications more than core current flows
- **High-risk changes:** low-medium right now unless templating gets expanded

---

## 8) Auth and staff admin

### `users`
- **Owner module:** `UsersModule` + `AuthModule`
- **Purpose:** staff accounts
- **Key fields:** `role_id`, `name`, `email`, `password_hash`, `is_active`, `avatar_url`, `last_login_at`
- **Related tables:**
  - belongs to `roles`
  - has many `refresh_tokens`
  - referenced by `jobs`, `inspections`, `estimate_lines`, `media_files`, `audit_logs`, `settings`, `approval_tokens`
- **Used by:** login, staff admin, assignment, audit attribution
- **High-risk changes:** auth identity fields, role linkage, soft-deactivation behavior

### `roles`
- **Owner module:** `AdminModule`
- **Purpose:** role definitions + permission payloads
- **Key fields:** `name`, `permissions`, `description`
- **Related tables:** has many `users`
- **Used by:** role guard checks, admin staff management
- **High-risk changes:** role names used in decorators (`admin`, `manager`, `service_advisor`, `technician`)

### `refresh_tokens`
- **Owner module:** `AuthModule`
- **Purpose:** session persistence and token rotation
- **Key fields:** `user_id`, `token_hash`, `device_info`, `expires_at`, `revoked_at`
- **Related tables:** belongs to `users`
- **Used by:** login, refresh, session listing/revocation
- **High-risk changes:** token hashing, revocation logic, session UX

---

## 9) Admin/config/integration support

### `settings`
- **Owner module:** `AdminModule`
- **Purpose:** dynamic app settings stored in DB
- **Key fields:** `key`, `value`, `value_type`, `updated_by`, `updated_at`
- **Related tables:** belongs to `users` via `updated_by`
- **Used by:** estimate defaults, admin settings screens, runtime configuration
- **High-risk changes:** key naming, value parsing, numeric/string fallback logic

### `labour_rates`
- **Owner module:** `AdminModule`
- **Purpose:** labour rate master data
- **Key fields:** `name`, `rate_per_hour`, `currency`, `is_active`
- **Used by:** estimate defaults, quote builder rate selection
- **High-risk changes:** standard-rate fallback assumptions

### `integrations`
- **Owner module:** `AdminModule`
- **Purpose:** external integration configuration registry
- **Key fields:** `name`, `type`, `config`, `is_enabled`, `last_test_status`
- **Related tables:** has many `integration_events`
- **Used by:** integration admin/testing
- **High-risk changes:** config serialization and test behavior

### `integration_events`
- **Owner module:** `AdminModule` / integration support
- **Purpose:** event log of integration attempts/results
- **Key fields:** `integration_id`, `event_type`, `direction`, `status`, `http_status`, `attempt_count`
- **Related tables:** belongs to `integrations`
- **Used by:** debugging integration issues, future observability
- **High-risk changes:** event logging consistency

### `audit_logs`
- **Owner module:** `AuditModule`
- **Purpose:** generic audit trail for sensitive actions
- **Key fields:** `user_id`, `entity_type`, `entity_id`, `action`, `old_values`, `new_values`, `ip_address`, `user_agent`
- **Related tables:** belongs to `users`
- **Used by:** admin audit screen, security/debugging, reopen/submit traces
- **High-risk changes:** redaction, sensitive-body logging, retention assumptions

### `vehicle_service_history`
- **Owner module:** shared, mostly `VehiclesModule` / `JobsModule`
- **Purpose:** historical service entries per vehicle
- **Key fields:** `vehicle_id`, `job_id`, `odometer_km`, `summary`, `serviced_at`
- **Related tables:** belongs to `vehicles`, belongs to `jobs`
- **Used by:** vehicle detail history context
- **High-risk changes:** relatively lower risk than core workflow tables

---

## Practical dependency map

If you change...

- **job status logic** → check `jobs`, `job_status_history`, `inspections`, portal auth status, archive scheduler
- **inspection response shape** → check `inspection_responses`, `estimate_lines`, `media_files`, portal findings rendering
- **estimate line lifecycle** → check `estimate_lines`, `estimate_line_history`, `authorisation_decisions`, `deferred_work`
- **portal token behavior** → check `approval_tokens`, `authorisation_decisions`, public `/portal/*` endpoints, frontend polling
- **media behavior** → check `media_files`, inspection response `media_count`, portal media proxy, Content-Disposition safety
- **notification flow** → check `notifications`, deferred reminders, inspection submit alerts, auth-request sending

---

## Recommended reading after this file

1. `docs/backend-modules.md`
2. `docs/backend-request-flows.md`
3. `docs/backend-business-rules.md`
4. `docs/backend-api-map.md`
