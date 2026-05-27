-- CreateTable
CREATE TABLE `qc_checklist_templates` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NULL,
    `description` TEXT NULL,
    `is_default` BOOLEAN NULL DEFAULT false,
    `is_active` BOOLEAN NULL DEFAULT true,
    `created_by` CHAR(36) NULL,
    `workshop_id` CHAR(36) NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX `fk_qct_created_by`(`created_by`),
    INDEX `idx_qct_is_default`(`is_default`),
    INDEX `idx_qct_workshop`(`workshop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qc_checklist_sections` (
    `id` CHAR(36) NOT NULL,
    `template_id` CHAR(36) NULL,
    `workshop_id` CHAR(36) NULL,
    `name` VARCHAR(80) NULL,
    `icon` VARCHAR(10) NULL,
    `sort_order` SMALLINT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,

    INDEX `idx_qcs_sort`(`template_id`, `sort_order`),
    INDEX `idx_qcs_template`(`template_id`),
    INDEX `idx_qcs_workshop`(`workshop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qc_checklist_items` (
    `id` CHAR(36) NOT NULL,
    `section_id` CHAR(36) NULL,
    `workshop_id` CHAR(36) NULL,
    `label` VARCHAR(180) NULL,
    `input_type` ENUM('pass_fail', 'yes_no', 'ok_fail', 'photo', 'text') NULL DEFAULT 'pass_fail',
    `requires_photo` BOOLEAN NULL DEFAULT false,
    `requires_note_on_fail` BOOLEAN NULL DEFAULT false,
    `help_text` TEXT NULL,
    `sort_order` SMALLINT NULL,
    `is_active` BOOLEAN NULL DEFAULT true,

    INDEX `idx_qci_section`(`section_id`),
    INDEX `idx_qci_sort`(`section_id`, `sort_order`),
    INDEX `idx_qci_workshop`(`workshop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qc_checklists` (
    `id` CHAR(36) NOT NULL,
    `job_id` CHAR(36) NULL,
    `template_id` CHAR(36) NULL,
    `checker_id` CHAR(36) NULL,
    `status` ENUM('draft', 'in_progress', 'submitted', 'approved') NULL DEFAULT 'draft',
    `overall_result` ENUM('pass', 'fail', 'na') NULL,
    `workshop_id` CHAR(36) NULL,
    `started_at` DATETIME(0) NULL,
    `submitted_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX `qc_job_id`(`job_id`),
    INDEX `fk_qc_checker`(`checker_id`),
    INDEX `fk_qc_template`(`template_id`),
    INDEX `idx_qc_job`(`job_id`),
    INDEX `idx_qc_status`(`status`),
    INDEX `idx_qc_workshop`(`workshop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qc_checklist_responses` (
    `id` CHAR(36) NOT NULL,
    `checklist_id` CHAR(36) NULL,
    `item_id` CHAR(36) NULL,
    `workshop_id` CHAR(36) NULL,
    `value` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `media_count` TINYINT NULL DEFAULT 0,
    `recorded_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX `idx_qcr_checklist_item`(`checklist_id`, `item_id`),
    INDEX `fk_qcr_item`(`item_id`),
    INDEX `idx_qcr_workshop`(`workshop_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `qc_checklist_templates` ADD CONSTRAINT `fk_qct_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklist_templates` ADD CONSTRAINT `fk_qct_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklist_sections` ADD CONSTRAINT `fk_qcs_template` FOREIGN KEY (`template_id`) REFERENCES `qc_checklist_templates`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklist_sections` ADD CONSTRAINT `fk_qcs_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklist_items` ADD CONSTRAINT `fk_qci_section` FOREIGN KEY (`section_id`) REFERENCES `qc_checklist_sections`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklist_items` ADD CONSTRAINT `fk_qci_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklists` ADD CONSTRAINT `fk_qc_job` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklists` ADD CONSTRAINT `fk_qc_checker` FOREIGN KEY (`checker_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklists` ADD CONSTRAINT `fk_qc_template` FOREIGN KEY (`template_id`) REFERENCES `qc_checklist_templates`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklists` ADD CONSTRAINT `fk_qc_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklist_responses` ADD CONSTRAINT `fk_qcr_checklist` FOREIGN KEY (`checklist_id`) REFERENCES `qc_checklists`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklist_responses` ADD CONSTRAINT `fk_qcr_item` FOREIGN KEY (`item_id`) REFERENCES `qc_checklist_items`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `qc_checklist_responses` ADD CONSTRAINT `fk_qcr_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey: media_files -> qc_checklist_responses
ALTER TABLE `media_files` ADD COLUMN `qc_checklist_response_id` CHAR(36) NULL;
ALTER TABLE `media_files` ADD CONSTRAINT `fk_mf_qc_response` FOREIGN KEY (`qc_checklist_response_id`) REFERENCES `qc_checklist_responses`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX `idx_media_qc_response` ON `media_files`(`qc_checklist_response_id`);