# Updated API Contract: Computed Meta Fields

This document describes the new computed fields added to existing API responses. All fields are additive — no breaking changes.

## `GET /api/jobs/:id` — Job Detail with Meta

Response now includes a top-level `meta` key:

```typescript
{
  // ...existing job fields...
  "meta": {
    "phaseIndex": 4,                    // index in FLOW_ORDER (0-based)
    "phaseLabel": "in progress",        // human-readable current phase
    "phaseTotal": 9,                     // total phases in flow
    "isOverdue": false,                  // promised_at < now (excludes booked/ready/closed)
    "idleHours": 2.5,                   // hours since updated_at
    "idleTier": "none",                  // "none" | "6h" | "12h" | "24h"
    "priorityScore": 32,                // 0-100 from PriorityService
    "priorityLevel": "normal",           // "low" | "normal" | "high" | "critical"
    "priorityFactors": [                // scoring breakdown
      { "key": "promiseOverdue", "weight": 30, "description": "Promise risk: overdue", "category": "promise" }
    ],
    "nextAction": {                     // from PriorityService.buildNextBestAction
      "title": "Complete diagnosis",
      "reason": "...",
      "urgency": "normal",
      "owner": "advisor",
      "actionType": "diagnosis_to_estimate",
      "signals": ["checking/diagnosis phase"]
    },
    "isWorkshopPhase": true,            // status in [in_progress, waiting_parts, quality_check, ready]
    "resolvedWorkshopStage": "work_in_progress",  // fallback-resolved stage
    "resolvedWorkflowStageKey": "in_progress",     // active workflow stage key from workshop config
    "validTransitions": ["waiting_parts", "quality_check", "ready", "closed"],
    "nextFlowStatus": "waiting_parts",  // first valid forward transition
    "availableActions": ["start_qc", "request_parts", "assign_technician", "add_concern"],
    "editableFields": ["workshop_stage", "parts_status", "customer_concern", "promised_at", "customer_sensitivity"],
    "blockedReason": null,             // null if not blocked
    "estimateTotal": 4500.00,           // sum of estimate_lines.line_total
    "concernsSummary": {
      "total": 3,                       // total concerns
      "inspected": 2,                   // concerns with technician_finding
      "pending": 1                      // concerns without technician_finding
    },
    "partsSummary": {
      "requested": 1,                   // job_parts reserved or used
      "arrived": 0,                     // job_parts used
      "pending": 1                      // job_parts still reserved
    }
  }
}
```

### `availableActions` keys

| Key | Condition |
|---|---|
| `check_in` | status = `booked` |
| `mark_no_show` | status = `booked` |
| `submit_for_approval` | status = `checking` + all concerns have findings |
| `send_estimate` | status = `estimate_sent` |
| `approve_estimate` | status = `estimate_sent` |
| `start_work` | status = `approved` |
| `request_parts` | status = `in_progress` + parts needed |
| `resume_work` | status = `waiting_parts` + parts_status = `parts_ready` |
| `start_qc` | status = `in_progress` |
| `inform_customer` | status = `ready` + customer_informed = false |
| `close_job` | status = `ready` |
| `assign_technician` | technician_id is null + not terminal |
| `add_concern` | not closed/no_show |
| `edit_concern` | not closed/no_show + concern not locked |
| `delete_concern` | not closed/no_show + concern not locked |
| `defer_concern` | concern has finding + status allows deferral |
| `archive_job` | status = `closed` + not archived |
| `unarchive_job` | archived_at is not null |

## `GET /api/jobs` — Job List with Lightweight Meta

Each item in the `items` array now includes a `meta` key:

```typescript
{
  "meta": {
    "priorityScore": 32,
    "priorityLevel": "normal",
    "isOverdue": false,
    "hoursToPromise": 4.5,             // null if no promised_at
    "idleHours": 2.5,
    "phaseIndex": 4,
    "phaseLabel": "in progress",
    "validTransitions": ["waiting_parts", "quality_check", "ready", "closed"],
    "nextFlowStatus": "waiting_parts",
    "nextAction": {
      "title": "...",
      "urgency": "normal",
      "owner": "advisor",
      "actionType": "..."
    },
    "isWorkshopPhase": true,
    "resolvedWorkshopStage": "work_in_progress",
    "resolvedWorkflowStageKey": "in_progress",
    "estimateTotal": 4500.00,
    "editableFields": ["workshop_stage", "parts_status"]
  }
}
```

Note: `concernsSummary` and `partsSummary` are NOT included in list meta (too expensive to compute per job).

## `GET /api/inspections/:id` — Inspection Detail

New computed fields:

```typescript
{
  // ...existing fields...
  "is_locked": true,                    // status in [submitted, reviewed, approved]

  // On each inspection item (inside template > sections):
  "is_informational": false,            // input_type in [photo, odometer, fuel_level, text]
  "available_options": ["pass", "fail"], // derived from input_type or parsed from options JSON

  // On each inspection response:
  "traffic_light": "amber"              // "green" | "amber" | "red" — from urgency/value
}
```

## `GET /api/qc-checklists/:id` — QC Checklist Detail

New computed fields:

```typescript
{
  // ...existing fields...
  "is_locked": true,                    // status in [submitted, approved]

  // On each QC item (inside template > sections):
  "is_informational": false,            // input_type in [photo, text]
  "available_options": ["pass", "fail"], // derived from input_type

  // On each QC response:
  "traffic_light": "red"                // "green" | "red" — from value (2-tier)
}
```

## `GET /api/portal/:token/` — Customer Portal

New computed fields:

```typescript
{
  "token": {
    // ...existing fields...
    "is_expired": false                  // expires_at < now
  },
  "approved_total": 3200.00,           // sum of line_total for approved lines
  "has_actionable_lines": true,         // some lines have no decision
  "can_submit": true,                   // !is_expired && !is_revoked && has_actionable_lines

  // On each group in grouped_estimate:
  "group_decision_summary": "mixed",    // "pending" | "approved" | "declined" | "deferred" | "mixed"
  "is_locked": false,                   // all lines in group have decisions

  // On each line in grouped_estimate[].lines:
  "is_actionable": true                 // no existing decision for this line
}
```

## `GET /api/estimates/job/:jobId` — Estimate Lines

New computed fields on each line:

```typescript
{
  // ...existing fields...
  "is_recommended": true,               // explicit flag OR inferred from inspection_response_id presence
  "is_actionable": true,                // no authorisation_decisions exist for this line
}
```

## `GET /api/parts` and `GET /api/parts/:id` — Parts

New computed field:

```typescript
{
  // ...existing fields...
  "is_low_stock": false                 // sum(inventory[].quantity_on_hand) <= min_stock && min_stock > 0
}
```
