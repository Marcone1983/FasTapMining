-- 🔥 CREATE mining_pools TABLE + INSERT ViaBTC Pool
-- EXECUTE THIS IN SUPABASE SQL EDITOR NOW!

-- Create mining_pools table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pools_active ON mining_pools(is_active);
CREATE INDEX IF NOT EXISTS idx_pools_token ON mining_pools(token);

-- Insert ViaBTC Scrypt Pool (8-coin merge mining)
INSERT INTO mining_pools (id, name, token, difficulty, block_reward, weight, is_active)
VALUES (
  'viabtc',
  'ViaBTC Scrypt',
  'LTC+DOGE+BELLS+LKY+PEP+JKC+DINGO+SHIC',
  65536,
  100.00000000,
  1.0000,
  TRUE
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  token = EXCLUDED.token,
  difficulty = EXCLUDED.difficulty,
  block_reward = EXCLUDED.block_reward,
  weight = EXCLUDED.weight,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify pool was created
SELECT * FROM mining_pools WHERE id = 'viabtc';

-- Update users table to use viabtc pool
UPDATE users
SET preferred_pool = 'viabtc'
WHERE preferred_pool IS NULL OR preferred_pool NOT IN (SELECT id FROM mining_pools);

-- Set default for new users
ALTER TABLE users ALTER COLUMN preferred_pool SET DEFAULT 'viabtc';
