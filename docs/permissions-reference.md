# SuperFlow — Permission System Reference

**Version:** 1.0
**Date:** May 2026
**For:** Admins, developers, and anyone managing roles

---

## How Permissions Work

Every API endpoint is protected by one or more permissions (e.g., `jobs:read`, `estimates:create`). When a request arrives, the `PermissionsGuard` checks whether the user's JWT token contains **at least one** of the required permissions.

- **Admin bypass:** If `user.role === 'admin'`, all permission checks pass automatically — even if the permissions array in the JWT is empty.
- **Any-match:** If an endpoint requires multiple permissions, the user needs at least one of them.

The JWT payload includes: `{ sub: userId, role: roleName, permissions: [...] }`. Permissions are loaded from the user's role record at login time and refreshed on each token refresh.

---

## All 44 Permissions

### Jobs (6)

| Permission | What It Allows |
|---|---|
| `jobs:read` | View job list, job details, priority scores |
| `jobs:create` | Create new jobs |
| `jobs:update` | Edit job fields, archive/unarchive |
| `jobs:delete` | Delete jobs (single or bulk) |
| `jobs:assign` | Assign technicians to jobs |
| `jobs:transition` | Change job status (move between workflow stages) |

### Estimates (4)

| Permission | What It Allows |
|---|---|
| `estimates:read` | View estimate lines and totals |
| `estimates:create` | Create new estimate lines |
| `estimates:update` | Edit existing estimate lines |
| `estimates:delete` | Remove estimate lines |

### Inspections (4)

| Permission | What It Allows |
|---|---|
| `inspections:read` | View inspection details and responses |
| `inspections:create` | Start a new inspection session |
| `inspections:submit` | Lock and finalize an inspection |
| `inspections:reopen` | Re-open a locked inspection for edits (manager+ only) |

### Customers (4)

| Permission | What It Allows |
|---|---|
| `customers:read` | View customer records |
| `customers:create` | Add new customers |
| `customers:update` | Edit customer details, sensitivity flags |
| `customers:delete` | Remove customers |

### Vehicles (3)

| Permission | What It Allows |
|---|---|
| `vehicles:read` | View vehicle records, VIN lookup |
| `vehicles:create` | Add new vehicles |
| `vehicles:update` | Edit vehicle details |

### Media (2)

| Permission | What It Allows |
|---|---|
| `media:upload` | Upload photos and documents |
| `media:delete` | Remove media files |

### Authorisation / Customer Portal (2)

| Permission | What It Allows |
|---|---|
| `auth:request` | Generate customer approval links |
| `auth:status` | Check approval token status |

### Deferred Work (3)

| Permission | What It Allows |
|---|---|
| `deferred:read` | View deferred work items |
| `deferred:manage` | Edit deferred work items |
| `deferred:book` | Create new jobs from deferred work |

### Booking Import (2)

| Permission | What It Allows |
|---|---|
| `import:parse` | Upload and preview import files |
| `import:run` | Execute the import and create jobs |

### Admin (11)

| Permission | What It Allows |
|---|---|
| `admin:settings` | View system settings |
| `admin:settings:edit` | Update system settings and priority weights |
| `admin:roles` | View, create, edit, delete roles |
| `admin:users` | View staff accounts |
| `admin:users:create` | Create new staff accounts |
| `admin:users:delete` | Deactivate/delete staff accounts |
| `admin:audit` | View audit logs |
| `admin:integrations` | View and test integrations |
| `admin:templates` | Manage inspection templates |
| `admin:labour-rates` | Manage labour rate records |
| `admin:stats` | View dashboard statistics |

### Priority & Insights (2)

| Permission | What It Allows |
|---|---|
| `priority:read` | View priority scores and next-best-actions |
| `insights:dashboard` | View the Workshop Insights dashboard |

---

## Default Role Templates

### Admin (43 permissions — full access)

All permissions. The admin role also bypasses all permission checks at the guard level, so even if the permissions array is empty, admin always has access.

### Manager (39 permissions)

| Category | Permissions |
|---|---|
| Jobs | `read`, `create`, `update`, `delete`, `assign`, `transition` |
| Estimates | `read`, `create`, `update`, `delete` |
| Inspections | `read`, `create`, `submit` |
| Customers | `read`, `create`, `update` |
| Vehicles | `read`, `create`, `update` |
| Media | `upload`, `delete` |
| Authorisation | `request`, `status` |
| Deferred Work | `read`, `manage`, `book` |
| Booking Import | `parse`, `run` |
| Admin | `settings`, `settings:edit`, `roles`, `users`, `users:create`, `integrations`, `templates`, `labour-rates`, `stats` |
| Priority & Insights | `priority:read`, `insights:dashboard` |

**Cannot:** delete users (`admin:users:delete`), view audit logs (`admin:audit`)

### Service Advisor (25 permissions)

| Category | Permissions |
|---|---|
| Jobs | `read`, `create`, `update`, `transition` |
| Estimates | `read`, `create`, `update` |
| Inspections | `read`, `create`, `submit` |
| Customers | `read`, `create`, `update` |
| Vehicles | `read`, `create`, `update` |
| Media | `upload` |
| Authorisation | `request`, `status` |
| Deferred Work | `read`, `manage`, `book` |
| Admin | `settings` |
| Priority & Insights | `priority:read`, `insights:dashboard` |

**Cannot:** delete jobs, assign technicians, delete estimates, delete customers, manage roles/users/templates/integrations

### Workshop Team Leader (18 permissions)

| Category | Permissions |
|---|---|
| Jobs | `read`, `update`, `assign`, `transition` |
| Estimates | `read`, `create`, `update` |
| Inspections | `read`, `create`, `submit`, `reopen` |
| Customers | `read` |
| Vehicles | `read` |
| Media | `upload` |
| Authorisation | `status` |
| Deferred Work | `read` |
| Priority & Insights | `priority:read`, `insights:dashboard` |

**Key differences from Technician:**
- Can **assign jobs** to technicians (`jobs:assign`)
- Can **create and edit estimates** (`estimates:create`, `estimates:update`)
- Can **reopen inspections** (`inspections:reopen`)
- Can **update job details** (`jobs:update`)
- Can see **priority** and **insights dashboard**

This makes the Team Leader the go-to person for workshop floor decisions without needing a manager or advisor.

### Technician (11 permissions)

| Category | Permissions |
|---|---|
| Jobs | `read`, `transition` |
| Estimates | `read` |
| Inspections | `read`, `create`, `submit` |
| Customers | `read` |
| Vehicles | `read` |
| Media | `upload` |
| Authorisation | `status` |
| Deferred Work | `read` |

**Can transition job status** (e.g., move from In Progress → Quality Check) but cannot create jobs, assign technicians, or edit estimates.

### Receptionist (7 permissions)

| Category | Permissions |
|---|---|
| Jobs | `read`, `create` |
| Customers | `read`, `create`, `update` |
| Vehicles | `read`, `create` |

For front-desk intake only: booking customers and vehicles into the system.

---

## Role-Based Job Visibility

Regardless of permissions, the backend filters job lists by role:

- **Advisors** see only their own jobs (where they are the assigned advisor)
- **Technicians** see only jobs assigned to them
- **Managers and Admins** see all jobs
- **Workshop Team Leaders** see all workshop-phase jobs
- Archived jobs are hidden from the active board unless the Archive filter is enabled

---

## Managing Roles & Permissions

### API Endpoints

| Action | Endpoint | Required Permission |
|---|---|---|
| List all roles | `GET /api/admin/roles` | `admin:roles` |
| Get available permissions | `GET /api/admin/permissions` | `admin:roles` |
| Create a new role | `POST /api/admin/roles` | `admin:roles` |
| Update a role's permissions | `PATCH /api/admin/roles/:id` | `admin:roles` |
| Delete a role | `DELETE /api/admin/roles/:id` | `admin:roles` |

### Creating a Role

```json
POST /api/admin/roles
{
  "name": "parts_coordinator",
  "description": "Parts team — can read jobs and manage deferred work",
  "permissions": ["jobs:read", "deferred:read", "deferred:manage", "deferred:book"]
}
```

### Updating a Role's Permissions

```json
PATCH /api/admin/roles/:id
{
  "permissions": [
    "jobs:read", "jobs:transition", "estimates:read",
    "inspections:read", "inspections:create", "inspections:submit",
    "customers:read", "vehicles:read", "media:upload",
    "auth:status", "deferred:read", "priority:read"
  ]
}
```

### Getting All Available Permissions

```json
GET /api/admin/permissions
```

Returns:

```json
{
  "permissions": ["jobs:read", "jobs:create", "...all 44 permissions..."],
  "defaultRoles": {
    "admin": { "name": "admin", "description": "...", "permissions": [...] },
    "manager": { ... },
    "service_advisor": { ... },
    "workshop_teamleader": { ... },
    "technician": { ... },
    "receptionist": { ... }
  }
}
```

Use this endpoint to build a permission editor UI: the `permissions` array lists all valid permission strings, and `defaultRoles` shows the reference templates.

### Safety Rules

- **You cannot delete a role that has users assigned to it.** The backend returns a clear error with the count.
- **The `admin` role always has full access**, regardless of its permissions array. This is a hardcoded safeguard.
- **Avoid renaming core roles** (`admin`, `manager`, `service_advisor`, `workshop_teamleader`, `technician`, `receptionist`) — the backend uses role names for job visibility filtering.
- When you update a role's permissions, **existing users get the new permissions on their next login** (the JWT is refreshed).

---

## Endpoint → Permission Mapping

### Jobs

| Endpoint | Method | Permission |
|---|---|---|
| `/api/jobs` | GET | `jobs:read` |
| `/api/jobs/:id` | GET | `jobs:read` |
| `/api/jobs` | POST | `jobs:create` |
| `/api/jobs/:id` | PATCH | `jobs:update` |
| `/api/jobs/:id/status` | PATCH | `jobs:transition` |
| `/api/jobs/:id/assign` | POST | `jobs:assign` |
| `/api/jobs/:id/archive` | PATCH | `jobs:update` |
| `/api/jobs/:id/unarchive` | PATCH | `jobs:update` |
| `/api/jobs/:id` | DELETE | `jobs:delete` |
| `/api/jobs` | DELETE | `jobs:delete` |

### Estimates

| Endpoint | Method | Permission |
|---|---|---|
| `/api/estimates/job/:jobId` | GET | `estimates:read` |
| `/api/estimates` | POST | `estimates:create` |
| `/api/estimates/:id` | PATCH | `estimates:update` |
| `/api/estimates/:id` | DELETE | `estimates:delete` |

### Inspections

| Endpoint | Method | Permission |
|---|---|---|
| `/api/inspections` | GET | `inspections:read` |
| `/api/inspections/:id` | GET | `inspections:read` |
| `/api/inspections` | POST | `inspections:create` |
| `/api/inspections/:id/responses` | PUT | `inspections:create` |
| `/api/inspections/:id/submit` | POST | `inspections:submit` |
| `/api/inspections/:id/reopen` | POST | `inspections:reopen` |

### Customers

| Endpoint | Method | Permission |
|---|---|---|
| `/api/customers` | GET | `customers:read` |
| `/api/customers/:id` | GET | `customers:read` |
| `/api/customers` | POST | `customers:create` |
| `/api/customers/:id` | PATCH | `customers:update` |
| `/api/customers/:id` | DELETE | `customers:delete` |

### Vehicles

| Endpoint | Method | Permission |
|---|---|---|
| `/api/vehicles` | GET | `vehicles:read` |
| `/api/vehicles/vin/:vin` | GET | `vehicles:read` |
| `/api/vehicles/customer/:customerId` | GET | `vehicles:read` |
| `/api/vehicles/:id` | GET | `vehicles:read` |
| `/api/vehicles` | POST | `vehicles:create` |
| `/api/vehicles/:id` | PATCH | `vehicles:update` |

### Media

| Endpoint | Method | Permission |
|---|---|---|
| `/api/media/presign` | POST | `media:upload` |
| `/api/media/:id` | DELETE | `media:delete` |

### Authorisation (Customer Portal)

| Endpoint | Method | Permission |
|---|---|---|
| `/api/authorisation/request/:jobId` | POST | `auth:request` |
| `/api/authorisation/status/:token` | GET | `auth:status` |

### Deferred Work

| Endpoint | Method | Permission |
|---|---|---|
| `/api/deferred` | GET | `deferred:read` |
| `/api/deferred/job/:jobId` | GET | `deferred:read` |
| `/api/deferred/:id` | PATCH | `deferred:manage` |
| `/api/deferred/:id/book` | POST | `deferred:book` |

### Booking Import

| Endpoint | Method | Permission |
|---|---|---|
| `/api/booking-import/parse` | POST | `import:parse` |
| `/api/booking-import/templates` | GET | `import:parse` |
| `/api/booking-import/templates/:id` | GET | `import:parse` |
| `/api/booking-import/templates` | POST | `import:run` |
| `/api/booking-import/templates/:id` | DELETE | `import:run` |
| `/api/booking-import/run` | POST | `import:run` |

### Admin

| Endpoint | Method | Permission |
|---|---|---|
| `/api/admin/settings` | GET | `admin:settings` |
| `/api/admin/settings` | PUT | `admin:settings:edit` |
| `/api/admin/stats` | GET | `admin:stats` |
| `/api/admin/permissions` | GET | `admin:roles` |
| `/api/admin/roles` | GET | `admin:roles` |
| `/api/admin/roles` | POST | `admin:roles` |
| `/api/admin/roles/:id` | PATCH | `admin:roles` |
| `/api/admin/roles/:id` | DELETE | `admin:roles` |
| `/api/admin/labour-rates` | GET | `admin:labour-rates` |
| `/api/admin/labour-rates` | POST | `admin:labour-rates` |
| `/api/admin/labour-rates/:id` | PATCH | `admin:labour-rates` |
| `/api/admin/labour-rates/:id` | DELETE | `admin:labour-rates` |
| `/api/admin/integrations` | GET | `admin:integrations` |
| `/api/admin/integrations/:name/test` | POST | `admin:integrations` |
| `/api/admin/templates*` | GET | `admin:templates` |
| `/api/admin/templates*` | POST | `admin:templates` |
| `/api/admin/templates*` | PATCH | `admin:templates` |
| `/api/admin/templates*` | DELETE | `admin:templates` |

### Users

| Endpoint | Method | Permission |
|---|---|---|
| `/api/users` | GET | `admin:users` |
| `/api/users/:id` | GET | `admin:users` |
| `/api/users` | POST | `admin:users:create` |
| `/api/users/invite` | POST | `admin:users:create` |
| `/api/users/:id` | PATCH | `admin:users:create` |
| `/api/users/:id/reset-password` | POST | `admin:users:delete` |
| `/api/users/:id` | DELETE | `admin:users:delete` |

### Priority & Insights

| Endpoint | Method | Permission |
|---|---|---|
| `/api/priority` | GET | `priority:read` |
| `/api/priority/:id` | GET | `priority:read` |
| `/api/insights/dashboard` | GET | `insights:dashboard` |

### Audit Logs

| Endpoint | Method | Permission |
|---|---|---|
| `/api/audit-logs` | GET | `admin:audit` |

---

*SuperFlow — Granular permissions, flexible roles.*