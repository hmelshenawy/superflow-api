-- Bridge operational job parts to quote-builder concerns and estimate lines.
-- New parts-team additions start as memo rows and can later be reserved/used/cancelled.

ALTER TABLE job_parts
  ADD COLUMN IF NOT EXISTS estimate_line_id CHAR(36) NULL AFTER source,
  ADD COLUMN IF NOT EXISTS concern_id       CHAR(36) NULL AFTER estimate_line_id;

ALTER TABLE job_parts
  MODIFY COLUMN status ENUM('memo','reserved','used','returned','cancelled') NOT NULL DEFAULT 'reserved';

SET @idx_jp_estimate_line := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE job_parts ADD INDEX idx_jp_estimate_line (estimate_line_id)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'job_parts'
    AND index_name = 'idx_jp_estimate_line'
);
PREPARE stmt FROM @idx_jp_estimate_line;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_jp_concern := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE job_parts ADD INDEX idx_jp_concern (concern_id)',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'job_parts'
    AND index_name = 'idx_jp_concern'
);
PREPARE stmt FROM @idx_jp_concern;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_jp_estimate_line := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE job_parts ADD CONSTRAINT fk_jp_estimate_line FOREIGN KEY (estimate_line_id) REFERENCES estimate_lines(id) ON DELETE SET NULL ON UPDATE RESTRICT',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'job_parts'
    AND constraint_name = 'fk_jp_estimate_line'
);
PREPARE stmt FROM @fk_jp_estimate_line;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_jp_concern := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE job_parts ADD CONSTRAINT fk_jp_concern FOREIGN KEY (concern_id) REFERENCES job_concerns(id) ON DELETE SET NULL ON UPDATE RESTRICT',
    'SELECT 1'
  )
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'job_parts'
    AND constraint_name = 'fk_jp_concern'
);
PREPARE stmt FROM @fk_jp_concern;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
