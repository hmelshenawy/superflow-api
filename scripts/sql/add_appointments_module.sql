-- Appointments module schema for SuperFlow / PrioraFlow Workshop.
-- Run against superflow_app before `npx prisma generate` and before seeding templates.

CREATE TABLE IF NOT EXISTS job_type_templates (
  id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(60) NOT NULL,
  default_duration_min INT NOT NULL,
  color_hex VARCHAR(7) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_jtt_category (category),
  KEY idx_jtt_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_types (
  id CHAR(36) NOT NULL,
  workshop_id CHAR(36) NULL,
  template_id CHAR(36) NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(60) NULL,
  duration_min INT NOT NULL,
  color_hex VARCHAR(7) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_job_types_workshop_template (workshop_id, template_id),
  KEY idx_job_types_workshop (workshop_id),
  KEY idx_job_types_template (template_id),
  KEY idx_job_types_category (category),
  KEY idx_job_types_active (is_active),
  CONSTRAINT fk_job_types_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_job_types_template FOREIGN KEY (template_id) REFERENCES job_type_templates(id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_config (
  id CHAR(36) NOT NULL,
  workshop_id CHAR(36) NULL,
  day_of_week TINYINT NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  slot_duration_min INT NOT NULL DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_schedule_config_workshop_day (workshop_id, day_of_week),
  KEY idx_schedule_config_workshop (workshop_id),
  CONSTRAINT fk_schedule_config_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_breaks (
  id CHAR(36) NOT NULL,
  workshop_id CHAR(36) NULL,
  day_of_week TINYINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label VARCHAR(60) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_schedule_breaks_workshop_day (workshop_id, day_of_week),
  CONSTRAINT fk_schedule_breaks_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS holidays (
  id CHAR(36) NOT NULL,
  workshop_id CHAR(36) NULL,
  date DATE NOT NULL,
  label VARCHAR(100) NULL,
  is_full_day BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_holidays_workshop_date (workshop_id, date),
  CONSTRAINT fk_holidays_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_members (
  id CHAR(36) NOT NULL,
  workshop_id CHAR(36) NULL,
  user_id CHAR(36) NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('advisor','technician','both') NOT NULL DEFAULT 'advisor',
  working_days JSON NOT NULL,
  max_concurrent_jobs TINYINT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_staff_members_workshop_user (workshop_id, user_id),
  KEY idx_staff_members_workshop (workshop_id),
  KEY idx_staff_members_user (user_id),
  KEY idx_staff_members_active (is_active),
  CONSTRAINT fk_staff_members_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_staff_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_leaves (
  id CHAR(36) NOT NULL,
  staff_id CHAR(36) NOT NULL,
  workshop_id CHAR(36) NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_staff_leaves_staff (staff_id),
  KEY idx_staff_leaves_workshop_dates (workshop_id, start_date, end_date),
  CONSTRAINT fk_staff_leaves_staff FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_staff_leaves_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id CHAR(36) NOT NULL,
  workshop_id CHAR(36) NULL,
  staff_id CHAR(36) NOT NULL,
  job_type_id CHAR(36) NULL,
  customer_id CHAR(36) NULL,
  work_order_id CHAR(36) NULL,
  title VARCHAR(200) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  duration_min INT NOT NULL,
  status ENUM('scheduled','waiting','in_progress','on_hold','done','cancelled') NOT NULL DEFAULT 'scheduled',
  notes TEXT NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_appointments_workshop_start (workshop_id, start_time),
  KEY idx_appointments_staff_start (staff_id, start_time),
  KEY idx_appointments_customer (customer_id),
  KEY idx_appointments_job_type (job_type_id),
  CONSTRAINT fk_appointments_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_appointments_staff FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_appointments_job_type FOREIGN KEY (job_type_id) REFERENCES job_types(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT fk_appointments_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT fk_appointments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT
  -- work_order_id intentionally has no FK until a work_orders table/module exists.
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Idempotent upgrade for deployments where staff_members already existed before user linkage.
SET @staff_user_col_missing := (
  SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_members' AND COLUMN_NAME = 'user_id'
);
SET @sql := IF(@staff_user_col_missing, 'ALTER TABLE staff_members ADD COLUMN user_id CHAR(36) NULL AFTER workshop_id', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @staff_user_idx_missing := (
  SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_members' AND INDEX_NAME = 'idx_staff_members_user'
);
SET @sql := IF(@staff_user_idx_missing, 'ALTER TABLE staff_members ADD KEY idx_staff_members_user (user_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @staff_user_unique_missing := (
  SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_members' AND INDEX_NAME = 'uniq_staff_members_workshop_user'
);
SET @sql := IF(@staff_user_unique_missing, 'ALTER TABLE staff_members ADD UNIQUE KEY uniq_staff_members_workshop_user (workshop_id, user_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @staff_user_fk_missing := (
  SELECT COUNT(*) = 0 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_members' AND CONSTRAINT_NAME = 'fk_staff_members_user'
);
SET @sql := IF(@staff_user_fk_missing, 'ALTER TABLE staff_members ADD CONSTRAINT fk_staff_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE RESTRICT', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
