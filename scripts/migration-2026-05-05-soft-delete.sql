-- Add is_deleted soft-delete flag to jobs and vehicles.
-- This allows the application to soft-delete records instead of hard-deleting them,
-- preserving referential integrity for historical data.

ALTER TABLE jobs ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER archived_at;
ALTER TABLE vehicles ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER dms_vehicle_id;

CREATE INDEX idx_jobs_is_deleted ON jobs (is_deleted);
CREATE INDEX idx_vehicles_is_deleted ON vehicles (is_deleted);