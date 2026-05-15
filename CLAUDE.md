# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SuperFlow (branded "PrioraFlow") — a multi-tenant workshop management SaaS for automotive service advisors. Manages the full job lifecycle: customer intake, vehicle tracking, inspections, estimates, customer approval portals, deferred work, notifications, and billing.

## Tech Stack

- **Backend:** NestJS 11, TypeScript 5.7+ (strict mode), Prisma 6.6, MySQL/MariaDB
- **Frontend:** Next.js 16, React 19, Zustand, Tailwind CSS 4, shadcn/ui (in `superflow-web/`)
- **Infra:** Docker Compose, Traefik, Redis 7, MinIO/S3, BullMQ
- **Auth:** Passport JWT, bcrypt, refresh token rotation
- **Validation:** class-validator + class-transformer (global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`)

## Commands

```bash
# Backend
npm run start:dev          # Dev server with watch
npm run build               # Compile NestJS
npm run lint                 # ESLint with --fix
npm test                    # Jest

# Prisma
npm run prisma:generate     # Regenerate Prisma client
npm run prisma:pull         # Introspect DB → schema
npm run prisma:studio       # Prisma Studio GUI

# Security tests (require running server + DB)
npm run test:auth-security
npm run test:file-security
npm run test:tenant
npm run test:rate-limit

# Frontend (from superflow-web/)
cd superflow-web && npm run dev    # Next.js dev server
cd superflow-web && npm run build  # Production build
```

## Architecture

### Module pattern

Each business domain is a self-contained NestJS module:

```
module-name/
  module-name.controller.ts   # HTTP routes, guards, decorators
  module-name.service.ts      # Business logic, Prisma calls
  module-name.module.ts       # NestJS module registration
  dto/                        # Request/response DTOs
```

### Multi-tenancy

Workshop-based tenant isolation via Prisma client extensions (`src/prisma/`):

- **`prisma.tenant`** — auto-scoped by `workshop_id`. Use this for all workshop-scoped data.
- **`prisma.raw`** — unscoped, cross-tenant. Only for auth, platform_admin, and signup operations.

Tenant context propagates via `AsyncLocalStorage`, set by `WorkshopContextInterceptor`. The `WorkshopGuard` ensures context exists before tenant-scoped queries run.

**Important:** Using `prisma.raw` where `prisma.tenant` is appropriate will leak data across workshops. Models scoped by the tenant extension are listed in `TENANT_SCOPED_MODELS` in `src/prisma/prisma-tenant.extension.ts`.

### Request pipeline

1. Sentry request handler
2. Helmet + CSP
3. CORS
4. `/health` endpoint (outside `/api` prefix)
5. `ValidationPipe` (whitelist + forbidNonWhitelisted + transform)
6. `AuditInterceptor` (logs non-GET mutations, redacts sensitive fields)
7. `HttpExceptionFilter`
8. `TenantThrottlerGuard` (rate limiting per JWT identity or IP)
9. `WorkshopGuard`
10. `PlanFeatureGuard` (feature gating by subscription)
11. `WorkshopContextInterceptor` (sets ALS tenant context)
12. Swagger docs (non-production only)

### Authorization layers

1. **`JwtAuthGuard`** — validates JWT
2. **`PermissionsGuard`** — checks `@RequirePermission()` against JWT permissions array; `admin` and `platform_admin` always pass; enforces trial expiry for non-GET requests
3. **`PlanFeatureGuard`** — checks `@RequirePlanFeature()` against subscription plan features; `platform_admin` always passes; enforces plan ceilings

Permission constants and default role templates are in `src/common/permissions/`.

### Job state machine

Job status transitions are governed by `src/jobs/jobs.state-machine.ts` — never update job status directly without consulting the state machine.

### Notifications

DB-first design: notifications are created as DB rows first, then pushed to BullMQ/Redis. If the queue is unavailable, rows remain as "queued" and are picked up by a 5-second poller.

### Customer portal

Public routes under `/api/portal/:token/` use token-based auth (approval tokens), not JWT.

### Media uploads

Presigned URL or direct multipart via S3/MinIO. Media records are soft-deleted. Portal media is proxied through the API — never expose direct bucket URLs.

## Key files

- `src/main.ts` — Bootstrap, global pipes, guards, interceptors
- `src/app.module.ts` — Root module wiring
- `src/prisma/` — `PrismaService`, tenant extension, workshop context (ALS)
- `src/common/guards/` — `JwtAuthGuard`, `PermissionsGuard`, `PlanFeatureGuard`, `WorkshopGuard`
- `src/common/permissions/` — Permission constants, `@RequirePermission`, `ALL_PERMISSIONS`, `DEFAULT_ROLES`
- `src/common/plan-features/` — `@RequirePlanFeature`, `FeatureKeys`, `UsageService`
- `src/jobs/jobs.state-machine.ts` — Job status transition rules
- `prisma/schema.prisma` — Full database schema
- `src/config/env.validation.ts` — Environment variable validation

## Deployment

Docker Compose with external Traefik + MariaDB networks. CI runs on GitHub Actions (build + audit + DB-backed security tests). CD deploys via SSH on push to `main`.

- API prefix: `/api`
- Health check: `/health`
- Swagger: `/api/docs` (non-production only)

## Documentation

Extended backend docs in `docs/`:
- `backend-overview.md` — Architecture overview
- `backend-modules.md` — Module-by-module reference
- `backend-request-flows.md` — End-to-end request flows
- `backend-business-rules.md` — Critical business rules
- `backend-entity-map.md` — Entity relationships
- `backend-api-map.md` — API endpoint map
- `permissions-reference.md` — Full permission/role system

## Frontend note

The frontend in `superflow-web/` uses Next.js 16 which has breaking changes from earlier versions. See `superflow-web/AGENTS.md` before writing frontend code.