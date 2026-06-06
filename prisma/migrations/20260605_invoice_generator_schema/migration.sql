-- Add branding and code fields to workshops
ALTER TABLE `workshops` ADD COLUMN `code` VARCHAR(20) NOT NULL DEFAULT '' AFTER `slug`;
ALTER TABLE `workshops` ADD UNIQUE INDEX `workshops_code_unique`(`code`);
ALTER TABLE `workshops` ADD COLUMN `logo_url` VARCHAR(255) NULL AFTER `display_name`;
ALTER TABLE `workshops` ADD COLUMN `vat_trn` VARCHAR(40) NULL AFTER `logo_url`;
ALTER TABLE `workshops` ADD COLUMN `footer_notes` TEXT NULL AFTER `vat_trn`;
ALTER TABLE `workshops` ADD COLUMN `terms_conditions` TEXT NULL AFTER `footer_notes`;

-- Create branches table
CREATE TABLE `branches` (
    `id` CHAR(36) NOT NULL,
    `workshop_id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    INDEX `idx_branches_workshop`(`workshop_id`),
    UNIQUE INDEX `idx_branches_workshop_code_unique`(`workshop_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add branch_id to jobs
ALTER TABLE `jobs` ADD COLUMN `branch_id` CHAR(36) NULL AFTER `technician_id`;
ALTER TABLE `jobs` ADD INDEX `idx_jobs_branch`(`branch_id`);
ALTER TABLE `jobs` ADD CONSTRAINT `fk_jobs_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- Create workshop_invoices table
CREATE TABLE `workshop_invoices` (
    `id` CHAR(36) NOT NULL,
    `workshop_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NULL,
    `customer_id` CHAR(36) NOT NULL,
    `vehicle_id` CHAR(36) NOT NULL,
    `job_id` CHAR(36) NULL,
    `created_by_user_id` CHAR(36) NOT NULL,
    `invoice_number` VARCHAR(50) NOT NULL,
    `invoice_year` INT NOT NULL,
    `invoice_serial_number` INT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
    `invoice_date` DATETIME(0) NOT NULL,
    `issued_at` DATETIME(0) NULL,
    `cancelled_at` DATETIME(0) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'AED',
    `vat_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.0500,
    `subtotal_cents` INT NOT NULL DEFAULT 0,
    `discount_cents` INT NOT NULL DEFAULT 0,
    `tax_cents` INT NOT NULL DEFAULT 0,
    `total_cents` INT NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `snapshot_customer_name` VARCHAR(120) NOT NULL,
    `snapshot_customer_phone` VARCHAR(40) NULL,
    `snapshot_customer_email` VARCHAR(120) NULL,
    `snapshot_vehicle_plate` VARCHAR(20) NULL,
    `snapshot_vehicle_vin` VARCHAR(40) NULL,
    `snapshot_vehicle_model` VARCHAR(80) NULL,
    `snapshot_vehicle_year` INT NULL,
    `workshop_code_snapshot` VARCHAR(20) NOT NULL,
    `branch_code_snapshot` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    INDEX `idx_workshop_invoices_workshop`(`workshop_id`),
    INDEX `idx_workshop_invoices_branch`(`branch_id`),
    INDEX `idx_workshop_invoices_customer`(`customer_id`),
    INDEX `idx_workshop_invoices_vehicle`(`vehicle_id`),
    INDEX `idx_workshop_invoices_job`(`job_id`),
    INDEX `idx_workshop_invoices_status`(`status`),
    INDEX `idx_workshop_invoices_invoice_date`(`invoice_date`),
    INDEX `idx_workshop_invoices_invoice_year`(`invoice_year`),
    UNIQUE INDEX `idx_workshop_invoices_number_unique`(`workshop_id`, `invoice_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `workshop_invoices` ADD CONSTRAINT `fk_workshop_invoices_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `workshop_invoices` ADD CONSTRAINT `fk_workshop_invoices_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `workshop_invoices` ADD CONSTRAINT `fk_workshop_invoices_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `workshop_invoices` ADD CONSTRAINT `fk_workshop_invoices_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `workshop_invoices` ADD CONSTRAINT `fk_workshop_invoices_job` FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `workshop_invoices` ADD CONSTRAINT `fk_workshop_invoices_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Create workshop_invoice_items table
CREATE TABLE `workshop_invoice_items` (
    `id` CHAR(36) NOT NULL,
    `workshop_invoice_id` CHAR(36) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `unit_price_cents` INT NOT NULL DEFAULT 0,
    `discount_cents` INT NOT NULL DEFAULT 0,
    `vat_applicable` BOOLEAN NOT NULL DEFAULT true,
    `vat_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.0500,
    `line_total_cents` INT NOT NULL DEFAULT 0,
    `line_vat_cents` INT NOT NULL DEFAULT 0,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    INDEX `idx_workshop_invoice_items_invoice`(`workshop_invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `workshop_invoice_items` ADD CONSTRAINT `fk_workshop_invoice_items_invoice` FOREIGN KEY (`workshop_invoice_id`) REFERENCES `workshop_invoices`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- Create workshop_invoice_sequences table
CREATE TABLE `workshop_invoice_sequences` (
    `id` CHAR(36) NOT NULL,
    `workshop_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NULL,
    `year` INT NOT NULL,
    `last_serial_number` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),

    INDEX `idx_workshop_invoice_sequences_workshop`(`workshop_id`),
    INDEX `idx_workshop_invoice_sequences_branch`(`branch_id`),
    INDEX `idx_workshop_invoice_sequences_year`(`year`),
    UNIQUE INDEX `idx_workshop_invoice_sequences_unique`(`workshop_id`, `branch_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `workshop_invoice_sequences` ADD CONSTRAINT `fk_workshop_invoice_sequences_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `workshop_invoice_sequences` ADD CONSTRAINT `fk_workshop_invoice_sequences_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- Add branches relation constraints
ALTER TABLE `branches` ADD CONSTRAINT `fk_branches_workshop` FOREIGN KEY (`workshop_id`) REFERENCES `workshops`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
