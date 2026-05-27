-- AlterTable: add advisor_decision and advisor_decision_note to job_concerns
ALTER TABLE `job_concerns` ADD COLUMN `advisor_decision` VARCHAR(20) NULL,
                         ADD COLUMN `advisor_decision_note` TEXT NULL;

-- CreateTable: approval_reset_audit
CREATE TABLE `approval_reset_audit` (
    `id` CHAR(36) NOT NULL,
    `concern_id` CHAR(36) NOT NULL,
    `job_id` CHAR(36) NULL,
    `reset_by` CHAR(36) NULL,
    `reason` TEXT NOT NULL,
    `lines_cleared` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX `idx_ara_concern` (`concern_id`),
    INDEX `idx_ara_job` (`job_id`),
    INDEX `fk_ara_user` (`reset_by`),

    CONSTRAINT `fk_ara_concern` FOREIGN KEY (`concern_id`) REFERENCES `job_concerns`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT `fk_ara_job` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT `fk_ara_user` FOREIGN KEY (`reset_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;