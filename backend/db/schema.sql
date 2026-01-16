-- Schema MySQL untuk Portal RT
-- Database: pwa_portal_rt

CREATE DATABASE IF NOT EXISTS pwa_portal_rt
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pwa_portal_rt;

CREATE TABLE IF NOT EXISTS rt (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  rw VARCHAR(10),
  address TEXT,
  status VARCHAR(20) NOT NULL,
  invite_code VARCHAR(20),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_rt (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  rt_id CHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_user_rt (user_id, rt_id),
  KEY idx_user_rt_rt (rt_id),
  CONSTRAINT fk_user_rt_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_rt_rt FOREIGN KEY (rt_id) REFERENCES rt(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_log (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NULL,
  actor_user_id CHAR(36) NOT NULL,
  action VARCHAR(50) NOT NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL,
  KEY idx_audit_log_rt (rt_id),
  KEY idx_audit_log_actor (actor_user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resident (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  approval_status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_resident_rt (rt_id),
  CONSTRAINT fk_resident_rt FOREIGN KEY (rt_id) REFERENCES rt(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS family_card (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  kk_number VARCHAR(50),
  address TEXT,
  notes TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_family_card_rt (rt_id),
  CONSTRAINT fk_family_card_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_family_card_resident FOREIGN KEY (resident_id) REFERENCES resident(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS family_member (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  family_card_id CHAR(36) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  birth_date DATE NULL,
  is_living_here TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_family_member_rt (rt_id),
  CONSTRAINT fk_family_member_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_family_member_card FOREIGN KEY (family_card_id) REFERENCES family_card(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resident_document (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  type VARCHAR(10) NOT NULL,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  uploaded_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_resident_document_rt (rt_id),
  CONSTRAINT fk_resident_document_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_resident_document_resident FOREIGN KEY (resident_id) REFERENCES resident(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_token (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_refresh_user (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallet (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_wallet_resident (resident_id),
  KEY idx_wallet_rt (rt_id),
  CONSTRAINT fk_wallet_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_wallet_resident FOREIGN KEY (resident_id) REFERENCES resident(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallet_topup_request (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  proof_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_wallet_topup_rt (rt_id),
  CONSTRAINT fk_wallet_topup_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_wallet_topup_resident FOREIGN KEY (resident_id) REFERENCES resident(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallet_transaction (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  wallet_id CHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  ref_type VARCHAR(50),
  ref_id CHAR(36),
  created_at DATETIME NOT NULL,
  KEY idx_wallet_tx_rt (rt_id),
  KEY idx_wallet_tx_wallet (wallet_id),
  CONSTRAINT fk_wallet_tx_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_wallet_tx_wallet FOREIGN KEY (wallet_id) REFERENCES wallet(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kas_rt_config (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  monthly_amount DECIMAL(18,2) NOT NULL,
  debit_day_of_month TINYINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_kas_rt_config_rt (rt_id),
  CONSTRAINT fk_kas_rt_config_rt FOREIGN KEY (rt_id) REFERENCES rt(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kas_rt_monthly_charge (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  period CHAR(7) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  wallet_transaction_id CHAR(36) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_kas_rt_charge (rt_id, resident_id, period),
  KEY idx_kas_rt_charge_rt (rt_id),
  CONSTRAINT fk_kas_rt_charge_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_kas_rt_charge_resident FOREIGN KEY (resident_id) REFERENCES resident(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_campaign (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  amount_type VARCHAR(20) NOT NULL,
  fixed_amount DECIMAL(18,2) NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_fee_campaign_rt (rt_id),
  CONSTRAINT fk_fee_campaign_rt FOREIGN KEY (rt_id) REFERENCES rt(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_billing (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  campaign_id CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  period CHAR(7) NULL,
  amount DECIMAL(18,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_fee_billing_rt (rt_id),
  CONSTRAINT fk_fee_billing_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_fee_billing_campaign FOREIGN KEY (campaign_id) REFERENCES fee_campaign(id),
  CONSTRAINT fk_fee_billing_resident FOREIGN KEY (resident_id) REFERENCES resident(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_payment_submission (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  billing_id CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  proof_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  verified_by_user_id CHAR(36) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_fee_payment_rt (rt_id),
  CONSTRAINT fk_fee_payment_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_fee_payment_billing FOREIGN KEY (billing_id) REFERENCES fee_billing(id),
  CONSTRAINT fk_fee_payment_resident FOREIGN KEY (resident_id) REFERENCES resident(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cash_ledger (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  type VARCHAR(10) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  category VARCHAR(50),
  description TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_cash_ledger_rt (rt_id),
  CONSTRAINT fk_cash_ledger_rt FOREIGN KEY (rt_id) REFERENCES rt(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS letter_request (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL,
  letter_number VARCHAR(50) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_letter_rt (rt_id),
  CONSTRAINT fk_letter_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_letter_resident FOREIGN KEY (resident_id) REFERENCES resident(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscription (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  plan VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  end_date DATE NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_subscription_rt (rt_id),
  CONSTRAINT fk_subscription_rt FOREIGN KEY (rt_id) REFERENCES rt(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notification_outbox (
  id CHAR(36) PRIMARY KEY,
  rt_id CHAR(36) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  to_phone VARCHAR(20) NOT NULL,
  template_key VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  status VARCHAR(20) NOT NULL,
  retry_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY idx_notification_outbox_rt (rt_id),
  CONSTRAINT fk_notification_outbox_rt FOREIGN KEY (rt_id) REFERENCES rt(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notification_log (
  id CHAR(36) PRIMARY KEY,
  outbox_id CHAR(36) NOT NULL,
  sent_at DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL,
  response_text TEXT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_notification_log_outbox FOREIGN KEY (outbox_id) REFERENCES notification_outbox(id)
) ENGINE=InnoDB;
