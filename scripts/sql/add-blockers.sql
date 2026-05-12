-- Create blockers enums
ALTER TABLE superflow_app.blockers ADD COLUMN IF NOT EXISTS dummy_check INT;

-- Create enum types (MariaDB uses ENUM constraints)
-- Note: MariaDB doesn't support CREATE TYPE, so we use ENUM in column definitions

-- Create blockers table
CREATE TABLE IF NOT EXISTS superflow_app.blockers (
  id CHAR(36) NOT NULL,
  job_id CHAR(36) NOT NULL,
  type ENUM('parts', 'customer_approval', 'workshop_approval', 'technician_unavailable', 'customer_decision', 'other') NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  status ENUM('active', 'resolved', 'dismissed') NOT NULL DEFAULT 'active',
  blocked_by CHAR(36) NULL,
  resolved_by CHAR(36) NULL,
  resolved_at DATETIME(0) NULL,
  resolution_note TEXT NULL,
  created_at DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP,
  workshop_id CHAR(36) NULL,

  PRIMARY KEY (id),
  INDEX idx_blockers_job (job_id),
  INDEX idx_blockers_status (status),
  INDEX idx_blockers_workshop (workshop_id),
  INDEX idx_blockers_severity (severity),

  CONSTRAINT fk_blockers_job FOREIGN KEY (job_id) REFERENCES superflow_app.jobs(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_blockers_blocked_by FOREIGN KEY (blocked_by) REFERENCES superflow_app.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_blockers_resolved_by FOREIGN KEY (resolved_by) REFERENCES superflow_app.users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_blockers_workshop FOREIGN KEY (workshop_id) REFERENCES superflow_app.workshops(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add blockers permissions to roles
UPDATE roles SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'blockers:read')
WHERE name IN ('admin', 'manager', 'service_advisor', 'workshop_teamleader', 'technician', 'platform_admin')
AND JSON_CONTAINS(permissions, '"blockers:read"') = 0;

UPDATE roles SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'blockers:manage')
WHERE name IN ('admin', 'manager', 'service_advisor', 'workshop_teamleader', 'platform_admin')
AND JSON_CONTAINS(permissions, '"blockers:manage"') = 0;