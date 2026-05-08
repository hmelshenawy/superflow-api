# PrioraFlow — SaaS Readiness Audit & Roadmap

_Date: 2026-05-08_

## 1. Current State Summary

PrioraFlow is a workshop operations platform built on NestJS (Prisma + MySQL) + Next.js 16 + Redis + MinIO + Traefik. It has a live deployment at `suservice.hmelshenawy.com` with Docker Compose, TLS, and multi-tenant (multi-workshop) architecture.

### What Already Works

| Layer | Status | Notes |
|---|---|---|
| **Auth** | ✅ Solid | JWT + refresh tokens, SHA-256 lookup, throttling, session management |
| **Multi-tenancy** | ✅ Done | Workshop-scoped data via ALS + Prisma interceptor, `platform_admin` vs `workshop_admin` |
| **Granular permissions** | ✅ Done | 6 default roles (platform_admin, admin, manager, service_advisor, workshop_teamleader, technician, receptionist), 40+ permissions, permission-based nav |
| **Jobs / Workshop Board** | ✅ Solid | Full lifecycle (booked → checking → estimate_sent → approved → in_progress → waiting_parts → quality_check → ready → closed), board + list views, priority badges |
| **Priority Engine** | ✅ Core done | Rule-based scoring (17 weighted factors), Next Best Action, API endpoints, job detail integration |
| **Inspections** | ✅ Solid | Template editor, multi-section items, photo capture, pass/fail/ok-warn-fail types |
| **Estimates / Quote Builder** | ✅ Solid | Grouped lines (Red/Yellow/Custom/General), labour+parts+sublets, tax, discounts |
| **Customer Portal** | ✅ Done | Token-based public page, approve/decline/defer per group, media proxy, smart polling |
| **Deferred Work** | ✅ Done | Save declined items, reminders, rebook into new job |
| **Insights Dashboard** | ✅ Basic | Counts, jobs by status, revenue, inspection rate, jobs over time charts |
| **Media / S3** | ✅ Done | MinIO, safe filenames, portal proxy, inspection photos |
| **Notifications** | ⚠️ Structure only | BullMQ queue, template renderer, DB storage — but no real delivery provider wired (webhooks are empty) |
| **Integrations** | ⚠️ Schema only | DB model exists (`integrations`, `integration_events`) but no service code |
| **Audit Logs** | ✅ Done | Entity changes tracked, sensitive field redaction |
| **Scheduler** | ✅ Done | Auto-archive closed, no-show booking, advisory locks, startup catch-up |
| **Landing Page** | ✅ Done | Marketing page with features, priority engine explainer, how-it-works, CTA |
| **Dark Mode** | ✅ Done | Full dark palette |
| **Security Hardening** | ✅ Partial | Helmet, throttling, validated DTOs, redacted audit — but CSP disabled, no pentest |

---

## 2. SaaS Readiness Gaps — Ranked by Blocker Level

### 🔴 BLOCKER — Cannot go public without these

| # | Gap | Why it blocks SaaS | Effort |
|---|---|---|---|
| B1 | **No billing / subscription system** | No way to charge customers, no plan tiers, no trial management | Large |
| B2 | **Self-service signup/onboarding backend + page added** | Public signup creates workshop + owner, sends welcome email, and starts 14-day trial | ✅ Mostly done |
| B3 | **Email delivery wired via Resend** | Notification worker sends email channel through Resend; approval emails include customer portal links | ✅ Done |
| B4 | **Password reset flow added** | `/auth/forgot-password` + `/auth/reset-password`, hashed one-time tokens, Resend email delivery | ✅ Done |
| B5 | **Per-tenant rate limiting added** | Global throttle now keys authenticated traffic by JWT `workshopId`; platform admins by user; public traffic by IP | ✅ Done |
| B6 | **No data isolation verification** | Multi-tenancy relies on ALS interceptor — no automated test proving cross-tenant leaks can't happen | Medium |
| B7 | **CSP disabled** | Helmet CSP is off (`contentSecurityPolicy: false`) — XSS risk on a public SaaS | Small |

### 🟡 MAJOR — Launch-able but will cause pain quickly

| # | Gap | Impact | Effort |
|---|---|---|---|
| M1 | **No real integrations** | Integration model exists but zero connectors (DMS, WhatsApp, SMS, email providers) | Large |
| M2 | **No webhook/event system for external apps** | Customers can't push data to their own systems | Medium |
| M3 | **No usage analytics / metering** | Can't measure per-tenant usage for billing or abuse detection | Medium |
| M4 | **Priority engine is rule-based only** | Plan says Phase 1 done; AI explanations, assistant, message drafts (Phases 2-4) not built | Large (but phased) |
| M5 | **No Advisor Cockpit (personal dashboard)** | Plan calls for per-advisor view — not built yet | Medium |
| M6 | **No Workshop Kanban board** | Plan calls for drag/drop by stage — not built | Medium |
| M7 | **No Blockers model / UI** | Plan calls for Blocker entity + blocked-jobs dashboard — not built | Medium |
| M8 | **No job stage history tracking** | `job_status_history` exists in schema but no service/UI to show timeline | Small |
| M9 | **No mobile-responsive optimization** | Current UI works on desktop; no dedicated mobile or PWA support | Medium |
| M10 | **No error monitoring** | No Sentry/Datadog — production errors go to Docker logs only | Small |

### 🟢 NICE-TO-HAVE — Post-launch improvements

| # | Gap | Impact | Effort |
|---|---|---|---|
| N1 | AI priority explanations (Phase 2) | Human-readable reason text via LLM | Small |
| N2 | AI assistant Q&A (Phase 3) | "What should I do now?" natural language | Medium |
| N3 | AI customer message drafts (Phase 4) | WhatsApp/SMS draft generation | Medium |
| N4 | Multi-language UI | Arabic + English for GCC market | Medium |
| N5 | White-label / custom branding per workshop | Subdomain + logo/colors per tenant | Medium |
| N6 | Public API / developer docs | External integrations via API keys | Medium |
| N7 | Advanced reporting (SLA, advisor performance, throughput) | Management analytics | Medium |
| N8 | Real-time push (SSE/WebSocket) | Replace polling for customer decisions | Small |

---

## 3. SaaS Readiness Score

| Category | Score | Max |
|---|---|---|
| Core product (workshop management) | 9 | 10 |
| Multi-tenancy | 8 | 10 |
| Auth & permissions | 8 | 10 |
| Priority engine (Phase 1) | 9 | 10 |
| Billing & monetization | 0 | 10 |
| Self-service onboarding | 1 | 10 |
| Notifications / comms | 2 | 10 |
| Data safety verification | 4 | 10 |
| Integrations ecosystem | 1 | 10 |
| AI features (Phases 2-4) | 0 | 10 |
| Mobile / PWA | 2 | 10 |
| Observability | 2 | 10 |
| **Total** | **46** | **130** |

**Verdict: PrioraFlow is ~35% ready for public SaaS. The product is strong where it counts (workshop ops, priority engine, multi-tenancy). The gaps are all in SaaS infrastructure — billing, onboarding, comms, safety, observability. None of the product gaps are hard to solve; they just haven't been built yet.**

---

## 4. Build Roadmap — Step by Step

### Phase 0: Safety & Fundamentals (Week 1-2)
_These are quick wins that unblock everything else._

- [x] **B7**: Enable CSP (report-only mode with directives for Next.js + Sentry) ✅ Deployed
- [x] **B4**: Add `/auth/forgot-password` + `/auth/reset-password` endpoints + email flow ✅
- [x] **B6**: Write automated multi-tenant isolation tests (26 checks: read/count/findUnique/write/no-workshop/platform-admin/cross-model) ✅ Added `npm run test:tenant`
- [x] **M10**: Add Sentry to API + Web — errors captured in production, 5xx only, PII redacted ✅ Deployed
- [x] **B5**: Add per-tenant rate limiting (tenant bucket from JWT `workshopId`, platform admin by user, public fallback by IP) ✅ Added `npm run test:rate-limit`

### Phase 1: Comms & Onboarding (Week 3-4)
_Now users can sign up and get value from the app._

- [x] **B3**: Wire real email delivery with Resend — notification worker sends emails and approval emails include portal links ✅
- [x] **B2**: Build self-service signup flow:
  - [x] Backend `POST /auth/signup` creates workshop + owner `workshop_admin`, returns tokens, sends welcome email
  - [x] Frontend `/signup` page + landing CTA "Start free trial" → redirect to dashboard
  - [x] Trial period (14 days) tracked in `workshops.trial_ends_at`, with `plan_id='free_trial'`
- [x] **M8**: Build job stage history service + timeline UI in job detail page — creation/status changes are recorded and shown in a Timeline tab
- [ ] **M10**: (if not done in Phase 0)

### Phase 2: Billing (Week 5-7)
_Monetization — the hardest gap but the one that makes it a real SaaS._

- [ ] **B1**: Implement billing system:
  - Add `plans` table (free_trial, starter, pro, enterprise) with limits (users, jobs/month, workshops)
  - Add `subscriptions` table linking workshop → plan → Stripe customer/subscription ID
  - Integrate Stripe Checkout for plan selection + payment
  - Add Stripe webhook handler (payment success/failure/subscription cancelled)
  - Enforce plan limits in API guards (e.g., reject job creation if over monthly limit)
  - Add billing page in settings (current plan, usage, upgrade CTA)
- [ ] **M3**: Add usage metering (jobs created/month, active users, API calls) — feed into billing enforcement

### Phase 3: Product Completeness (Week 8-10)
_Close the biggest product gaps from the priority engine plan._

- [ ] **M5**: Advisor Cockpit — personal dashboard (my urgent, my pending, my promises at risk, my next actions)
- [ ] **M6**: Workshop Kanban board (drag/drop stage, priority coloring, blocker icons)
- [ ] **M7**: Blockers model + blocked-jobs dashboard (new `blockers` table, blocker types, resolve flow)
- [ ] **M9**: Mobile-responsive pass — test on phone, fix worst layout breaks, consider PWA manifest

### Phase 4: AI & Intelligence (Week 11-14)
_Differentiator — make PrioraFlow genuinely AI-driven, not just AI-branded._

- [ ] **N1**: AI priority explanations — LLM call generates human-readable reason for each job's score
- [ ] **N2**: AI assistant — natural language Q&A over active jobs ("What should I focus on now?")
- [ ] **N3**: AI customer message drafts — generate WhatsApp/SMS/email drafts based on job state
- [ ] **N8**: Real-time push (SSE) for customer decisions — replace polling

### Phase 5: Ecosystem & Scale (Week 15+)
_Growth infrastructure._

- [ ] **M1**: Build first real integration connectors (DMS sync, WhatsApp Business, SMS via Twilio)
- [ ] **M2**: Webhook system — let workshops push events to their own endpoints
- [ ] **N4**: Multi-language UI (Arabic first for GCC market)
- [ ] **N5**: White-label per workshop (subdomain, logo, colors)
- [ ] **N6**: Public API + developer docs (API keys, rate limits, Swagger public)

---

## 5. Priority Engine Plan — Progress Tracker

From `docs/prioraflow-priority-engine-plan.md`:

| Plan Item | Status | Notes |
|---|---|---|
| Priority score per job | ✅ Done | 17 factors, weighted, 0-100 capped |
| Unified priority levels (Low/Normal/High/Critical) | ✅ Done | Same thresholds everywhere |
| Next Best Action | ✅ Done | Generated per job with owner, urgency, action type |
| Customer Informed zeroing | ✅ Done | Zeroes risk factors, keeps permanent ones |
| Priority explanation | ✅ Partial | Factor list shown in UI; no AI natural language yet |
| Job stage lifecycle | ✅ Done | 9 stages with transitions |
| Dashboard: Urgent Now | ❌ Not built | Part of Advisor Cockpit (Phase 3) |
| Dashboard: Blocked Jobs | ❌ Not built | Needs Blockers model (Phase 3) |
| Dashboard: Promised Delivery Risk | ⚠️ Partial | Shown per-job; no dedicated widget/timeline |
| Dashboard: Advisor Workload | ❌ Not built | Part of Advisor Cockpit |
| Dashboard: Next Best Actions | ⚠️ Partial | Shown per-job; no global action queue |
| Blocker model | ❌ Not built | Phase 3 |
| NextAction model | ❌ Not built | Currently computed on-the-fly, not persisted |
| Workshop Kanban | ❌ Not built | Phase 3 |
| Advisor Cockpit | ❌ Not built | Phase 3 |
| AI explanation (Phase 2) | ❌ Not built | Phase 4 of this roadmap |
| AI assistant (Phase 3) | ❌ Not built | Phase 4 of this roadmap |
| AI message drafts (Phase 4) | ❌ Not built | Phase 4 of this roadmap |

---

## 6. Schema Changes Needed

### Immediate (Phase 0-1)

```sql
-- Password reset
ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(64);
ALTER TABLE users ADD COLUMN reset_token_expires DATETIME;

-- Workshop trial
ALTER TABLE workshops ADD COLUMN trial_ends_at DATETIME;
ALTER TABLE workshops ADD COLUMN plan_id VARCHAR(36);
```

### Billing (Phase 2)

```sql
CREATE TABLE plans (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(60),
  slug VARCHAR(60) UNIQUE,
  price_monthly DECIMAL(10,2),
  limits_json TEXT,
  created_at DATETIME DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id CHAR(36) PRIMARY KEY,
  workshop_id CHAR(36),
  plan_id CHAR(36),
  stripe_customer_id VARCHAR(120),
  stripe_subscription_id VARCHAR(120),
  status ENUM('active','past_due','cancelled','trialing') DEFAULT 'trialing',
  current_period_start DATETIME,
  current_period_end DATETIME,
  created_at DATETIME DEFAULT NOW()
);
```

### Blockers (Phase 3)

```sql
CREATE TABLE blockers (
  id CHAR(36) PRIMARY KEY,
  job_id CHAR(36),
  type ENUM('customer_approval','parts','diagnosis','warranty','advisor_action','workshop'),
  severity ENUM('low','medium','high') DEFAULT 'medium',
  note TEXT,
  owner VARCHAR(60),
  created_at DATETIME DEFAULT NOW(),
  resolved_at DATETIME
);
```

### Next Actions (persisted) — Phase 3

```sql
CREATE TABLE next_actions (
  id CHAR(36) PRIMARY KEY,
  job_id CHAR(36),
  type VARCHAR(60),
  title VARCHAR(255),
  description TEXT,
  due_at DATETIME,
  priority ENUM('low','normal','high','critical'),
  status ENUM('pending','completed','skipped') DEFAULT 'pending',
  completed_at DATETIME,
  created_at DATETIME DEFAULT NOW()
);
```

---

## 7. Key Decisions Needed

| Decision | Options | Recommendation |
|---|---|---|
| Billing provider | Stripe vs Paddle vs LemonSqueezy | **Stripe** — most mature, best webhook support, handles GCC/EMEA |
| Email delivery | Resend vs SendGrid vs AWS SES | **Resend** — developer-friendly, good DX, affordable |
| Error monitoring | Sentry vs Datadog vs Logtail | **Sentry** — free tier covers early stage, NestJS SDK ready |
| AI provider for Phase 4 | OpenAI vs Claude vs local Ollama | **OpenAI** for quality; keep Ollama as fallback for cost |
| Mobile approach | Responsive web vs PWA vs React Native | **PWA** — lowest effort, works offline, no app store needed |
| Integration architecture | Polling vs webhook-driven vs event-sourced | **Webhook-out + polling-in** — simplest to build first |

---

_This document is the working plan. Update checkboxes as items get built._