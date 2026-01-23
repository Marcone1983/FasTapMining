-- FasTapMining Database Schema - Production Ready
-- PostgreSQL 14+ with proper indexing, constraints, and relationships

-- Users table - Core user data
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  wallet_address VARCHAR(66), -- TON wallet address
  has_lifetime_access BOOLEAN DEFAULT FALSE,
  lifetime_access_tx_hash VARCHAR(66),
  lifetime_access_paid_at TIMESTAMPTZ,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_by_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  total_taps BIGINT DEFAULT 0,
  total_blocks_found INT DEFAULT 0,
  preferred_pool VARCHAR(20) DEFAULT 'minex',
  settings JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_referred_by ON users(referred_by_id);
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);

-- User balances - Token balances for each user
CREATE TABLE user_balances (
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(20) NOT NULL,
  balance DECIMAL(24, 8) DEFAULT 0,
  lifetime_earned DECIMAL(24, 8) DEFAULT 0,
  lifetime_claimed DECIMAL(24, 8) DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, token)
);

CREATE INDEX idx_balances_user ON user_balances(user_id);
CREATE INDEX idx_balances_token ON user_balances(token);

-- Mining pools - Pool configuration and stats
CREATE TABLE mining_pools (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  token VARCHAR(20) NOT NULL,
  difficulty BIGINT NOT NULL,
  block_reward DECIMAL(18, 8) NOT NULL,
  weight DECIMAL(5, 4) NOT NULL,
  current_height BIGINT DEFAULT 0,
  total_hashrate DECIMAL(18, 2) DEFAULT 0,
  total_miners INT DEFAULT 0,
  total_blocks_found BIGINT DEFAULT 0,
  has_nft_rewards BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pools_active ON mining_pools(is_active);
CREATE INDEX idx_pools_token ON mining_pools(token);

-- Insert default pools
INSERT INTO mining_pools (id, name, token, difficulty, block_reward, weight, has_nft_rewards) VALUES
  ('minex', 'MineX', 'MineX', 1000000, 100, 0.40, FALSE),
  ('tbtc', 'TonBitcoin', 'tBTC', 800000, 50, 0.30, FALSE),
  ('mrdn', 'Meridian', 'MRDN', 500000, 1000, 0.30, TRUE);

-- Blocks found - Historical record of all blocks
CREATE TABLE blocks (
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

CREATE INDEX idx_blocks_pool ON blocks(pool_id);
CREATE INDEX idx_blocks_finder ON blocks(finder_user_id);
CREATE INDEX idx_blocks_found_at ON blocks(found_at DESC);
CREATE INDEX idx_blocks_height ON blocks(pool_id, height DESC);

-- Mining shares - Pending shares before block found
CREATE TABLE mining_shares (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  pool_id VARCHAR(20) REFERENCES mining_pools(id),
  shares INT NOT NULL,
  taps INT NOT NULL,
  hashrate DECIMAL(18, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_shares_user ON mining_shares(user_id);
CREATE INDEX idx_shares_pool ON mining_shares(pool_id);
CREATE INDEX idx_shares_expires ON mining_shares(expires_at);

-- NFTs - User NFT collection
CREATE TABLE nfts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  collection VARCHAR(100) NOT NULL,
  character VARCHAR(50) NOT NULL,
  rarity VARCHAR(20) NOT NULL,
  image_url TEXT,
  metadata JSONB,
  minted_at TIMESTAMPTZ DEFAULT NOW(),
  block_id BIGINT REFERENCES blocks(id),
  is_listed BOOLEAN DEFAULT FALSE,
  list_price DECIMAL(18, 8)
);

CREATE INDEX idx_nfts_user ON nfts(user_id);
CREATE INDEX idx_nfts_collection ON nfts(collection);
CREATE INDEX idx_nfts_rarity ON nfts(rarity);
CREATE INDEX idx_nfts_listed ON nfts(is_listed) WHERE is_listed = TRUE;

-- AutoTap subscriptions - Passive mining
CREATE TABLE autotap_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL,
  shares_per_second INT NOT NULL,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_lifetime BOOLEAN DEFAULT FALSE,
  last_claim_at TIMESTAMPTZ DEFAULT NOW(),
  accumulated_shares BIGINT DEFAULT 0,
  total_earned_shares BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  payment_tx_hash VARCHAR(66)
);

CREATE INDEX idx_autotap_user ON autotap_subscriptions(user_id);
CREATE INDEX idx_autotap_active ON autotap_subscriptions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_autotap_expires ON autotap_subscriptions(expires_at);

-- Referrals - Referral tracking
CREATE TABLE referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  referred_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  rewards_paid BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(referred_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_active ON referrals(is_active) WHERE is_active = TRUE;

-- Referral rewards - Track rewards given
CREATE TABLE referral_rewards (
  id BIGSERIAL PRIMARY KEY,
  referral_id BIGINT REFERENCES referrals(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(20) NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  reward_type VARCHAR(20) NOT NULL, -- 'referrer' or 'referred'
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ref_rewards_user ON referral_rewards(user_id);
CREATE INDEX idx_ref_rewards_referral ON referral_rewards(referral_id);

-- Achievements - User achievements
CREATE TABLE achievements (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  category VARCHAR(30),
  requirement JSONB,
  reward JSONB,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert achievements
INSERT INTO achievements (id, name, description, icon, category, requirement, reward) VALUES
  ('first_block', 'First Block', 'Find your first block', '🏆', 'mining', '{"blocks": 1}', '{"bonus_shares": 100}'),
  ('block_hunter', 'Block Hunter', 'Find 10 blocks', '⚡', 'mining', '{"blocks": 10}', '{"bonus_shares": 1000}'),
  ('mega_miner', 'Mega Miner', 'Find 100 blocks', '💎', 'mining', '{"blocks": 100}', '{"bonus_shares": 10000}'),
  ('tap_novice', 'Tap Novice', 'Reach 1,000 taps', '👆', 'tapping', '{"taps": 1000}', '{"bonus_shares": 50}'),
  ('tap_master', 'Tap Master', 'Reach 100,000 taps', '🔥', 'tapping', '{"taps": 100000}', '{"bonus_shares": 5000}'),
  ('referral_starter', 'Referral Starter', 'Invite 5 friends', '🤝', 'social', '{"referrals": 5}', '{"bonus_minex": 500}'),
  ('referral_king', 'Referral King', 'Invite 50 friends', '👑', 'social', '{"referrals": 50}', '{"bonus_minex": 10000}'),
  ('collector', 'NFT Collector', 'Own 10 NFTs', '🎨', 'nft', '{"nfts": 10}', '{"rare_nft": 1}'),
  ('whale', 'Whale', 'Earn 10,000 MineX', '🐋', 'wealth', '{"minex_earned": 10000}', '{"bonus_tbtc": 50}');

-- User achievements - Achievements earned by users
CREATE TABLE user_achievements (
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) REFERENCES achievements(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned ON user_achievements(earned_at DESC);

-- Daily rewards - Daily login streak
CREATE TABLE daily_rewards (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_claim_date DATE,
  total_claims INT DEFAULT 0,
  next_claim_at TIMESTAMPTZ
);

CREATE INDEX idx_daily_last_claim ON daily_rewards(last_claim_date DESC);

-- Transactions - All token transactions
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  tx_type VARCHAR(30) NOT NULL,
  token VARCHAR(20) NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  from_address VARCHAR(66),
  to_address VARCHAR(66),
  tx_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending',
  block_id BIGINT REFERENCES blocks(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_tx_user ON transactions(user_id);
CREATE INDEX idx_tx_type ON transactions(tx_type);
CREATE INDEX idx_tx_status ON transactions(status);
CREATE INDEX idx_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_tx_created ON transactions(created_at DESC);

-- Shop purchases - Track all purchases
CREATE TABLE purchases (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  item_id VARCHAR(50) NOT NULL,
  item_type VARCHAR(30) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  currency VARCHAR(20) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  payment_tx_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending',
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_date ON purchases(purchased_at DESC);

-- Ad views - Track ad watching
CREATE TABLE ad_views (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  ad_block_id VARCHAR(50),
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  reward_given BOOLEAN DEFAULT FALSE,
  reward_amount DECIMAL(18, 8),
  boost_multiplier DECIMAL(5, 2),
  boost_expires_at TIMESTAMPTZ
);

CREATE INDEX idx_ads_user ON ad_views(user_id);
CREATE INDEX idx_ads_viewed ON ad_views(viewed_at DESC);

-- Leaderboard cache - Materialized view for performance
CREATE TABLE leaderboard_cache (
  rank INT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  username VARCHAR(255),
  metric_type VARCHAR(30) NOT NULL,
  metric_value DECIMAL(24, 8) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_type ON leaderboard_cache(metric_type);
CREATE INDEX idx_leaderboard_rank ON leaderboard_cache(rank);

-- Global stats cache - Real-time aggregate stats
CREATE TABLE global_stats (
  id INT PRIMARY KEY DEFAULT 1,
  total_users BIGINT DEFAULT 0,
  active_users_24h BIGINT DEFAULT 0,
  total_blocks_found BIGINT DEFAULT 0,
  total_taps BIGINT DEFAULT 0,
  total_hashrate DECIMAL(24, 2) DEFAULT 0,
  total_minex_distributed DECIMAL(24, 8) DEFAULT 0,
  total_tbtc_distributed DECIMAL(24, 8) DEFAULT 0,
  total_mrdn_distributed DECIMAL(24, 8) DEFAULT 0,
  total_nfts_minted BIGINT DEFAULT 0,
  total_referrals BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO global_stats (id) VALUES (1);

-- Pool stats cache - Per-pool statistics
CREATE TABLE pool_stats_cache (
  pool_id VARCHAR(20) PRIMARY KEY REFERENCES mining_pools(id),
  active_miners_1h INT DEFAULT 0,
  active_miners_24h INT DEFAULT 0,
  blocks_found_1h INT DEFAULT 0,
  blocks_found_24h INT DEFAULT 0,
  avg_block_time_seconds INT DEFAULT 0,
  hashrate_1h DECIMAL(18, 2) DEFAULT 0,
  hashrate_24h DECIMAL(18, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions - Track user activity
CREATE TABLE user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  taps_count INT DEFAULT 0,
  blocks_found INT DEFAULT 0,
  duration_seconds INT,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_started ON user_sessions(started_at DESC);

-- Notifications - User notifications
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notif_created ON notifications(created_at DESC);

-- System config - App configuration
CREATE TABLE system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO system_config (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('min_app_version', '"1.0.0"', 'Minimum required app version'),
  ('referral_rewards', '{"referrer": {"MineX": 100, "tBTC": 5, "MRDN": 500}, "referred": {"MineX": 50, "tBTC": 2, "MRDN": 250}}', 'Referral reward amounts'),
  ('daily_reward_multipliers', '[1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 5.0]', 'Daily streak multipliers'),
  ('platform_fee_percent', '0.05', 'Platform fee percentage (5%)'),
  ('owner_wallet', '"UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR"', 'Owner wallet address'),
  ('lifetime_access_price', '1.0', 'Lifetime access price in TON');

-- Functions for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_mining_pools_updated_at BEFORE UPDATE ON mining_pools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_balances_updated_at BEFORE UPDATE ON user_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate accumulated AutoTap shares
CREATE OR REPLACE FUNCTION calculate_autotap_shares(subscription_id BIGINT)
RETURNS BIGINT AS $$
DECLARE
  shares_per_sec INT;
  last_claim TIMESTAMPTZ;
  elapsed_seconds INT;
  accumulated BIGINT;
BEGIN
  SELECT shares_per_second, last_claim_at
  INTO shares_per_sec, last_claim
  FROM autotap_subscriptions
  WHERE id = subscription_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - last_claim))::INT;
  accumulated := shares_per_sec * elapsed_seconds;

  RETURN accumulated;
END;
$$ LANGUAGE plpgsql;

-- Views for common queries

-- Active miners view
CREATE VIEW v_active_miners AS
SELECT
  u.id,
  u.telegram_id,
  u.username,
  u.wallet_address,
  u.total_taps,
  u.total_blocks_found,
  u.preferred_pool,
  u.last_active_at,
  COUNT(DISTINCT ms.pool_id) as active_pools,
  SUM(ms.shares) as total_pending_shares
FROM users u
LEFT JOIN mining_shares ms ON u.id = ms.user_id
WHERE u.last_active_at > NOW() - INTERVAL '1 hour'
GROUP BY u.id;

-- Pool leaderboard view
CREATE VIEW v_pool_leaderboard AS
SELECT
  u.id as user_id,
  u.username,
  p.id as pool_id,
  p.name as pool_name,
  COUNT(b.id) as blocks_found,
  SUM(b.finder_reward) as total_rewards,
  RANK() OVER (PARTITION BY p.id ORDER BY COUNT(b.id) DESC) as rank
FROM users u
JOIN blocks b ON u.id = b.finder_user_id
JOIN mining_pools p ON b.pool_id = p.id
GROUP BY u.id, u.username, p.id, p.name;

-- User stats view
CREATE VIEW v_user_stats AS
SELECT
  u.id,
  u.telegram_id,
  u.username,
  u.total_taps,
  u.total_blocks_found,
  COUNT(DISTINCT n.id) as nft_count,
  COUNT(DISTINCT r.referred_id) as referrals_count,
  COUNT(DISTINCT ua.achievement_id) as achievements_count,
  dr.current_streak as daily_streak,
  (SELECT COUNT(*) FROM autotap_subscriptions WHERE user_id = u.id AND is_active = TRUE) as active_autotaps
FROM users u
LEFT JOIN nfts n ON u.id = n.user_id
LEFT JOIN referrals r ON u.id = r.referrer_id AND r.is_active = TRUE
LEFT JOIN user_achievements ua ON u.id = ua.user_id
LEFT JOIN daily_rewards dr ON u.id = dr.user_id
GROUP BY u.id, dr.current_streak;

-- Recent blocks view
CREATE VIEW v_recent_blocks AS
SELECT
  b.id,
  b.pool_id,
  p.name as pool_name,
  b.height,
  b.hash,
  b.reward_amount,
  b.finder_reward,
  b.pool_reward,
  b.found_at,
  b.nft_rewarded,
  u.telegram_id as finder_telegram_id,
  u.username as finder_username
FROM blocks b
JOIN mining_pools p ON b.pool_id = p.id
LEFT JOIN users u ON b.finder_user_id = u.id
ORDER BY b.found_at DESC
LIMIT 100;

-- Create indexes on views
CREATE INDEX idx_v_recent_blocks_pool ON blocks(pool_id, found_at DESC);
CREATE INDEX idx_v_user_stats_telegram ON users(telegram_id);
