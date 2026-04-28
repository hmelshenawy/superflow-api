# SuperFlow Backend Modules

This file is a practical module-by-module reference for developers.

## AppModule

File: `src/app.module.ts`

Purpose:
- root composition module
- loads config globally
- enables global request throttling
- imports every feature module

Notes:
- `ThrottlerGuard` is registered as an app-wide guard
- feature-specific throttles still override or tighten limits on selected routes

---

## AuthModule

Files:
- `src/auth/auth.module.ts`
- `src/auth/auth.controller.ts`
- `src/auth/auth.service.ts`

Purpose:
- authenticate users
- issue/refresh/revoke tokens
- expose current user profile and active sessions
- handle profile update and password change

Key routes:
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/:id`
- `PATCH /api/auth/profile`
- `POST /api/auth/change-password`

Key logic:
- validates user with bcrypt against `users.password_hash`
- signs access token with user id + role
- stores refresh token as SHA-256 hash in `refresh_tokens`
- rotates refresh token on refresh
- revokes sessions on logout
- password change revokes all but the latest live session

Tables touched:
- `users`
- `roles`
- `refresh_tokens`

Important developer notes:
- response uses `accessToken` / `refreshToken` naming
- frontend also supports fallback shapes in some places, so avoid changing token field names casually
- login and refresh are rate-limited

---

## JobsModule

Files:
- `src/jobs/jobs.controller.ts`
- `src/jobs/jobs.service.ts`
- `src/jobs/jobs.state-machine.ts`

Purpose:
- own the main workshop job record
- manage job status transitions
- expose job board, job details, assignment, archive/unarchive

Key routes:
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `POST /api/jobs`
- `PATCH /api/jobs/:id`
- `PATCH /api/jobs/:id/status`
- `POST /api/jobs/:id/assign`
- `PATCH /api/jobs/:id/archive`
- `PATCH /api/jobs/:id/unarchive`
- `DELETE /api/jobs/:id`

Key logic:
- creates job numbers like `SF-...`
- filters job list by role
  - advisors see their jobs
  - technicians see assigned jobs
- supports archived/non-archived views
- search is implemented with raw SQL against jobs, customers, and vehicles
- transitions are enforced by `canTransition()` from `jobs.state-machine.ts`
- status changes create `job_status_history` rows
- moving away from `closed` clears `invoiced_at` and `archived_at`
- moving away from `ready` back to earlier stages clears `completed_at`

Job flow:
- `booked`
- `checking`
- `estimate_sent`
- `approved`
- `in_progress`
- `waiting_parts`
- `quality_check`
- `ready`
- `closed`

Tables touched:
- `jobs`
- `job_status_history`
- related joins: `customers`, `vehicles`, `users`, `estimate_lines`, `inspections`, `media_files`, `approval_tokens`

Important developer notes:
- `findOne()` is heavily enriched and acts like a dashboard payload
- archived jobs are excluded by default unless explicitly requested
- there is still a legacy helper `archiveOldClosedJobs()` inside `JobsService`; the active scheduled archive path is in `SchedulerService`

---

## InspectionsModule

Files:
- `src/inspections/inspections.controller.ts`
- `src/inspections/inspections.service.ts`
- `src/inspections/templates.controller.ts`
- `src/inspections/templates.service.ts`

Purpose:
- manage inspection sessions for jobs
- store responses for template items
- submit/reopen inspections
- manage reusable inspection templates

Key routes:
- `GET /api/inspections`
- `GET /api/inspections/:id`
- `POST /api/inspections`
- `PUT /api/inspections/:id/responses`
- `POST /api/inspections/:id/submit`
- `POST /api/inspections/:id/reopen`
- `GET /api/inspection-templates`
- `GET /api/inspection-templates/:id`
- `POST /api/inspection-templates`
- `POST /api/inspection-templates/:id/sections`
- `POST /api/inspection-templates/:id/items`
- `PATCH /api/inspection-templates/:id/publish`

Key logic:
- only one inspection exists per job (`inspections.job_id` is unique)
- creating an inspection auto-moves a job from `booked` to `checking`
- responses are upserted by `(inspection_id, item_id)`
- inspections lock when status becomes `submitted`, `reviewed`, or `approved`
- submit queues an advisor notification and writes an audit log
- reopen restores `in_progress`
- media URLs are rewritten to API proxy URLs because browsers cannot directly reach internal MinIO hostnames

Tables touched:
- `inspections`
- `inspection_responses`
- `inspection_templates`
- `inspection_sections`
- `inspection_items`
- `media_files`
- `notifications`
- `audit_logs`
- `jobs`

Important developer notes:
- `offline_draft` is stored as JSON string on the inspection row
- customer-facing inspection findings are later derived from inspection responses in the authorisation portal flow

---

## EstimatesModule

Files:
- `src/estimates/estimates.controller.ts`
- `src/estimates/estimates.service.ts`

Purpose:
- manage quote/estimate lines for a job
- provide defaults like tax rate and labour rate
- support full job-level bulk replacement from the quote builder UI

Key routes:
- `GET /api/estimates/defaults`
- `GET /api/estimates/job/:jobId`
- `GET /api/estimates`
- `GET /api/estimates/:id`
- `POST /api/estimates`
- `PUT /api/estimates/:id`
- `DELETE /api/estimates/:id`
- `PUT /api/estimates/job/:jobId/bulk`

Key logic:
- computes `line_total` and `tax_amount` server-side
- snapshots existing line into `estimate_line_history` before update
- bulk replace updates existing lines, creates new ones, and handles stale lines carefully
- stale lines are preserved instead of deleted if referenced by:
  - `authorisation_decisions`
  - `deferred_work`
  - `estimate_line_history`

Tables touched:
- `estimate_lines`
- `estimate_line_history`
- `settings`
- `labour_rates`
- reference checks against `authorisation_decisions` and `deferred_work`

Important developer notes:
- quote grouping uses `quote_group_id` and `quote_group_title`
- estimate lines may be linked back to inspection responses via `inspection_response_id`
- preserved stale lines are detached from the job rather than hard-deleted

---

## AuthorisationModule

Files:
- `src/authorisation/authorisation.controller.ts`
- `src/authorisation/authorisation.service.ts`

Purpose:
- create customer approval links
- expose staff-side approval status
- serve portal payload to customers
- accept customer decisions

Controllers:
- staff controller under `/api/jobs/*`
- public portal controller under `/api/portal/*`

Key staff routes:
- `POST /api/jobs/:id/auth-request`
- `GET /api/jobs/:id/auth-status`

Key portal routes:
- `GET /api/portal/:token`
- `POST /api/portal/:token/decide`
- `GET /api/portal/:token/media/:mediaId`

Key logic:
- approval tokens are stored hashed, not raw
- approval links expire after 7 days by default
- generating an approval link moves the job to `estimate_sent` when valid
- portal payload includes:
  - job/customer/vehicle summary
  - inspection findings grouped by severity
  - grouped estimate lines
  - job photos
  - existing decisions
- customer decisions are stored per estimate line
- decline/defer creates `deferred_work` if not already present
- customer submission marks token as used
- successful submission moves job to `approved` when valid
- advisor receives follow-up notification

Tables touched:
- `approval_tokens`
- `authorisation_decisions`
- `jobs`
- `job_status_history`
- `deferred_work`
- `notifications`
- `estimate_lines`
- `inspections`, `inspection_responses`, `media_files`

Important developer notes:
- portal media is proxied only after token validation
- `getAuthStatus()` exposes `hasActiveToken` used by the frontend polling logic
- grouping order is important: red findings first, then amber, custom groups, then general

---

## MediaModule

Files:
- `src/media/media.controller.ts`
- `src/media/media.service.ts`

Purpose:
- upload/store media
- generate staff download URLs
- stream media safely through the API
- soft-delete media records

Key routes:
- `POST /api/media/presign`
- `POST /api/media/confirm`
- `POST /api/media/upload-direct`
- `GET /api/media/:id/url`
- `GET /api/media/:id/download`
- `GET /api/media/:id`
- `DELETE /api/media/:id`

Key logic:
- filenames are normalized to `{job_number}_{timestamp}.{ext}`
- upload can be presigned or direct
- uploads may auto-create an empty `inspection_response` if only inspection + item are supplied
- soft delete keeps DB record but sets `is_deleted = true`
- inspection response `media_count` is maintained on add/remove
- `Content-Disposition` is sanitized to avoid invalid header errors

Tables touched:
- `media_files`
- `jobs`
- `inspection_responses`

Important developer notes:
- storage metadata lives in the DB; binary file lives in S3/MinIO
- do not assume direct bucket URLs are safe for browser use in all flows

---

## NotificationsModule

Files:
- `src/notifications/notifications.service.ts`
- `src/notifications/notifications.processor.ts`

Purpose:
- queue notifications in DB
- enqueue delivery jobs into BullMQ
- deliver through configured provider webhooks

Key behavior:
- DB row is created first
- BullMQ queue is best-effort; if queue init fails, rows stay queued in DB
- worker retries failed jobs with exponential backoff
- queued DB notifications are re-enqueued on startup and every 5 seconds
- if no webhook is configured for a channel, notification is marked sent via `noop`

Tables touched:
- `notifications`
- optionally `notification_templates`

Important developer notes:
- DB is the source of truth; BullMQ is delivery machinery
- notifications can exist and be visible even if no external provider is configured yet

---

## SchedulerModule

File:
- `src/scheduler/scheduler.service.ts`

Purpose:
- background cron tasks

Current job:
- archive all closed jobs that are still unarchived

Behavior:
- runs once at startup (`OnModuleInit`) as catch-up
- runs nightly at `0 0 * * *` UTC
- logs whether jobs were archived or nothing was found
- catches and logs failures instead of failing silently

Tables touched:
- `jobs`

---

## AdminModule

Files:
- `src/admin/admin.controller.ts`
- `src/admin/admin.service.ts`

Purpose:
- back-office/config APIs
- settings and labour rates
- roles
- integrations test endpoint
- inspection template CRUD/editor endpoints
- dashboard summary stats

Key routes:
- `/api/admin/settings`
- `/api/admin/stats`
- `/api/admin/labour-rates`
- `/api/admin/roles`
- `/api/admin/integrations`
- `/api/admin/templates`
- section/item reorder and CRUD routes

Tables touched:
- `settings`
- `labour_rates`
- `roles`
- `integrations`
- `integration_events`
- `inspection_templates`
- `inspection_sections`
- `inspection_items`
- plus counts from core operational tables

Important developer notes:
- some inspection template functionality exists both here and under `inspection-templates`
- admin endpoints are richer and effectively back the template editor UI

---

## CustomersModule

Purpose:
- customer CRUD
- search
- customer job history
- customer deferred work view

Primary table:
- `customers`

Important relations:
- `jobs`
- `deferred_work`
- `vehicles`

---

## VehiclesModule

Purpose:
- vehicle CRUD
- lookup by VIN
- list vehicles for a customer

Primary table:
- `vehicles`

Important relations:
- `customers`
- `jobs`
- `vehicle_service_history`

---

## UsersModule

Purpose:
- staff user CRUD
- invite/create/deactivate accounts

Primary tables:
- `users`
- `roles`

Important notes:
- delete is soft-style deactivation, not destructive removal

---

## DeferredModule

Purpose:
- manage deferred customer work
- send reminders
- convert deferred items back into new jobs

Primary tables:
- `deferred_work`
- `deferred_work_reminders`

Important notes:
- many deferred rows are created as a side effect of customer portal decisions

---

## AuditModule

Purpose:
- browse operational audit logs

Primary table:
- `audit_logs`

Important notes:
- mostly for admin visibility and traceability
