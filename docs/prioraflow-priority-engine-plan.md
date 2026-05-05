# PrioraFlow Priority Engine & Flow-Control Improvement Plan

_Date: 2026-05-01_

## 1. Goal

Turn PrioraFlow / SuperFlow from a workshop management system into an **AI-powered workshop flow-control cockpit**.

The app should answer one practical question:

> **Which vehicle, repair order, or customer needs attention next — and what should the service advisor do?**

This is not a generic to-do app. The priority system must be focused on real service-advisor operations:

- active repair orders
- customer approvals
- estimates
- promised delivery risk
- technician/workshop delays
- parts delays
- advisor workload
- customer follow-ups
- blocked jobs
- next best action

---

## 2. Product Direction

### Current identity

PrioraFlow / SuperFlow is a workshop/service-advisor management app.

### Improved identity

**PrioraFlow = AI-powered flow-control cockpit for service advisors.**

The system should help advisors and managers see:

- what is urgent now
- what is blocked
- which promised deliveries are at risk
- which customers need follow-up
- which jobs are stuck
- what the advisor should do next

---

## 3. Main New Feature: Priority Engine

Every active repair order should receive a live **priority score**.

Example:

```text
RO-1042 — Priority 92 / Critical
Reason:
- Customer is waiting
- Promised delivery is in 1 hour
- Estimate is not approved
- Vehicle has been idle for 2 hours
Next action:
Call customer for approval now
```

The priority score should update automatically when:

- stage changes
- promised delivery time approaches
- estimate is sent
- customer approves or rejects
- parts become pending
- blocker is added or resolved
- vehicle stays idle too long
- advisor completes a next action

---

## 4. Priority Score Formula

### Suggested scoring factors

| Factor | Suggested Weight | Example |
|---|---:|---|
| Customer waiting | +25 | Customer is in lounge |
| Promised delivery soon | +20 | Delivery due within 2 hours |
| Promised delivery overdue | +35 | Already late |
| Approval pending | +15 | Estimate sent but not approved |
| Estimate not sent | +20 | Diagnosis complete but quote not sent |
| Parts delay | +10 to +25 | Parts are blocking progress |
| Vehicle idle 24h+ | +20 | No stage movement for 24+ hours (not Booked/Ready/Closed) |
| Vehicle idle 12h+ | +12 | No stage movement for 12+ hours (not Booked/Ready/Closed) |
| Vehicle idle 6h+ | +6 | No stage movement for 6+ hours (not Booked/Ready/Closed) |
| High-value job | +5 to +15 | Large estimate/invoice |
| Angry/VIP/comeback customer | +20 | Sensitive case |
| Technician blocked | +15 | Technician needs advisor decision |
| Warranty/internal approval pending | +10 | Waiting manager/importer approval |

### Priority levels (unified — same thresholds everywhere)

| Score | Level | Color | Meaning |
|---|---|---|---|
| 0–21 | **Low** | Grey | No urgency. Normal progress. |
| 22–39 | **Normal** | Blue | Standard attention needed. |
| 40–59 | **High** | Amber | Elevated urgency — act soon. |
| ≥ 60 | **Critical** | Red | Immediate action required. |

> **Important:** There is only one scoring system. The same `priorityScore` drives the priority level badge, the action card urgency label, dashboard sorting, and stats. No separate calculations, no mismatched thresholds.

### Status exclusions from risk signals

| Status | Excluded From | Why |
|---|---|---|
| **Booked** | Idle risk, Promise overdue | Appointment waiting for slot |
| **Ready** | Idle risk, Promise overdue | Car done, waiting collection |
| **Closed** | Idle risk, Promise overdue | Job finished |

### Idle risk tiers

| Tier | Weight | When | Applies To |
|---|---:|---|---|
| Idle 6h+ | 6 | No update in 6+ hours | Active workshop jobs only (not Booked/Ready/Closed) |
| Idle 24h+ | 20 | No update in 24+ hours | Active workshop jobs only (excludes Booked/Ready/Closed) |
| Idle 12h+ | 12 | No update in 12+ hours | Active workshop jobs only (excludes Booked/Ready/Closed) |
| Idle 6h+ | 6 | No update in 6+ hours | Active workshop jobs only (excludes Booked/Ready/Closed) |
| Idle 24h+ | 20 | No update in 24+ hours | Active workshop jobs only — triggers High risk floor |

### Customer Informed zeroing

When `customer_informed = true` on a Ready job:
- Promise risk, customer waiting, parts risk, idle risk, stage urgency, ready-to-inform → **zeroed**
- Customer sensitivity, estimate value → **kept**
- Next Best Action changes from "Notify customer for collection" → "Arrange collection with customer" (Low urgency)
- Excluded from "Promised delivery risk" widget

### Priority explanation

The system should always explain the score in plain language.

Example:

```text
Critical because customer is waiting, promised delivery is due in less than 1 hour, and estimate approval is still pending.
```

---

## 5. Repair Order Lifecycle / Stages

Each RO should have a clear operational stage.

Recommended stages:

1. Created / Vehicle Received
2. Initial Inspection
3. Diagnosis In Progress
4. Diagnosis Complete
5. Estimate Draft
6. Estimate Sent
7. Customer Approval Pending
8. Approved
9. Parts Pending
10. Work In Progress
11. Quality Check
12. Ready for Delivery
13. Delivered / Closed
14. Blocked / Escalated

Each stage should track:

- start time
- owner
- expected duration
- actual duration
- overdue flag
- next recommended action

---

## 6. Dashboard Redesign

The main dashboard should become the **Advisor Cockpit**.

### A. Urgent Now

Shows jobs requiring immediate attention.

Example card:

```text
Critical — RO-1021
Customer: Ahmed
Vehicle: C-Class
Issue: Estimate not approved
Promise: Today 3:00 PM
Risk: Delivery may be missed
Next action: Call customer now
```

### B. Blocked Jobs

Grouped by blocker type:

- Waiting customer approval
- Waiting parts
- Waiting diagnosis
- Waiting warranty approval
- Waiting advisor action
- Waiting workshop controller

### C. Promised Delivery Risk

Timeline-style list:

```text
Due in 1 hour — RO-1033 — Not ready
Due in 3 hours — RO-1041 — Parts pending
Overdue — RO-1018 — QC not done
```

### D. Advisor Workload

For each advisor:

- active ROs
- critical ROs
- pending approvals
- overdue promises
- estimated workload/risk

### E. Next Best Actions

Simple action queue:

```text
1. Call Ahmed for estimate approval
2. Send quote for RO-1045
3. Follow up parts ETA for RO-1039
4. Escalate overdue diagnosis RO-1012
```

This should become one of the most important screens in the app.

---

## 7. Next Best Action Engine

The system should generate the next recommended action for every active RO.

### Rule examples

#### Diagnosis complete but no estimate

```text
Next action: Create and send estimate
```

#### Estimate sent but no reply after 2 hours

```text
Next action: Follow up customer approval
```

#### Promised time is close and work is not complete

```text
Next action: Update customer and escalate workshop delay
```

#### Parts pending too long

```text
Next action: Check parts ETA
```

#### Vehicle ready for delivery

```text
Next action: Notify customer for collection
```

---

## 8. Data Model Changes

### RepairOrder

Add or extend fields:

- `id`
- `roNumber`
- `customerId`
- `vehicleId`
- `advisorId`
- `status`
- `stage`
- `priorityScore`
- `priorityLevel`
- `promisedAt`
- `receivedAt`
- `deliveredAt`
- `isWaitingCustomer`
- `isComeback`
- `isVip`
- `customerSensitivity`
- `totalEstimateValue`
- `lastCustomerContactAt`
- `lastStageChangedAt`
- `createdAt`
- `updatedAt`

### JobStageHistory

Tracks movement between stages.

Fields:

- `id`
- `repairOrderId`
- `fromStage`
- `toStage`
- `changedBy`
- `changedAt`
- `durationMinutes`
- `note`

### Blocker

Tracks why a job is stuck.

Fields:

- `id`
- `repairOrderId`
- `type`
  - `customer_approval`
  - `parts`
  - `diagnosis`
  - `warranty`
  - `advisor_action`
  - `workshop`
- `severity`
- `note`
- `owner`
- `createdAt`
- `resolvedAt`

### NextAction

Tracks recommended and completed actions.

Fields:

- `id`
- `repairOrderId`
- `type`
- `title`
- `description`
- `dueAt`
- `priority`
- `status`
- `completedAt`

---

## 9. Backend Services

### PriorityEngineService

Responsible for scoring ROs.

Suggested methods:

```ts
calculatePriority(roId)
recalculateAllActive()
explainPriority(roId)
```

### NextActionService

Responsible for recommended actions.

Suggested methods:

```ts
generateForRepairOrder(roId)
refreshAllActive()
completeAction(actionId)
```

### FlowMonitorService

Detects operational problems.

Suggested methods:

```ts
detectIdleJobs()
detectOverduePromises()
detectPendingApprovals()
detectPartsDelays()
```

### DashboardService

Feeds cockpit widgets.

Suggested methods:

```ts
getUrgentNow()
getBlockedJobs()
getDeliveryRisks()
getAdvisorWorkload()
getNextBestActions()
```

---

## 10. API Endpoints

Suggested endpoints:

```http
GET /dashboard/urgent-now
GET /dashboard/blocked
GET /dashboard/delivery-risk
GET /dashboard/advisor-workload
GET /dashboard/next-actions

POST /repair-orders/:id/recalculate-priority
GET /repair-orders/:id/priority-explanation

POST /repair-orders/:id/stage
POST /repair-orders/:id/blockers
PATCH /blockers/:id/resolve

POST /next-actions/:id/complete
```

---

## 11. UI Pages to Add

### A. Flow Dashboard

Main cockpit screen.

Includes:

- urgent jobs
- blocked jobs
- promised delivery risk
- next actions
- advisor workload

### B. RO Detail — Flow Tab

Inside each repair order:

- current stage
- priority score
- priority reasons
- blockers
- next action
- timeline history

### C. Workshop Board

Kanban by stage:

```text
Received → Diagnosis → Estimate → Approval → Parts → WIP → QC → Ready
```

Cards should show:

- RO number
- customer
- promise time
- priority badge
- blocker icon
- next action

### D. Advisor Cockpit

Personal dashboard for one advisor:

- my urgent cars
- my pending approvals
- my promised delivery risks
- my next calls
- my blocked jobs

---

## 12. AI Layer

Start rule-based first, then add AI.

### Phase 1 — Rule-based

Use deterministic scoring and next-action rules.

This is safer, easier to test, and easier to explain.

### Phase 2 — AI explanation

AI explains priority in human language.

Example:

```text
This job is critical because the customer is waiting, the estimate is not approved, and the promised delivery time is less than one hour away.
```

### Phase 3 — AI assistant

Allow questions like:

```text
What should I focus on now?
Which customers need updates?
Which cars are at risk today?
Why is RO-1032 critical?
```

### Phase 4 — AI customer message drafts

Generate suggested WhatsApp/SMS/customer-update drafts.

Example:

```text
Dear Mr. Ahmed, your vehicle diagnosis is complete. The estimated repair cost is AED 2,350. Please confirm approval so we can proceed.
```

Important: keep these as drafts first. Do not auto-send without approval.

---

## 13. Implementation Phases

### Phase 1 — Foundation

Goal: add priority score and stages.

Tasks:

1. Add stage field to repair orders.
2. Add promised delivery time.
3. Add waiting customer flag.
4. Add priority score fields.
5. Create priority calculation service.
6. Show priority badge in RO list.
7. Add priority explanation.

Impact: high.

---

### Phase 2 — Dashboard

Goal: build the flow-control cockpit.

Tasks:

1. Add `/dashboard/urgent-now`.
2. Add `/dashboard/blocked`.
3. Add `/dashboard/delivery-risk`.
4. Add `/dashboard/next-actions`.
5. Build new dashboard UI.
6. Sort all cards by priority score.

Impact: very high.

---

### Phase 3 — Next Best Action

Goal: make the app tell the advisor what to do.

Tasks:

1. Create NextAction model.
2. Generate actions from RO state.
3. Add action completion.
4. Add advisor action queue.
5. Add overdue action flags.

Impact: very high.

---

### Phase 4 — Blockers

Goal: identify why cars are stuck.

Tasks:

1. Add blocker model.
2. Add blocker types.
3. Add blocker badges.
4. Add blocked jobs dashboard.
5. Add resolve blocker flow.

Impact: high.

---

### Phase 5 — Workshop Board

Goal: visualize the whole workshop.

Tasks:

1. Build Kanban board by stage.
2. Add drag/drop stage update.
3. Add priority coloring.
4. Add overdue and blocker icons.
5. Add filters by advisor/status/priority.

Impact: high.

---

### Phase 6 — AI Assistant

Goal: natural language operational help.

Tasks:

1. Create AI context builder for active ROs.
2. Add questions:
   - What should I do now?
   - Which cars are at risk?
   - Who needs follow-up?
3. Add AI priority summaries.
4. Add customer message drafts.

Impact: strong differentiator.

---

## 14. Recommended MVP

The best fast version is:

### MVP: Advisor Priority Cockpit

Build only:

1. Priority score
2. Urgent Now dashboard
3. Next Best Action
4. Blocked jobs
5. Promised delivery risk

Skip for now:

- full AI assistant
- complex analytics
- deep reporting
- automation
- drag/drop Kanban

This gives the highest value fastest.

---

## 15. Example User Flow

Advisor opens PrioraFlow in the morning.

The app shows:

```text
Today you have 18 active vehicles.

Critical:
1. RO-1041 — Customer waiting, estimate not approved
2. RO-1037 — Promise time overdue
3. RO-1029 — Parts delay, customer angry

Next 3 actions:
1. Call Ahmed for approval
2. Escalate diagnosis delay for RO-1037
3. Send update to Sara about parts ETA
```

Advisor clicks action 1.

System opens RO detail and shows suggested message/call note.

Advisor completes action.

Priority updates automatically.

---

## 16. Recommended Build Order

1. Priority Engine
2. Next Best Action
3. Urgent Dashboard
4. Blocked Jobs
5. Promised Delivery Risk
6. AI explanations/message drafts

This order makes PrioraFlow useful quickly without overbuilding the AI layer too early.
