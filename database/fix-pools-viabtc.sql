-- 🔥 FIX CRITICAL: Replace fake pools with REAL ViaBTC Scrypt pool
-- ViaBTC mines 8 tokens simultaneously via merge mining

-- Delete fake pools
DELETE FROM mining_pools WHERE id IN ('minex', 'tbtc', 'mrdn');

-- Create REAL ViaBTC Scrypt pool for 8-coin merge mining
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
  is_active = EXCLUDED.is_active;

-- Verify
SELECT * FROM mining_pools WHERE id = 'viabtc';

-- Update users default pool preference
UPDATE users SET preferred_pool = 'viabtc' WHERE preferred_pool = 'minex' OR preferred_pool IS NULL;

-- Update schema default for new users
ALTER TABLE users ALTER COLUMN preferred_pool SET DEFAULT 'viabtc';
