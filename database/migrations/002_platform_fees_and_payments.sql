-- Platform fees tracking table
CREATE TABLE IF NOT EXISTS platform_fees (
  id BIGSERIAL PRIMARY KEY,
  coin VARCHAR(10) NOT NULL,
  amount DECIMAL(24, 8) NOT NULL,
  owner_wallet VARCHAR(100),
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  paid_out BOOLEAN DEFAULT FALSE,
  paid_out_at TIMESTAMPTZ,
  payout_tx_hash VARCHAR(100)
);

CREATE INDEX idx_platform_fees_coin ON platform_fees(coin);
CREATE INDEX idx_platform_fees_paid_out ON platform_fees(paid_out);
CREATE INDEX idx_platform_fees_collected_at ON platform_fees(collected_at DESC);

-- Lifetime access payments
CREATE TABLE IF NOT EXISTS lifetime_access_payments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(18, 8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TON',
  payment_address VARCHAR(100) NOT NULL,
  tx_hash VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE INDEX idx_lifetime_payments_user ON lifetime_access_payments(user_id);
CREATE INDEX idx_lifetime_payments_status ON lifetime_access_payments(status);
CREATE INDEX idx_lifetime_payments_tx_hash ON lifetime_access_payments(tx_hash);

-- Marketplace purchases
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- autotap_tier1, autotap_tier2, multiplier_2x, etc.
  price DECIMAL(18, 8) NOT NULL,
  currency VARCHAR(10) DEFAULT 'TON',
  payment_address VARCHAR(100) NOT NULL,
  tx_hash VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  activated_at TIMESTAMPTZ,
  expires_on TIMESTAMPTZ -- for time-limited items
);

CREATE INDEX idx_marketplace_user ON marketplace_purchases(user_id);
CREATE INDEX idx_marketplace_status ON marketplace_purchases(status);
CREATE INDEX idx_marketplace_item_type ON marketplace_purchases(item_type);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  referred_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  reward_given BOOLEAN DEFAULT FALSE,
  reward_amount JSONB, -- {LTC: 0.001, DOGE: 0.1, ...}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);

-- User wallet addresses for receiving mining rewards
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_bells VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_lky VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pep VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_jkc VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_dingo VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_shic VARCHAR(100);

-- System configuration
INSERT INTO system_config (key, value, description) VALUES
  ('platform_fee_wallets', '{
    "TON": "UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR",
    "BELLS": "B5K4zaWC2rUFJfbGbxwHqF9TLRCysiuYDV",
    "LKY": "LSW7zztEWjjCRoWuTwcX28joihrxarZE2u",
    "PEP": "PaS36tR8PgkKtahY1BFXLjUwYYRPpHh6u3",
    "JKC": "JcnYtBb8Erk9Z3ttxLq2G3yrnBxqvBG9vb",
    "DINGO": "DGrJyvBfcdmeZ1sVyN1hbftCBfBAJs1MfB",
    "SHIC": "SjKVZNGwmYqQTqHV1pDgonjinPayCaR5gB"
  }', 'Platform owner wallet addresses for 5% fee collection')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO system_config (key, value, description) VALUES
  ('pricing', '{
    "lifetime_access": 1.0,
    "autotap_tier1": 0.5,
    "autotap_tier2": 1.0,
    "autotap_tier3": 2.0,
    "multiplier_2x": 0.3,
    "multiplier_5x": 0.8,
    "multiplier_10x": 1.5
  }', 'Marketplace pricing in TON')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO system_config (key, value, description) VALUES
  ('referral_rewards', '{
    "referrer": {"LTC": 0.001, "DOGE": 1.0, "TON": 0.1},
    "referred": {"LTC": 0.0005, "DOGE": 0.5, "TON": 0.05}
  }', 'Referral rewards for referrer and referred users')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
