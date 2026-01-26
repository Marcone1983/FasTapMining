-- Initial database schema for FasTap Mining

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(100),
  first_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),

  -- Mining
  hashrate DECIMAL(18, 8) DEFAULT 0,
  total_taps BIGINT DEFAULT 0,
  total_shares BIGINT DEFAULT 0,

  -- Balances (JSONB for flexibility)
  balances JSONB DEFAULT '{"LTC":0,"DOGE":0,"TON":0,"BELLS":0,"LKY":0,"PEP":0,"JKC":0,"DINGO":0,"SHIC":0}',

  -- Wallets
  wallet_ton VARCHAR(100),

  -- Lifetime access
  has_lifetime_access BOOLEAN DEFAULT FALSE,
  lifetime_access_granted_at TIMESTAMPTZ,

  -- Referral
  referral_code VARCHAR(20) UNIQUE,
  referred_by BIGINT REFERENCES users(id),

  -- AutoTap & Boosts
  autotap_tier VARCHAR(20),
  autotap_enabled BOOLEAN DEFAULT FALSE,
  mining_multiplier DECIMAL(4, 2) DEFAULT 1.0,
  multiplier_expires_at TIMESTAMPTZ
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_config_key ON system_config(key);

-- Mining sessions (for tracking active mining)
CREATE TABLE IF NOT EXISTS mining_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_taps BIGINT DEFAULT 0,
  total_hashrate DECIMAL(18, 8) DEFAULT 0,
  rewards JSONB
);

CREATE INDEX idx_mining_sessions_user ON mining_sessions(user_id);
CREATE INDEX idx_mining_sessions_started_at ON mining_sessions(started_at DESC);

-- Transactions log
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  coin VARCHAR(10) NOT NULL,
  amount DECIMAL(24, 8) NOT NULL,
  balance_before DECIMAL(24, 8),
  balance_after DECIMAL(24, 8),
  description TEXT,
  tx_hash VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_coin ON transactions(coin);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Insert default system configuration
INSERT INTO system_config (key, value, description) VALUES
  ('platform_fee_percent', '5', 'Platform fee percentage')
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_config (key, value, description) VALUES
  ('viabtc_pool', '{
    "host": "ltc.viabtc.io",
    "port": 3333,
    "algorithm": "scrypt",
    "coins": ["LTC", "DOGE", "BELLS", "LKY", "PEP", "JKC", "DINGO", "SHIC"]
  }', 'ViaBTC pool configuration')
ON CONFLICT (key) DO NOTHING;
