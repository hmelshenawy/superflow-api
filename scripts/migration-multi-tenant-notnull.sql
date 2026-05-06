-- Migration: Multi-tenant Phase 2
-- Make workshop_id NOT NULL on all data tables + add composite unique constraints
-- Run AFTER seed-workshop.ts has backfilled all workshop_id values

-- Set workshop_id NOT NULL on all data tables
ALTER TABLE `approval_tokens` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `audit_logs` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `authorisation_decisions` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `booking_import_templates` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `customers` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `deferred_work` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `deferred_work_reminders` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `estimate_line_history` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `estimate_lines` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `inspection_items` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `inspection_responses` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `inspection_sections` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `inspection_templates` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `inspections` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `integrations` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `integration_events` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `job_status_history` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `jobs` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `labour_rates` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `media_files` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `notification_templates` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `notifications` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `quote_groups` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `settings` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `vehicle_service_history` MODIFY `workshop_id` CHAR(36) NOT NULL;
ALTER TABLE `vehicles` MODIFY `workshop_id` CHAR(36) NOT NULL;

-- Drop old single-column unique constraints and add composite unique constraints
ALTER TABLE `jobs` DROP INDEX `job_number`, ADD UNIQUE INDEX `idx_jobs_number_workshop` (`job_number`, `workshop_id`);
ALTER TABLE `vehicles` DROP INDEX `vin`, ADD UNIQUE INDEX `idx_vehicles_vin_workshop` (`vin`, `workshop_id`);
ALTER TABLE `settings` DROP INDEX `key`, ADD UNIQUE INDEX `idx_settings_key_workshop` (`key`, `workshop_id`);
ALTER TABLE `integrations` DROP INDEX `name`, ADD UNIQUE INDEX `idx_integrations_name_workshop` (`name`, `workshop_id`);
ALTER TABLE `notification_templates` DROP INDEX `name`, ADD UNIQUE INDEX `idx_nt_name_workshop` (`name`, `workshop_id`);