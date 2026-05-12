-- Add 'jobs' feature key to plan_features for each plan tier
-- This enables usage metering for job creation with monthly ceilings

-- Free trial: unlimited during trial
INSERT INTO plan_features (id, plan_id, feature_key, is_included, ceiling, overage_unit_cents) VALUES
  (UUID(), 'free_trial', 'jobs', TRUE, NULL, 0)
ON DUPLICATE KEY UPDATE
  is_included = VALUES(is_included),
  ceiling = VALUES(ceiling),
  overage_unit_cents = VALUES(overage_unit_cents);

-- Starter: 50 jobs/month
INSERT INTO plan_features (id, plan_id, feature_key, is_included, ceiling, overage_unit_cents) VALUES
  (UUID(), 'starter', 'jobs', TRUE, 50, 0)
ON DUPLICATE KEY UPDATE
  is_included = VALUES(is_included),
  ceiling = VALUES(ceiling),
  overage_unit_cents = VALUES(overage_unit_cents);

-- Professional: 200 jobs/month
INSERT INTO plan_features (id, plan_id, feature_key, is_included, ceiling, overage_unit_cents) VALUES
  (UUID(), 'professional', 'jobs', TRUE, 200, 0)
ON DUPLICATE KEY UPDATE
  is_included = VALUES(is_included),
  ceiling = VALUES(ceiling),
  overage_unit_cents = VALUES(overage_unit_cents);

-- Enterprise: unlimited
INSERT INTO plan_features (id, plan_id, feature_key, is_included, ceiling, overage_unit_cents) VALUES
  (UUID(), 'enterprise', 'jobs', TRUE, NULL, 0)
ON DUPLICATE KEY UPDATE
  is_included = VALUES(is_included),
  ceiling = VALUES(ceiling),
  overage_unit_cents = VALUES(overage_unit_cents);