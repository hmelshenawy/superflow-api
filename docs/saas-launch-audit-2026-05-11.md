# PrioraFlow SaaS Launch Readiness Audit Report

**Date:** 2026-05-11
**Branch:** dev (d7974a0)
**Auditor:** Claude Code

---

## Overall Score: 4.5 / 10

The application has a solid architectural foundation and impressive feature depth for a workshop management tool, but has significant gaps in security, billing, legal compliance, testing, and production hardening that block a public SaaS launch.

---

## 1. Product Readiness

### What the app does well
- **Complete job lifecycle**: Create → assign → inspect → estimate → customer approval → complete, with status state machine and Kanban board
- **Multi-tenant architecture**: Workshop-scoped data isolation with Prisma extension, role-based permissions (38 fine-grained permissions), workshop selection
- **Customer approval portal**: Token-based approval flow for estimates, accessible without login
- **Priority engine**: Weighted scoring system for job prioritization
- **Inspection system**: Templates, sections, items, responses with media attachment
- **Estimate builder**: Line items, quote groups, bulk replace, approval workflows
- **Deferred work tracking**: Reminder system with scheduling
- **Media management**: S3/MinIO presigned uploads, file type validation, scan status tracking
- **Insights dashboard**: Job counts, revenue, vehicle metrics, attendance trends
- **Admin panel**: Users, roles, permissions, workshops, labour rates, inspection templates, integrations, audit logs
- **Billing data model**: Plans, subscriptions, invoices, payments — fully modeled in the database
- **14-day trial system**: Auto-created on signup, blocks mutations after expiry (402)

### Incomplete or missing user flows

| Gap | Severity |
|-----|----------|
| No forgot-password / password-reset page on frontend | **Blocker** |
| No email verification on signup | **Blocker** |
| No invitation flow for adding users (admin sets passwords directly) | High |
| No billing/payment collection (Stripe or any gateway) | **Blocker** |
| No plan upgrade/downgrade flow | High |
| No plan limit enforcement (max users, max jobs/month) | High |
| No account deletion for end users | High |
| No data export for workshop admins (platform_admin only) | Medium |
| No onboarding walkthrough or guided tour for new users | High |
| No sample data seeding for new workshops | Medium |

---

## 2. Code Quality

### Architecture
- **Well-structured NestJS modular architecture**: 19 feature modules, clean separation of controllers/services/DTOs
- **Prisma tenant extension**: Sophisticated AsyncLocalStorage-based multi-tenancy that auto-injects `workshop_id` across 27 models — genuinely impressive
- **Global guards/pipes/interceptors**: ValidationPipe (whitelist + forbidNonWhitelisted), TenantThrottlerGuard, WorkshopContextInterceptor, AuditInterceptor, HttpExceptionFilter — well-chosen pipeline

### Maintainability concerns

| Issue | Location | Impact |
|-------|----------|--------|
| Massive page components | `jobs/[id]/page.tsx` (1100+ lines), `jobs/page.tsx` (500+ lines) | Hard to maintain, test, reuse |
| Duplicate STATUS_META | Defined in both `jobs-data.ts` and `jobs/[id]/page.tsx` | Changes must be made in two places |
| No form validation library | All validation is manual `required` attributes + server errors | No inline error display, poor UX |
| Inconsistent localStorage naming | `superflow-auth`, `superflow-collapsed-columns`, `sf_dashboard_view` | Maintenance confusion |

### Error handling
- Global `HttpExceptionFilter` normalizes all errors to `{ statusCode, message, method, path, timestamp }` — good
- Sentry integration for 5xx errors with header redaction — good
- Audit interceptor silently swallows write failures (`.catch(() => {})`) — data loss risk
- No request correlation IDs — impossible to trace user-reported errors
- Some catch blocks silently fail with no user feedback (priority, users load)

### Type safety
- TypeScript strict mode enabled (`"strict": true`) — good
- 39 DTO files with 288 class-validator decorators — comprehensive validation
- But: `UpdateSettingsDto` uses `@Allow()` accepting any value, and `CreateRoleDto.permissions` doesn't validate against the allowed list
- Frontend `types/index.ts` exists but no shared types between frontend and backend

### Test coverage

| Category | Files | Coverage |
|----------|-------|----------|
| Security tests (auth, tenant, file, rate-limit) | 4 | Covers critical paths |
| Unit tests (Jest) | 0 | **Zero** |
| Integration tests | 0 | Zero |
| E2E tests | 0 | Zero |
| Frontend tests | 0 | Zero |
| No `jest.config` file | — | `npm test` would fail |

The 4 existing custom test scripts are high-quality (real DB, real services), but they cover only security-critical paths. All business logic is untested.

### Performance
- `InsightsService.getDashboard()` fires 20-42 individual queries per request — will degrade with scale
- No database connection pool configuration in `DATABASE_URL`
- Double PrismaClient connection pool (`prisma.tenant` + `prisma.raw`)
- Workshop export fires 16 parallel queries with no pagination — OOM risk for large workshops

---

## 3. Security

### Critical vulnerabilities

| # | Issue | Detail | Severity |
|---|-------|--------|----------|
| 1 | **Media findUnique bypasses tenant isolation** | `media.service.ts findOne()` uses `findUnique` which the tenant extension handles post-hoc (fetch row, then check workshop_id). Any authenticated user can read media from any workshop by ID. | **CRITICAL** |
| 2 | **SSRF in integration test endpoint** | `admin.service.ts testIntegration()` makes server-side HTTP requests to user-supplied URLs with custom headers. No URL allowlist or blocklist. | **CRITICAL** |
| 3 | **WorkshopGuard not applied** | Defined in `workshop.guard.ts` but never registered globally or on any controller. Requests without workshop context silently get empty data instead of a 403. | HIGH |
| 4 | **Refresh token in response body** | `/auth/refresh` returns the refresh token in JSON body alongside the HttpOnly cookie. If the frontend stores it in JS-accessible memory, XSS can steal it. | HIGH |
| 5 | **In-memory throttle storage** | Rate limits are per-instance. Horizontal scaling bypasses them entirely. No Redis-backed throttle storage. | HIGH |
| 6 | **No account lockout** | Failed login attempts are only rate-limited (3/minute). No account lockout after N failures. | MEDIUM |
| 7 | **Inconsistent password minimums** | Signup requires 8 chars, admin-created users and password changes require only 6. No complexity requirements. | MEDIUM |
| 8 | **No CSRF protection** | SameSite=Lax cookie provides partial protection only. | LOW |
| 9 | **No email verification** | Anyone can sign up with any email address. | HIGH |
| 10 | **Integration secrets in plaintext** | `integrations.config` stores API keys as plaintext JSON in the database. | MEDIUM |

### Positive security findings
- Bcrypt cost factor 10 for passwords, SHA-256 for tokens — good
- Refresh token rotation with replay detection (revokes all sessions on reuse) — excellent
- Password reset tokens are single-use, 1-hour expiry — good
- Environment validation blocks default credentials and wildcard CORS in production — good
- Audit logging for all mutations with sensitive field redaction — good
- Presigned URL uploads with MIME validation and cross-checking — good
- Sensitive data stripping (`password_hash` destructured out) — good

---

## 4. SaaS Readiness

### Multi-tenant data isolation
- Application-level tenant isolation via Prisma extension works well for CRUD operations
- **Risk**: 127 uses of `prisma.raw` across 11 service files bypass the extension. No linter rule or guard prevents future misuse.
- **Risk**: `findUnique` path fetches before checking tenancy — minor ID enumeration risk
- No database-level RLS (MariaDB doesn't support it) — defense-in-depth is missing

### Subscription/billing readiness

| Component | Status |
|-----------|--------|
| Database schema (plans, subscriptions, invoices, payments) | Complete |
| 14-day trial creation on signup | Complete |
| Trial expiry gate (402 for mutations) | Complete |
| Pricing page on frontend | Complete |
| Billing section in settings | Complete |
| Payment gateway integration (Stripe or any) | **Not started** |
| Checkout flow | **Not started** |
| Invoice generation | **Not started** |
| Payment webhooks | **Not started** |
| Plan limit enforcement | **Not started** |
| Upgrade/downgrade flow | **Not started** |
| Trial expiry notifications | **Not started** |

**Verdict: Billing data model is ready, but payment collection is entirely unimplemented. You cannot charge customers.**

### GDPR / Legal compliance

| Requirement | Status |
|-------------|--------|
| Terms of Service page | **Not started** |
| Privacy Policy page | **Not started** |
| Cookie consent | **Not started** |
| Data processing consent | **Not started** |
| Right to erasure (account deletion) | **Not started** (soft delete exists but no self-service endpoint) |
| Data portability (export) | **Partial** (platform_admin only, not user-facing) |
| Data retention policy | Partial (90-day audit log cleanup exists) |

### Email flows

| Email Type | Status |
|-----------|--------|
| Welcome email | Working (Resend) |
| Password reset | Working (Resend) |
| Email verification | **Not started** |
| Trial expiry warning | **Not started** |
| Invoice/receipt | **Not started** |
| Invitation to join | **Not started** |

---

## 5. Infrastructure & Deployment

| Area | Status | Severity |
|------|--------|----------|
| Docker runs as root (no USER directive) | Both Dockerfiles missing `USER` | **CRITICAL** |
| No database backup strategy | MariaDB, Redis, MinIO — no backups | **CRITICAL** |
| No Prisma migration history | `prisma/migrations/` is empty | **CRITICAL** |
| SENTRY_AUTH_TOKEN in Docker build args | Visible in image layer history | HIGH |
| MinIO pinned to `latest` tag | Reproducibility risk | HIGH |
| No rollback mechanism in deploy | No versioning, no blue-green, no health gate | HIGH |
| No `.dockerignore` in API | Build context includes node_modules, .git | MEDIUM |
| No Redis password (defaults to empty) | Internal network only, still risky | MEDIUM |
| No Traefik rate limiting middleware | All rate limiting is app-level only | MEDIUM |
| No structured logging / log aggregation | Console output only | LOW |
| No Prometheus metrics | Only /health endpoint | LOW |
| No Redis health check | Missing from docker-compose | LOW |
| CI missing lint and type-check steps | Only builds and security tests | LOW |

### CI/CD
- GitHub Actions CI runs: API build, web build, DB security tests (3 parallel jobs)
- Deploy workflow: push to `main` → SSH → git pull → docker compose build → up
- **No database migration step in deploy** — schema changes must be applied manually
- **No health gate in deploy** — just `sleep 10` then curl `/health`
- **No rollback** — if deploy fails, manual intervention required

---

## 6. UI/UX

### Usability problems

| Issue | Impact |
|-------|--------|
| No forgot-password page | Users locked out permanently |
| No onboarding for new workspaces | Empty board with no guidance |
| `confirm()` browser dialogs for destructive actions | Unstyled, blockable, inconsistent |
| Estimate builder unusable on mobile | No responsive layout |
| Settings tabs don't sync with URL | Refreshing loses active tab |

### Mobile responsiveness
- Sidebar auto-collapses below 768px — good
- Jobs board auto-switches to list view on mobile — good
- Estimate builder has no mobile layout — **broken on phones**
- Workshop view columns require horizontal scroll on mobile — suboptimal

### Accessibility
- No keyboard-accessible alternative to drag-and-drop on jobs board
- No `aria-current` on sidebar navigation
- Many buttons lack `aria-label` attributes
- `confirm()` dialogs are not accessible
- Color contrast may not meet WCAG AA on `text-muted-foreground` on `bg-muted`

### Empty/Loading/Error states
- Empty states exist for most list views — good
- Global and dashboard error boundaries exist — good
- Some loading states use plain text instead of skeleton components — inconsistent
- Some catch blocks silently swallow errors — no user feedback
- No React error boundary for individual sub-components — one crash takes down the whole page

### Copywriting
- Landing page is polished and industry-specific — good
- Inconsistent naming: "PrioraFlow" vs "SuperFlow" across code and localStorage keys
- No legal pages (Terms, Privacy)

---

## 7. Summary Scores

| Category | Score (1-10) | Notes |
|----------|-------------|-------|
| Product Readiness | 6 | Core features solid; billing and onboarding missing |
| Code Quality | 5 | Good architecture; massive components, zero tests |
| Security | 4 | Critical tenant isolation bypasses; auth is solid |
| SaaS Readiness | 3 | No billing, no legal, no GDPR, no email verification |
| Infrastructure | 4 | Docker/CI exists; runs as root, no backups, no migrations |
| UI/UX | 6 | Good design; missing key pages and mobile layout |
| **Overall** | **4.5** | **Not launch-ready; 2-3 weeks of focused work needed** |

---

## Critical Blockers (Must fix before launch)

1. **Media findUnique tenant isolation bypass** — cross-tenant data leak
2. **SSRF in testIntegration endpoint** — allows internal network scanning
3. **WorkshopGuard not applied** — confusing and leak-prone without it
4. **Docker containers run as root** — container breakout risk
5. **No database backup strategy** — unacceptable for SaaS holding customer data
6. **No Prisma migration history** — cannot evolve production schema safely
7. **No payment collection** — cannot charge customers
8. **No forgot-password frontend page** — users locked out with no recovery
9. **No Terms of Service or Privacy Policy** — legal requirement for SaaS handling personal data

## High-Priority Fixes

1. Add Redis-backed throttle storage
2. Return refresh token only in HttpOnly cookie
3. Apply WorkshopGuard globally with auth-route exemptions
4. Add email verification on signup
5. Normalize password minimums to 8 chars everywhere
6. Add account lockout after N failed attempts
7. Validate CreateRoleDto permissions against ALL_PERMISSIONS
8. Replace UpdateSettingsDto `@Allow()` with proper validation
9. Add `.dockerignore`, non-root USER, remove SENTRY_AUTH_TOKEN from build args
10. Pin MinIO to specific version tag
11. Add database migration step to deploy pipeline
12. Implement Stripe checkout + webhooks for payment collection
13. Add forgot-password frontend page
14. Add Terms of Service and Privacy Policy pages
15. Create baseline Prisma migration
16. Add soft-delete global filter or Prisma middleware
17. Add Jest test setup with at least controller/service tests for core modules

## Medium-Priority Improvements

1. Decompose job detail page (1100 lines) into sub-components
2. Deduplicate STATUS_META definitions
3. Add React error boundaries for EstimateBuilder and InspectionWorkspace
4. Add form validation library (react-hook-form + zod)
5. Replace `confirm()` dialogs with shadcn Dialog components
6. Add breadcrumbs to admin section
7. Add keyboard-accessible alternative to drag-and-drop
8. Add `aria-current` and `aria-label` attributes to navigation
9. Add Redis password to docker-compose
10. Add structured logging (Pino/Winston)
11. Add request correlation IDs
12. Add composite index on `(workshop_id, status)` for jobs
13. Add connection pool settings to DATABASE_URL
14. Optimize InsightsService queries (consolidate 42 individual queries)
15. Add Stripe/webhook integration for invoices and receipts
16. Add plan limit enforcement (max users, max jobs/month)
17. Add user-facing data export endpoint
18. Add email verification and invitation flows
19. Implement virus scanning for uploaded media
20. Add Traefik rate limiting middleware

## Nice-to-Have Improvements

1. Add onboarding walkthrough / guided tour for new workspaces
2. Add sample data seeding for new workshop signups
3. Add Prometheus metrics endpoint
4. Add blue-green deployment strategy
5. Add mobile-responsive layout for estimate builder
6. Add E2E tests (Playwright/Cypress)
7. Add WebSocket notifications for real-time updates
8. Add Bull Board for queue monitoring
9. Add log aggregation (ELK/Loki)
10. Add encrypt-then-store for integration secrets column
11. Standardize localStorage key naming
12. Add URL hash sync for settings tabs

---

## Step-by-Step Action Plan

### Phase 1: Security & Legal Blockers (Week 1-2)
1. Fix media `findUnique` tenant isolation — add explicit `workshop_id` check or switch to `findFirst`
2. Add URL allowlist/blocklist to `testIntegration()` (or disable the endpoint)
3. Register `WorkshopGuard` globally with exemptions for auth routes
4. Remove refresh token from response body (cookie-only)
5. Add Redis-backed `ThrottlerStorage`
6. Normalize password minimum to 8 everywhere
7. Add `.dockerignore`, `USER node` to both Dockerfiles, remove `SENTRY_AUTH_TOKEN` from build args
8. Create baseline Prisma migration (`prisma migrate dev --name init`)
9. Add Terms of Service and Privacy Policy pages

### Phase 2: Must-Have Features (Week 3-4)
10. Build forgot-password frontend page (backend already exists)
11. Integrate Stripe checkout + webhook handler for payment collection
12. Add email verification on signup
13. Set up automated database backups (MariaDB, Redis, MinIO)
14. Add deploy pipeline migration step + rollback mechanism
15. Add Jest test setup + critical path tests (auth, job CRUD, tenant isolation)

### Phase 3: Hardening (Week 5-6)
16. Pin MinIO version, add Redis password, add health checks
17. Validate DTOs properly (replace `@Allow()`, validate permissions list)
18. Add account lockout mechanism
19. Add plan limit enforcement (max users, max jobs/month)
20. Add user-facing data export endpoint
21. Decompose large page components, add error boundaries

### Phase 4: Polish (Week 7+)
22. Onboarding walkthrough for new workspaces
23. Form validation library + inline errors
24. Mobile responsive estimate builder
25. Accessibility improvements (keyboard nav, aria attributes)
26. Structured logging + request correlation IDs
27. Optimize insights dashboard queries

---

## Specific Files Needing Changes

| File | Change |
|------|--------|
| `src/media/media.service.ts` | Fix `findUnique` → `findFirst` with `workshop_id` filter |
| `src/admin/admin.service.ts` | Add SSRF protection to `testIntegration()` |
| `src/common/guards/workshop.guard.ts` | Register as global guard in `app.module.ts` |
| `src/auth/auth.service.ts` | Remove refresh token from response body |
| `src/auth/dto/refresh-token.dto.ts` | Remove `refreshToken` field from response type |
| `src/config/env.validation.ts` | Normalize password minimum validation |
| `Dockerfile` | Add `USER node`, add `.dockerignore` |
| `superflow-web/Dockerfile` | Remove `SENTRY_AUTH_TOKEN` build arg |
| `docker-compose.yml` | Pin MinIO version, add Redis password, add `user:` directives |
| `src/common/throttler/` | Add Redis-backed ThrottlerStorage |
| `superflow-web/src/app/(dashboard)/forgot-password/page.tsx` | Create forgot-password page |
| `superflow-web/src/app/(dashboard)/settings/page.tsx` | Add billing/checkout UI |
| `superflow-web/src/app/terms/page.tsx` | Create Terms of Service page |
| `superflow-web/src/app/privacy/page.tsx` | Create Privacy Policy page |
| `prisma/migrations/` | Create baseline migration |
| `src/common/dto/update-settings.dto.ts` | Replace `@Allow()` with proper validation |
| `src/admin/dto/create-role.dto.ts` | Add permission allowlist validation |
| `src/insights/insights.service.ts` | Consolidate queries, add composite index |
| `superflow-web/src/app/(dashboard)/jobs/[id]/page.tsx` | Decompose into sub-components |
| `superflow-web/src/app/(dashboard)/jobs/page.tsx` | Extract inline components, deduplicate STATUS_META |