# PrioraFlow Mobile API Contract

Reference document for the Flutter technician app. All endpoints are under `/api` prefix.

## Authentication

All authenticated endpoints require `Authorization: Bearer <jwt>` header.

### `POST /api/auth/login`
```json
{ "email": "...", "password": "..." }
→ { "access_token": "...", "refresh_token": "...", "user": { "id", "name", "email", "role" } }
```

### `POST /api/auth/refresh`
```json
{ "refresh_token": "..." }
→ { "access_token": "...", "refresh_token": "..." }
```

## Jobs

### `GET /api/jobs?status=&search=&page=1&limit=20`
Returns paginated job list with lightweight `meta` per item.

```typescript
{
  "items": [{
    "id": "uuid",
    "job_number": "SF-...",
    "status": "in_progress",
    "workshop_stage": "work_in_progress",
    "parts_status": "no_parts",
    "customer_sensitivity": "normal",
    "promised_at": "2026-05-25T10:00:00Z",
    "customer_informed": false,
    "is_customer_waiting": false,
    "arrived_at": "2026-05-24T09:00:00Z",
    "customer": { "id", "name", "phone", "email" },
    "vehicle": { "id", "make", "model", "plate", "vin", "year" },
    "advisor": { "id", "name", "email" },
    "technician": { "id", "name", "email" } | null,
    "meta": {
      "priorityScore": 32,
      "priorityLevel": "normal",         // "low" | "normal" | "high" | "critical"
      "isOverdue": false,
      "hoursToPromise": 18.5,
      "idleHours": 2.5,
      "phaseIndex": 4,
      "phaseLabel": "in progress",
      "validTransitions": ["waiting_parts", "quality_check", "ready", "closed"],
      "nextFlowStatus": "waiting_parts",
      "nextAction": { "title", "urgency", "owner", "actionType" },
      "isWorkshopPhase": true,
      "resolvedWorkshopStage": "work_in_progress",
      "resolvedWorkflowStageKey": "in_progress",
      "estimateTotal": 4500.00,
      "editableFields": ["workshop_stage", "parts_status"]
    }
  }],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### `GET /api/jobs/:id`
Full job detail with complete `meta`.

```typescript
{
  // ...all job fields from list, plus:
  "job_concerns": [{ "id", "code", "title", "description", "status", "technician_finding", "work_note", "qc_note", "media_files" }],
  "estimate_lines": [{ "id", "type", "description", "quantity", "unit_price", "line_total", "quote_group", "concern" }],
  "inspection": { "id", "status", "responses": [...] },
  "qc_checklists": [{ "id", "status" }],
  "media_files": [...],
  "job_status_history": [...],
  "meta": {
    // ...all list meta fields, plus:
    "priorityFactors": [{ "key", "weight", "description", "category" }],
    "nextAction": { "title", "reason", "urgency", "owner", "actionType", "signals" },
    "concernsSummary": { "total": 3, "inspected": 2, "pending": 1 },
    "partsSummary": { "requested": 1, "arrived": 0, "pending": 1 }, // from job_parts: reserved/used, used, reserved
    "availableActions": ["start_qc", "assign_technician", "add_concern"],
    "blockedReason": null,
    "idleTier": "none"                   // "none" | "6h" | "12h" | "24h"
  }
}
```

### `PATCH /api/jobs/:id/status`
```json
{ "to_status": "in_progress", "reason": "Work started" }
→ updated job object
```

### `POST /api/jobs/:id/assign`
```json
{ "technician_id": "uuid" | null }
→ updated job object
```

### `PATCH /api/jobs/:id`
Update job fields (workshop_stage, parts_status, etc).

## Concerns

### `POST /api/jobs/:id/concerns`
```json
{ "code": "C1", "title": "Engine noise", "description": "..." }
→ created concern object
```

### `PATCH /api/jobs/:id/concerns/:concernId`
```json
{ "technician_finding": "Worn bearing", "work_note": "Replace bearing" }
→ updated concern object
```

### `DELETE /api/jobs/:id/concerns/:concernId`
→ deleted concern object

## Inspections

### `POST /api/inspections`
```json
{ "jobId": "uuid", "templateId": "uuid", "technicianId": "uuid" }
→ created inspection object
```

### `GET /api/inspections/:id`
```typescript
{
  "id": "uuid",
  "status": "in_progress",
  "is_locked": false,                    // computed: status in [submitted, reviewed, approved]
  "inspection_responses": [{
    "id": "uuid",
    "value": "fail",
    "urgency": "high",
    "tech_notes": "...",
    "traffic_light": "red",              // computed: "green" | "amber" | "red"
    "inspection_items": {
      "id": "uuid",
      "label": "Brake pads",
      "input_type": "pass_fail",
      "is_informational": false,          // computed: input_type in [photo, odometer, fuel_level, text]
      "available_options": ["pass", "fail"] // computed from input_type or options JSON
    },
    "media_files": [{ "id", "url", "mime_type", "filename" }]
  }],
  "inspection_templates": {
    "inspection_sections": [{
      "name": "Brakes",
      "inspection_items": [{
        "id": "uuid",
        "label": "Brake pads",
        "input_type": "pass_fail",
        "is_informational": false,
        "available_options": ["pass", "fail"]
      }]
    }]
  }
}
```

### `PUT /api/inspections/:id/responses`
```json
{
  "responses": [
    { "item_id": "uuid", "value": "fail", "urgency": "high", "tech_notes": "Worn" }
  ],
  "offline_draft": { ... }
}
→ { "saved": 1, "inspection_id": "uuid", "status": "in_progress" }
```

### `POST /api/inspections/:id/submit`
```json
{ "advisor_note": "Brake pads need replacement" }
→ updated inspection object
```

### `POST /api/inspections/:id/reopen`
→ updated inspection object (status back to `in_progress`)

## QC Checklists

### `POST /api/qc-checklists`
```json
{ "jobId": "uuid", "templateId": "uuid", "checkerId": "uuid" }
→ created checklist object
```

### `GET /api/qc-checklists/:id`
```typescript
{
  "id": "uuid",
  "status": "in_progress",
  "overall_result": null,
  "is_locked": false,                    // computed: status in [submitted, approved]
  "qc_checklist_responses": [{
    "id": "uuid",
    "value": "pass",
    "notes": null,
    "traffic_light": "green",            // computed: "green" | "red" (2-tier for QC)
    "qc_checklist_items": {
      "id": "uuid",
      "label": "Paint quality",
      "input_type": "pass_fail",
      "is_informational": false,          // computed: input_type in [photo, text]
      "available_options": ["pass", "fail"]
    },
    "media_files": [...]
  }],
  "qc_checklist_templates": {
    "qc_checklist_sections": [{
      "name": "Body",
      "qc_checklist_items": [{
        "id": "uuid",
        "label": "Paint quality",
        "input_type": "pass_fail",
        "is_informational": false,
        "available_options": ["pass", "fail"]
      }]
    }]
  }
}
```

### `PUT /api/qc-checklists/:id/responses`
```json
{ "responses": [{ "item_id": "uuid", "value": "pass", "notes": "OK" }] }
→ { "saved": 1, "checklist_id": "uuid", "status": "in_progress" }
```

### `POST /api/qc-checklists/:id/submit`
```json
{ "notes": "All checks passed" }
→ updated checklist object
```

## Parts

### `GET /api/parts?search=&category=&page=1&limit=20`
```typescript
{
  "items": [{
    "id": "uuid",
    "part_number": "BRK-001",
    "name": "Brake Pad Set",
    "brand": "Bosch",
    "category": "Brakes",
    "cost_price": 120.00,
    "selling_price": 180.00,
    "min_stock": 5,
    "is_low_stock": true,                // computed: total_on_hand <= min_stock
    "suppliers": { "id", "name" },
    "inventory": [{ "quantity_on_hand": 3, "warehouses": { "name": "Main" } }]
  }],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### `GET /api/parts/search?q=brake`
Returns top 20 matching parts: `[{ id, name, part_number, barcode, brand }]`

## Deferred Work

### `GET /api/deferred?status=&page=1&limit=20`
```typescript
{
  "items": [{
    "id": "uuid",
    "status": "pending",
    "urgency": "medium",
    "estimated_value": 450.00,
    "remind_after": "2026-06-01T00:00:00Z",
    "available_actions": ["can_remind", "can_close"], // computed by backend
    "customer": { "id", "name", "phone", "email" },
    "vehicle": { "id", "make", "model", "plate", "year" }
  }],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

`available_actions` keys:

| Key | Meaning |
|---|---|
| `can_remind` | Staff can send a reminder now |
| `can_close` | Staff can close the deferred work item |

## Media

### `GET /api/media/:id/download`
Proxied media download (no direct S3/MinIO URL exposure).

### `POST /api/media/upload`
Multipart upload for photos/documents.

## Priority

### `GET /api/priority`
Returns all active jobs with priority scores (for dashboard views).

### `GET /api/priority/dashboard`
Returns advisor cockpit dashboard: critical count, high count, urgent jobs, pending approvals, promises at risk.

## Workshop Context

All tenant-scoped endpoints auto-inject `workshop_id` via JWT claims + `AsyncLocalStorage`. The Flutter app does not need to pass workshop_id explicitly.

## Status Values

### Job Status
`booked` → `checking` → `estimate_sent` → `approved` → `in_progress` → `waiting_parts` → `quality_check` → `ready` → `closed`
(plus terminal `no_show`)

### Inspection Status
`draft` → `in_progress` → `submitted` → `reviewed` → `approved`

### QC Checklist Status
`draft` → `in_progress` → `submitted` → `approved`

### Inspection Input Types
`pass_fail` | `yes_no` | `ok_warn_fail` | `number` | `text` | `toggle` | `photo` | `odometer` | `fuel_level`

### QC Input Types
`pass_fail` | `yes_no` | `ok_fail` | `photo` | `text`

### Priority Levels
`low` (< 22) | `normal` (22-39) | `high` (40-59) | `critical` (60+)

### Customer Sensitivity
`normal` | `vip` | `angry` | `comeback`
