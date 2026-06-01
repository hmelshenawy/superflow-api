-- CreateTable
CREATE TABLE `technician_clock_events` (
    `id` VARCHAR(36) NOT NULL,
    `technician_id` VARCHAR(36) NOT NULL,
    `workshop_id` VARCHAR(36) NOT NULL,
    `event_type` ENUM('clock_in', 'clock_out', 'break_start', 'break_end') NOT NULL,
    `timestamp` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `note` TEXT NULL,
    `changed_by` VARCHAR(36) NULL,

    INDEX `idx_tce_technician`(`technician_id`),
    INDEX `idx_tce_workshop`(`workshop_id`),
    INDEX `idx_tce_timestamp`(`timestamp`),
    
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: technician
ALTER TABLE `technician_clock_events` ADD CONSTRAINT `fk_tce_technician` FOREIGN KEY (`technician_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey: workshop
ALTER TABLE `technician_clock_events` ADD CONSTRAINT `fk_tce_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey: changed_by
ALTER TABLE `technician_clock_events` ADD CONSTRAINT `fk_tce_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;