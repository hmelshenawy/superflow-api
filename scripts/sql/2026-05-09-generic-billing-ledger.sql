ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider_name VARCHAR(60) NULL AFTER current_period_ends_at,
  ADD COLUMN IF NOT EXISTS provider_customer_id VARCHAR(120) NULL AFTER provider_name,
  ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(120) NULL AFTER provider_customer_id,
  ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255) NULL AFTER stripe_subscription_id,
  ADD INDEX IF NOT EXISTS idx_subscriptions_provider (provider_name);

CREATE TABLE IF NOT EXISTS payment_gateways (
  id VARCHAR(60) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'available',
  supported_currencies VARCHAR(255) NULL,
  notes TEXT NULL,
  is_active BOOLEAN NULL DEFAULT TRUE,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_gateways_status (status),
  INDEX idx_payment_gateways_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workshop_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) NULL,
  invoice_number VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  currency VARCHAR(3) NULL DEFAULT 'AED',
  subtotal_cents INT NOT NULL DEFAULT 0,
  tax_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL DEFAULT 0,
  amount_paid_cents INT NOT NULL DEFAULT 0,
  due_at DATETIME NULL,
  issued_at DATETIME NULL,
  paid_at DATETIME NULL,
  provider_name VARCHAR(60) NULL,
  provider_invoice_id VARCHAR(120) NULL,
  provider_checkout_url TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_invoices_number (invoice_number),
  INDEX idx_invoices_workshop (workshop_id),
  INDEX idx_invoices_subscription (subscription_id),
  INDEX idx_invoices_status (status),
  INDEX idx_invoices_due (due_at),
  CONSTRAINT fk_invoices_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  invoice_id CHAR(36) NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_amount_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL DEFAULT 0,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_items_invoice (invoice_id),
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workshop_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) NULL,
  invoice_id CHAR(36) NULL,
  gateway_id VARCHAR(60) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  amount_cents INT NOT NULL DEFAULT 0,
  currency VARCHAR(3) NULL DEFAULT 'AED',
  method VARCHAR(60) NULL,
  provider_name VARCHAR(60) NULL,
  provider_payment_id VARCHAR(120) NULL,
  provider_reference VARCHAR(120) NULL,
  paid_at DATETIME NULL,
  failed_at DATETIME NULL,
  failure_reason TEXT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payments_workshop (workshop_id),
  INDEX idx_payments_subscription (subscription_id),
  INDEX idx_payments_invoice (invoice_id),
  INDEX idx_payments_gateway (gateway_id),
  INDEX idx_payments_status (status),
  INDEX idx_payments_provider (provider_name),
  CONSTRAINT fk_payments_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_gateway FOREIGN KEY (gateway_id) REFERENCES payment_gateways(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO payment_gateways (id, name, status, supported_currencies, notes, is_active)
VALUES
  ('manual', 'Manual / Bank Transfer', 'available', 'AED,USD,EUR', 'Offline payments, bank transfer, cash, or manually reconciled receipts.', TRUE),
  ('tap', 'Tap Payments', 'candidate', 'AED,SAR,KWD,BHD,QAR,OMR,USD', 'GCC-friendly gateway candidate. Integration can be added later.', TRUE),
  ('paytabs', 'PayTabs', 'candidate', 'AED,SAR,USD', 'MENA gateway candidate. Integration can be added later.', TRUE),
  ('network-international', 'Network International', 'candidate', 'AED,USD', 'UAE enterprise gateway candidate. Integration can be added later.', TRUE),
  ('stripe', 'Stripe', 'deferred', 'USD,EUR,GBP', 'Deferred until UAE availability/fit is confirmed.', FALSE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status),
  supported_currencies = VALUES(supported_currencies),
  notes = VALUES(notes),
  is_active = VALUES(is_active);
