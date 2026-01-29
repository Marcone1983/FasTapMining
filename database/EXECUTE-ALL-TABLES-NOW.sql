-- 🔥 EXECUTE ALL MISSING TABLES IN SUPABASE - ENTERPRISE GRADE
-- Copy this ENTIRE file and execute in Supabase SQL Editor

-- ================================================
-- MINING POOLS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS mining_pools (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  token VARCHAR(100) NOT NULL,
  difficulty BIGINT NOT NULL DEFAULT 65536,
  block_reward DECIMAL(18, 8) NOT NULL DEFAULT 100.00000000,
  weight DECIMAL(5, 4) NOT NULL DEFAULT 1.0000,
  current_height BIGINT DEFAULT 0,
  total_hashrate DECIMAL(18, 2) DEFAULT 0,
  total_miners INT DEFAULT 0,
  total_blocks_found BIGINT DEFAULT 0,
  has_nft_rewards BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pools_active ON mining_pools(is_active);
CREATE INDEX IF NOT EXISTS idx_pools_token ON mining_pools(token);

-- Insert ViaBTC Pool
INSERT INTO mining_pools (id, name, token, difficulty, block_reward, weight, is_active)
VALUES ('viabtc', 'ViaBTC Scrypt', 'LTC+DOGE+BELLS+LKY+PEP+JKC+DINGO+SHIC', 65536, 100.00000000, 1.0000, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  token = EXCLUDED.token,
  difficulty = EXCLUDED.difficulty,
  updated_at = NOW();

-- ================================================
-- MINING SHARES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS mining_shares (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pool_id VARCHAR(20) NOT NULL REFERENCES mining_pools(id),
  shares BIGINT NOT NULL DEFAULT 0,
  taps INT NOT NULL DEFAULT 0,
  hashrate DECIMAL(18, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shares_user ON mining_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_pool ON mining_shares(pool_id);
CREATE INDEX IF NOT EXISTS idx_shares_expires ON mining_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_shares_user_pool ON mining_shares(user_id, pool_id);

-- ================================================
-- BLOCKS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS blocks (
  id BIGSERIAL PRIMARY KEY,
  pool_id VARCHAR(20) REFERENCES mining_pools(id),
  height BIGINT NOT NULL,
  finder_user_id BIGINT REFERENCES users(id),
  hash VARCHAR(64) NOT NULL,
  nonce BIGINT NOT NULL,
  difficulty BIGINT NOT NULL,
  reward_amount DECIMAL(18, 8) NOT NULL,
  finder_reward DECIMAL(18, 8) NOT NULL,
  pool_reward DECIMAL(18, 8) NOT NULL,
  found_at TIMESTAMPTZ DEFAULT NOW(),
  distributed_at TIMESTAMPTZ,
  nft_rewarded BOOLEAN DEFAULT FALSE,
  nft_id BIGINT,
  UNIQUE(pool_id, height)
);

CREATE INDEX IF NOT EXISTS idx_blocks_pool ON blocks(pool_id);
CREATE INDEX IF NOT EXISTS idx_blocks_finder ON blocks(finder_user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_found_at ON blocks(found_at DESC);

-- ================================================
-- MARKETPLACE PURCHASES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  tx_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending',
  activated_at TIMESTAMPTZ,
  expires_on TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_user ON marketplace_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_purchases(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_expires ON marketplace_purchases(expires_on);

-- ================================================
-- LIFETIME ACCESS PAYMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS lifetime_access_payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(18, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'TON',
  payment_address VARCHAR(66) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lifetime_payments_user ON lifetime_access_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_lifetime_payments_status ON lifetime_access_payments(status);
CREATE INDEX IF NOT EXISTS idx_lifetime_payments_expires ON lifetime_access_payments(expires_at);

-- ================================================
-- USER BALANCES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS user_balances (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ltc DECIMAL(18, 8) DEFAULT 0,
  doge DECIMAL(18, 8) DEFAULT 0,
  ton DECIMAL(18, 8) DEFAULT 0,
  bells DECIMAL(18, 8) DEFAULT 0,
  lky DECIMAL(18, 8) DEFAULT 0,
  pep DECIMAL(18, 8) DEFAULT 0,
  jkc DECIMAL(18, 8) DEFAULT 0,
  dingo DECIMAL(18, 8) DEFAULT 0,
  shic DECIMAL(18, 8) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balances_updated ON user_balances(updated_at DESC);

-- ================================================
-- TRANSACTIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  from_address VARCHAR(66),
  to_address VARCHAR(66),
  tx_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at DESC);

-- ================================================
-- REFERRALS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_amount DECIMAL(18, 8) DEFAULT 0,
  total_earned DECIMAL(18, 8) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- ================================================
-- UPDATE users TABLE WITH MISSING COLUMNS
-- ================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS hashrate DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_ton VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_bells VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_lky VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pep VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_jkc VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_dingo VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_shic VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_access_granted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balances JSONB DEFAULT '{}'::jsonb;

-- Create missing users indexes
CREATE INDEX IF NOT EXISTS idx_users_hashrate ON users(hashrate DESC) WHERE hashrate > 0;
CREATE INDEX IF NOT EXISTS idx_users_lifetime_access ON users(has_lifetime_access) WHERE has_lifetime_access = TRUE;

-- Set default pool preference
ALTER TABLE users ALTER COLUMN preferred_pool SET DEFAULT 'viabtc';
UPDATE users SET preferred_pool = 'viabtc' WHERE preferred_pool IS NULL OR preferred_pool NOT IN (SELECT id FROM mining_pools);

-- ================================================
-- VERIFICATION QUERIES
-- ================================================
SELECT 'mining_pools' as table_name, COUNT(*) as count FROM mining_pools
UNION ALL
SELECT 'mining_shares', COUNT(*) FROM mining_shares
UNION ALL
SELECT 'blocks', COUNT(*) FROM blocks
UNION ALL
SELECT 'marketplace_purchases', COUNT(*) FROM marketplace_purchases
UNION ALL
SELECT 'lifetime_access_payments', COUNT(*) FROM lifetime_access_payments
UNION ALL
SELECT 'user_balances', COUNT(*) FROM user_balances
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- Show ViaBTC pool
SELECT * FROM mining_pools WHERE id = 'viabtc';
