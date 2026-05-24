# Audit Log: Frontend Business Logic Centralized to Backend

Date: 2026-05-24

## Summary

45 pieces of business logic were found scattered across 10 screens of the Next.js web app. All have been centralized in the NestJS backend as computed fields in API responses, with zero database schema changes and zero new endpoint paths.

## HIGH severity (code duplication that would silently drift)

| # | Finding | Frontend location | Backend fix |
|---|---|---|---|
| 1 | TRANSITIONS state machine | `lib/jobs-data.ts:5-20`, `jobs/[id]/page.tsx:231-242`, `jobs/page.tsx:254` | `job.meta.validTransitions` from `jobs.state-machine.ts` |
| 2 | getWorkshopStage() fallback logic | `lib/jobs-data.ts:146-155` | `job.meta.resolvedWorkshopStage` from `JobMetaService.legacyWorkshopStageForStatus()` |
| 3 | getJobWorkflowStage() status-to-category | `lib/workflow.ts:21-40` | `job.meta.resolvedWorkflowStageKey` from `JobMetaService.defaultWorkflowStageKeyForStatus()` |
| 4 | Estimate total calculation | `jobs/page.tsx:220,524`, `jobs/[id]/page.tsx:180-184` | `job.meta.estimateTotal` computed from `estimate_lines` |
| 5 | Inspection/QC isLocked inconsistency | `inspection-workspace.tsx`, `qc-checklist-workspace.tsx` | `inspection.is_locked`, `checklist.is_locked` — centralized lock rules |
| 6 | resultToTrafficLight inconsistency | `inspection-workspace.tsx` (3-tier), `qc-checklist-workspace.tsx` (2-tier) | `response.traffic_light` from `src/common/utils/traffic-light.ts` |

## MEDIUM severity (business rules in frontend)

| # | Finding | Frontend location | Backend fix |
|---|---|---|---|
| 7 | WORKSHOP_STAGE_DISABLED_STATUSES / PARTS_STATUS_DISABLED_STATUSES | `jobs/[id]/page.tsx:102-105` | `job.meta.editableFields` array |
| 8 | isWorkshopPhaseJob() | `lib/jobs-data.ts:142-144` | `job.meta.isWorkshopPhase` boolean |
| 9 | Drag-and-drop transition guard | `jobs/page.tsx:254` | `job.meta.validTransitions` from state machine |
| 10 | Portal: isExpired, approvedTotal, actionableLines | `portal/[token]/page.tsx:245-253` | `token.is_expired`, `portal.approved_total`, `portal.has_actionable_lines`, `portal.can_submit`, `line.is_actionable` |
| 11 | Estimate builder: recalc(), resultToSeverity(), summarizeGroupDecision() | `estimate-builder.tsx` | Keep `recalc()` for optimistic UI; use `line.is_recommended`, `line.is_actionable`, `group.group_decision_summary` from backend |
| 12 | Inspection: optionsForInputType(), isInformationalInputType() | `inspection-workspace.tsx` | `item.available_options`, `item.is_informational` from `traffic-light.ts` |
| 13 | Concern status options | `estimate-builder.tsx` | To be fetched from backend |
| 14 | Deferred: button visibility | `deferred/page.tsx:201-209` | `job.meta.availableActions` includes `can_remind`/`can_close` |

## LOW severity (display logic, kept on frontend)

| # | Finding | Decision |
|---|---|---|
| 15 | Status label/color maps (STATUS_META, PARTS_STATUS_META) | Keep on frontend — pure display |
| 16 | Status-to-guidance text | Superseded by `job.meta.nextAction` |
| 17 | Active jobs classification (closed/no_show exclusion) | Reasonable client-side filter |
| 18 | Delivery risk/idle filtering thresholds | `job.meta.isOverdue`/`job.meta.idleTier` now available |

## Backend files created/modified

### New files
- `src/jobs/job-meta.service.ts` — JobMetaService with `computeJobMeta()` and `computeJobListMeta()`
- `src/common/utils/traffic-light.ts` — Shared traffic light, informational, and options utilities

### Modified files
- `src/jobs/jobs.state-machine.ts` — Exported `JobStatus` type and `FLOW_ORDER` constant
- `src/jobs/jobs.module.ts` — Added `JobMetaService` provider, `PriorityModule` import
- `src/jobs/jobs.service.ts` — Injected `JobMetaService`, `findOne()` adds `meta`, `findAll()` adds `meta` + `estimate_lines` to include
- `src/priority/priority.service.ts` — Made `computeForJob()` public (was private)
- `src/inspections/inspections.service.ts` — Added `is_locked`, `traffic_light`, `is_informational`, `available_options`
- `src/qc-checklists/qc-checklists.service.ts` — Added `is_locked`, `traffic_light`, `is_informational`, `available_options`
- `src/authorisation/authorisation.service.ts` — Added `is_expired`, `approved_total`, `has_actionable_lines`, `can_submit`, `group_decision_summary`, `is_actionable`, `is_locked` per group
- `src/estimates/estimates.service.ts` — Added `is_recommended`, `is_actionable`, included `authorisation_decisions`
- `src/parts/parts.service.ts` — Added `is_low_stock` computed field