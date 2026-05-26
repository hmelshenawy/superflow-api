# Post-Migration Bug Report

Audit date: 2026-05-25

## Read-Pass Summary

- `src/jobs/job-meta.service.ts`: centralizes job phase, priority, transitions, editable fields, action keys, estimate total, concern counts, and parts counts. Suspicious: workflow-stage resolution is hardcoded instead of using workshop config; parts summary reads `job.parts` even though jobs expose `job_parts`; editable-field disabled sets do not match the migrated frontend constants.
- `src/jobs/jobs.service.ts`: attaches list/detail meta after reshaping Prisma results. Suspicious: `findOne()` does not include `job_parts`, so `partsSummary` cannot be correct; status changes through `transition()` are well synchronized, but other services still update `jobs.status` directly.
- `src/jobs/jobs.controller.ts`: thin controller, delegates list/detail/status transitions to `JobsService`. No direct meta issue found.
- `src/common/utils/traffic-light.ts`: shared traffic-light and options helpers for inspection/QC. Suspicious: backend returns only `green|amber|red`, while old inspection UI had a `none` state for informational items.
- `src/inspections/inspections.service.ts`: computes lock/options/traffic-light fields and creates/submits inspections. Suspicious: creating an inspection directly moves `booked -> checking` without `workflow_stage_key`, `arrived_at`, or history.
- `src/qc-checklists/qc-checklists.service.ts`: computes lock/options/traffic-light fields and creates/submits QC. Suspicious: QC status changes update `jobs.status` directly without `workflow_stage_key`, `workshop_stage`, completion timestamps, or history.
- `src/authorisation/authorisation.service.ts`: portal load/decision flow, immutable line decisions, approval totals, and portal submit state. Previously suspicious direct status updates were confirmed and patched before this report.
- `src/estimates/estimates.service.ts`: creates/lists/bulk replaces quote lines. Suspicious: `is_recommended` can remain false even when an inspection response is linked.
- `src/parts/parts.service.ts`: adds `is_low_stock` from inventory totals. Suspicious: contains an unreachable `return part` after returning the computed shape.
- `src/priority/priority.service.ts`: canonical scoring/overdue/idle/next-action engine. No missing relation found for current scoring inputs.
- `superflow-web/src/lib/jobs-data.ts`: frontend display helpers now prefer `job.meta` with fallbacks. Suspicious: `job.meta` is untyped and fallbacks can mask backend drift.
- `superflow-web/src/lib/workflow.ts`: resolves workflow lanes from meta, then `workflow_stage_key`, then status/category. Suspicious: list meta does not provide `resolvedWorkflowStageKey`, and detail meta currently resolves active statuses to generic `active`.
- `jobs/page.tsx` and `jobs/[id]/page.tsx`: migrated job board/detail consume backend meta for transitions, estimate totals, and editable fields. Suspicious: several `(job as any).meta` accesses bypass type checking; editable-field behavior now depends on backend sets that do not match previous frontend constants.
- Remaining screens: inspection, QC, estimate builder, portal, deferred, parts, and insights still intentionally use local fallback/business logic. They are not fully migrated, but endpoint fields were reviewed for consistency.

## Bug 1: Portal approval updated status without workflow stage key

**Status**: Fixed
**Severity**: High
**Location**: `src/authorisation/authorisation.service.ts`
**Found in**: Live customer approval report before this audit

**Description**: Customer portal approval could update `jobs.status` to `approved` while leaving `workflow_stage_key` at the old stage.

**Expected behavior**: Approval should move both `status` and `workflow_stage_key` to the approved workflow lane.

**Actual behavior**: The example job showed `status = approved` but `workflow_stage_key = checking`, so one board view could still place it under Checking.

**Root cause**: Migration moved approval logic to the backend but did not reuse the same companion-field behavior as `JobsService.transition()`.

**Fix**: Portal estimate-sent and approved updates now also write the matching `workflow_stage_key` and clear `workshop_stage`.

## Bug 2: Inspection auto-check-in bypasses workflow transition side effects

**Status**: Fixed
**Severity**: High
**Location**: `src/inspections/inspections.service.ts:21`
**Found in**: Step 4 direct status-writer audit

**Description**: Creating an inspection on a booked job directly writes `status = checking`.

**Expected behavior**: The job should receive all `booked -> checking` transition side effects: `workflow_stage_key`, `workshop_stage`, `arrived_at`, and status history.

**Actual behavior**: Only `status` is changed.

**Root cause**: The inspection service owns a workflow transition but does not call shared transition logic or duplicate its required side effects.

**Fix**: Inspection-created check-in now writes `workflow_stage_key`, clears `workshop_stage`, sets `arrived_at`, and creates status history.

## Bug 3: QC workflow transitions bypass workflow transition side effects

**Status**: Fixed
**Severity**: High
**Location**: `src/qc-checklists/qc-checklists.service.ts:19`, `src/qc-checklists/qc-checklists.service.ts:195`
**Found in**: Step 4 direct status-writer audit

**Description**: Creating/submitting QC can move jobs to `quality_check`, `ready`, or `in_progress` by directly writing `jobs.status`.

**Expected behavior**: These moves should sync `workflow_stage_key`, `workshop_stage`, timestamps such as `completed_at`, and status history.

**Actual behavior**: Only `status` is changed.

**Root cause**: QC service performs workflow moves outside the job state machine side-effect path.

**Fix**: QC-created/submitted transitions now write `workflow_stage_key`, `workshop_stage`, timestamps, and status history.

## Bug 4: Job meta workflow stage key is not resolved from workshop workflow config

**Status**: Fixed
**Severity**: High
**Location**: `src/jobs/job-meta.service.ts:232`
**Found in**: Step 2 relation/workflow audit

**Description**: `resolvedWorkflowStageKey` returns hardcoded category keys like `active` instead of the active configured stage key for the job status.

**Expected behavior**: For configured stages, `checking` should resolve to the configured checking key, `approved` to the approved key, and so on.

**Actual behavior**: Most active statuses resolve to `active`, which is not a real lane key in the large/default workflow.

**Root cause**: `JobMetaService` duplicated `JobsService.defaultWorkflowStageKeyForStatus()` as a synchronous hardcoded mapper instead of using workshop settings.

**Fix**: `JobMetaService` now resolves workflow stage keys from `WorkflowService.getStages()` and list meta includes `resolvedWorkflowStageKey`.

## Bug 5: Parts summary always returns zero for real job parts

**Status**: Fixed
**Severity**: Medium
**Location**: `src/jobs/job-meta.service.ts:107`, `src/jobs/jobs.service.ts:180`
**Found in**: Step 2 relation check

**Description**: `partsSummary` reads `job.parts`, but Prisma exposes assigned job parts as `job_parts`, and `findOne()` does not include them.

**Expected behavior**: `partsSummary` should count actual job part rows.

**Actual behavior**: It silently falls back to an empty array and returns `{ requested: 0, arrived: 0, pending: 0 }`.

**Root cause**: Relation name mismatch and missing include.

**Fix**: `GET /jobs/:id` now includes `job_parts`, and `partsSummary` counts `reserved`/`used` job-part rows.

## Bug 6: Waiting-parts resume action checks nonexistent parts status

**Status**: Fixed
**Severity**: Medium
**Location**: `src/jobs/job-meta.service.ts:208`
**Found in**: Step 2 availableActions audit

**Description**: `resume_work` requires `parts_status === 'all_arrived'`, but the valid enum contains `parts_ready`, not `all_arrived`.

**Expected behavior**: A waiting-parts job should expose `resume_work` when `parts_status` is `parts_ready`.

**Actual behavior**: `resume_work` never appears from backend meta.

**Root cause**: Migration kept an old/incorrect status key.

**Fix**: `resume_work` now checks `parts_status === 'parts_ready'`.

## Bug 7: Checking jobs with incomplete concern findings lack a blocked reason

**Status**: Fixed
**Severity**: Medium
**Location**: `src/jobs/job-meta.service.ts:118`
**Found in**: Step 5 Scenario B audit

**Description**: `blockedReason` is only set when no transitions exist.

**Expected behavior**: A checking job with pending concern findings should explain why submit-for-approval is unavailable.

**Actual behavior**: `blockedReason` is `null`.

**Root cause**: Available-action gating moved to backend, but the explanatory blocked state was not migrated.

**Fix**: Checking jobs with pending concern findings now return a clear `blockedReason`.

## Bug 8: Editable-field sets do not match the migrated frontend rules

**Status**: Fixed
**Severity**: Medium
**Location**: `src/jobs/job-meta.service.ts:46`
**Found in**: Step 2 editableFields audit

**Description**: Backend disabled statuses differ from the old frontend constants.

**Expected behavior**: Workshop stage and parts status editability should match the verified product rules used before migration.

**Actual behavior**: Backend allows `workshop_stage` on `approved` and `waiting_parts`; frontend old constants disabled those. Backend also controls terminal status editability differently.

**Root cause**: Migration re-created editability rules manually instead of moving the exact source rule.

**Fix**: Backend editable-field disabled sets now include the previously disabled approval/waiting-parts statuses and terminal statuses.

## Bug 9: Estimate line recommendation flag ignores linked inspection responses when stored false

**Status**: Fixed
**Severity**: Low
**Location**: `src/estimates/estimates.service.ts:53`
**Found in**: Step 3e estimate fields audit

**Description**: Returned `is_recommended` uses `l.is_recommended ?? Boolean(l.inspection_response_id)`.

**Expected behavior**: A line linked to an inspection response should be recommended even if the stored flag is false.

**Actual behavior**: Explicit false in the database suppresses the derived recommendation.

**Root cause**: Nullish coalescing treats false as intentional, but the migrated rule is based on linked inspection response presence.

**Fix**: Estimate responses and new saved lines now derive recommendation from linked inspection responses.

## Bug 10: Frontend Job type does not model backend meta

**Status**: Fixed
**Severity**: Medium
**Location**: `superflow-web/src/types/index.ts:217`
**Found in**: Step 4 TypeScript safety audit

**Description**: `Job` has no typed `meta` property, so migrated reads use `(job as any).meta`.

**Expected behavior**: Frontend types should define `JobMeta`/`JobListMeta` fields returned by the backend.

**Actual behavior**: Field-name mismatches are invisible to TypeScript.

**Root cause**: Backend response shape changed without updating shared frontend types.

**Fix**: Frontend `JobMeta` is now typed and migrated job meta reads no longer use `(job as any).meta`.

## Bug 11: Migrated job fallbacks can mask backend meta defects

**Status**: Fixed
**Severity**: Low
**Location**: `superflow-web/src/lib/jobs-data.ts`, `superflow-web/src/lib/workflow.ts`, job pages
**Found in**: Step 4 fallback audit

**Description**: Several migrated reads fall back to old client computations.

**Expected behavior**: Verified backend-owned fields should be used directly, with only null/loading fallbacks retained.

**Actual behavior**: Stale client logic can hide backend regressions during development.

**Root cause**: Migration kept compatibility fallbacks after backend ownership was introduced.

**Fix**: Verified backend-owned job fallbacks now either use typed `job.meta` or include comments explaining why the fallback remains for optimistic/local rows.

## Bug 12: Parts service contains unreachable return

**Status**: Fixed
**Severity**: Low
**Location**: `src/parts/parts.service.ts:106`
**Found in**: Step 3 parts audit

**Description**: `findOne()` returns the computed part shape and then has a second `return part`.

**Expected behavior**: No unreachable code.

**Actual behavior**: Dead code remains after the migration.

**Root cause**: Mechanical edit left a stale return behind.

**Fix**: Removed the unreachable return.

## Bug 13: `nextFlowStatus` can choose a backward transition

**Status**: Fixed
**Severity**: High
**Location**: `src/jobs/job-meta.service.ts:83`
**Found in**: Live runtime verification after deploy

**Description**: `nextFlowStatus` uses the first allowed transition from the state machine.

**Expected behavior**: The primary next CTA should choose the next forward workflow status when one exists.

**Actual behavior**: Approved jobs returned `nextFlowStatus = estimate_sent`, so the detail page could offer "Next -> Estimate Sent" instead of "Next -> In Progress". QC similarly preferred the backtrack to `in_progress` instead of `ready`.

**Root cause**: The transition map includes controlled backtracks before forward moves, and meta treated array order as forward-flow order.

**Fix**: `nextFlowStatus` now prefers the next forward status in `FLOW_ORDER`, with an explicit waiting-parts resume exception.

## Bug 14: Stale `workshop_stage` overrides terminal stage resolution

**Status**: Fixed
**Severity**: Medium
**Location**: `src/jobs/job-meta.service.ts:220`
**Found in**: Live runtime verification after deploy

**Description**: `legacyWorkshopStageForStatus()` returns stored `workshop_stage` before checking status-specific overrides.

**Expected behavior**: `ready` should resolve to `ready_handover`, `quality_check` to `quality_check`, and non-workshop statuses should resolve to null even if stale data remains.

**Actual behavior**: A live Ready job with stale `workshop_stage = quality_check` returned `resolvedWorkshopStage = quality_check`.

**Root cause**: The migration trusted persisted legacy stage values before canonical status rules.

**Fix**: Canonical status rules now override stale `workshop_stage` values before falling back to stored workshop stage.

## Bug 15: Deferred action visibility still depends on client-side status rules

**Status**: Fixed
**Severity**: Medium
**Location**: `superflow-web/src/app/(dashboard)/deferred/page.tsx:201`, `src/deferred/deferred.service.ts`
**Found in**: Remaining frontend migration Step 2

**Description**: The deferred work screen decides whether Remind and Close buttons should be visible by comparing `item.status` on the frontend.

**Expected behavior**: Deferred responses should expose backend-computed action availability so the frontend only renders what the API says is allowed.

**Actual behavior**: The screen duplicated deferred workflow rules locally, and the API contract did not include deferred action metadata.

**Root cause**: The initial backend meta migration covered jobs, inspection, QC, portal, estimates, and parts, but not deferred-work action availability.

**Fix**: Deferred responses now include `available_actions`, and the screen reads `can_remind` / `can_close` from that backend field.

## Bug 16: Inspection summary counts still depend on client-side traffic rules

**Status**: Fixed
**Severity**: Medium
**Location**: `superflow-web/src/components/inspections/inspection-workspace.tsx:334`, `src/inspections/inspections.service.ts`
**Found in**: Remaining frontend migration Step 5

**Description**: The inspection workspace computes green/amber/red/unset summary counts by re-running traffic-light and informational-item rules in the frontend.

**Expected behavior**: Inspection detail responses should expose backend-computed summary counts based on the same backend traffic-light and informational fields used by each item/response.

**Actual behavior**: The screen still duplicated inspection traffic-light rules locally.

**Root cause**: The first backend migration added per-response `traffic_light` and per-item fields but did not add an aggregate inspection summary.

**Fix**: `GET /inspections/:id` now returns `summary`, and the workspace reads it directly.

## Bug 17: Estimate group decision summary is missing from estimate responses

**Status**: Fixed
**Severity**: Medium
**Location**: `src/estimates/estimates.service.ts`, `superflow-web/src/components/estimates/estimate-builder.tsx`
**Found in**: Remaining frontend migration Step 6

**Description**: The estimate builder summarizes group-level customer decisions by reducing line decisions in the frontend.

**Expected behavior**: Estimate line responses should expose the backend-owned group decision summary used by quote groups.

**Actual behavior**: `GET /estimates/job/:jobId` returned `group_decision_summary: undefined`.

**Root cause**: The migration added line actionability but did not finish the group summary value on the estimate-lines endpoint.

**Fix**: Estimate responses now include `group_decision_summary`, and the builder reads that field.

## Bug 18: Concern status options are not exposed by the backend

**Status**: Fixed
**Severity**: Low
**Location**: `superflow-web/src/components/estimates/estimate-builder.tsx:502`
**Found in**: Remaining frontend migration Step 6

**Description**: The estimate builder contains a hardcoded list of concern status options in the feedback form.

**Expected behavior**: The backend should expose valid concern status options or the concern update contract should describe the allowable values.

**Actual behavior**: No backend field or endpoint exists in `docs/api-contract.md` for concern status options.

**Root cause**: Concern status option metadata was not included in the backend migration.

**Fix**: Added `GET /jobs/concern-status-options` and updated the estimate builder to fetch options from the backend.

## Bug 19: Checklist card color does not update after selecting OK/Fail

**Status**: Fixed
**Severity**: Medium
**Location**: `superflow-web/src/components/qc-checklists/qc-checklist-workspace.tsx`, `superflow-web/src/components/inspections/inspection-workspace.tsx`
**Found in**: Live QA on job `b525a449-2c78-48fb-9925-48be2b31cd42`

**Description**: Checklist item cards stayed neutral after selecting OK/Pass/Fail until the checklist was saved and reloaded.

**Expected behavior**: The selected value should immediately apply the same traffic-light color the backend will return after save.

**Actual behavior**: The migration set unsaved selections to `traffic_light: "none"`, so row background and icon color did not change.

**Root cause**: Backend `traffic_light` became authoritative, but the frontend still needs optimistic display state while editing unsaved responses.

**Fix**: Checklist workspaces now apply backend-equivalent traffic-light color for unsaved selections, then sync back to backend `traffic_light` after save/reload.

## Bug 20: Inspection fail/warn values are overridden by `urgency = none`

**Status**: Fixed
**Severity**: High
**Location**: `src/common/utils/traffic-light.ts`, `superflow-web/src/components/inspections/inspection-workspace.tsx`
**Found in**: Live QA on job `b525a449-2c78-48fb-9925-48be2b31cd42`

**Description**: Inspection checklist cards showed green for failed or warning values when urgency was `none`.

**Expected behavior**: `ok/pass/yes` should be green, `warn` should be amber, and `fail/no` should be red.

**Actual behavior**: Backend and optimistic frontend logic treated `urgency = none` as green before checking the selected value.

**Root cause**: Traffic-light precedence was wrong. Neutral urgency was allowed to override the actual inspection result.

**Fix**: Inspection traffic-light logic now checks the selected result first, and only uses urgency when no result mapping exists.

## Bug 21: Mileage and fuel level do not turn green when filled

**Status**: Fixed
**Severity**: Low
**Location**: `superflow-web/src/components/inspections/inspection-workspace.tsx`, `src/common/utils/traffic-light.ts`
**Found in**: Live QA checklist color pass

**Description**: Odometer/mileage and fuel-level inspection items stayed neutral after entering a value.

**Expected behavior**: Mileage and fuel level should show green when a value is present.

**Actual behavior**: They were treated as informational items and always mapped to neutral in the edit UI.

**Root cause**: Informational item handling did not distinguish value-bearing inspection fields from text/photo fields.

**Fix**: Odometer and fuel-level items now map to green when filled and neutral when empty, both optimistically in the frontend and after backend reload.

## Bug 22: Portal approved total ignores current unsaved approval selection

**Status**: Fixed
**Severity**: Medium
**Location**: `superflow-web/src/app/portal/[token]/page.tsx`
**Found in**: Live QA on portal token `43bd900bb6697111d9c651c23cbb1c2e728bd2723eb9d427515e83a34659e21f`

**Description**: The customer portal approved total stayed at zero after the customer selected Approve for an actionable estimate group.

**Expected behavior**: The approved total shown in the sticky footer should immediately include currently selected approved lines, while still using backend `approved_total` for already-saved decisions.

**Actual behavior**: The migration changed the display to `data.approved_total` only, so unsaved current selections were not included.

**Root cause**: Backend `approved_total` is the persisted approval total. The portal still needs display-only form math for the customer’s current unsaved selection.

**Fix**: Portal approved total now starts from backend `approved_total` and adds actionable lines from groups currently selected as approved.
