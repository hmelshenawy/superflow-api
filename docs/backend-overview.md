# SuperFlow Backend Overview

This document explains how the NestJS backend is organized, what each major area owns, and how requests move through the system.

## 1. High-level purpose

The backend supports a workshop/service-advisor workflow:

1. create customers and vehicles
2. open jobs
3. perform inspections
4. convert findings into estimate lines
5. send customer approval links
6. collect customer decisions
7. execute the work
8. close and archive jobs

The API is built with **NestJS**, uses **Prisma** for database access, **MySQL/MariaDB** as the database, **BullMQ + Redis** for queued notifications, and **Backblaze B2** for media storage.

## 2. Application bootstrap

Main startup file: `src/main.ts`

Key startup behavior:

- global API prefix: `/api`
- health endpoint excluded from prefix: `/health`
- CORS enabled from `CORS_ORIGINS`
- request validation via Nest `ValidationPipe`
- audit logging via global `AuditInterceptor`
- Helmet enabled; CSP allows `'self'` and `'unsafe-inline'` but **not** `'unsafe-eval'`
- S3 storage uses Backblaze B2 (not MinIO) — bucket `PrioraFlow` in `us-east-005`
- Health endpoint at `/health` checks DB and Redis connectivity; returns 503 if degraded
- Graceful shutdown enabled via `enableShutdownHooks()`
- Swagger is exposed only outside production

Root module: `src/app.module.ts`

It wires together all feature modules and enables a global throttler guard.

## 3. Main backend building blocks

### Core infrastructure
- `PrismaModule` / `PrismaService`: database access
- `AuthModule`: login, refresh, sessions, profile
- `SchedulerModule`: cron tasks such as job archiving
- `NotificationsModule`: DB-backed notification queue + webhook delivery

### Core business modules
- `JobsModule`: job lifecycle
- `InspectionsModule`: inspection sessions and responses
- `EstimatesModule`: estimate/quote lines
- `AuthorisationModule`: customer approval links and portal decisions
- `MediaModule`: upload/download media for jobs and inspection findings
- `DeferredModule`: work declined/deferred by the customer

### Supporting modules
- `CustomersModule`
- `VehiclesModule`
- `UsersModule`
- `AdminModule`
- `AuditModule`

## 4. Data model in plain English

Important database entities from `prisma/schema.prisma`:

- `users` + `roles`: staff accounts and permissions
- `customers`: customer records
- `vehicles`: vehicle records
- `jobs`: the main workshop record
- `job_status_history`: audit trail of job status changes
- `inspections`: one inspection per job
- `inspection_sections`, `inspection_items`, `inspection_responses`: inspection template and actual findings
- `estimate_lines`: quote/estimate items for a job
- `estimate_line_history`: snapshots before line edits
- `approval_tokens`: customer approval links
- `authorisation_decisions`: per-line customer approve/decline/defer decisions
- `deferred_work`: items postponed or declined by the customer
- `media_files`: uploaded job and inspection media
- `notifications`: queued/sent notifications
- `settings`, `labour_rates`, `integrations`: admin/config data
- `audit_logs`: operational audit trail
- `refresh_tokens`: login sessions

## 5. Request model and conventions

### Authentication
Most routes are protected with:
- `JwtAuthGuard`
- `RolesGuard`

Public routes are limited, mainly:
- `/health`
- customer portal routes under `/portal/*`

### Validation
DTOs are validated globally. Unknown fields are rejected because the global validation pipe uses:
- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

### Role model
Typical backend roles:
- `admin`
- `manager`
- `service_advisor`
- `technician`

### API style
Most modules follow this pattern:
- controller handles HTTP/guard/decorator concerns
- service contains business logic
- Prisma calls are made directly from the service layer

## 6. Security model

### Auth tokens
Access tokens are JWTs signed with `JWT_SECRET`.

Refresh tokens are not stored raw. The current approach is:
- generate a UUID refresh token
- store a SHA-256 hash in the DB
- rotate refresh token on use
- revoke sessions on logout or certain security actions

There is backward compatibility for older bcrypt-hashed refresh tokens.

### Rate limits
The app uses Nest throttling globally, with stricter limits on sensitive auth and portal endpoints, for example:
- login: 5 attempts/minute, temporary block after repeated failures
- refresh: 10 attempts/minute
- portal load/decide endpoints also have dedicated throttles

### Media exposure
Media is not exposed by direct storage URL in customer-facing flows. Instead:
- staff can get signed URLs or stream via API
- customer portal media is proxied through `/api/portal/:token/media/:mediaId`
- portal token validation happens before streaming customer-visible media

## 7. Error responses

All API errors return a consistent JSON shape with a machine-readable `code` field:

```json
{
  "statusCode": 403,
  "code": "AUTH_PERMISSION_DENIED",
  "message": "Missing permission: JOBS_DELETE",
  "method": "GET",
  "path": "/api/jobs",
  "timestamp": "2026-05-13T12:00:00.000Z"
}
```

### Error codes

| Code | HTTP Status | When |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT has expired |
| `AUTH_TOKEN_INVALID` | 401 | Missing, malformed, or invalid token |
| `AUTH_FORBIDDEN` | 403 | No access to resource (general) |
| `AUTH_PERMISSION_DENIED` | 403 | Missing role permission |
| `AUTH_TRIAL_EXPIRED` | 402 | Workshop trial period has ended |
| `AUTH_WORKSHOP_REQUIRED` | 403 | No workshop context selected |
| `PLAN_FEATURE_REQUIRED` | 403 | Feature locked behind higher plan tier |
| `PLAN_LIMIT_REACHED` | 402 | Usage ceiling hit for plan |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | DTO validation failed (field constraints) |
| `BAD_REQUEST` | 400 | Generic client error |
| `CONFLICT` | 409 | Duplicate resource or state conflict |
| `RATE_LIMITED` | 429 | Request throttled |
| `MEDIA_FILE_BLOCKED` | 403 | File blocked by security scan |
| `MEDIA_FILE_PENDING` | 403 | File pending security scan |
| `MEDIA_FILE_TYPE_NOT_ALLOWED` | 400 | File extension or MIME type rejected |
| `MEDIA_FILE_TOO_LARGE` | 400 | File exceeds size limit for its type |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

Custom errors are thrown using `AppException` subclasses in `src/common/errors/app-errors.ts`. Standard NestJS exceptions (e.g., `NotFoundException`, `ForbiddenException`) that haven't been migrated yet still get an inferred code based on HTTP status.

## 8. Background processing

### Scheduler
`SchedulerService` runs on startup and nightly:
- startup catch-up runs once on module init
- nightly cron archives all jobs already in `closed` status and still unarchived

### Notifications
Notifications are stored in the DB first, then optionally pushed to BullMQ.

Delivery flow:
1. create row in `notifications`
2. enqueue BullMQ job if queue is available
3. worker delivers via configured webhook
4. DB row is updated to `sent` or `failed`

If no webhook exists for a channel, the system marks it as sent with provider `noop`.

## 9. Backend architectural strengths

Current strengths:
- clear module separation by domain
- Prisma schema is expressive and maps business entities well
- approval/customer portal flow is isolated from staff-auth flow
- notification delivery is resilient because DB is the source of truth
- audit/history tables exist for important areas

## 10. Backend architectural caveats

Important caveats for developers:

- Prisma is used directly in services, so some services are becoming large and contain both orchestration and DB mapping logic.
- Business rules live in services rather than a dedicated domain layer.
- Some rules are duplicated or partially duplicated across modules, so changes should be made carefully.
- The current deployment assumes existing external infrastructure for Traefik and MariaDB.

## 11. Best way to read this backend

Recommended order for new developers:

1. `src/main.ts`
2. `src/app.module.ts`
3. `src/auth/*`
4. `src/jobs/*`
5. `src/inspections/*`
6. `src/estimates/*`
7. `src/authorisation/*`
8. `src/media/*`
9. `src/notifications/*`
10. `prisma/schema.prisma`

Then read:
- `docs/backend-modules.md`
- `docs/backend-request-flows.md`
- `docs/backend-business-rules.md`
