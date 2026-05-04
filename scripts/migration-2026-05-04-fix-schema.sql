-- ============================================================
-- Migration: 2026-05-04_fix_schema_issues
-- Description: Fix collation mismatch, add missing indexes
-- ============================================================

-- 1. Fix collation on booking_import_templates (was utf8mb4_unicode_ci, should be utf8mb4_general_ci)
ALTER TABLE `booking_import_templates`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- 2. Add missing index on jobs.archived_at
CREATE INDEX IF NOT EXISTS `idx_jobs_archived_at` ON `jobs` (`archived_at`);

-- 3. Add missing index on customers.name
CREATE INDEX IF NOT EXISTS `idx_customers_name` ON `customers` (`name`);

-- 4. Add missing index on deferred_work.remind_after (standalone, for "what's due" queries)
CREATE INDEX IF NOT EXISTS `idx_dw_remind_after` ON `deferred_work` (`remind_after`);