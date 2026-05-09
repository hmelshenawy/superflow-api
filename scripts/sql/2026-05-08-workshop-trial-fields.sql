ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS plan_id VARCHAR(60) NULL DEFAULT 'free_trial' AFTER is_active,
  ADD COLUMN IF NOT EXISTS trial_ends_at DATETIME NULL AFTER plan_id;

UPDATE workshops
SET plan_id = COALESCE(plan_id, 'free_trial')
WHERE plan_id IS NULL;
