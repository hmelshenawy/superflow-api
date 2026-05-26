-- Support catalog-linked and ad-hoc job parts.
-- Ad-hoc parts are free-text entries and do not require a parts master row or warehouse stock.

ALTER TABLE job_parts MODIFY COLUMN part_id CHAR(36) NULL;

ALTER TABLE job_parts MODIFY COLUMN warehouse_id CHAR(36) NULL;

ALTER TABLE job_parts
  ADD COLUMN IF NOT EXISTS part_name   VARCHAR(180) NULL AFTER part_id,
  ADD COLUMN IF NOT EXISTS part_number VARCHAR(60)  NULL AFTER part_name,
  ADD COLUMN IF NOT EXISTS source      ENUM('catalog','adhoc') NOT NULL
                                       DEFAULT 'catalog' AFTER part_number;

UPDATE job_parts SET source = 'catalog' WHERE source IS NULL;
