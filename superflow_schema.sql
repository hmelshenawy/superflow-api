-- ============================================================
-- SuperFlow App — Full Database Schema
-- Regenerated: 2026-05-04 (from live MariaDB)
-- Database: superflow_app
-- Engine: MariaDB 11.4+ / InnoDB
-- Charset: utf8mb4 / Collation: utf8mb4_general_ci
-- Tables: 28
-- ============================================================

SET FOREIGN_KEY_CHECKS=0;

CREATE DATABASE IF NOT EXISTS `superflow_app` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `superflow_app`;

-- ============================================================
-- 1. AUTH & ROLES
-- ============================================================

CREATE TABLE `roles` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(60) DEFAULT NULL,
  `permissions` JSON DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL,
  `role_id` CHAR(36) DEFAULT NULL,
  `name` VARCHAR(120) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `employee_code` VARCHAR(20) DEFAULT NULL,
  `avatar_url` VARCHAR(500) DEFAULT NULL,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_role_id` (`role_id`),
  KEY `idx_users_email` (`email`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `refresh_tokens` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) DEFAULT NULL,
  `token_hash` VARCHAR(255) DEFAULT NULL,
  `device_info` VARCHAR(255) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `expires_at` DATETIME DEFAULT NULL,
  `revoked_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_rt_user_id` (`user_id`),
  KEY `idx_rt_expires` (`expires_at`),
  CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 2. CUSTOMERS & VEHICLES
-- ============================================================

CREATE TABLE `customers` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(120) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `preferred_contact` ENUM('phone','email','whatsapp','sms') DEFAULT 'phone',
  `language` VARCHAR(10) DEFAULT NULL,
  `dms_customer_id` VARCHAR(60) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customers_email` (`email`),
  KEY `idx_customers_phone` (`phone`),
  KEY `idx_customers_dms` (`dms_customer_id`),
  KEY `idx_customers_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `vehicles` (
  `id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) DEFAULT NULL,
  `vin` VARCHAR(17) DEFAULT NULL,
  `make` VARCHAR(60) DEFAULT NULL,
  `model` VARCHAR(60) DEFAULT NULL,
  `year` SMALLINT DEFAULT NULL,
  `plate` VARCHAR(20) DEFAULT NULL,
  `color` VARCHAR(40) DEFAULT NULL,
  `odometer_km` INT UNSIGNED DEFAULT NULL,
  `vehicle_type` ENUM('sedan','suv','coupe','hatchback','convertible','pickup','van','truck','motorcycle','other') DEFAULT NULL,
  `engine` VARCHAR(60) DEFAULT NULL,
  `dms_vehicle_id` VARCHAR(60) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vin` (`vin`),
  KEY `idx_vehicles_customer` (`customer_id`),
  KEY `idx_vehicles_vin` (`vin`),
  KEY `idx_vehicles_plate` (`plate`),
  CONSTRAINT `fk_vehicles_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 3. JOBS
-- ============================================================

CREATE TABLE `jobs` (
  `id` CHAR(36) NOT NULL,
  `job_number` VARCHAR(20) DEFAULT NULL,
  `customer_id` CHAR(36) DEFAULT NULL,
  `vehicle_id` CHAR(36) DEFAULT NULL,
  `advisor_id` CHAR(36) DEFAULT NULL,
  `technician_id` CHAR(36) DEFAULT NULL,
  `owner_code` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('booked','checking','estimate_sent','approved','in_progress','waiting_parts','quality_check','ready','closed','no_show') NOT NULL DEFAULT 'booked',
  `workshop_stage` ENUM('waiting_technician','diagnosis','estimate_prep','customer_approval','work_in_progress','final_test','quality_check','ready_handover') DEFAULT 'waiting_technician',
  `parts_status` ENUM('no_parts','order_parts','waiting_warehouse','backorder','parts_ready') DEFAULT 'no_parts',
  `customer_informed` TINYINT(1) DEFAULT 0,
  `is_customer_waiting` TINYINT(1) DEFAULT 0,
  `customer_sensitivity` VARCHAR(40) DEFAULT 'normal',
  `customer_concern` TEXT DEFAULT NULL,
  `internal_notes` TEXT DEFAULT NULL,
  `odometer_in` INT UNSIGNED DEFAULT NULL,
  `promised_at` DATETIME DEFAULT NULL,
  `arrived_at` DATETIME DEFAULT NULL,
  `dms_ro_number` VARCHAR(60) DEFAULT NULL,
  `dms_synced_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `invoiced_at` DATETIME DEFAULT NULL,
  `archived_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_number` (`job_number`),
  KEY `idx_jobs_customer` (`customer_id`),
  KEY `idx_jobs_vehicle` (`vehicle_id`),
  KEY `idx_jobs_advisor` (`advisor_id`),
  KEY `idx_jobs_technician` (`technician_id`),
  KEY `idx_jobs_status` (`status`),
  KEY `idx_jobs_created` (`created_at` DESC),
  KEY `idx_jobs_workshop_stage` (`workshop_stage`),
  KEY `idx_jobs_parts_status` (`parts_status`),
  KEY `idx_jobs_customer_waiting` (`is_customer_waiting`),
  KEY `idx_jobs_customer_sensitivity` (`customer_sensitivity`),
  KEY `idx_jobs_arrived_at` (`arrived_at`),
  KEY `idx_jobs_archived_at` (`archived_at`),
  CONSTRAINT `fk_jobs_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_jobs_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  CONSTRAINT `fk_jobs_advisor` FOREIGN KEY (`advisor_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_jobs_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 4. SERVICE & STATUS HISTORY
-- ============================================================

CREATE TABLE `vehicle_service_history` (
  `id` CHAR(36) NOT NULL,
  `vehicle_id` CHAR(36) DEFAULT NULL,
  `job_id` CHAR(36) DEFAULT NULL,
  `odometer_km` INT UNSIGNED DEFAULT NULL,
  `summary` TEXT DEFAULT NULL,
  `serviced_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vsh_vehicle` (`vehicle_id`),
  KEY `idx_vsh_job` (`job_id`),
  KEY `idx_vsh_serviced_at` (`serviced_at`),
  CONSTRAINT `fk_vsh_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  CONSTRAINT `fk_vsh_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `job_status_history` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) DEFAULT NULL,
  `from_status` VARCHAR(20) DEFAULT NULL,
  `to_status` VARCHAR(20) DEFAULT NULL,
  `changed_by` CHAR(36) DEFAULT NULL,
  `reason` TEXT DEFAULT NULL,
  `changed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_jsh_job` (`job_id`),
  KEY `idx_jsh_changed_at` (`changed_at`),
  CONSTRAINT `fk_jsh_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_jsh_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 5. INSPECTIONS
-- ============================================================

CREATE TABLE `inspection_templates` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(120) DEFAULT NULL,
  `vehicle_type` VARCHAR(20) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `is_default` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_by` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_it_vehicle_type` (`vehicle_type`),
  KEY `idx_it_is_default` (`is_default`),
  CONSTRAINT `fk_it_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `inspection_sections` (
  `id` CHAR(36) NOT NULL,
  `template_id` CHAR(36) DEFAULT NULL,
  `name` VARCHAR(80) DEFAULT NULL,
  `icon` VARCHAR(10) DEFAULT NULL,
  `sort_order` SMALLINT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_is_template` (`template_id`),
  KEY `idx_is_sort` (`template_id`, `sort_order`),
  CONSTRAINT `fk_is_template` FOREIGN KEY (`template_id`) REFERENCES `inspection_templates` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `inspection_items` (
  `id` CHAR(36) NOT NULL,
  `section_id` CHAR(36) DEFAULT NULL,
  `label` VARCHAR(180) DEFAULT NULL,
  `input_type` ENUM('pass_fail','yes_no','ok_warn_fail','number','text','toggle','photo','odometer','fuel_level') DEFAULT 'pass_fail',
  `options` JSON DEFAULT NULL,
  `unit` VARCHAR(20) DEFAULT NULL,
  `requires_photo` TINYINT(1) DEFAULT 0,
  `requires_note_on` VARCHAR(20) DEFAULT NULL,
  `help_text` TEXT DEFAULT NULL,
  `sort_order` SMALLINT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_ii_section` (`section_id`),
  KEY `idx_ii_sort` (`section_id`, `sort_order`),
  CONSTRAINT `fk_ii_section` FOREIGN KEY (`section_id`) REFERENCES `inspection_sections` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `inspections` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) DEFAULT NULL,
  `template_id` CHAR(36) DEFAULT NULL,
  `technician_id` CHAR(36) DEFAULT NULL,
  `status` ENUM('draft','in_progress','submitted','reviewed','approved') DEFAULT 'draft',
  `offline_draft` JSON DEFAULT NULL,
  `started_at` DATETIME DEFAULT NULL,
  `submitted_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_id` (`job_id`),
  KEY `idx_ins_job` (`job_id`),
  KEY `idx_ins_status` (`status`),
  CONSTRAINT `fk_ins_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_ins_template` FOREIGN KEY (`template_id`) REFERENCES `inspection_templates` (`id`),
  CONSTRAINT `fk_ins_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `inspection_responses` (
  `id` CHAR(36) NOT NULL,
  `inspection_id` CHAR(36) DEFAULT NULL,
  `item_id` CHAR(36) DEFAULT NULL,
  `value` VARCHAR(100) DEFAULT NULL,
  `urgency` ENUM('none','low','medium','high','critical') DEFAULT 'none',
  `tech_notes` TEXT DEFAULT NULL,
  `media_count` TINYINT DEFAULT 0,
  `recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_ir_inspection_item` (`inspection_id`, `item_id`),
  KEY `idx_ir_urgency` (`urgency`),
  CONSTRAINT `fk_ir_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`),
  CONSTRAINT `fk_ir_item` FOREIGN KEY (`item_id`) REFERENCES `inspection_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 6. MEDIA FILES
-- ============================================================

CREATE TABLE `media_files` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) DEFAULT NULL,
  `inspection_response_id` CHAR(36) DEFAULT NULL,
  `uploaded_by` CHAR(36) DEFAULT NULL,
  `s3_bucket` VARCHAR(100) DEFAULT NULL,
  `s3_key` VARCHAR(500) DEFAULT NULL,
  `file_type` ENUM('photo','video','document') DEFAULT 'photo',
  `mime_type` VARCHAR(60) DEFAULT NULL,
  `original_filename` VARCHAR(255) DEFAULT NULL,
  `size_bytes` BIGINT UNSIGNED DEFAULT NULL,
  `width_px` SMALLINT UNSIGNED DEFAULT NULL,
  `height_px` SMALLINT UNSIGNED DEFAULT NULL,
  `duration_sec` SMALLINT UNSIGNED DEFAULT NULL,
  `thumbnail_key` VARCHAR(500) DEFAULT NULL,
  `scan_status` ENUM('pending','clean','infected','failed') DEFAULT 'pending',
  `is_deleted` TINYINT(1) DEFAULT 0,
  `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_media_job` (`job_id`),
  KEY `idx_media_response` (`inspection_response_id`),
  KEY `idx_media_scan` (`scan_status`),
  CONSTRAINT `fk_mf_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_mf_response` FOREIGN KEY (`inspection_response_id`) REFERENCES `inspection_responses` (`id`),
  CONSTRAINT `fk_mf_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 7. PRICING & ESTIMATES
-- ============================================================

CREATE TABLE `estimate_lines` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) DEFAULT NULL,
  `inspection_response_id` CHAR(36) DEFAULT NULL,
  `quote_group_id` CHAR(36) DEFAULT NULL,
  `quote_group_title` VARCHAR(120) DEFAULT NULL,
  `type` ENUM('labour','part','sublet') NOT NULL,
  `description` TEXT DEFAULT NULL,
  `part_number` VARCHAR(60) DEFAULT NULL,
  `quantity` DECIMAL(8,2) DEFAULT 1.00,
  `unit_price` DECIMAL(10,2) DEFAULT NULL,
  `discount_pct` DECIMAL(5,2) DEFAULT 0.00,
  `tax_rate_pct` DECIMAL(5,2) DEFAULT 0.00,
  `line_total` DECIMAL(10,2) DEFAULT NULL,
  `tax_amount` DECIMAL(10,2) DEFAULT NULL,
  `is_recommended` TINYINT(1) DEFAULT 0,
  `sort_order` SMALLINT DEFAULT NULL,
  `added_by` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_el_job` (`job_id`),
  KEY `idx_el_type` (`type`),
  KEY `idx_el_recommended` (`is_recommended`),
  KEY `idx_el_quote_group` (`quote_group_id`),
  CONSTRAINT `fk_el_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_el_response` FOREIGN KEY (`inspection_response_id`) REFERENCES `inspection_responses` (`id`),
  CONSTRAINT `fk_el_added_by` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `estimate_line_history` (
  `id` CHAR(36) NOT NULL,
  `line_id` CHAR(36) DEFAULT NULL,
  `snapshot` JSON DEFAULT NULL,
  `changed_by` CHAR(36) DEFAULT NULL,
  `changed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_elh_line` (`line_id`),
  KEY `idx_elh_changed_at` (`changed_at`),
  CONSTRAINT `fk_elh_line` FOREIGN KEY (`line_id`) REFERENCES `estimate_lines` (`id`),
  CONSTRAINT `fk_elh_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 8. AUTHORISATION
-- ============================================================

CREATE TABLE `approval_tokens` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) DEFAULT NULL,
  `token_hash` VARCHAR(64) DEFAULT NULL,
  `channel` ENUM('email','sms','whatsapp','link') DEFAULT 'email',
  `sent_to` VARCHAR(255) DEFAULT NULL,
  `issued_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME DEFAULT NULL,
  `first_opened_at` DATETIME DEFAULT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `is_revoked` TINYINT(1) DEFAULT 0,
  `revoked_at` DATETIME DEFAULT NULL,
  `revoked_by` CHAR(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `fk_at_revoked_by` (`revoked_by`),
  KEY `idx_at_job` (`job_id`),
  KEY `idx_at_expires` (`expires_at`),
  CONSTRAINT `fk_at_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_at_revoked_by` FOREIGN KEY (`revoked_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `authorisation_decisions` (
  `id` CHAR(36) NOT NULL,
  `token_id` CHAR(36) DEFAULT NULL,
  `estimate_line_id` CHAR(36) DEFAULT NULL,
  `decision` ENUM('approved','declined','deferred') NOT NULL,
  `customer_comment` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `decided_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_ad_token_line` (`token_id`, `estimate_line_id`),
  KEY `fk_ad_line` (`estimate_line_id`),
  KEY `idx_ad_decision` (`decision`),
  CONSTRAINT `fk_ad_token` FOREIGN KEY (`token_id`) REFERENCES `approval_tokens` (`id`),
  CONSTRAINT `fk_ad_line` FOREIGN KEY (`estimate_line_id`) REFERENCES `estimate_lines` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 9. DEFERRED WORK
-- ============================================================

CREATE TABLE `deferred_work` (
  `id` CHAR(36) NOT NULL,
  `customer_id` CHAR(36) DEFAULT NULL,
  `vehicle_id` CHAR(36) DEFAULT NULL,
  `original_job_id` CHAR(36) DEFAULT NULL,
  `estimate_line_id` CHAR(36) DEFAULT NULL,
  `status` ENUM('pending','reminded','booked','closed','expired') DEFAULT 'pending',
  `urgency` ENUM('none','low','medium','high','critical') DEFAULT 'none',
  `estimated_value` DECIMAL(10,2) DEFAULT NULL,
  `remind_after` DATE DEFAULT NULL,
  `remind_count` TINYINT DEFAULT 0,
  `last_reminded_at` DATETIME DEFAULT NULL,
  `booked_job_id` CHAR(36) DEFAULT NULL,
  `closed_reason` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dw_customer` (`customer_id`),
  KEY `idx_dw_status_remind` (`status`, `remind_after`),
  KEY `idx_dw_remind_after` (`remind_after`),
  CONSTRAINT `fk_dw_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_dw_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  CONSTRAINT `fk_dw_original_job` FOREIGN KEY (`original_job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_dw_estimate_line` FOREIGN KEY (`estimate_line_id`) REFERENCES `estimate_lines` (`id`),
  CONSTRAINT `fk_dw_booked_job` FOREIGN KEY (`booked_job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `deferred_work_reminders` (
  `id` CHAR(36) NOT NULL,
  `deferred_work_id` CHAR(36) DEFAULT NULL,
  `channel` ENUM('email','sms','whatsapp','call') DEFAULT 'email',
  `sent_to` VARCHAR(255) DEFAULT NULL,
  `delivery_status` ENUM('pending','sent','delivered','failed','bounced') DEFAULT 'pending',
  `sent_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dwr_deferred_work` (`deferred_work_id`),
  KEY `idx_dwr_sent_at` (`sent_at`),
  CONSTRAINT `fk_dwr_deferred_work` FOREIGN KEY (`deferred_work_id`) REFERENCES `deferred_work` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 10. AUDIT & SETTINGS
-- ============================================================

CREATE TABLE `audit_logs` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) DEFAULT NULL,
  `entity_type` VARCHAR(60) DEFAULT NULL,
  `entity_id` CHAR(36) DEFAULT NULL,
  `action` VARCHAR(30) DEFAULT NULL,
  `old_values` JSON DEFAULT NULL,
  `new_values` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_al_entity` (`entity_type`, `entity_id`),
  KEY `idx_al_user` (`user_id`),
  KEY `idx_al_created` (`created_at` DESC),
  CONSTRAINT `fk_al_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `settings` (
  `id` CHAR(36) NOT NULL,
  `key` VARCHAR(100) DEFAULT NULL,
  `value` TEXT DEFAULT NULL,
  `value_type` ENUM('string','number','boolean','json') DEFAULT 'string',
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_by` CHAR(36) DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  CONSTRAINT `fk_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `labour_rates` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(80) DEFAULT NULL,
  `rate_per_hour` DECIMAL(8,2) DEFAULT NULL,
  `currency` CHAR(3) DEFAULT 'AED',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `booking_import_templates` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `mappings` JSON NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_bit_created_by` (`created_by`),
  KEY `idx_bit_active` (`is_active`),
  CONSTRAINT `fk_bit_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 11. INTEGRATIONS
-- ============================================================

CREATE TABLE `integrations` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(60) DEFAULT NULL,
  `type` ENUM('dms','accounting','sms','email','payment','storage','other') NOT NULL,
  `config` JSON DEFAULT NULL,
  `is_enabled` TINYINT(1) DEFAULT 0,
  `last_tested_at` DATETIME DEFAULT NULL,
  `last_test_status` ENUM('success','failed','unknown') DEFAULT 'unknown',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `integration_events` (
  `id` CHAR(36) NOT NULL,
  `integration_id` CHAR(36) DEFAULT NULL,
  `event_type` VARCHAR(60) DEFAULT NULL,
  `direction` ENUM('inbound','outbound') NOT NULL,
  `payload` JSON DEFAULT NULL,
  `response` JSON DEFAULT NULL,
  `status` ENUM('pending','success','failed','retrying') DEFAULT 'pending',
  `http_status` SMALLINT DEFAULT NULL,
  `attempt_count` TINYINT DEFAULT 1,
  `error_message` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ie_integration` (`integration_id`),
  KEY `idx_ie_status` (`status`),
  KEY `idx_ie_created` (`created_at` DESC),
  CONSTRAINT `fk_ie_integration` FOREIGN KEY (`integration_id`) REFERENCES `integrations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- 12. NOTIFICATIONS
-- ============================================================

CREATE TABLE `notification_templates` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(80) DEFAULT NULL,
  `event_type` VARCHAR(60) DEFAULT NULL,
  `channel` ENUM('email','sms','whatsapp','push') DEFAULT 'email',
  `subject` VARCHAR(255) DEFAULT NULL,
  `body` TEXT DEFAULT NULL,
  `language` VARCHAR(10) DEFAULT 'en',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `notifications` (
  `id` CHAR(36) NOT NULL,
  `template_id` CHAR(36) DEFAULT NULL,
  `job_id` CHAR(36) DEFAULT NULL,
  `customer_id` CHAR(36) DEFAULT NULL,
  `channel` ENUM('email','sms','whatsapp','push') DEFAULT 'email',
  `recipient` VARCHAR(255) DEFAULT NULL,
  `subject` VARCHAR(255) DEFAULT NULL,
  `body_rendered` TEXT DEFAULT NULL,
  `status` ENUM('queued','sent','delivered','failed','bounced') DEFAULT 'queued',
  `provider` VARCHAR(30) DEFAULT NULL,
  `provider_message_id` VARCHAR(120) DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `queued_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `sent_at` DATETIME DEFAULT NULL,
  `delivered_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_nt_template` (`template_id`),
  KEY `idx_n_job` (`job_id`),
  KEY `idx_n_customer` (`customer_id`),
  KEY `idx_n_status` (`status`),
  KEY `idx_n_queued` (`queued_at` DESC),
  CONSTRAINT `fk_nt_template` FOREIGN KEY (`template_id`) REFERENCES `notification_templates` (`id`),
  CONSTRAINT `fk_n_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`),
  CONSTRAINT `fk_n_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS=1;

-- ============================================================
-- SEED: Default roles
-- ============================================================

INSERT IGNORE INTO `roles` (`id`, `name`, `permissions`, `description`) VALUES
  (UUID(), 'admin', '["*"]', 'Full system access'),
  (UUID(), 'service_advisor', '["jobs:read","jobs:write","customers:read","customers:write","estimates:read","estimates:write","inspections:read","inspections:write","notifications:read"]', 'Service advisor role'),
  (UUID(), 'technician', '["inspections:read","inspections:write","jobs:read","media:write"]', 'Technician role'),
  (UUID(), 'receptionist', '["customers:read","customers:write","jobs:read","jobs:write"]', 'Receptionist role'),
  (UUID(), 'manager', '["jobs:read","jobs:write","customers:read","estimates:read","estimates:write","reports:read","settings:read","settings:write"]', 'Manager role');