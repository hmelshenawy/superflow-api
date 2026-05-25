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
