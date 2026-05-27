# PrioraFlow Product Mode Data Model Audit

## Shared tables

`workshops`, `users`, `roles`, `user_workshop_access`, `customers`, `vehicles`, `jobs`, `job_status_history`, `media_files`, `audit_logs`, `settings`, `notifications`, `integrations`, and `integration_events` are shared. In Connect, customer, vehicle, and job rows can be DMS-imported records rather than native-owned records.

## Workshop-only ownership

`parts`, `part_fitments`, `inventory`, `stock_movements`, `warehouses`, `suppliers`, `purchase_orders`, `purchase_order_items`, native `invoices`, and native stock ownership belong to PrioraFlow Workshop. Connect can consume parts/labor/revenue data imported from a DMS, but it should not become the source of truth for parts master, accounting, or invoicing.

## Connect-specific scope

Connect uses `integrations` and `integration_events` for DMS provider config, sync state, and sync audit. Imported jobs/customers/vehicles reuse shared tables through existing `dms_*` fields. Future Connect-only operational intelligence tables should be additive, for example `dms_sync_runs`, `capacity_snapshots`, `bottleneck_events`, and `next_best_action_events`.

## Optional financial fields

Financial analytics in Connect must be optional because revenue, labor sales, parts margin, advisor conversion, approval delays, and deferred work value depend on DMS availability. Existing monetary fields such as estimate totals, parts unit cost/price, invoice amounts, and deferred estimated value should be treated as nullable/partial when `product_mode = CONNECT`.
