-- 👑 GRANT OWNER ACCESS + SET WALLETS - EXECUTE NOW!
-- Run this in Supabase SQL Editor

-- Set owner with lifetime access and all wallets
UPDATE users
SET
  has_lifetime_access = TRUE,
  lifetime_access_granted_at = NOW(),
  wallet_address = 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR',
  wallet_ton = 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR',
  wallet_bells = 'B5K4zaWC2rUFJfbGbxwHqF9TLRCysiuYDV',
  wallet_lky = 'LSW7zztEWjjCRoWuTwcX28joihrxarZE2u',
  wallet_pep = 'PaS36tR8PgkKtahY1BFXLjUwYYRPpHh6u3',
  wallet_jkc = 'JcnYtBb8Erk9Z3ttxLq2G3yrnBxqvBG9vb',
  wallet_dingo = 'DGrJyvBfcdmeZ1sVyN1hbftCBfBAJs1MfB',
  wallet_shic = 'SjKVZNGwmYqQTqHV1pDgonjinPayCaR5gB'
WHERE telegram_id = '856208904';

-- Verify it worked
SELECT
  telegram_id,
  has_lifetime_access,
  wallet_address,
  wallet_ton,
  wallet_bells,
  wallet_lky,
  wallet_pep,
  wallet_jkc,
  wallet_dingo,
  wallet_shic
FROM users
WHERE telegram_id = '856208904';
