<!--
SYNC IMPACT REPORT
- Version change: 1.0.0 → 1.1.0
- Principles added:
  - XI. Multi-Tenant First
  - XII. Observability & Auditability
  - XIII. API-First Development
  - XIV. AI Must Assist, Not Control
  - XV. Revenue Before Features
- Principles modified:
  - None removed or renamed
- AI Coding Rules — Anti-Spaghetti Constitution amended:
  - Architecture Rules: pragmatic Repository layer guidance added
  - Old: "Service = Business logic only. No direct DB queries. Repository = All DB queries. Nowhere else."
  - New: "Service = Business logic. Direct Prisma access is allowed in services when complexity is low. Introduce a Repository layer only when it reduces duplication, improves maintainability, or improves testability."
- Governance updated:
  - Amendment Procedure now references Core Principles I–XV (was I–X)
  - Compliance Review expanded with checks for XI–XV
- Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ updated (Constitution Check gates 11–15 added)
  - .specify/templates/spec-template.md — ✅ updated (tenant scoping note in Data Requirements, API-first note in API Requirements)
  - .specify/templates/tasks-template.md — ✅ updated (Polish phase expanded with tenant isolation and observability tasks)
  - .specify/templates/checklist-template.md — ✅ no changes required (generic)
- Follow-up TODOs: None
-->

# PrioraFlow Constitution

## Product Purpose

PrioraFlow is a workshop operations intelligence app designed for automotive service centers.
Its main goal is to help service advisors, workshop controllers, and managers prioritize jobs,
reduce idle time, improve follow-up, and make workshop decisions based on clear operational data.

The app must stay focused on:
- Job prioritization
- Workshop visibility
- Service advisor follow-up
- Technician/workshop flow
- Customer delay prevention
- KPI and operational insights

PrioraFlow is not a generic CRM, ERP, or accounting system.

## Core Principles

### I. Workshop-First Design

Every feature must solve a real workshop problem:
- Which job needs attention now?
- Why is this job delayed?
- Who should follow up?
- What is blocking progress?
- What is the next best action?

Avoid features that look nice but do not improve workshop flow.

**Rationale**: Workshop staff operate under time pressure. Every screen and workflow must directly
contribute to moving vehicles through the service center faster and with fewer errors.

### II. Priority Over Data Display

PrioraFlow should not only show data. It must help users understand what needs action first.

Every job screen or dashboard should answer:
- What is urgent?
- What is delayed?
- What is at risk?
- What should be done next?

**Rationale**: Raw data without prioritization creates cognitive overload. Users need actionable
intelligence, not exhaustive lists.

### III. Simple for Daily Users

Service advisors and workshop users are busy. The UI must be clear, fast, and easy to understand.

Rules:
- Avoid complex screens.
- Avoid too many clicks.
- Use clear labels.
- Use color only when it adds meaning.
- Make the next action obvious.

**Rationale**: Complexity increases training time and error rates. A simple UI is a competitive
advantage in high-throughput environments.

### IV. Operational Accuracy

Workshop data must be reliable.

Rules:
- Avoid duplicate jobs.
- Keep job status consistent.
- Track created, updated, closed, delayed, and idle states clearly.
- Never silently overwrite important job data.
- All calculations must be explainable.

**Rationale**: Decisions are only as good as the data behind them. Inconsistent or silently
corrupted job data leads to misallocated technician time and broken customer trust.

### V. Current Version Safety

When adding features or fixing bugs:
- Do not break existing working flows.
- Prefer small, safe changes.
- Keep backward compatibility where possible.
- Refactor only when it clearly improves maintainability.
- Avoid large rewrites unless required.

**Rationale**: Workshop operations depend on the system being available and predictable.
Regressions in live environments directly impact revenue and customer satisfaction.

### VI. Role-Based Thinking

PrioraFlow should support different workshop roles:
- Service Advisor: follow-up, customer updates, job status
- Workshop Controller: job flow, technician load, blockers
- Manager: KPIs, delays, idle time, performance
- Admin: users, settings, workflow stages

Each feature must clearly define which role benefits from it.

**Rationale**: Different roles have distinct goals and time constraints. Designing for a specific
role prevents one-size-fits-all screens that serve no one well.

### VII. Explainable Intelligence

Any AI, scoring, priority, or recommendation must be understandable.

For every priority score or recommendation, the app should be able to explain:
- Why this job is urgent
- What factors affected the score
- What action is recommended
- What risk exists if ignored

No black-box logic.

**Rationale**: Users will not trust or act on recommendations they cannot explain to a customer
or a manager. Explainability is a prerequisite for adoption.

### VIII. Performance Matters

PrioraFlow is used during live workshop operations.

Rules:
- Pages should load quickly.
- Avoid unnecessary database queries.
- Avoid N+1 query problems.
- Use caching where useful.
- APIs should return only required data.
- Heavy reports should not slow daily job boards.

**Rationale**: A slow job board is ignored. Performance is a feature because it determines
whether the system is used in real time or bypassed entirely.

### IX. Clean Technical Structure

Backend and frontend should remain modular.

Backend rules:
- Keep services focused.
- Avoid god classes.
- Keep business logic inside services, not controllers.
- Use DTOs clearly.
- Validate input.
- Use Prisma carefully and efficiently.

Frontend rules:
- Keep components reusable.
- Separate UI from data-fetching logic.
- Use clear folder structure.
- Avoid duplicated state.
- Keep pages simple and readable.

**Rationale**: Technical debt accumulates faster in SaaS products than in greenfield projects.
Clean structure keeps the cost of change low as the product matures.

### X. Feature Specification Standard

Every new feature must include:
- Problem statement
- Target user
- User story
- Acceptance criteria
- Data requirements
- API requirements
- UI requirements
- Edge cases
- Permission rules if needed
- Success metric
- Risk to existing system

No feature should be implemented without clear acceptance criteria.

**Rationale**: Incomplete specifications produce rework. The specification is the contract
between product intent and implementation.

### XI. Multi-Tenant First

PrioraFlow is a SaaS product.

Rules:
- Every workshop owns its own data.
- No workshop can access another workshop's data.
- Every query must be workshop-scoped.
- Every cache key must be workshop-scoped.
- Every report must be workshop-scoped.
- Tenant isolation is non-negotiable.

**Rationale**: Multi-tenant mistakes are catastrophic and difficult to fix later.
Security and tenant isolation are foundational requirements of the platform.

### XII. Observability & Auditability

Every important action should be traceable.

Track:
- Who created a record
- Who modified a record
- When it was modified
- What changed
- Important workflow transitions

Examples:
- Job moved stage
- Priority changed
- Estimate approved
- Follow-up completed
- User role changed

**Rationale**: Managers need accountability, troubleshooting capability, and historical
visibility into operational decisions.

### XIII. API-First Development

PrioraFlow backend is the source of truth.

Rules:
- Design API contracts before UI implementation.
- Frontend never bypasses backend business rules.
- Business logic exists once in backend.
- APIs must be stable, predictable, and versionable.
- All integrations should use public application services rather than direct database access.

**Rationale**: Future mobile applications, AI agents, external integrations, and partner systems
depend on stable APIs.

### XIV. AI Must Assist, Not Control

AI recommendations are suggestions.

Rules:
- AI never performs destructive actions automatically.
- Users always remain decision makers.
- AI recommendations must be reviewable.
- AI recommendations must include reasoning.
- AI actions affecting customer or workshop data require human approval.

Allowed:
- Recommend follow-up
- Recommend priority increase
- Recommend escalation
- Recommend workload balancing

Not Allowed:
- Automatically close jobs
- Automatically modify customer information
- Automatically change workflow stages
- Automatically approve estimates

**Rationale**: PrioraFlow is an operational intelligence platform, not an autonomous workshop
controller.

### XV. Revenue Before Features

Feature prioritization order:

1. Solve workshop pain
2. Increase adoption
3. Improve retention
4. Generate revenue
5. Nice-to-have improvements

Rules:
- Every feature proposal should identify measurable business value.
- Nice-to-have features should not delay high-impact operational features.
- Product decisions should favor customer outcomes over feature quantity.

**Rationale**: PrioraFlow is a commercial SaaS platform and must remain focused on delivering
measurable customer value.

## Bug Fix Rules

When fixing bugs:
1. Reproduce the issue.
2. Identify root cause.
3. Fix the smallest safe area.
4. Add validation or guard if needed.
5. Confirm existing behavior still works.
6. Document what changed.

Avoid random changes without understanding the cause.

## Data Model Principles

PrioraFlow data should represent real workshop objects:
- Job
- Vehicle
- Customer
- Service Advisor
- Technician
- Workflow Stage
- Priority Score
- Delay Reason
- Follow-up Action
- Estimate
- Appointment
- Notification
- Workshop

Database changes must be intentional and should avoid unnecessary complexity.

## UI/UX Principles

The interface should feel:
- Professional
- Clean
- Fast
- Workshop-focused
- Suitable for dealership/service center use

Preferred style:
- Dark theme friendly
- Clear status colors
- Strong tables/cards
- Minimal clutter
- Dashboard-style visibility
- Mobile/tablet consideration where useful

## PrioraFlow Feature Decision Filter

Before adding any feature, ask:
1. Does this improve workshop flow?
2. Does it reduce delay or idle time?
3. Does it help someone take action faster?
4. Is it simple enough for daily use?
5. Can we measure its value?
6. Will it affect existing flows?
7. Is the logic explainable?

If the answer is mostly no, do not build it.

## Development Mindset

PrioraFlow should grow feature by feature, not by random expansion.

Preferred approach:
- Small specs
- Clear tasks
- Safe implementation
- Test after each feature
- Keep current version stable
- Improve structure gradually

The goal is not only to build features, but to build a reliable workshop intelligence product.

## AI Coding Rules — Anti-Spaghetti Constitution

### Session Rules
- Always work on dev branch. Never touch main unless explicitly told.
- Start a new conversation after each completed feature. Never carry dead context.
- If unsure about anything — ask, never assume.
- Never change code outside the file/module currently being worked on.
- Never change existing function signatures without explicit approval.

### Architecture Rules
- Design first, code second. Always propose structure before writing implementation.
- One module per task. Never mix concerns across modules in one session.
- Controller = HTTP only. No business logic.
- Service = Business logic.
- Direct Prisma access is allowed in services when complexity is low.
- Introduce a Repository layer only when it reduces duplication, improves maintainability,
  or improves testability.
- DTOs must have full validation decorators. No raw input passes through.

**Rationale**: PrioraFlow is currently developed by a small team. Architecture should remain
pragmatic and avoid unnecessary abstraction.

### Code Quality Rules
- No file exceeds 300 lines. If it does, split it.
- No function exceeds 30 lines. If it does, extract it.
- No duplicate logic. Extract to shared service or utility.
- No unused imports, variables, or exports.
- No hardcoded values. Use config/constants.
- Every service function must have error handling.

### Git Rules
- AI suggests git commands. Human runs them.
- Never switch branches autonomously.
- Never commit without explicit instruction.

### Context Rules
- Always paste PROJECT_CONTEXT.md at session start.
- Always paste CONVENTIONS.md when writing new code.
- If context feels lost — stop, re-ground, don't guess.

## Governance

### Amendment Procedure
- Amendments to this constitution require updating `.specify/memory/constitution.md` directly.
- Any change to Core Principles (I–XV) constitutes a MINOR version bump.
- Removal or redefinition of a principle constitutes a MAJOR version bump.
- Clarifications, wording improvements, or non-semantic refinements constitute a PATCH version bump.
- All amendments must be recorded in the Sync Impact Report at the top of this file.

### Versioning Policy
- Versions follow Semantic Versioning: MAJOR.MINOR.PATCH.
- MAJOR: backward-incompatible governance or principle removals/redefinitions.
- MINOR: new principles or materially expanded guidance.
- PATCH: clarifications, wording, typo fixes, non-semantic refinements.

### Compliance Review
- All implementation plans (`plan.md`) must pass a Constitution Check before research begins.
- All feature specifications (`spec.md`) must include every item mandated by Principle X.
- All code reviews must verify alignment with the Clean Technical Structure principle (IX).
- Performance regressions that violate Principle VIII must be justified in writing.
- Tenant isolation that violates Principle XI must be rejected without exception.
- New features that involve workflow transitions must satisfy Principle XII (Observability & Auditability).
- AI-driven features must satisfy Principle XIV (AI Must Assist, Not Control).
- Feature proposals must identify measurable business value per Principle XV (Revenue Before Features).

### Runtime Guidance
- For day-to-day development, refer to `CLAUDE.md` in the repository root.
- If `CLAUDE.md` conflicts with this constitution, this constitution takes precedence.

**Version**: 1.1.0 | **Ratified**: 2026-06-05 | **Last Amended**: 2026-06-05
