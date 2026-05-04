-- ============================================================
-- Migration: 2026-05-04_quote_groups
-- Description: Create quote_groups table, migrate data, add FK
-- ============================================================

-- 1. Create the quote_groups table
CREATE TABLE `quote_groups` (
  `id` CHAR(36) NOT NULL,
  `job_id` CHAR(36) DEFAULT NULL,
  `title` VARCHAR(120) DEFAULT NULL,
  `sort_order` SMALLINT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_qg_job` (`job_id`),
  CONSTRAINT `fk_qg_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Migrate existing quote_group data from estimate_lines
INSERT INTO quote_groups (id, job_id, title, sort_order)
SELECT DISTINCT
  el.quote_group_id,
  el.job_id,
  MAX(el.quote_group_title),
  0
FROM estimate_lines el
WHERE el.quote_group_id IS NOT NULL AND el.quote_group_id != ''
GROUP BY el.quote_group_id, el.job_id;

-- 3. Replace plain index with FK-backed index
ALTER TABLE estimate_lines DROP INDEX idx_el_quote_group;
ALTER TABLE estimate_lines ADD CONSTRAINT fk_el_quote_group
  FOREIGN KEY (quote_group_id) REFERENCES quote_groups (id);
CREATE INDEX idx_el_quote_group ON estimate_lines (quote_group_id);