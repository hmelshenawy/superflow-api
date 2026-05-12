-- Add custom pricing and notes fields to subscriptions
ALTER TABLE `subscriptions` ADD COLUMN `price_override_cents` Int NULL;
ALTER TABLE `subscriptions` ADD COLUMN `discount_pct` Int NULL;
ALTER TABLE `subscriptions` ADD COLUMN `internal_notes` Text NULL;