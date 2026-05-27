ALTER TABLE `workshops`
  ADD COLUMN `product_mode` VARCHAR(20) NOT NULL DEFAULT 'WORKSHOP',
  ADD COLUMN `dms_integration_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `enabled_modules` LONGTEXT NULL,
  ADD COLUMN `package_name` VARCHAR(120) NULL DEFAULT 'PrioraFlow Workshop',
  ADD COLUMN `display_name` VARCHAR(120) NULL;

UPDATE `workshops`
SET
  `product_mode` = COALESCE(NULLIF(`product_mode`, ''), 'WORKSHOP'),
  `package_name` = COALESCE(`package_name`, 'PrioraFlow Workshop'),
  `enabled_modules` = COALESCE(`enabled_modules`, JSON_ARRAY(
    'appointments',
    'jobCards',
    'customers',
    'vehicles',
    'stock',
    'estimates',
    'invoicing',
    'technicianLoading',
    'wip',
    'operationalAnalytics'
  ));

CREATE INDEX `idx_workshops_product_mode` ON `workshops` (`product_mode`);
