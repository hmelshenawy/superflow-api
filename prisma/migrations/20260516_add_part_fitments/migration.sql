CREATE TABLE IF NOT EXISTS `part_fitments` (
  `id` CHAR(36) NOT NULL,
  `part_id` CHAR(36) NOT NULL,
  `make` VARCHAR(80) NOT NULL,
  `model` VARCHAR(120) NULL,
  `variant` VARCHAR(120) NULL,
  `engine` VARCHAR(120) NULL,
  `year_from` SMALLINT NULL,
  `year_to` SMALLINT NULL,
  `notes` TEXT NULL,
  `workshop_id` CHAR(36) NULL,
  `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

  PRIMARY KEY (`id`),
  INDEX `idx_part_fitments_part` (`part_id`),
  INDEX `idx_part_fitments_workshop` (`workshop_id`),
  INDEX `idx_part_fitments_make_model` (`make`, `model`),
  INDEX `idx_part_fitments_years` (`year_from`, `year_to`),
  CONSTRAINT `fk_part_fitments_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_part_fitments_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
