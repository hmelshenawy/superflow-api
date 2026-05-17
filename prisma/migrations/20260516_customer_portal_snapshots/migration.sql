CREATE TABLE IF NOT EXISTS `job_concerns` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) NOT NULL,
  `code` VARCHAR(10) NULL,
  `title` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `status` VARCHAR(40) NULL DEFAULT 'reviewing',
  `technician_finding` TEXT NULL,
  `work_note` TEXT NULL,
  `qc_note` TEXT NULL,
  `customer_decision` VARCHAR(20) NULL,
  `sort_order` SMALLINT NULL DEFAULT 0,
  `inspection_response_id` CHAR(36) NULL,
  `workshop_id` CHAR(36) NULL,
  `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  INDEX `idx_jc_job` (`job_id`),
  INDEX `idx_jc_response` (`inspection_response_id`),
  INDEX `idx_jc_workshop` (`workshop_id`),
  CONSTRAINT `fk_jc_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_jc_response` FOREIGN KEY (`inspection_response_id`) REFERENCES `inspection_responses` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_jc_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `estimate_lines` ADD COLUMN IF NOT EXISTS `concern_id` CHAR(36) NULL;
CREATE INDEX IF NOT EXISTS `idx_el_concern` ON `estimate_lines` (`concern_id`);
ALTER TABLE `estimate_lines` ADD CONSTRAINT `fk_el_concern` FOREIGN KEY (`concern_id`) REFERENCES `job_concerns` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

CREATE TABLE IF NOT EXISTS `customer_portal_snapshots` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) NOT NULL,
  `version` INT NOT NULL,
  `stage` VARCHAR(40) NULL,
  `payload_json` LONGTEXT NOT NULL,
  `release_note` TEXT NULL,
  `released_by` CHAR(36) NULL,
  `workshop_id` CHAR(36) NULL,
  `released_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_cps_job_version` (`job_id`, `version`),
  INDEX `idx_cps_job` (`job_id`),
  INDEX `idx_cps_workshop` (`workshop_id`),
  INDEX `idx_cps_released_at` (`released_at`),
  CONSTRAINT `fk_cps_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_cps_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
