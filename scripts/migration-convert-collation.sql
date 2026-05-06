-- Migration: Convert all tables to utf8mb4_unicode_ci for Prisma compatibility
-- Run on the VPS MariaDB container

SET FOREIGN_KEY_CHECKS=0;

-- Drop all existing FK constraints
ALTER TABLE approval_tokens DROP FOREIGN KEY fk_at_job;
ALTER TABLE approval_tokens DROP FOREIGN KEY fk_at_revoked_by;
ALTER TABLE audit_logs DROP FOREIGN KEY fk_al_user;
ALTER TABLE authorisation_decisions DROP FOREIGN KEY fk_ad_line;
ALTER TABLE authorisation_decisions DROP FOREIGN KEY fk_ad_token;
ALTER TABLE booking_import_templates DROP FOREIGN KEY fk_bit_created_by;
ALTER TABLE deferred_work DROP FOREIGN KEY fk_dw_booked_job;
ALTER TABLE deferred_work DROP FOREIGN KEY fk_dw_customer;
ALTER TABLE deferred_work DROP FOREIGN KEY fk_dw_estimate_line;
ALTER TABLE deferred_work DROP FOREIGN KEY fk_dw_original_job;
ALTER TABLE deferred_work DROP FOREIGN KEY fk_dw_vehicle;
ALTER TABLE deferred_work_reminders DROP FOREIGN KEY fk_dwr_deferred_work;
ALTER TABLE estimate_line_history DROP FOREIGN KEY fk_elh_changed_by;
ALTER TABLE estimate_line_history DROP FOREIGN KEY fk_elh_line;
ALTER TABLE estimate_lines DROP FOREIGN KEY fk_el_added_by;
ALTER TABLE estimate_lines DROP FOREIGN KEY fk_el_job;
ALTER TABLE estimate_lines DROP FOREIGN KEY fk_el_quote_group;
ALTER TABLE estimate_lines DROP FOREIGN KEY fk_el_response;
ALTER TABLE inspection_items DROP FOREIGN KEY fk_ii_section;
ALTER TABLE inspection_responses DROP FOREIGN KEY fk_ir_inspection;
ALTER TABLE inspection_responses DROP FOREIGN KEY fk_ir_item;
ALTER TABLE inspection_sections DROP FOREIGN KEY fk_is_template;
ALTER TABLE inspection_templates DROP FOREIGN KEY fk_it_created_by;
ALTER TABLE inspections DROP FOREIGN KEY fk_ins_job;
ALTER TABLE inspections DROP FOREIGN KEY fk_ins_technician;
ALTER TABLE inspections DROP FOREIGN KEY fk_ins_template;
ALTER TABLE integration_events DROP FOREIGN KEY fk_ie_integration;
ALTER TABLE job_status_history DROP FOREIGN KEY fk_jsh_changed_by;
ALTER TABLE job_status_history DROP FOREIGN KEY fk_jsh_job;
ALTER TABLE jobs DROP FOREIGN KEY fk_jobs_advisor;
ALTER TABLE jobs DROP FOREIGN KEY fk_jobs_customer;
ALTER TABLE jobs DROP FOREIGN KEY fk_jobs_technician;
ALTER TABLE jobs DROP FOREIGN KEY fk_jobs_vehicle;
ALTER TABLE media_files DROP FOREIGN KEY fk_mf_job;
ALTER TABLE media_files DROP FOREIGN KEY fk_mf_response;
ALTER TABLE media_files DROP FOREIGN KEY fk_mf_uploaded_by;
ALTER TABLE notifications DROP FOREIGN KEY fk_n_customer;
ALTER TABLE notifications DROP FOREIGN KEY fk_n_job;
ALTER TABLE notifications DROP FOREIGN KEY fk_nt_template;
ALTER TABLE quote_groups DROP FOREIGN KEY fk_qg_job;
ALTER TABLE refresh_tokens DROP FOREIGN KEY fk_rt_user;
ALTER TABLE settings DROP FOREIGN KEY fk_settings_updated_by;
ALTER TABLE users DROP FOREIGN KEY fk_users_role;
ALTER TABLE vehicle_service_history DROP FOREIGN KEY fk_vsh_job;
ALTER TABLE vehicle_service_history DROP FOREIGN KEY fk_vsh_vehicle;
ALTER TABLE vehicles DROP FOREIGN KEY fk_vehicles_customer;

-- Drop workshops and user_workshop_access (they're empty)
DROP TABLE IF EXISTS user_workshop_access;
DROP TABLE IF EXISTS workshops;

-- Convert all tables to utf8mb4_unicode_ci
ALTER TABLE approval_tokens CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE audit_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE authorisation_decisions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE booking_import_templates CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE customers CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE deferred_work CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE deferred_work_reminders CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE estimate_line_history CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE estimate_lines CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE inspection_items CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE inspection_responses CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE inspection_sections CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE inspection_templates CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE inspections CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE integration_events CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE integrations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE job_status_history CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE jobs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE labour_rates CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE media_files CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE notification_templates CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE notifications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE quote_groups CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE refresh_tokens CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE roles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE vehicle_service_history CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE vehicles CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;