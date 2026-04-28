# SuperFlow Backend Request Flows

This file explains the most important end-to-end backend flows.

## 1. Login and session flow

### Route sequence
1. `POST /api/auth/login`
2. frontend stores `access_token` + `refresh_token`
3. frontend calls `GET /api/auth/me`
4. protected API calls include `Authorization: Bearer <access_token>`

### Backend flow
- `AuthController.login()` calls `AuthService.login()`
- user is fetched by email with role relation
- bcrypt validates the password against `password_hash`
- `last_login_at` is updated
- expired/revoked refresh tokens are cleaned up
- JWT access token is signed with:
  - `sub = user.id`
  - `role = user.roles?.name`
- new refresh token is created and stored hashed in `refresh_tokens`
- user summary is returned

### Refresh flow
1. frontend calls `POST /api/auth/refresh`
2. backend hashes the incoming refresh token
3. backend looks up the token in `refresh_tokens`
4. old session token is revoked
5. new access token + new refresh token are created

### Important rules
- refresh token rotation is mandatory
- legacy bcrypt-hashed refresh token rows are still supported during migration
- repeated failed login attempts trigger throttling

---

## 2. Job creation flow

### Route
- `POST /api/jobs`

### Backend flow
- `JobsService.create()` generates a new `job_number`
- links customer and vehicle
- sets advisor to the provided value or current user
- stores concern, odometer, promised date, DMS RO number
- initial status defaults to `booked` from the schema

### Important rules
- job is the main parent record for inspections, estimates, portal approvals, notifications, and media
- job numbers are generated in application code, not by the DB

---

## 3. Inspection flow

### Start inspection
Route:
- `POST /api/inspections`

Flow:
- if an inspection already exists for the job, return it
- if the job is still `booked`, move it to `checking`
- create inspection row with:
  - `job_id`
  - `template_id`
  - `technician_id`
  - status `in_progress`
  - `started_at`

### Save responses
Route:
- `PUT /api/inspections/:id/responses`

Flow:
- inspection must exist and not be locked
- each response is upserted by `(inspection_id, item_id)`
- optional offline draft is persisted as JSON string on the inspection

### Submit inspection
Route:
- `POST /api/inspections/:id/submit`

Flow:
- inspection must not already be finalized
- status becomes `submitted`
- advisor notification row is queued
- audit log entry is created

### Reopen inspection
Route:
- `POST /api/inspections/:id/reopen`

Flow:
- only locked inspections can be reopened
- status becomes `in_progress`
- `submitted_at` is cleared
- audit log entry is created

### Important rules
- one inspection per job
- inspection media is later surfaced in both staff UI and customer portal
- inspection responses are the source for later estimate grouping and severity analysis

---

## 4. Estimate/quote flow

### Create line
Route:
- `POST /api/estimates`

Flow:
- quantity, unit price, discount, tax rate are normalized
- backend calculates:
  - `line_total`
  - `tax_amount`
- line is stored with grouping metadata and optional inspection response link

### Update line
Route:
- `PUT /api/estimates/:id`

Flow:
- existing line is loaded
- full snapshot is written into `estimate_line_history`
- totals are recalculated
- current row is updated

### Bulk replace job quote
Route:
- `PUT /api/estimates/job/:jobId/bulk`

Flow:
- load current job lines
- update matching incoming lines in place
- create brand new lines
- detect stale old lines
- if stale lines are referenced by decisions/history/deferred work:
  - detach them from the job and preserve them
- otherwise delete them
- return fresh ordered set for the job

### Important rules
- backend remains the authority for financial totals
- bulk replace is designed to protect historical references
- group ids/titles are important for customer portal rendering

---

## 5. Customer approval link flow

### Request approval
Route:
- `POST /api/jobs/:id/auth-request`

Flow:
- load job + customer + vehicle + estimate lines
- reject request if job has no estimate lines
- create random raw token
- hash token and store hash in `approval_tokens`
- build portal URL from `CUSTOMER_PORTAL_URL`
- if current job status can move to `estimate_sent`, transition it and write history
- queue customer notification with the link
- queue advisor notification that estimate was sent

### Check approval status
Route:
- `GET /api/jobs/:id/auth-status`

Flow:
- load latest token and decisions
- count approved / declined / deferred / pending lines
- expose `hasActiveToken`
- return a `decisionByLine` map for the UI

### Important rules
- tokens are hashed in storage
- token can be revoked, expired, or used once
- frontend polling depends on `hasActiveToken`, not just job status

---

## 6. Customer portal load flow

### Route
- `GET /api/portal/:token`

### Flow
- validate token by hash, expiry, and revocation
- mark `first_opened_at` on first load
- load job, inspection, estimate lines, media, and prior decisions
- rewrite media URLs to portal proxy URLs
- derive inspection findings from inspection responses:
  - failing/high urgency => red
  - warning/medium urgency => amber
- group estimate lines by:
  - `quote_group_id`
  - fallback `inspection_response_id`
  - otherwise `General / Other`
- sort groups in customer-friendly order:
  - red
  - amber
  - custom groups
  - general

### Output model
Portal payload includes:
- token metadata
- job summary
- findings
- job photos
- grouped estimate
- grand total
- existing decisions

---

## 7. Customer decision submission flow

### Route
- `POST /api/portal/:token/decide`

### Flow
- validate token
- reject if token already used
- validate all submitted line ids belong to the token’s job
- within one transaction:
  - create `authorisation_decisions` rows
  - for declined or deferred lines, create `deferred_work` if missing
  - mark token as used and record IP/user-agent
  - if job can move to `approved`, update status and create history row
- queue advisor notification summarizing counts

### Important rules
- token is effectively one-time-use after submission
- decisions are per estimate line, not one decision for the whole job
- declined and deferred both create deferred-work tracking records

---

## 8. Media upload flow

### Presigned upload path
Routes:
- `POST /api/media/presign`
- upload directly to S3/MinIO using signed URL
- `POST /api/media/confirm`

Flow:
- backend generates clean filename
- media DB row is created before upload completes
- client uploads directly to object storage
- client confirms metadata afterward

### Direct upload path
Route:
- `POST /api/media/upload-direct`

Flow:
- API receives multipart file
- uploads binary to S3/MinIO itself
- creates DB row immediately
- increments inspection response media count if linked

### Download path
Staff route:
- `GET /api/media/:id/download`

Portal route:
- `GET /api/portal/:token/media/:mediaId`

### Important rules
- filenames are sanitized to avoid invalid HTTP headers
- customer portal media must pass portal-token validation first

---

## 9. Nightly archive flow

### Where it lives
- `src/scheduler/scheduler.service.ts`

### Trigger points
- on app startup (`onModuleInit` catch-up)
- nightly cron at midnight UTC

### Flow
- find all jobs where:
  - `status = closed`
  - `archived_at IS NULL`
- set `archived_at = now()`
- log archived count or “No closed jobs to archive”

### Important rules
- no 24-hour waiting period anymore
- startup catch-up exists because cron-only execution can miss windows during restarts/deploys

---

## 10. Notification delivery flow

### Creation
Various business modules create rows in `notifications`, often with status `queued`.

### Enqueue
`NotificationsService` tries to place queued rows into BullMQ.

### Processing
`NotificationsProcessor` worker:
- picks queued jobs
- selects webhook URL by channel
- if no webhook exists, marks notification as sent via `noop`
- if webhook exists, posts JSON payload to it
- updates DB row to `sent` or `failed`

### Recovery behavior
- pending queued rows are re-enqueued on startup
- poller also retries every 5 seconds

### Important rules
- DB row is the durable truth
- webhook delivery is replaceable infrastructure, not business truth
