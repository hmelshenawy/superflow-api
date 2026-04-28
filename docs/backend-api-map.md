# Backend API map

This file is a route map for the current backend.

Use it to answer:
- what endpoints exist
- which module owns each endpoint
- what screen/workflow likely uses them
- what auth level protects them

## Assumptions

- Effective route prefix in practice is **`/api/...`**
- Global request throttling exists at app level
- Most staff routes use JWT auth
- Many write routes also use role checks via `RolesGuard`

## Auth legend

- **Public** = no JWT required
- **Public token** = customer portal token required in URL
- **JWT** = any authenticated staff user
- **JWT + roles(...)** = authenticated staff user with matching role

Current role names used in decorators:
- `admin`
- `manager`
- `service_advisor`
- `technician`

---

## 1) AuthModule

### `POST /api/auth/login`
- **Auth:** Public
- **Purpose:** sign in with email/password and issue access + refresh tokens
- **Used by:** login page
- **Notes:** stricter throttling than normal routes

### `POST /api/auth/refresh`
- **Auth:** Public
- **Purpose:** rotate refresh token and issue a fresh access token
- **Used by:** frontend auth refresh interceptor
- **Notes:** throttled

### `POST /api/auth/logout`
- **Auth:** JWT
- **Purpose:** revoke current user's refresh-token sessions
- **Used by:** logout action

### `GET /api/auth/me`
- **Auth:** JWT
- **Purpose:** load current staff profile
- **Used by:** auth bootstrap, auth guard, top-level app session restore

### `GET /api/auth/sessions`
- **Auth:** JWT
- **Purpose:** list active sessions for current user
- **Used by:** profile/security/session management UI

### `DELETE /api/auth/sessions/:id`
- **Auth:** JWT
- **Purpose:** revoke one specific session
- **Used by:** session management UI

### `PATCH /api/auth/profile`
- **Auth:** JWT
- **Purpose:** update own profile fields
- **Used by:** profile settings screen

### `POST /api/auth/change-password`
- **Auth:** JWT
- **Purpose:** change current password
- **Used by:** profile/security screen
- **Notes:** throttled

---

## 2) UsersModule

### `GET /api/users`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** list staff accounts
- **Used by:** admin staff screen

### `GET /api/users/:id`
- **Auth:** JWT
- **Purpose:** load one user record
- **Used by:** user detail/edit screens, assignment helpers

### `POST /api/users`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** create staff account
- **Used by:** admin staff creation

### `POST /api/users/invite`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** alternate create/invite endpoint
- **Used by:** admin invite flow

### `PATCH /api/users/:id`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** update staff account
- **Used by:** admin user editing

### `DELETE /api/users/:id`
- **Auth:** JWT + roles(`admin`)
- **Purpose:** soft-deactivate user
- **Used by:** admin staff management

---

## 3) CustomersModule

### `GET /api/customers`
- **Auth:** JWT
- **Purpose:** paginated customer list
- **Used by:** customer browser/list

### `GET /api/customers/search?q=...`
- **Auth:** JWT
- **Purpose:** search customers by name/email/phone/DMS id
- **Used by:** job creation, customer picker, search bars

### `GET /api/customers/:id`
- **Auth:** JWT
- **Purpose:** customer detail with vehicles
- **Used by:** customer detail screen

### `GET /api/customers/:id/jobs`
- **Auth:** JWT
- **Purpose:** customer job history
- **Used by:** customer history tab

### `GET /api/customers/:id/deferred`
- **Auth:** JWT
- **Purpose:** customer deferred-work history
- **Used by:** customer/deferred history screens

### `POST /api/customers`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** create customer
- **Used by:** job intake flow

### `PATCH /api/customers/:id`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** update customer
- **Used by:** customer edit flow

### `DELETE /api/customers/:id`
- **Auth:** JWT + roles(`admin`)
- **Purpose:** soft-delete/deactivate customer
- **Used by:** admin cleanup

---

## 4) VehiclesModule

### `GET /api/vehicles`
- **Auth:** JWT
- **Purpose:** paginated vehicle list
- **Used by:** vehicle browser/list

### `GET /api/vehicles/vin/:vin`
- **Auth:** JWT
- **Purpose:** local lookup + NHTSA VIN decode
- **Used by:** vehicle intake, VIN-assisted autofill

### `GET /api/vehicles/customer/:customerId`
- **Auth:** JWT
- **Purpose:** list vehicles for one customer
- **Used by:** job creation, customer detail

### `GET /api/vehicles/:id`
- **Auth:** JWT
- **Purpose:** vehicle detail with jobs/history
- **Used by:** vehicle detail screen

### `POST /api/vehicles`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** create vehicle
- **Used by:** job intake flow

### `PATCH /api/vehicles/:id`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** update vehicle
- **Used by:** vehicle edit flow

---

## 5) JobsModule

### `GET /api/jobs`
- **Auth:** JWT
- **Purpose:** list jobs, role-filtered, optional status/search filtering
- **Used by:** jobs board
- **Notes:** high-impact endpoint for dashboard behavior

### `GET /api/jobs/:id`
- **Auth:** JWT
- **Purpose:** full job details payload
- **Used by:** job details page
- **Notes:** one of the most break-sensitive responses in the app

### `POST /api/jobs`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** create job
- **Used by:** new job flow

### `PATCH /api/jobs/:id`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** update job fields
- **Used by:** job edit flow

### `PATCH /api/jobs/:id/status`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** state transition
- **Used by:** workflow status actions
- **Notes:** tied to state-machine rules and history logging

### `POST /api/jobs/:id/assign`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** assign technician
- **Used by:** dispatch/assignment flow

### `PATCH /api/jobs/:id/archive`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** archive a closed job
- **Used by:** archive/manual cleanup flow

### `PATCH /api/jobs/:id/unarchive`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** return archived job to active board/history
- **Used by:** admin correction flow

### `DELETE /api/jobs/:id`
- **Auth:** JWT + roles(`admin`)
- **Purpose:** hard delete job
- **Used by:** exceptional admin cleanup only

---

## 6) InspectionsModule

### `GET /api/inspections`
- **Auth:** JWT
- **Purpose:** paginated inspections list
- **Used by:** inspection/admin browsing

### `GET /api/inspections/:id`
- **Auth:** JWT
- **Purpose:** inspection with responses, template structure, and proxied media URLs
- **Used by:** inspection detail/editor/review screen

### `POST /api/inspections`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`, `technician`)
- **Purpose:** start inspection session
- **Used by:** technician flow when opening a new inspection
- **Notes:** also moves job from `booked` to `checking` when appropriate

### `PUT /api/inspections/:id/responses`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`, `technician`)
- **Purpose:** batch-save inspection answers and optional offline draft payload
- **Used by:** inspection checklist save flow

### `POST /api/inspections/:id/submit`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`, `technician`)
- **Purpose:** finalize inspection
- **Used by:** technician/advisor handoff flow
- **Notes:** queues advisor notification and writes audit log

### `POST /api/inspections/:id/reopen`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** unlock a finalized inspection
- **Used by:** manager correction flow

---

## 7) Inspection template routes

There are **two route families** touching template data:
- lightweight staff-facing `/api/inspection-templates/*`
- richer admin editor routes under `/api/admin/templates/*`

### Staff-facing template endpoints

#### `GET /api/inspection-templates`
- **Auth:** JWT
- **Purpose:** list templates, optional `vehicleType`
- **Used by:** inspection start flow

#### `GET /api/inspection-templates/:id`
- **Auth:** JWT
- **Purpose:** get template with sections/items
- **Used by:** inspection rendering

#### `POST /api/inspection-templates`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** create template
- **Used by:** basic template management

#### `POST /api/inspection-templates/:id/sections`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** add section
- **Used by:** template editing

#### `POST /api/inspection-templates/:id/items`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** add item
- **Used by:** template editing

#### `PATCH /api/inspection-templates/:id/publish`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** publish/activate template
- **Used by:** template management

---

## 8) EstimatesModule

### `GET /api/estimates/defaults`
- **Auth:** JWT
- **Purpose:** quote-builder defaults like tax and standard labour rate
- **Used by:** estimate builder bootstrap

### `GET /api/estimates/job/:jobId`
- **Auth:** JWT
- **Purpose:** list lines for one job
- **Used by:** quote builder/job detail quote tab

### `GET /api/estimates`
- **Auth:** JWT
- **Purpose:** paginated estimate line list
- **Used by:** admin/debug/listing flows

### `GET /api/estimates/:id`
- **Auth:** JWT
- **Purpose:** get one estimate line
- **Used by:** edit/debug/detail flows

### `POST /api/estimates`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** create one estimate line
- **Used by:** quote builder/manual add flow

### `PUT /api/estimates/:id`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** update one estimate line
- **Used by:** quote line editing
- **Notes:** writes line snapshot history before update

### `DELETE /api/estimates/:id`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** delete one estimate line
- **Used by:** manager/admin cleanup

### `PUT /api/estimates/job/:jobId/bulk`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** replace the visible estimate set for a job in one request
- **Used by:** main quote builder save action
- **Notes:** referenced stale lines may be detached instead of deleted

---

## 9) AuthorisationModule staff endpoints

### `POST /api/jobs/:id/auth-request`
- **Auth:** JWT
- **Purpose:** create/resend customer approval link for a job
- **Used by:** advisor sending estimate to customer
- **Notes:** route sits under `/jobs` but belongs to authorisation flow

### `GET /api/jobs/:id/auth-status`
- **Auth:** JWT
- **Purpose:** check portal approval status for job
- **Used by:** job detail polling, jobs board polling
- **Notes:** frontend should rely on active-token semantics, not raw job status alone

---

## 10) Public customer portal endpoints

### `GET /api/portal/:token`
- **Auth:** Public token
- **Purpose:** load customer approval report
- **Used by:** public portal page
- **Notes:** token-based, throttled

### `POST /api/portal/:token/decide`
- **Auth:** Public token
- **Purpose:** submit customer approve/decline/defer decisions
- **Used by:** public portal action buttons
- **Notes:** throttled, writes portal decisions + audit-ish metadata

### `GET /api/portal/:token/media/:mediaId`
- **Auth:** Public token
- **Purpose:** proxy media for portal without exposing JWT-only media endpoints
- **Used by:** customer portal findings images

---

## 11) DeferredModule

### `GET /api/deferred`
- **Auth:** JWT
- **Purpose:** list deferred work, optional status filter
- **Used by:** deferred work screen

### `GET /api/deferred/reminders`
- **Auth:** JWT
- **Purpose:** list deferred items currently due for reminder
- **Used by:** reminder/admin workflows

### `GET /api/deferred/:id`
- **Auth:** JWT
- **Purpose:** deferred work detail with linked reminder history
- **Used by:** deferred item detail screen

### `POST /api/deferred/:id/remind`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** send reminder immediately
- **Used by:** advisor follow-up action

### `PATCH /api/deferred/:id`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** update deferred status/details
- **Used by:** deferred management UI

### `POST /api/deferred/:id/book`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`)
- **Purpose:** convert deferred item into a new booked job
- **Used by:** customer returned-for-work workflow

---

## 12) MediaModule

### `POST /api/media/presign`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`, `technician`)
- **Purpose:** get presigned object-storage upload URL
- **Used by:** media upload flow from inspection/job UI

### `POST /api/media/confirm`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`, `technician`)
- **Purpose:** confirm upload completed and save dimensions/size/etc.
- **Used by:** presigned upload completion flow

### `POST /api/media/upload-direct`
- **Auth:** JWT + roles(`admin`, `manager`, `service_advisor`, `technician`)
- **Purpose:** upload binary through API instead of direct-to-storage
- **Used by:** fallback/simple upload clients

### `GET /api/media/:id/url`
- **Auth:** JWT
- **Purpose:** get signed download URL
- **Used by:** internal preview/download flows

### `GET /api/media/:id/download`
- **Auth:** JWT
- **Purpose:** stream media through API
- **Used by:** browser-safe internal download/preview flows

### `GET /api/media/:id`
- **Auth:** JWT
- **Purpose:** get media metadata row
- **Used by:** media detail/panel logic

### `DELETE /api/media/:id`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** soft-delete media row
- **Used by:** manager/admin cleanup

---

## 13) AdminModule

### Settings

#### `GET /api/admin/settings`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** list DB-backed settings
- **Used by:** admin settings screen

#### `PUT /api/admin/settings`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** bulk update settings
- **Used by:** admin settings save

### Dashboard stats

#### `GET /api/admin/stats`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** job summary metrics
- **Used by:** dashboard/admin summary widgets

### Labour rates

#### `GET /api/admin/labour-rates`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** list rates
- **Used by:** admin labour-rate screen

#### `POST /api/admin/labour-rates`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** create rate
- **Used by:** admin labour-rate creation

#### `PATCH /api/admin/labour-rates/:id`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** update rate
- **Used by:** admin labour-rate editing

#### `DELETE /api/admin/labour-rates/:id`
- **Auth:** JWT + roles(`admin`)
- **Purpose:** delete rate
- **Used by:** admin cleanup

### Roles

#### `GET /api/admin/roles`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** list role definitions
- **Used by:** admin role management

#### `POST /api/admin/roles`
- **Auth:** JWT + roles(`admin`)
- **Purpose:** create role
- **Used by:** admin role management

#### `PATCH /api/admin/roles/:id`
- **Auth:** JWT + roles(`admin`)
- **Purpose:** update role
- **Used by:** admin role management

#### `DELETE /api/admin/roles/:id`
- **Auth:** JWT + roles(`admin`)
- **Purpose:** delete role if safe
- **Used by:** admin role cleanup

### Integrations

#### `GET /api/admin/integrations`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** list integration configs/status
- **Used by:** admin integrations screen

#### `POST /api/admin/integrations/:name/test`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** test one integration
- **Used by:** admin integrations screen

### Rich inspection template editor

#### `GET /api/admin/templates`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** list templates for admin editor
- **Used by:** `/admin/templates`

#### `GET /api/admin/templates/:id`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** get template + sections + items
- **Used by:** `/admin/templates/[id]`

#### `POST /api/admin/templates`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** create template
- **Used by:** admin template creation dialog

#### `PATCH /api/admin/templates/:id`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** update template metadata
- **Used by:** admin template editor

#### `DELETE /api/admin/templates/:id`
- **Auth:** JWT + roles(`admin`)
- **Purpose:** soft-delete template
- **Used by:** admin cleanup

#### `POST /api/admin/templates/:id/sections`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** add section
- **Used by:** admin template editor

#### `PATCH /api/admin/templates/sections/:sectionId`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** update section
- **Used by:** admin template editor

#### `DELETE /api/admin/templates/sections/:sectionId`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** delete section
- **Used by:** admin template editor

#### `PATCH /api/admin/templates/:id/sections/reorder`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** reorder sections
- **Used by:** admin template editor

#### `POST /api/admin/templates/:id/items`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** add item
- **Used by:** admin template editor

#### `PATCH /api/admin/templates/items/:itemId`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** update item
- **Used by:** admin template editor

#### `DELETE /api/admin/templates/items/:itemId`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** delete item
- **Used by:** admin template editor

#### `PATCH /api/admin/templates/sections/:sectionId/items/reorder`
- **Auth:** JWT + roles(`admin`, `manager`)
- **Purpose:** reorder items in a section
- **Used by:** admin template editor

---

## 14) AuditModule

### `GET /api/audit-logs`
- **Auth:** JWT + roles(`admin`)
- **Purpose:** filterable audit log list
- **Used by:** admin audit screen

---

## Cross-cutting route notes

## Most break-sensitive endpoints

If a developer changes any of these, they should assume frontend break risk is high:
- `GET /api/jobs/:id`
- `GET /api/inspections/:id`
- `PUT /api/estimates/job/:jobId/bulk`
- `GET /api/jobs/:id/auth-status`
- `GET /api/portal/:token`
- `POST /api/portal/:token/decide`
- `GET /api/portal/:token/media/:mediaId`

## Important route ownership quirks

- `AuthorisationModule` owns some routes under **`/jobs/...`**, not only under `/portal/...`
- Inspection template data is exposed in **two styles**:
  - staff/basic routes under `/inspection-templates`
  - richer admin editor routes under `/admin/templates`
- Media has both:
  - staff JWT endpoints under `/media/*`
  - public-token proxy access under `/portal/:token/media/:mediaId`

## Practical reading order for new developers

1. `GET /api/jobs`
2. `GET /api/jobs/:id`
3. `GET /api/inspections/:id`
4. `PUT /api/estimates/job/:jobId/bulk`
5. `GET /api/jobs/:id/auth-status`
6. `GET /api/portal/:token`
7. `POST /api/deferred/:id/book`

These seven routes cover most of the core business workflow.
