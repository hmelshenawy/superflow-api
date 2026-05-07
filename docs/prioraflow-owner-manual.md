# PrioraFlow — Owner Manual

**Version:** 2.0  
**Date:** May 2026  
**For:** Service center owners, general managers, and operations leadership

---

## Table of Contents

1. [What Is PrioraFlow?](#1-what-is-prioraflow)
2. [Who Is It For?](#2-who-is-it-for)
3. [Getting Started](#3-getting-started)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [The Job Lifecycle](#5-the-job-lifecycle)
6. [The Priority Engine](#6-the-priority-engine)
7. [Next Best Actions](#7-next-best-actions)
8. [Workshop Stages](#8-workshop-stages)
9. [Parts Status Flow](#9-parts-status-flow)
10. [Customer Informed System](#10-customer-informed-system)
11. [The Job Board](#11-the-job-board)
12. [Job Detail Page](#12-job-detail-page)
13. [Inspection System](#13-inspection-system)
14. [Estimate Builder & Authorization](#14-estimate-builder--authorization)
15. [Booking Import](#15-booking-import)
16. [Media & Photo Management](#16-media--photo-management)
17. [Deferred Work](#17-deferred-work)
18. [Notifications](#18-notifications)
19. [Settings & Configuration](#19-settings--configuration)
20. [Technical Architecture](#20-technical-architecture)
21. [Deployment Guide](#21-deployment-guide)
22. [Multi-Tenant Architecture & Workshops](#22-multi-tenant-architecture--workshops)
23. [Security Model](#23-security-model)
24. [Glossary](#24-glossary)

---

## 1. What Is PrioraFlow?

PrioraFlow is an **AI-powered flow-control system for the entire service center** — reception, workshop, parts, and delivery.

It is not a generic task manager. It is not a simple job tracker. PrioraFlow answers the critical question every service center faces daily:

> **Which vehicle needs attention right now — and what should be done about it?**

The system gives **management full visibility** over every job, every stage, and every delay. It turns reactive workshop operations into a proactive, priority-driven flow.

### The Problem It Solves

In a busy service center, managers oversee 15–50+ vehicles across reception, workshop, and delivery. Without a smart system:

- Promised delivery times get missed
- Customers sit waiting without updates
- Parts delays go unnoticed
- High-value or VIP customers don't get prioritized
- Vehicles sit idle because nobody noticed they were stuck
- Workshop capacity is underutilized
- Management has no real-time visibility into what's happening

PrioraFlow solves this by giving every job a **live priority score**, explaining **why** it's urgent, telling the team **exactly what to do next**, and giving **management a clear dashboard** of the entire operation.

### Management Value

PrioraFlow gives owners and managers what they've never had before:

- **Real-time visibility** — See every job, every delay, every risk in one place. No more walking the floor.
- **Priority-driven operations** — The system tells the team what to focus on, based on data, not gut feeling.
- **Revenue capture** — Deferred work tracking means no lost revenue. Customer approval flow means no ambiguity.
- **Accountability** — Every status change is logged. Every action has an owner. Every delay is visible.
- **Scalability** — Works with 5 jobs or 500. The priority engine and next actions scale with the operation.

### Key Differentiators

| Feature | Traditional Workshop Software | PrioraFlow |
|---|---|---|
| Priority scoring | None — all jobs equal | Live 0–100 score, auto-updated |
| What to do next | Each person figures it out | Next Best Action for every job |
| Customer follow-up | Manual tracking | Auto-flagged when waiting or overdue |
| Promised date risk | Manual mental note | Auto-calculated, flagged before it's late |
| Workshop ↔ Overall sync | Manual dual entry | Auto-synced, impossible to break |
| Parts delay visibility | Separate system | Integrated into priority score |
| Customer Informed flow | Sticky notes, WhatsApp groups | One-click with priority adjustment |
| Management visibility | Walk the floor or ask | Real-time board with priority, risk, and actions |

---

## 2. Who Is It For?

### Primary Decision Makers

- **Service Center Owners** — Full visibility into every job, every delay, every missed promise. ROI-driven oversight.
- **General Managers / Operations Managers** — Real-time dashboard of the entire service center: reception, workshop, and delivery.
- **Workshop Controllers** — See the full workshop flow, identify bottlenecks, allocate resources.

### Active Users

- **Service Advisors** — Manage their jobs, priorities, next actions, and customer follow-ups.
- **Technicians** — Receive assignments, complete inspections, report progress.
- **Parts Coordinators** — Track parts status, update ETAs, unblock workshop.
- **Administrators** — Configure the system, manage users, and customize priority weights.

### Ideal Service Center Profiles

- Premium and luxury automotive brands (Mercedes-Benz, BMW, Audi, etc.)
- Service centers with 10+ active repair orders per advisor
- Operations where missed promised dates cost real money and customer retention
- Teams that want data-driven decisions, not guesswork
- Management that needs real-time visibility, not just end-of-day reports

---

## 3. Getting Started

### First Login

1. Open PrioraFlow in your browser (e.g., `https://your-workshop.prioraflow.com`)
2. Log in with your admin credentials (provided during setup)
3. If you have only one workshop, it is auto-selected and you land on the **Job Board**
4. If you have multiple workshops, you will be redirected to the **Workshop Selector** — pick the workshop you want to work in
5. You can switch workshops anytime using the **Workshop Dropdown** in the sidebar

### Initial Setup

As a platform admin, configure these before your team starts using the system:

1. **Workshops** — Create your workshops (branches) and assign users to them (Admin → Workshops)
2. **Users & Roles** — Add your advisors, technicians, and managers (Settings → Users)
3. **Labour Rates** — Set your hourly rates for different operations (Settings → Labour Rates)
4. **Priority Weights** — Customize scoring to match your workshop's priorities (Settings → Priority Matrix)
5. **Inspection Templates** — Create or customize inspection checklists (Admin → Templates)
6. **Integrations** — Connect webhooks for notifications (Settings → Integrations)

### Quick Tour

| Screen | What It Shows |
|---|---|
| Job Board | All active jobs across the entire service center, sorted by priority |
| Job Detail | Full information for one job: status, priority, estimate, inspection, actions |
| Priority Snapshot | Top urgent jobs + next actions sidebar |
| Settings | System configuration, priority weights, users, labour rates |
| Admin | Dashboard stats, booking import, template management |

**Management sees everything.** Advisors see their own jobs. Technicians see their assignments. This role-based visibility gives owners the full picture while keeping each team member focused on their work.

---

## 4. User Roles & Permissions

PrioraFlow uses **role-based access control** with **workshop-scoped data isolation**. Each user is assigned one global role. Data (jobs, customers, vehicles, etc.) is automatically scoped to the workshop the user selects. The role controls what the user can do; the workshop controls what data they can see.

### Two-Tier Admin System

PrioraFlow has two distinct admin levels:

| | **Platform Admin** | **Workshop Admin** |
|---|---|---|
| Role name | `platform_admin` | `workshop_admin` |
| Scope | Entire platform — all workshops | Own assigned workshop(s) only |
| Sees all workshops | Yes | No — only assigned workshops |
| Create/delete workshops | Yes | No |
| Assign users to any workshop | Yes | Only within own workshop |
| See all users | Yes (across platform) | Only users in own workshop |
| Jobs/customers/vehicles | All workshops | Own workshop only |
| Admin pages (roles, settings) | Yes | Yes |
| Can create `platform_admin` users | Yes | **No — blocked** |
| Can see `platform_admin` role | Yes | **No — hidden** |
| Can change role to `platform_admin` | Yes | **No — blocked** |

### Available Roles

| Role | Purpose | Permission Scope |
|---|---|---|
| **Platform Admin** | Platform owner — manages the entire SaaS | All 48 permissions including `workshops:*`, bypasses all workshop scoping |
| **Workshop Admin** | Workshop owner — manages their own workshop | 46 permissions (all operational + `workshops:read`, `workshops:update`, `workshops:assign-users`), scoped to own workshop |
| **Manager** | Operational management | 39 permissions — jobs, estimates, inspections, customers, vehicles, admin settings, roles, users, integrations, templates, labour rates, stats |
| **Service Advisor** | Advisor workflow: customers, jobs, estimates, inspections | 25 permissions — jobs, estimates, inspections, customers, vehicles, media, auth, deferred, admin:settings, priority, insights |
| **Workshop Team Leader** | Team leader with inspection reopen authority | 18 permissions — jobs (read, update, assign, transition), estimates, inspections (including reopen), read-only customers/vehicles, media, deferred, priority, insights |
| **Technician** | Workshop execution and inspections | 11 permissions — jobs (read, transition), estimates (read), inspections (read, create, submit), customers/vehicles (read), media, auth, deferred, priority |
| **Receptionist** | Front-desk booking and customer creation | 9 permissions — jobs (read, create), customers (read, create, update), vehicles (read, create) |

### Platform Admin Permissions

Platform admin is the **top-level platform owner**. They can:

- See and manage **all workshops** on the platform
- Create, update, and delete workshops
- Assign any user to any workshop
- See **all users** across all workshops
- Access all data across all workshops (bypasses workshop scoping)
- Create other `platform_admin` users
- Perform all administrative functions: roles, settings, templates, labour rates, integrations, audit

Platform admin is the **only role that can**:
- Create or assign the `platform_admin` role to users
- See the `platform_admin` role in the roles list
- Access the `/workshops` create and delete endpoints
- Operate without selecting a workshop (all data visible)

### Workshop Admin Permissions

Workshop admin manages **their own workshop**. They can:

- View and edit their own workshop details
- Assign/remove users within their own workshop
- See only users assigned to their workshop
- Create new users (automatically assigned to their workshop)
- Manage jobs, customers, vehicles, estimates, inspections within their workshop
- Access admin pages: roles, settings, templates, labour rates, users
- Use all operational features (full jobs/customers/vehicles/estimates/inspections permissions)

Workshop admin **cannot**:
- See or access other workshops' data
- Create or delete workshops
- See the `platform_admin` role (hidden from their view)
- Create users with `platform_admin` role (blocked with 403)
- Change any user's role to `platform_admin` (blocked with 403)
- See users outside their workshop

### Service Advisor Permissions

Service Advisor is the daily front-line role. A service advisor can:

- View and manage jobs within their workshop
- Create and update jobs
- Move jobs through advisor-owned statuses (Booked, Checking, Estimate Sent, Approved, Closed)
- Create and update customers
- Read/write estimates and inspections
- Upload job media

A service advisor cannot:
- Manage users, roles, or system settings
- Access admin configuration screens
- See users or data from other workshops

### Workshop-Scoped Data Isolation

All data in PrioraFlow is automatically isolated by workshop. When a user selects a workshop from the dropdown, **every query** is scoped to that workshop:

- Jobs, customers, vehicles, estimates, inspections, media, deferred work, notifications, settings, labour rates, audit logs — all scoped to the selected workshop
- Users are scoped: workshop admins see only users in their workshop
- Workshop data is invisible to users in other workshops
- Same VIN can exist in different workshops (uniqueness is per-workshop)
- Same job number can exist in different workshops

Users must select a workshop before accessing data. If no workshop is selected, the system returns empty results (except for `platform_admin` who can operate without one).

### Creating Users

**As Platform Admin:**
1. Go to **Admin → Users & Roles**
2. Click **Add User** — fill in name, email, password, role
3. User can be assigned `platform_admin` or any other role
4. Go to **Admin → Workshops** → select workshop → **Assign User** to give them workshop access

**As Workshop Admin:**
1. Go to **Admin → Users & Roles**
2. Click **Add User** — fill in name, email, password, role
3. User is automatically assigned to your current workshop
4. You cannot assign `platform_admin` role — the option is hidden and blocked

### Creating a New Role

Only admins can create custom roles.

1. Go to **Admin → Roles & Permissions**
2. Click **New Role**
3. Enter name (lowercase, underscore-separated), description
4. Select permissions using the quick-fill template or individual toggles
5. Save the role

Safety rules:
- Do not delete a role while users are assigned to it; the backend blocks this
- Workshop admins cannot see or assign the `platform_admin` role
- The `platform_admin` role always bypasses all permission and workshop checks

Backend API reference:

| Action | Endpoint | Required Permission |
|---|---|---|
| List roles | `GET /api/admin/roles` | `admin:roles` |
| Create role | `POST /api/admin/roles` | `admin:roles` |
| Update role | `PATCH /api/admin/roles/:id` | `admin:roles` |
| Delete role | `DELETE /api/admin/roles/:id` | `admin:roles` |
| List permissions | `GET /api/admin/permissions` | `admin:roles` |
## 5. The Job Lifecycle

Every vehicle that enters the workshop follows a structured lifecycle. The system enforces valid transitions — you cannot skip steps or jump backwards arbitrarily.

### Status Flow Diagram

```
  ┌──────────┐
  │  BOOKED  │  ← Vehicle scheduled, not yet received
  └────┬─────┘
       │
       ▼
  ┌──────────┐
  │ CHECKING │  ← Vehicle received, inspection/diagnosis in progress
  └────┬─────┘
       │
       ▼
  ┌──────────────┐
  │ ESTIMATE SENT│  ← Quote sent to customer, awaiting decision
  └────┬─────┬───┘
       │     │
       │     └──────────┐
       ▼                │
  ┌──────────┐          │
  │ APPROVED │ ←─────────┘  Customer approved the work
  └────┬─────┘
       │
       ▼
  ┌────────────┐
  │ IN PROGRESS│  ← Workshop actively working on the vehicle
  └────┬───┬──┘
       │   │
       │   └──────────────┐
       ▼                  │
  ┌───────────────┐       │
  │ WAITING PARTS │ ←─────┘  Parts needed, work paused
  └────┬─────────┘
       │
       ▼
  ┌──────────────┐
  │ QUALITY CHECK│  ← Work complete, final QC in progress
  └────┬────┬───┘
       │    │
       │    └──────┐
       ▼           │
  ┌────────┐       │
  │  READY │ ←─────┘  Vehicle ready for delivery
  └────┬───┘
       │
       ▼
  ┌────────┐
  │ CLOSED │  ← Vehicle delivered, job archived
  └────────┘
```

### Allowed Transitions

| From | Can Move To |
|---|---|
| Booked | Checking, Closed, No Show |
| Checking | Estimate Sent, Approved, In Progress, Closed |
| Estimate Sent | Checking, Approved, Closed |
| Approved | Estimate Sent, In Progress, Closed |
| In Progress | Waiting Parts, Quality Check, Ready, Closed |
| Waiting Parts | In Progress, Closed |
| Quality Check | In Progress, Ready |
| Ready | Quality Check, Closed |
| Closed | *(terminal — no transitions out)* |
| No Show | *(terminal — no transitions out)* |

### Three Operational Phases

| Phase | Statuses | Who Owns It |
|---|---|---|
| **Reception / Advisor** | Booked, Checking, Estimate Sent, Approved | Service Advisor |
| **Workshop** | In Progress, Waiting Parts, Quality Check | Workshop / Technician |
| **Delivery** | Ready, Closed | Service Advisor |

### Side Effects on Status Changes

The system automatically handles these when status changes:

| Action | What Happens |
|---|---|
| Move from **Booked** to **Checking** / click **Arrived** | `arrived_at` timestamp is set |
| Move from **Booked** to **No Show** | Job status becomes `no_show`; Workshop Stage is cleared; job is not shown in visible Kanban columns |
| End-of-day no-show cron | At 9:00 PM Dubai, remaining `booked` jobs with empty `arrived_at` are marked `no_show` |
| Move to **Ready** | `completed_at` timestamp is set |
| Move to **Closed** | `invoiced_at` timestamp is set |
| Move **away from Closed** | `invoiced_at` and `archived_at` are cleared |
| Move back to **Booked** | `arrived_at` is cleared |
| Move **away from Ready** (backwards) | `completed_at` is cleared |
| Move to **Waiting Parts** | Workshop Stage is cleared; Parts Status auto-sets to "Order Parts" |
| Parts Status → **Parts Ready** | Workshop Stage auto-sets to "Waiting to Start" |
| Workshop Stage → **WIP** | Overall status auto-sets to "In Progress" |
| Workshop Stage → **Quality Check** | Overall status auto-sets to "Quality Check" |
| Workshop Stage → **Ready Handover** | Overall status auto-sets to "Ready" |

---

## 6. The Priority Engine

This is the heart of PrioraFlow. Every active job receives a **live priority score** from 0 to 100.

### Priority Levels

| Score | Level | Color | Meaning |
|---|---|---|---|
| 0–39 | **Low** | Grey | No urgency. Normal progress. |
| 40–64 | **Normal** | Blue | Standard attention needed. |
| 65–84 | **High** | Amber | Elevated urgency — action soon. |
| 85–100 | **Critical** | Red | Immediate action required. |

### How the Score Is Calculated

**Formula:** `Priority = min(100, 10 + Σ(active factor weights))`

Every job starts with a base score of 10. Then each active factor adds its weight. The total is capped at 100.

### Priority Factors

| Factor | Default Weight | When It Applies | Category |
|---|---:|---|---|
| Promise Overdue | 30 | Promised date has passed and job is not Ready/Closed | Promise Risk |
| Promise Due ≤ 2h | 20 | Promised date is within 2 hours | Promise Risk |
| Promise Due ≤ 6h | 10 | Promised date is within 6 hours | Promise Risk |
| No Promised Date | 5 | Active job (not booked/closed) has no promised date | Promise Risk |
| Customer Waiting | 22 | Customer is marked as waiting at the workshop | Customer |
| Customer Angry | 18 | Customer sensitivity set to "Angry" | Customer |
| Customer VIP | 16 | Customer sensitivity set to "VIP" | Customer |
| Customer Comeback | 14 | Customer sensitivity set to "Comeback" | Customer |
| Waiting Customer Decision | 20 | Job is in "Estimate Sent" status | Approval |
| Parts Backorder | 22 | Parts status is "Backorder" | Parts Risk |
| Parts Waiting Warehouse | 16 | Parts status is "Waiting Warehouse" | Parts Risk |
| Parts Need Order | 12 | Parts status is "Order Parts" or job is "Waiting Parts" | Parts Risk |
| Idle 12h+ | 12 | Job hasn't been updated in 12+ hours (not booked) | Idle Risk |
| Idle 6h+ | 6 | Job hasn't been updated in 6+ hours (not booked) | Idle Risk |
| Stage: Checking/Diagnosis | 10 | Job is in "Checking" status | Stage Urgency |
| Stage: QC / Near Delivery | 10 | Job is in "Quality Check" status | Stage Urgency |
| Ready to Inform | 20 | Job is "Ready" but customer not yet informed | Delivery |
| High Estimate Value | 8 | Estimate total ≥ 10,000 | Value |
| Medium Estimate Value | 4 | Estimate total ≥ 5,000 | Value |

### Weight Scale Guide

| Range | Intent | Examples |
|---|---|---|
| 4–8 | Mild nudge — nice to address | Medium estimate, idle 6h |
| 10–16 | Moderate — should act soon | Parts waiting, VIP customer, QC stage |
| 18–22 | Strong — act now | Customer waiting, backorder, ready to inform |
| 30 | Maximum — critical alert | Promise overdue |

### Example Priority Calculation

**Job: Mercedes C-Class, RO-49126**

| Factor | Weight |
|---|---:|
| Base | 10 |
| Promise Due ≤ 2h | 20 |
| Customer Waiting | 22 |
| Customer VIP | 16 |
| **Total** | **68** → **High** |

**Priority explanation shown to advisor:**
> Promise risk: due ≤2h +20 · Customer waiting +22 · Customer sensitivity: VIP +16

### What Gets Zeroed by "Customer Informed"

When a job is Ready and you click "Customer Informed," urgency factors about getting the car ready or informing the customer are zeroed:

**Zeroed (urgency factors):**
- Promise risk (overdue, due soon)
- Customer waiting
- Waiting customer decision
- Parts risk
- Idle risk
- Stage urgency (checking, QC)
- Ready to inform

**Kept (permanent facts):**
- Customer sensitivity (angry, VIP, comeback)
- Estimate value (high, medium)

This means an informed VIP customer with a high-value estimate still shows a meaningful priority — the car is handled, but the customer relationship matters.

### Booked Jobs and Idle Risk

Booked appointments are excluded from idle risk scoring. A booked car that hasn't moved in 12 hours is normal — it's an appointment waiting for its slot, not a stuck job.

---

## 7. Next Best Actions

Every active job has a **Next Best Action** — the system tells the responsible person exactly what to do. This eliminates the "walk the floor and ask" approach and gives management confidence that nothing falls through the cracks.

### How It Works

The action is determined by the job's current status and phase. Risk signals (promise overdue, customer waiting, VIP, etc.) increase the action's urgency and explain *why* it matters now. **Management can see the full action queue across all advisors**, not just per-person.

### Actions by Status

| Job Status | Next Best Action | Owner |
|---|---|---|
| **Booked** | Receive vehicle and start check-in | Advisor |
| **Checking** | Complete diagnosis and prepare estimate | Advisor |
| **Estimate Sent** | Follow up customer decision | Advisor |
| **Approved** | Print job card and release to workshop | Advisor |
| **Waiting Parts** | Check parts ETA and update plan | Parts |
| **In Progress** (no technician) | Assign technician and start work | Workshop |
| **In Progress** (approval blocker) | Resolve advisor/approval blocker | Advisor |
| **In Progress** (parts blocking) | Check parts ETA and unblock technician | Parts |
| **In Progress** (normal) | Check technician progress | Workshop |
| **Quality Check** | Complete QC and prepare delivery | Workshop |
| **Ready** | Notify customer for collection | Advisor |

### Action Urgency Levels

| Urgency | When | Color |
|---|---|---|
| Low | Base scenario, no risk signals | Grey |
| Normal | Some risk signals present | Blue |
| High | Multiple risk signals | Amber |
| Critical | Promise overdue, angry customer, or multiple strong signals | Red |

### Risk Signals

Each action shows the risk signals that make it urgent:

- **Promise overdue** — promised date has passed
- **Promise due within 2h** — delivery promised very soon
- **Promise due within 6h** — delivery promised today
- **Customer waiting** — customer is at the workshop
- **Angry/VIP/Comeback customer** — sensitive customer relationship
- **Idle 6h+/12h+** — job hasn't progressed in too long
- **Parts: backorder/waiting/order** — parts are blocking progress
- **High/medium estimate value** — significant financial value at stake

---

## 8. Workshop Stages

Workshop stages track the **physical progress** of the vehicle inside the workshop. They are separate from the overall job status.

### Workshop Stage Flow

```
Waiting to Start → Diagnosis → Estimate Prep → Advisor/Approval → WIP → Final Test → QC → Ready Handover
```

### Workshop Stages Detail

| Stage | Label | What It Means |
|---|---|---|
| `waiting_technician` | Waiting to Start | Vehicle received, waiting for a technician or bay |
| `diagnosis` | Diagnosis | Technician is inspecting and diagnosing the vehicle |
| `estimate_prep` | Estimate Prep | Technician or advisor is preparing the quote |
| `customer_approval` | Advisor / Approval | Waiting for advisor follow-up or customer decision |
| `work_in_progress` | WIP | Technician is actively performing the repair |
| `final_test` | Final Test | Road test or final functional test |
| `quality_check` | QC | Quality control check in progress |
| `ready_handover` | Ready Handover | Vehicle is ready for customer delivery |

### Workshop ↔ Overall Auto-Sync

When you change the Workshop Stage, the overall job status updates automatically:

| Workshop Stage Change | Overall Status Auto-Set To |
|---|---|
| → WIP | In Progress |
| → Quality Check | Quality Check |
| → Ready Handover | Ready |

And when overall status changes:

| Overall Status Change | Parts Status Auto-Set To |
|---|---|
| → Waiting Parts | Order Parts |

| Parts Status Change | Workshop Stage Auto-Set To |
|---|---|
| → Parts Ready | Waiting to Start |

### When Workshop Stage Is Disabled

The Workshop Stage dropdown is disabled (greyed out) when the vehicle is not in the workshop:

| Overall Status | Workshop Stage | Parts Status |
|---|---|---|
| Booked, Checking, Estimate Sent, Approved | ❌ Disabled | ❌ Disabled |
| Waiting Parts | ❌ Disabled | ✅ Active |
| In Progress, Quality Check, Ready | ✅ Active | ✅ Active |

When disabled, the Operational Snapshot shows "—" instead of a misleading stage name.

---

## 9. Parts Status Flow

Parts status tracks the supply chain state for parts needed by the job.

### Parts Statuses

| Status | Label | What It Means |
|---|---|---|
| `no_parts` | No Parts | No parts needed for this job |
| `order_parts` | Order Parts | Parts need to be ordered |
| `waiting_warehouse` | Waiting Warehouse | Parts ordered, waiting at warehouse |
| `backorder` | Backorder | Parts are on backorder — delayed supply |
| `parts_ready` | Parts Ready | All parts received and available |

### Auto-Sync Behaviors

- Overall status → **Waiting Parts**: Parts status auto-sets to **Order Parts**
- Parts status → **Parts Ready**: Workshop stage auto-sets to **Waiting to Start**

### Parts Status and Priority

Parts status directly affects the priority score:

| Parts Status | Priority Impact |
|---|---|
| Backorder | +22 (strong — supply chain is stuck) |
| Waiting Warehouse | +16 (moderate — parts on the way) |
| Order Parts | +12 (mild — needs action but not blocked yet) |
| No Parts / Parts Ready | +0 |

---

## 10. Customer Informed System

When a vehicle is ready for delivery, the most important action is informing the customer. The Customer Informed system makes this a one-click operation with smart priority adjustment.

### When the Button Appears

The **"Customer Informed"** button appears:
- On the job detail page (in the status section)
- On the job board cards
- **Only when** the job status is **Ready**
- **Only when** `customer_informed` is `false`

### What Happens When You Click It

1. `customer_informed` is set to `true`
2. `is_customer_waiting` is auto-cleared (customer was waiting, now they know)
3. Urgency factors are zeroed from the priority score
4. Button changes to **✓ Informed** (disabled, cannot be unclicked)
5. Toast notification confirms: "Customer informed — urgency factors cleared from priority"

### Priority Before and After — Example

**Before clicking "Customer Informed":**

| Factor | Weight |
|---|---:|
| Base | 10 |
| Ready to Inform | 20 |
| Customer Waiting | 22 |
| Promise Due ≤ 2h | 20 |
| **Total** | **72 → High** |

**After clicking "Customer Informed":**

| Factor | Weight |
|---|---:|
| Base | 10 |
| *(urgency factors zeroed)* | 0 |
| Customer VIP (permanent) | 16 |
| High Estimate Value (permanent) | 8 |
| **Total** | **34 → Low** |

The priority drops because the car is handled and the customer knows. But permanent facts (VIP, value) keep a small baseline — you still treat VIP customers well.

---

## 11. The Job Board

The Job Board is the main screen — a Kanban-style view of all active jobs across the entire service center, organized by status. **This is management's real-time visibility tool**: see the whole operation at a glance, identify bottlenecks, and know exactly where attention is needed.

### Board Layout

The board is divided into **three phases**, each with its own color:

| Phase | Color | Columns |
|---|---|---|
| Reception / Advisor | Blue | Booked, Checking, Estimate Sent, Approved |
| Workshop | Orange | In Progress, Waiting Parts, Quality Check |
| Delivery | Green | Ready, Closed |

### What Each Card Shows

- **Job number** and current status badge
- **Customer name** and **vehicle** (make, model, plate)
- **Priority score** (color-coded badge)
- **Priority reasons** (expandable on hover/click)
- **Parts status** badge (if applicable)
- **Customer sensitivity** badge (VIP, Angry, Comeback)
- **Promised date** with overdue/due-soon indicators
- **Customer Informed** button (when Ready and not yet informed)

### Priority Sidebar

The sidebar shows:

1. **Priority Snapshot** — Top 6 most urgent jobs with scores and next actions
2. **Advisor Actions** — Top 8 recommended actions, sorted by priority + action urgency

### Drag and Drop

Jobs can be moved between columns by changing status via the dropdown or the "Next →" button. The board updates in real time.

---

## 12. Job Detail Page

Clicking a job opens its full detail page with everything about that repair order.

### Sections

#### Operational Snapshot

At-a-glance summary cards:

| Card | Shows |
|---|---|
| Current Status | Overall job status with color badge |
| Workshop Stage | Current workshop stage (or "—" if not applicable) |
| Parts Status | Current parts status |
| Priority Flags | Customer waiting/not waiting + sensitivity level |
| Advisor | Assigned service advisor |
| Technician | Assigned technician |
| Odometer | Vehicle odometer reading (synced from inspection) |

#### Customer & Vehicle Info

- Customer name, phone, email
- Vehicle make, model, year, color, plate, VIN

#### Status Controls

- **Overall Status dropdown** — shows current status, auto-changes on selection
- **"Next →" button** — advances to the logical next status
- **Workshop Stage dropdown** — disabled when not applicable
- **Parts Status dropdown** — disabled in reception phases
- **Promised Date** picker — setting a promised date removes the +5 "No Promised Date" penalty
- **Customer Informed** button — appears when Ready

#### Priority Explanation

Shows the full breakdown:

```
Priority: 72 / High
• Promise risk: due ≤2h +20
• Customer waiting +22
• Customer sensitivity: VIP +16
• Ready to inform customer +20
```

#### Estimate / Quote

- Full estimate builder with labour, parts, and sublet lines
- Group by concern area or general/other
- Tax calculation (auto)
- Send approval link to customer
- Track customer decisions

#### Inspection

- Link to inspection workspace
- Odometer and fuel level readings
- Findings with severity markers
- Photos and media

#### Media Gallery

- All photos and documents attached to the job
- Upload new media
- View/delete existing media

#### Job History

- Timestamped log of all status changes
- Shows who changed what and when

---

## 13. Inspection System

### Overview

Every job can have one inspection. The inspection captures the vehicle's condition when it arrives and documents findings that may become estimate lines.

### Inspection Templates

Templates define the structure of an inspection. Each template contains:

- **Sections** — Groups like "Exterior", "Interior", "Engine", "Underbody"
- **Items** — Individual checks within each section

### Item Input Types

| Type | What It Captures | Example |
|---|---|---|
| `pass_fail` | Green/Red pass or fail | Brake pads — Pass / Fail |
| `yes_no` | Yes or No | Tyre rotation needed? |
| `ok_warn_fail` | Three-level: OK / Warning / Fail | Belt condition |
| `number` | Numeric value | Tyre tread depth (mm) |
| `odometer` | Mileage reading (km) | Vehicle odometer |
| `fuel_level` | Fuel level | Fuel gauge reading |
| `text` | Free-text notes | Additional observations |
| `toggle` | On/off switch | AC working? |
| `photo` | Photo capture | Damage documentation |

### Odometer Sync

When a technician enters the odometer reading in the inspection, the value **automatically syncs to the job's odometer field**. No double entry needed.

### Inspection Lifecycle

```
In Progress (editable) → Submitted (locked) → Reviewed → Approved
```

- **Creating** an inspection auto-moves a Booked job to Checking
- Once submitted, the inspection is locked and cannot be edited
- An advisor can **reopen** a submitted inspection to allow corrections
- Reopen moves the inspection back to In Progress

### Urgency Markers

Each inspection response can be marked with urgency:

| Urgency | Meaning |
|---|---|
| None | Normal finding |
| Low | Minor note |
| Medium | Should be addressed |
| High | Must be addressed — safety or customer impact |
| Critical | Immediate attention required |

---

## 14. Estimate Builder & Authorization

### Estimate Builder

The estimate builder creates the quote for the customer. It supports:

- **Labour lines** — Operation code, hours, labour rate, line total
- **Parts lines** — Part number, quantity, unit price, line total
- **Sublet lines** — External work sent to third parties
- **Grouping** — Lines can be grouped by concern area (linked to inspection findings) or as General/Other

All financial totals are calculated on the **backend** — the frontend cannot override prices.

### Customer Approval Flow

The customer approval flow is a key differentiator for management: no more verbal approvals, no more "I think they said yes." Every decision is tracked, timestamped, and auditable.

1. Advisor creates the estimate
2. Advisor clicks **"Send Approval"** — system generates a unique approval link
3. Link is sent to the customer (via WhatsApp, SMS, or email)
4. Customer opens the portal and sees:
   - Job and vehicle summary
   - Inspection findings (grouped by severity: red → amber → green)
   - Estimate lines with approve/decline/defer buttons
   - Job photos
5. Customer makes decisions per line
6. System records decisions and:
   - Approved lines → proceed with work
   - Declined/deferred lines → create **Deferred Work** records
   - If all lines approved → job auto-moves to **Approved**
7. Advisor receives notification of customer decision

### Approval Links

- Links are hashed (SHA-256) for security — raw tokens are never stored
- Links expire after 7 days by default
- Links are single-use — once the customer submits, the link is invalid
- Links can be revoked manually by the advisor

### Estimate Line History

Before any estimate line is modified, the system snapshots the previous version into `estimate_line_history`. This provides a full audit trail of quote changes.

---

## 15. Booking Import

### Overview

The booking import allows bulk creation of jobs from a DMS export file (XLSX or CSV).

### How to Use

1. Go to **Admin → Booking Import**
2. Upload your XLSX or CSV file
3. Map columns to system fields
4. Preview and confirm import

### Supported Fields

| Column | Maps To |
|---|---|
| Customer name | Customer first/last name |
| Contact / Phone | Customer phone |
| Vehicle Make/Model/Year | Vehicle details |
| Plate number | Vehicle plate |
| VIN | Vehicle VIN |
| Appointment date | Job promised date |

### Smart Features

- **Header row detection** — Rows with "Customer name", "Name", "Contact" etc. are automatically skipped
- **Duplicate detection** — Existing customers/vehicles are matched and reused
- **Auto-booking** — Imported jobs start as "Booked" status
- **Odometer import** — Mileage values from the booking file are stored

---

## 16. Media & Photo Management

### Upload Methods

- **Direct upload** — File uploaded through the browser
- **Presigned URL** — For large files or mobile upload flows

### Storage

Files are stored in **MinIO** (S3-compatible object storage). Metadata lives in the database.

### Media Organization

- Media is attached to either a **job** or an **inspection response**
- Filenames are normalized to `{job_number}_{timestamp}.{ext}`
- Media is **soft-deleted** — can be recovered if accidentally removed

### Customer Portal Access

Customer-facing media (photos, inspection findings) is served through an API proxy — customers never get direct access to internal storage URLs.

---

## 17. Deferred Work

### What Is Deferred Work?

When a customer declines or defers an estimate line, the system creates a **Deferred Work** record. This is work that was recommended but not approved.

**For management, this is captured revenue.** Deferred work represents jobs the customer didn't approve today — but might approve next visit, next month, or when reminded. Without tracking it, this revenue simply disappears.

### What You Can Do with Deferred Work

| Action | What Happens |
|---|---|
| **Remind** | Send the customer a reminder about the deferred item |
| **Book into New Job** | Create a new job from the deferred work |
| **Close / Expire** | Mark the deferred work as no longer relevant |

### Why It Matters for Revenue

Deferred work is **revenue you haven't captured yet**. The system keeps it visible so the team can follow up when the timing is right — next service visit, seasonal promotion, etc. Management can track the total deferred value and measure follow-up conversion over time.

---

## 18. Notifications

### How Notifications Work

1. An event occurs (inspection submitted, approval received, etc.)
2. A notification record is created in the database
3. If a webhook is configured, the notification is queued for delivery
4. Delivery is retried with exponential backoff on failure
5. If no webhook exists, the notification is marked as "sent" (no-op)

### Database Is the Source of Truth

All notifications live in the database first. The delivery queue (BullMQ + Redis) is best-effort infrastructure. If Redis goes down, notifications still exist and can be re-queued when the system recovers.

### Supported Events

- Inspection submitted
- Customer decision received
- Job status changed
- Approval link generated
- Deferred work reminder

---

## 19. Settings & Configuration

### Priority Matrix Settings

Customize the weight of every priority factor to match your workshop's priorities.

**Access:** Settings → Priority Matrix

Each factor has a weight slider (0–30). Changes take effect immediately on the job board.

**Settings Groups:**

| Group | Factors |
|---|---|
| Promise Risk | Promise Overdue, Promise Due ≤ 2h, Promise Due ≤ 6h, No Promised Date |
| Customer | Customer Waiting, Customer Angry, Customer VIP, Customer Comeback |
| Approval | Waiting Customer Decision |
| Parts Risk | Parts Backorder, Parts Waiting Warehouse, Parts Need Order |
| Idle Risk | Idle 12h+, Idle 6h+ |
| Stage Urgency | Stage: Checking/Diagnosis, Stage: QC/Near Delivery |
| Delivery | Ready to Inform |
| Value | High Estimate Value, Medium Estimate Value |

### Labour Rates

Set hourly rates for different operation types. These are used in the estimate builder to calculate labour line totals.

### Users

Add, edit, deactivate, and assign roles to users.

### Integrations

Configure webhook URLs for notification delivery (WhatsApp, SMS, email, etc.).

---

## 20. Technical Architecture

### System Components

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│   Next.js    │────▶│   NestJS     │
│   (User)     │     │   Web App    │     │   API        │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                      │
                            │                      ├────▶ MariaDB (Database)
                            │                      ├────▶ Redis (Queue + Cache)
                            │                      ├────▶ MinIO (Media Storage)
                            │                      └────▶ BullMQ (Background Jobs)
                            │
                     ┌──────▼───────┐
                     │   Traefik    │
                     │   (Reverse   │
                     │    Proxy +   │
                     │    TLS)      │
                     └──────────────┘
```

### Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| **API** | NestJS (Node.js) | Business logic, REST API |
| **Web App** | Next.js 16 (React) | Frontend UI |
| **Database** | MariaDB (MySQL) | All data storage |
| **ORM** | Prisma | Database access layer |
| **Cache** | Redis | Session cache, BullMQ backend |
| **Queue** | BullMQ | Background job processing |
| **Media** | MinIO (S3) | File and photo storage |
| **Proxy** | Traefik | Reverse proxy, TLS, routing |
| **Auth** | JWT + Refresh Tokens | User authentication |

### API Structure

- Base URL: `/api`
- Authentication: JWT Bearer tokens
- Health check: `/health` (no auth required)
- Customer portal: `/api/portal/*` (token-based auth, no JWT)
- Swagger docs: Available in non-production environments

### Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `users` | Staff accounts |
| `roles` | Permission roles |
| `customers` | Customer records |
| `vehicles` | Vehicle records |
| `jobs` | Main workshop job records |
| `job_status_history` | Audit trail of status changes |
| `inspections` | One inspection per job |
| `inspection_items` | Template items |
| `inspection_responses` | Actual findings |
| `estimate_lines` | Quote/estimate items |
| `estimate_line_history` | Audit trail of estimate changes |
| `approval_tokens` | Customer approval links (hashed) |
| `authorisation_decisions` | Per-line customer decisions |
| `deferred_work` | Declined/deferred estimate items |
| `media_files` | Uploaded media metadata |
| `notifications` | Queued and sent notifications |
| `settings` | System configuration |
| `labour_rates` | Hourly rates |
| `audit_logs` | Operational audit trail |
| `refresh_tokens` | Login sessions |

---

## 21. Deployment Guide

### Requirements

| Requirement | Minimum |
|---|---|
| **OS** | Linux (Ubuntu 20.04+) |
| **CPU** | 2 cores |
| **RAM** | 4 GB |
| **Disk** | 40 GB SSD |
| **Docker** | 20.10+ with Compose V2 |
| **Domain** | A registered domain with DNS access |

### Deployment Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/hmelshenawy/superflow-api.git
   cd superflow-api
   git checkout dev
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your settings
   ```

3. **Build and start**
   ```bash
   docker compose --env-file .env.production up -d
   ```

4. **Set up TLS**
   - Traefik automatically provisions Let's Encrypt certificates
   - Point your domain DNS to the server IP
   - Traefik handles HTTP → HTTPS redirect

5. **Create admin user**
   - First user through the setup flow becomes admin
   - Or seed via database

### Environment Variables (Key)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MariaDB connection string |
| `JWT_SECRET` | Token signing key |
| `MINIO_ENDPOINT` | Media storage endpoint |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | MinIO credentials |
| `CORS_ORIGINS` | Allowed frontend origins |
| `APP_DOMAIN` | Your domain (e.g., `prioraflow.com`) |

### Updating

```bash
git pull origin dev
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

### Backups

- **Database:** Use `mysqldump` or MariaDB backup tools
- **Media:** Sync MinIO data directory
- **Config:** `.env.production` file should be securely stored

---

## 22. Multi-Tenant Architecture & Workshops

PrioraFlow is a **multi-tenant SaaS platform**. Multiple workshops (branches, garages, service centers) run on the same platform, each with completely isolated data.

### How It Works

- Each workshop is a separate entity with its own data: jobs, customers, vehicles, estimates, inspections, settings, labour rates, notifications, audit logs, etc.
- Users are assigned to one or more workshops via the **Workshop Access** system
- After login, the user selects which workshop to work in from the **Workshop Dropdown** in the sidebar
- All data queries are automatically scoped to the selected workshop by the **Prisma Client Extension** using AsyncLocalStorage
- A user in Workshop A **cannot see** Workshop B data — not through the UI, not through the API

### Workshop Management

Workshops are managed by **Platform Admin** only.

| Action | Endpoint | Who Can Do It |
|---|---|---|
| List workshops | `GET /api/workshops` | Platform Admin (all), Workshop Admin (own only) |
| Create workshop | `POST /api/workshops` | Platform Admin only |
| View workshop details | `GET /api/workshops/:id` | Platform Admin + Workshop Admin (own only) |
| Edit workshop | `PATCH /api/workshops/:id` | Platform Admin + Workshop Admin (own only) |
| Delete workshop (soft) | `DELETE /api/workshops/:id` | Platform Admin only |
| List workshop users | `GET /api/workshops/:id/users` | Platform Admin + Workshop Admin (own only) |
| Assign user to workshop | `POST /api/workshops/:id/users` | Platform Admin + Workshop Admin (own only) |
| Remove user from workshop | `DELETE /api/workshops/:id/users/:userId` | Platform Admin + Workshop Admin (own only) |

### Workshop Selector

After login:

1. If the user has **one workshop** only, it is auto-selected
2. If the user has **multiple workshops**, they select one from the dropdown in the sidebar
3. Selecting a workshop calls `POST /api/auth/select-workshop`, which returns a new JWT with the selected `workshopId`
4. The page reloads and all data is scoped to the selected workshop
5. Switching workshops is instant — just pick from the dropdown

### Data Isolation Details

| Data Type | Scoped Per Workshop | Notes |
|---|---|---|
| Jobs | Yes | Same job number can exist in different workshops |
| Customers | Yes | Each workshop has its own customer list |
| Vehicles | Yes | Same VIN can exist in different workshops |
| Estimates / Estimate Lines | Yes | Scoped to workshop |
| Inspections | Yes | Templates are per-workshop |
| Media Files | Yes | Photos/docs per workshop |
| Settings | Yes | Each workshop has independent settings |
| Labour Rates | Yes | Each workshop sets its own rates |
| Notifications | Yes | Per-workshop notification queue |
| Audit Logs | Yes | Activity logs per workshop |
| Deferred Work | Yes | Per-workshop tracking |
| Integrations | Yes | Each workshop connects its own webhooks |

**Global (not scoped):**
| Data Type | Notes |
|---|---|
| Users | Global accounts — one login across workshops |
| Roles | Global — same role names across platform |
| Workshops | Global entities managed by platform_admin |

### Technical Implementation

The data isolation is enforced at the **database query level** using a Prisma Client Extension:

1. **WorkshopContextInterceptor** runs on every request (after auth guards), reading the `workshopId` from the JWT
2. It sets an **AsyncLocalStorage** context with `{ workshopId, isPlatformAdmin }`
3. The **Prisma Client Extension** intercepts every query and automatically injects `workshop_id` into:
   - **Reads** (`findMany`, `findFirst`, `count`): adds `where: { workshop_id }` 
   - **Creates**: injects `workshop_id` into `data`
   - **Updates/Deletes**: adds `workshop_id` to `where` clause
4. If `platform_admin` has no `workshopId` selected, all scoping is bypassed (they see everything)
5. If a non-platform user has no `workshopId`, queries return empty results

### Setting Up a New Workshop

**Platform Admin workflow:**

1. Go to **Admin → Workshops**
2. Click **Create Workshop** — enter name, slug, address, phone, email
3. Assign users to the workshop via the workshop user management
4. The assigned users will see the new workshop in their dropdown after login
5. Configure workshop-specific settings: labour rates, inspection templates, integrations

### Test Credentials

| User | Password | Role | Workshop Access |
|---|---|---|---|
| admin@superflow.app | Test1234 | Platform Admin | All workshops (bypass) |
| nhda_admin@superflow.app | Test1234 | Workshop Admin | Al-Nahda Branch only |
| fatima@superflow.app | Test1234 | Workshop Admin | Mercedes-Benz Test only |
| haitham@prioraflow.app | Test1234 | Service Advisor | Mercedes-Benz Test only |

## 23. Security Model

### Authentication

- **Staff login:** JWT access tokens (15 min default) + Refresh tokens (30 day expiry)
- **JWT payload:** `{ sub, role, permissions, workshopId }` — workshopId is set when user selects a workshop
- **Refresh tokens:** Stored as SHA-256 hashes, rotated on each use
- **Rate limiting:** Login (5/min), Refresh (10/min)
- **Workshop selection:** `POST /api/auth/select-workshop` returns new JWT with workshopId
- **Session management:** View active sessions, revoke individually or all

### Multi-Tenant Data Isolation

- **AsyncLocalStorage context:** Set by `WorkshopContextInterceptor` on every authenticated request
- **Prisma Client Extension:** Automatically injects `workshop_id` into all queries on scoped models (25 models)
- **Platform Admin bypass:** `platform_admin` with no workshopId sees all data across all workshops
- **Workshop Admin scoping:** `workshop_admin` and all other roles are strictly scoped to their selected workshop
- **Same VIN/Job Number:** Can exist in different workshops — uniqueness is per-workshop, not global

### Role-Based Access Control

- **Permission keys:** Fine-grained permissions (e.g., `jobs:read`, `admin:users:create`) stored in JWT
- **Permission guard:** `PermissionsGuard` checks each request against required permissions
- **Platform Admin bypass:** `platform_admin` passes all permission checks automatically
- **Workshop Admin:** Must have explicit permissions (no bypass) — cannot see or assign `platform_admin` role

### Workshop Admin Restrictions

Workshop admins **cannot**:
- See the `platform_admin` role in the roles list (hidden)
- Create users with `platform_admin` role (returns 403 Forbidden)
- Change any user role to `platform_admin` (returns 403 Forbidden)
- Create or delete workshops
- See users outside their assigned workshop
- Access workshop management endpoints for workshops they are not assigned to

### Customer Portal

- **Token-based access:** Unique hashed token per approval link
- **No JWT required:** Customer accesses via secure link only
- **Token expiry:** 7 days default
- **Single use:** Token invalidated after decision submission
- **Media proxy:** Customer never accesses internal storage directly

### Data Protection

- **Soft deletes:** Media and some records use soft deletion (recoverable)
- **Audit logging:** All significant actions are logged with workshop context
- **Input validation:** Strict DTO validation rejects unknown fields
- **CORS:** Configured origins only
- **Helmet:** Security headers enabled
- **Throttling:** Global rate limiting on all API routes

---
## 24. Glossary

| Term | Definition |
|---|---|
| **Job / RO** | A repair order — the main unit of work in PrioraFlow |
| **Priority Score** | 0–100 number indicating how urgently a job needs attention |
| **Priority Level** | Low / Normal / High / Critical — derived from the score |
| **Workshop Stage** | The physical stage of the vehicle inside the workshop |
| **Parts Status** | The supply chain state for parts needed by the job |
| **Customer Informed** | Flag indicating the customer has been told their vehicle is ready |
| **Next Best Action** | The system's recommendation for what the advisor should do next |
| **Deferred Work** | Estimate items the customer didn't approve — tracked for follow-up |
| **Approval Token** | A secure, hashed link sent to the customer for estimate approval |
| **Inspection** | A structured vehicle check performed by the technician |
| **Estimate** | The quote/price breakdown sent to the customer |
| **DMS** | Dealer Management System — the workshop's core business system |
| **Promised Date** | The date/time the customer was told their vehicle would be ready |
| **Idle Time** | How long since the job was last updated |
| **Kanban Board** | Visual job board organized by status columns |
| **Traefik** | The reverse proxy that handles routing and TLS |
| **MinIO** | S3-compatible object storage for media files |
| **BullMQ** | Background job queue powered by Redis |

---

*PrioraFlow — Know what's urgent. Know what to do next.*