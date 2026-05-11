-- ============================================================
-- PrioraFlow: Subscription Package Redesign
-- Date: 2026-05-11
-- Adds: plan_features, plan_regions, plan_add_ons,
--       plan_add_on_prices, usage_records tables
-- Alters: subscriptions, workshops, invoice_items
-- Seeds: new plan tiers, features, regional pricing, add-ons
-- ============================================================

-- ----------------------------------------------------------
-- 1. NEW TABLES
-- ----------------------------------------------------------

CREATE TABLE IF NOT EXISTS plan_features (
  id                  CHAR(36)     NOT NULL PRIMARY KEY,
  plan_id             VARCHAR(60)  NOT NULL,
  feature_key         VARCHAR(80)  NOT NULL,
  is_included         BOOLEAN      NOT NULL DEFAULT FALSE,
  ceiling             INT          NULL,
  overage_unit_cents  INT          NOT NULL DEFAULT 0,
  created_at          DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_plan_feature (plan_id, feature_key),
  INDEX idx_pf_plan (plan_id),
  INDEX idx_pf_feature (feature_key),
  CONSTRAINT fk_pf_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plan_regions (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  plan_id               VARCHAR(60)  NOT NULL,
  region                VARCHAR(10)  NOT NULL,
  currency              CHAR(3)      NOT NULL DEFAULT 'USD',
  price_monthly_cents   INT          NOT NULL DEFAULT 0,
  display_name          VARCHAR(120) NULL,
  created_at            DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_plan_region (plan_id, region),
  INDEX idx_pr_plan (plan_id),
  CONSTRAINT fk_pr_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plan_add_ons (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  slug            VARCHAR(60)  NOT NULL,
  name            VARCHAR(120) NOT NULL,
  description     TEXT         NULL,
  pricing_model   VARCHAR(20)  NOT NULL DEFAULT 'flat',
  created_at      DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_addon_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plan_add_on_prices (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  add_on_id             CHAR(36)     NOT NULL,
  region                VARCHAR(10)  NOT NULL,
  currency              CHAR(3)      NOT NULL DEFAULT 'USD',
  price_per_unit_cents  INT          NOT NULL DEFAULT 0,
  created_at            DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_addon_region (add_on_id, region),
  INDEX idx_aop_addon (add_on_id),
  CONSTRAINT fk_aop_addon FOREIGN KEY (add_on_id) REFERENCES plan_add_ons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS usage_records (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  workshop_id     CHAR(36)     NOT NULL,
  feature_key     VARCHAR(80)  NOT NULL,
  period          CHAR(7)      NOT NULL,
  count           INT          NOT NULL DEFAULT 0,
  created_at      DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME(0)  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_usage_workshop_feature_period (workshop_id, feature_key, period),
  INDEX idx_usage_workshop_period (workshop_id, period),
  CONSTRAINT fk_ur_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. ALTER EXISTING TABLES
-- ----------------------------------------------------------

-- Subscriptions: add region, additional_locations, billing_model
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS region               VARCHAR(10)  NULL DEFAULT 'gcc' AFTER plan_id,
  ADD COLUMN IF NOT EXISTS additional_locations  INT          NULL DEFAULT 0 AFTER region,
  ADD COLUMN IF NOT EXISTS billing_model         VARCHAR(20)  NULL DEFAULT 'flat' AFTER additional_locations;

-- Workshops: add region
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS region VARCHAR(10) NULL DEFAULT 'gcc' AFTER timezone;

-- Invoice items: add feature_key, type, period, add_on_id
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS feature_key  VARCHAR(80)  NULL AFTER total_cents,
  ADD COLUMN IF NOT EXISTS type         VARCHAR(20)  NOT NULL DEFAULT 'plan' AFTER feature_key,
  ADD COLUMN IF NOT EXISTS period       CHAR(7)      NULL AFTER type,
  ADD COLUMN IF NOT EXISTS add_on_id    CHAR(36)     NULL AFTER period;

-- ----------------------------------------------------------
-- 3. DEACTIVATE OLD PLANS, INSERT NEW ONES
-- ----------------------------------------------------------

-- Deactivate old starter and pro plans (keep free_trial active)
UPDATE plans SET is_active = FALSE WHERE id IN ('starter', 'pro');

-- Insert new plan tiers
INSERT INTO plans (id, name, description, price_monthly_cents, currency, is_active) VALUES
  ('starter',      'Starter',      'Job board, stages, customer approval, DVI, estimates.', 0, 'USD', TRUE),
  ('professional', 'Professional', 'Everything in Starter + Priority Engine, Next Best Actions, delivery risk, blocked jobs.', 0, 'USD', TRUE),
  ('enterprise',   'Enterprise',   'Everything in Professional + Multi-shop, advisor workload, AI message drafts, analytics.', 0, 'USD', TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_active = VALUES(is_active);

-- Keep free_trial plan active with updated description
UPDATE plans SET description = '14-day full-access trial. Converts to Starter after expiry.' WHERE id = 'free_trial';

-- ----------------------------------------------------------
-- 4. REGIONAL PRICING
-- ----------------------------------------------------------

INSERT INTO plan_regions (id, plan_id, region, currency, price_monthly_cents, display_name) VALUES
  -- US / Global pricing
  (UUID(), 'starter',      'us',  'USD', 19900,  'Starter'),
  (UUID(), 'professional', 'us',  'USD', 34900,  'Professional'),
  (UUID(), 'enterprise',  'us',  'USD', 54900,  'Enterprise'),
  -- GCC / MENA pricing (28% premium)
  (UUID(), 'starter',      'gcc', 'AED', 73000,  'Starter'),
  (UUID(), 'professional', 'gcc', 'AED', 165000, 'Professional'),
  (UUID(), 'enterprise',  'gcc', 'AED', 257000, 'Enterprise')
ON DUPLICATE KEY UPDATE
  price_monthly_cents = VALUES(price_monthly_cents),
  display_name = VALUES(display_name);

-- ----------------------------------------------------------
-- 5. PLAN FEATURES
-- ----------------------------------------------------------

-- Starter features
INSERT INTO plan_features (id, plan_id, feature_key, is_included, ceiling, overage_unit_cents) VALUES
  (UUID(), 'starter', 'job_board',             TRUE,  NULL, 0),
  (UUID(), 'starter', 'stages',               TRUE,  NULL, 0),
  (UUID(), 'starter', 'customer_approval',     TRUE,  NULL, 0),
  (UUID(), 'starter', 'dvi_reports',          TRUE,  200,  50),
  (UUID(), 'starter', 'estimates',            TRUE,  NULL, 0),
  (UUID(), 'starter', 'ai_scored_jobs',       TRUE,  500,  10),
  (UUID(), 'starter', 'customer_approval_sms', TRUE,  100,  5),
  (UUID(), 'starter', 'priority_engine',      FALSE, NULL, 0),
  (UUID(), 'starter', 'nba',                  FALSE, NULL, 0),
  (UUID(), 'starter', 'delivery_risk',        FALSE, NULL, 0),
  (UUID(), 'starter', 'multi_shop',           FALSE, NULL, 0),
  (UUID(), 'starter', 'advisor_workload',     FALSE, NULL, 0),
  (UUID(), 'starter', 'ai_message_drafts',    FALSE, NULL, 0),
  (UUID(), 'starter', 'analytics',            FALSE, NULL, 0),
  (UUID(), 'starter', 'max_users',            TRUE,  5,    0),
  (UUID(), 'starter', 'max_locations',        TRUE,  1,    0)
ON DUPLICATE KEY UPDATE
  is_included = VALUES(is_included),
  ceiling = VALUES(ceiling),
  overage_unit_cents = VALUES(overage_unit_cents);

-- Professional features
INSERT INTO plan_features (id, plan_id, feature_key, is_included, ceiling, overage_unit_cents) VALUES
  (UUID(), 'professional', 'job_board',             TRUE,  NULL, 0),
  (UUID(), 'professional', 'stages',               TRUE,  NULL, 0),
  (UUID(), 'professional', 'customer_approval',     TRUE,  NULL, 0),
  (UUID(), 'professional', 'dvi_reports',          TRUE,  1000, 25),
  (UUID(), 'professional', 'estimates',            TRUE,  NULL, 0),
  (UUID(), 'professional', 'ai_scored_jobs',       TRUE,  1500, 5),
  (UUID(), 'professional', 'customer_approval_sms', TRUE, 500,  3),
  (UUID(), 'professional', 'priority_engine',      TRUE,  NULL, 0),
  (UUID(), 'professional', 'nba',                  TRUE,  NULL, 0),
  (UUID(), 'professional', 'delivery_risk',        TRUE,  NULL, 0),
  (UUID(), 'professional', 'multi_shop',           FALSE, NULL, 0),
  (UUID(), 'professional', 'advisor_workload',     FALSE, NULL, 0),
  (UUID(), 'professional', 'ai_message_drafts',    FALSE, NULL, 0),
  (UUID(), 'professional', 'analytics',            FALSE, NULL, 0),
  (UUID(), 'professional', 'max_users',            TRUE,  20,   0),
  (UUID(), 'professional', 'max_locations',        TRUE,  1,    0)
ON DUPLICATE KEY UPDATE
  is_included = VALUES(is_included),
  ceiling = VALUES(ceiling),
  overage_unit_cents = VALUES(overage_unit_cents);

-- Enterprise features
INSERT INTO plan_features (id, plan_id, feature_key, is_included, ceiling, overage_unit_cents) VALUES
  (UUID(), 'enterprise', 'job_board',             TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'stages',               TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'customer_approval',     TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'dvi_reports',          TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'estimates',            TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'ai_scored_jobs',       TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'customer_approval_sms', TRUE, NULL, 0),
  (UUID(), 'enterprise', 'priority_engine',      TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'nba',                  TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'delivery_risk',        TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'multi_shop',           TRUE,  1,    0),
  (UUID(), 'enterprise', 'advisor_workload',     TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'ai_message_drafts',    TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'analytics',            TRUE,  NULL, 0),
  (UUID(), 'enterprise', 'max_users',            TRUE,  100,  0),
  (UUID(), 'enterprise', 'max_locations',        TRUE,  3,    0)
ON DUPLICATE KEY UPDATE
  is_included = VALUES(is_included),
  ceiling = VALUES(ceiling),
  overage_unit_cents = VALUES(overage_unit_cents);

-- ----------------------------------------------------------
-- 6. ADD-ONS
-- ----------------------------------------------------------

INSERT INTO plan_add_ons (id, slug, name, description, pricing_model) VALUES
  (UUID(), 'multi_shop', 'MultiShop', 'Additional location beyond included allowance', 'per_unit')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description);

INSERT INTO plan_add_on_prices (id, add_on_id, region, currency, price_per_unit_cents) VALUES
  (UUID(), (SELECT id FROM plan_add_ons WHERE slug = 'multi_shop'), 'us',  'USD', 10000),
  (UUID(), (SELECT id FROM plan_add_ons WHERE slug = 'multi_shop'), 'gcc', 'AED', 55000)
ON DUPLICATE KEY UPDATE
  price_per_unit_cents = VALUES(price_per_unit_cents);

-- ----------------------------------------------------------
-- 7. MIGRATE EXISTING SUBSCRIPTIONS
-- ----------------------------------------------------------

-- Map old 'pro' subscriptions to 'professional'
UPDATE subscriptions SET plan_id = 'professional' WHERE plan_id = 'pro';
-- Map old 'starter' subscriptions stay as 'starter' (new starter)
-- Existing 'free_trial' subscriptions stay as 'free_trial'

-- Set region on existing workshops based on timezone (GCC default)
UPDATE workshops SET region = 'gcc' WHERE region IS NULL;
-- Set region on existing subscriptions
UPDATE subscriptions s JOIN workshops w ON s.workshop_id = w.id SET s.region = COALESCE(w.region, 'gcc') WHERE s.region IS NULL;