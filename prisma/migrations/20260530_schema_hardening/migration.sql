-- Schema hardening migration
-- Makes created_at, updated_at, is_active, is_deleted, cancel_at_period_end, assigned_at, is_revoked
-- NOT NULL where they have defaults (they always have a value anyway).
-- No column renames needed: Prisma field "vehicle_model" maps to existing DB column "model" via @map("model").

-- workshops
ALTER TABLE `workshops` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `workshops` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `workshops` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- plans
ALTER TABLE `plans` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `plans` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `plans` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- subscriptions
ALTER TABLE `subscriptions` MODIFY COLUMN `cancel_at_period_end` tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE `subscriptions` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `subscriptions` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- payment_gateways
ALTER TABLE `payment_gateways` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `payment_gateways` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `payment_gateways` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- invoices
ALTER TABLE `invoices` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `invoices` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- invoice_items
ALTER TABLE `invoice_items` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- payments
ALTER TABLE `payments` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `payments` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- user_workshop_access
ALTER TABLE `user_workshop_access` MODIFY COLUMN `assigned_at` datetime NOT NULL DEFAULT current_timestamp();

-- approval_tokens
ALTER TABLE `approval_tokens` MODIFY COLUMN `is_revoked` tinyint(1) NOT NULL DEFAULT 0;

-- audit_logs
ALTER TABLE `audit_logs` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- approval_reset_audit
ALTER TABLE `approval_reset_audit` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- customers
ALTER TABLE `customers` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `customers` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `customers` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- appointments
ALTER TABLE `appointments` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `appointments` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- blockers
ALTER TABLE `blockers` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `blockers` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- customer_portal_snapshots
ALTER TABLE `customer_portal_snapshots` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- deferred_work
ALTER TABLE `deferred_work` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- estimate_lines
ALTER TABLE `estimate_lines` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `estimate_lines` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- holidays
ALTER TABLE `holidays` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `holidays` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- inspections
ALTER TABLE `inspections` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- inspection_items
ALTER TABLE `inspection_items` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;

-- inspection_sections
ALTER TABLE `inspection_sections` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;

-- inspection_templates
ALTER TABLE `inspection_templates` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `inspection_templates` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `inspection_templates` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- integrations
ALTER TABLE `integrations` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `integrations` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- integration_events
ALTER TABLE `integration_events` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- inventory
ALTER TABLE `inventory` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `inventory` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- jobs
ALTER TABLE `jobs` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `jobs` MODIFY COLUMN `is_deleted` tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE `jobs` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- job_concerns
ALTER TABLE `job_concerns` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `job_concerns` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- job_parts
ALTER TABLE `job_parts` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `job_parts` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- job_types
ALTER TABLE `job_types` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `job_types` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `job_types` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- job_type_templates
ALTER TABLE `job_type_templates` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `job_type_templates` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `job_type_templates` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- labour_rates
ALTER TABLE `labour_rates` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `labour_rates` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `labour_rates` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- media_files
ALTER TABLE `media_files` MODIFY COLUMN `is_deleted` tinyint(1) NOT NULL DEFAULT 0;

-- notification_templates
ALTER TABLE `notification_templates` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `notification_templates` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `notification_templates` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- parts
ALTER TABLE `parts` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `parts` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `parts` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- part_fitments
ALTER TABLE `part_fitments` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `part_fitments` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- password_reset_tokens
ALTER TABLE `password_reset_tokens` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- plan_add_ons
ALTER TABLE `plan_add_ons` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `plan_add_ons` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- plan_add_on_prices
ALTER TABLE `plan_add_on_prices` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `plan_add_on_prices` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- plan_features
ALTER TABLE `plan_features` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `plan_features` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- plan_regions
ALTER TABLE `plan_regions` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `plan_regions` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- purchase_orders
ALTER TABLE `purchase_orders` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `purchase_orders` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- purchase_order_items
ALTER TABLE `purchase_order_items` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `purchase_order_items` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- qc_checklists
ALTER TABLE `qc_checklists` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- qc_checklist_items
ALTER TABLE `qc_checklist_items` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;

-- qc_checklist_sections
ALTER TABLE `qc_checklist_sections` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;

-- qc_checklist_templates
ALTER TABLE `qc_checklist_templates` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `qc_checklist_templates` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `qc_checklist_templates` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- quote_groups
ALTER TABLE `quote_groups` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `quote_groups` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- refresh_tokens
ALTER TABLE `refresh_tokens` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- roles
ALTER TABLE `roles` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- schedule_breaks
ALTER TABLE `schedule_breaks` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `schedule_breaks` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- schedule_config
ALTER TABLE `schedule_config` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `schedule_config` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- settings
ALTER TABLE `settings` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- staff_leaves
ALTER TABLE `staff_leaves` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `staff_leaves` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- staff_members
ALTER TABLE `staff_members` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `staff_members` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `staff_members` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- stock_movements
ALTER TABLE `stock_movements` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();

-- suppliers
ALTER TABLE `suppliers` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `suppliers` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `suppliers` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- usage_records
ALTER TABLE `usage_records` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `usage_records` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- users
ALTER TABLE `users` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `users` MODIFY COLUMN `is_active` tinyint(1) NOT NULL DEFAULT true;
ALTER TABLE `users` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- vehicles
ALTER TABLE `vehicles` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `vehicles` MODIFY COLUMN `is_deleted` tinyint(1) NOT NULL DEFAULT 0;
ALTER TABLE `vehicles` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();

-- warehouses
ALTER TABLE `warehouses` MODIFY COLUMN `created_at` datetime NOT NULL DEFAULT current_timestamp();
ALTER TABLE `warehouses` MODIFY COLUMN `updated_at` datetime NOT NULL DEFAULT current_timestamp();