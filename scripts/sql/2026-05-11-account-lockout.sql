-- ============================================================
-- PrioraFlow: Account Lockout Mechanism
-- Date: 2026-05-11
-- Adds: failed_login_attempts, locked_until columns to users
-- ============================================================

ALTER TABLE `users`
  ADD COLUMN `failed_login_attempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN `locked_until` DATETIME(0) DEFAULT NULL;

-- Reset any existing lockout state
UPDATE `users` SET `failed_login_attempts` = 0, `locked_until` = NULL WHERE `failed_login_attempts` != 0 OR `locked_until` IS NOT NULL;