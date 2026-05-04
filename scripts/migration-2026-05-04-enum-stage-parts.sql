-- ============================================================
-- Migration: 2026-05-04_enum_stage_parts
-- Description: Convert workshop_stage and parts_status from VARCHAR to ENUM
-- ============================================================

-- 1. Migrate legacy values to canonical values
UPDATE jobs SET workshop_stage = 'waiting_technician' WHERE workshop_stage = 'received';
UPDATE jobs SET workshop_stage = 'customer_approval' WHERE workshop_stage = 'advisor_review';
UPDATE jobs SET workshop_stage = NULL WHERE workshop_stage = 'parts_check';
UPDATE jobs SET parts_status = 'no_parts' WHERE parts_status IS NULL OR parts_status = '';

-- 2. Convert workshop_stage to ENUM
ALTER TABLE jobs
  MODIFY COLUMN workshop_stage ENUM(
    'waiting_technician','diagnosis','estimate_prep',
    'customer_approval','work_in_progress','final_test',
    'quality_check','ready_handover'
  ) DEFAULT 'waiting_technician';

-- 3. Convert parts_status to ENUM
ALTER TABLE jobs
  MODIFY COLUMN parts_status ENUM(
    'no_parts','order_parts','waiting_warehouse','backorder','parts_ready'
  ) DEFAULT 'no_parts';