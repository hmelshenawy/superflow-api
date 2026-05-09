CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(60) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  price_monthly_cents INT NULL DEFAULT 0,
  currency VARCHAR(3) NULL DEFAULT 'AED',
  max_users INT NULL,
  max_jobs_per_month INT NULL,
  max_workshops INT NULL DEFAULT 1,
  is_active BOOLEAN NULL DEFAULT TRUE,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workshop_id CHAR(36) NOT NULL,
  plan_id VARCHAR(60) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'trialing',
  trial_ends_at DATETIME NULL,
  current_period_starts_at DATETIME NULL,
  current_period_ends_at DATETIME NULL,
  stripe_customer_id VARCHAR(120) NULL,
  stripe_subscription_id VARCHAR(120) NULL,
  cancel_at_period_end BOOLEAN NULL DEFAULT FALSE,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subscriptions_workshop (workshop_id),
  INDEX idx_subscriptions_plan (plan_id),
  INDEX idx_subscriptions_status (status),
  INDEX idx_subscriptions_trial_ends (trial_ends_at),
  CONSTRAINT fk_subscriptions_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO plans (id, name, description, price_monthly_cents, currency, max_users, max_jobs_per_month, max_workshops, is_active)
VALUES
  ('free_trial', '14-day Free Trial', 'Temporary full-access trial for new workshops.', 0, 'AED', 10, NULL, 1, TRUE),
  ('starter', 'Starter', 'Small workshop plan.', 49000, 'AED', 5, 300, 1, TRUE),
  ('pro', 'Pro', 'Growing service center plan.', 99000, 'AED', 20, 1500, 1, TRUE),
  ('enterprise', 'Enterprise', 'Multi-branch custom plan.', NULL, 'AED', NULL, NULL, NULL, TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  price_monthly_cents = VALUES(price_monthly_cents),
  currency = VALUES(currency),
  max_users = VALUES(max_users),
  max_jobs_per_month = VALUES(max_jobs_per_month),
  max_workshops = VALUES(max_workshops),
  is_active = VALUES(is_active);
