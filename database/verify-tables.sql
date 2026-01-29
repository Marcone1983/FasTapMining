-- ============================================
-- VERIFY ALL TABLES EXIST IN SUPABASE
-- Execute this in Supabase SQL Editor to check everything
-- ============================================

-- Check which tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IN (
      'users', 'mining_pools', 'mining_shares', 'blocks',
      'user_balances', 'transactions', 'referrals',
      'marketplace_purchases', 'lifetime_access_payments'
    ) THEN '✅ Required'
    ELSE '❓ Optional'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Count rows in each critical table
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'mining_pools', COUNT(*) FROM mining_pools
UNION ALL
SELECT 'mining_shares', COUNT(*) FROM mining_shares
UNION ALL
SELECT 'blocks', COUNT(*) FROM blocks
UNION ALL
SELECT 'user_balances', COUNT(*) FROM user_balances
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 'marketplace_purchases', COUNT(*) FROM marketplace_purchases
UNION ALL
SELECT 'lifetime_access_payments', COUNT(*) FROM lifetime_access_payments;

-- Verify ViaBTC pool exists and is active
SELECT
  id,
  name,
  token,
  difficulty,
  block_reward,
  is_active,
  current_height,
  total_blocks_found
FROM mining_pools
WHERE id = 'viabtc';

-- Check if owner user exists (replace 856208904 with your Telegram ID)
SELECT
  id,
  telegram_id,
  username,
  has_lifetime_access,
  wallet_address,
  total_taps,
  hashrate,
  created_at
FROM users
WHERE telegram_id = '856208904';

-- Check users table columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check mining_shares table columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'mining_shares'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check recent mining_shares (if any)
SELECT
  ms.id,
  u.telegram_id,
  ms.pool_id,
  ms.shares,
  ms.taps,
  ms.hashrate,
  ms.created_at,
  ms.expires_at
FROM mining_shares ms
LEFT JOIN users u ON ms.user_id = u.id
ORDER BY ms.created_at DESC
LIMIT 10;
