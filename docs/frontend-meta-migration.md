# Frontend Backend-Meta Migration Notes

Date: 2026-05-25

## Parts Screen Findings

[Parts] Finding 1:
Logic: Computes low-stock state client-side from inventory totals and `min_stock`.
Location: `superflow-web/src/app/(dashboard)/parts/page.tsx:184-187`
Replace with: `part.is_low_stock`

[Parts] Finding 2:
Logic: Active/category/search filters are translated into API query parameters.
Location: `superflow-web/src/app/(dashboard)/parts/page.tsx:60-63`
Replace with: No replacement needed. These are user-selected query controls, not derived business decisions.

## Deferred Screen Findings

[Deferred] Finding 1:
Logic: Shows the Remind button when `item.status` is `pending` or `reminded`.
Location: `superflow-web/src/app/(dashboard)/deferred/page.tsx:201`
Replace with: `item.available_actions.includes("can_remind")`

[Deferred] Finding 2:
Logic: Shows the Close button when `item.status !== "closed"`.
Location: `superflow-web/src/app/(dashboard)/deferred/page.tsx:206`
Replace with: `item.available_actions.includes("can_close")`

[Deferred] Finding 3:
Logic: `GET /deferred` does not currently expose `available_actions`, and deferred rows are not job objects with `job.meta.availableActions`.
Location: `src/deferred/deferred.service.ts:29`
Replace with: Add backend-computed `available_actions` to deferred responses before migrating the screen.

## Portal Screen Findings

[Portal] Finding 1:
Logic: Computes expiry by comparing `token.expires_at` to the current time.
Location: `superflow-web/src/app/portal/[token]/page.tsx:245`
Replace with: `data.token.is_expired`

[Portal] Finding 2:
Logic: Computes approved total by reducing estimate lines and selected/existing decisions.
Location: `superflow-web/src/app/portal/[token]/page.tsx:246-253`
Replace with: `data.approved_total`

[Portal] Finding 3:
Logic: Computes actionable lines by excluding lines with existing decisions.
Location: `superflow-web/src/app/portal/[token]/page.tsx:174`
Replace with: `line.is_actionable`

[Portal] Finding 4:
Logic: Computes whether the portal has actionable lines from grouped estimate contents.
Location: `superflow-web/src/app/portal/[token]/page.tsx:175`
Replace with: `data.has_actionable_lines`

[Portal] Finding 5:
Logic: Uses local grouped-line rules to decide whether the portal can be submitted.
Location: `superflow-web/src/app/portal/[token]/page.tsx:176-186`, `superflow-web/src/app/portal/[token]/page.tsx:612`
Replace with: `data.can_submit` for backend eligibility. Keep a local selected-decision completeness check so the UI does not send an empty/incomplete payload.

[Portal] Finding 6:
Logic: Computes fully locked groups from whether all lines are non-actionable.
Location: `superflow-web/src/app/portal/[token]/page.tsx:433-434`
Replace with: `group.is_locked`

## QC Checklist Workspace Findings

[QC] Finding 1:
Logic: Computes locked state from `status in [submitted, approved]`.
Location: `superflow-web/src/components/qc-checklists/qc-checklist-workspace.tsx:83`
Replace with: `checklist.is_locked`

[QC] Finding 2:
Logic: Maps response values to traffic lights with `resultToTrafficLight()`.
Location: `superflow-web/src/components/qc-checklists/qc-checklist-workspace.tsx:37-43`, `superflow-web/src/components/qc-checklists/qc-checklist-workspace.tsx:263`
Replace with: `response.traffic_light`

[QC] Finding 3:
Logic: Derives checklist item options from `input_type`.
Location: `superflow-web/src/components/qc-checklists/qc-checklist-workspace.tsx:26-33`, `superflow-web/src/components/qc-checklists/qc-checklist-workspace.tsx:266`
Replace with: `item.available_options`

[QC] Finding 4:
Logic: Active-section/item filters and sort-order sorting.
Location: `superflow-web/src/components/qc-checklists/qc-checklist-workspace.tsx:245-250`
Replace with: No replacement needed. These are presentation ordering/visibility concerns from backend data flags.

## Inspection Workspace Findings

[Inspection] Finding 1:
Logic: Computes locked state from `status in [submitted, reviewed, approved]`.
Location: `superflow-web/src/components/inspections/inspection-workspace.tsx:117`
Replace with: `inspection.is_locked`

[Inspection] Finding 2:
Logic: Maps response values/input types to traffic lights with `resultToTrafficLight()`.
Location: `superflow-web/src/components/inspections/inspection-workspace.tsx:55-62`, `superflow-web/src/components/inspections/inspection-workspace.tsx:404`
Replace with: `response.traffic_light`

[Inspection] Finding 3:
Logic: Derives whether an item is informational from `input_type`.
Location: `superflow-web/src/components/inspections/inspection-workspace.tsx:49-51`, `superflow-web/src/components/inspections/inspection-workspace.tsx:340`
Replace with: `item.is_informational`

[Inspection] Finding 4:
Logic: Derives item options from `input_type`.
Location: `superflow-web/src/components/inspections/inspection-workspace.tsx:34-47`, `superflow-web/src/components/inspections/inspection-workspace.tsx:496`
Replace with: `item.available_options`

[Inspection] Finding 5:
Logic: Computes summary counts from local responses and input-type rules.
Location: `superflow-web/src/components/inspections/inspection-workspace.tsx:334-348`
Replace with: `inspection.summary`. This field was missing from the contract and backend response, so it must be added first.

## Estimate Builder Findings

[Estimate] Finding 1:
Logic: Maps inspection response values/urgency to quote-group severity with `resultToSeverity()`.
Location: `superflow-web/src/components/estimates/estimate-builder.tsx:85-92`, `superflow-web/src/components/estimates/estimate-builder.tsx:288`
Replace with: `response.traffic_light`

[Estimate] Finding 2:
Logic: Summarizes group decisions by reducing `decisionByLine`.
Location: `superflow-web/src/components/estimates/estimate-builder.tsx:101-121`, `superflow-web/src/components/estimates/estimate-builder.tsx:402`
Replace with: `line.group_decision_summary`. The field was missing from the estimate-lines endpoint and is added before the UI replacement.

[Estimate] Finding 3:
Logic: Uses `recalc()` to compute `line_total` and `tax_amount` locally.
Location: `superflow-web/src/components/estimates/estimate-builder.tsx:139-147`
Replace with: Keep for optimistic typing only; after save, replace local lines with backend-returned `line_total` and `tax_amount`.

[Estimate] Finding 4:
Logic: Marks new inspection-linked lines as recommended from `inspectionResponseId`.
Location: `superflow-web/src/components/estimates/estimate-builder.tsx:195`
Replace with: Backend `line.is_recommended` after save. This optimistic flag remains only for new unsaved rows.

[Estimate] Finding 5:
Logic: Hardcoded concern status options in the quote group feedback form.
Location: `superflow-web/src/components/estimates/estimate-builder.tsx:502-510`
Replace with: `GET /jobs/concern-status-options`

## Insights Screen Findings

[Insights] Finding 1:
Logic: Computes notification delivery rate from sent/total notification counts.
Location: `superflow-web/src/app/(dashboard)/insights/page.tsx:249-251`
Replace with: `data.notificationDeliveryRate`

[Insights] Finding 2:
Logic: Computes pending approval decisions from total minus approved minus declined.
Location: `superflow-web/src/app/(dashboard)/insights/page.tsx:257`
Replace with: `data.approvalCounts.pending`

[Insights] Finding 3:
Logic: Computes inspection completed and in-progress counts from completion rate and inspection total.
Location: `superflow-web/src/app/(dashboard)/insights/page.tsx:262-263`
Replace with: `data.inspectionCounts.completed` and `data.inspectionCounts.inProgress`
