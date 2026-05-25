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
