CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY token_hash (token_hash),
  KEY idx_prt_expires (expires_at),
  KEY idx_prt_user_id (user_id),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
