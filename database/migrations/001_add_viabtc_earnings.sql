-- Add table for real ViaBTC earnings
CREATE TABLE IF NOT EXISTS viabtc_earnings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  coin VARCHAR(10) NOT NULL, -- LTC, DOGE, BELLS, LKY, PEP, JKC, DINGO, SHIC
  amount DECIMAL(24, 8) NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  distributed BOOLEAN DEFAULT FALSE,
  distributed_at TIMESTAMPTZ
);

CREATE INDEX idx_viabtc_earnings_user ON viabtc_earnings(user_id);
CREATE INDEX idx_viabtc_earnings_coin ON viabtc_earnings(coin);
CREATE INDEX idx_viabtc_earnings_distributed ON viabtc_earnings(distributed);

-- Add column to track total ViaBTC earnings per coin
ALTER TABLE user_balances ADD COLUMN IF NOT EXISTS viabtc_earned DECIMAL(24, 8) DEFAULT 0;

-- Add ViaBTC stats to system_config
INSERT INTO system_config (key, value, description) VALUES
  ('viabtc_pool', '{"host": "ltc.viabtc.io", "port": 3333, "algorithm": "scrypt", "coins": ["LTC", "DOGE", "BELLS", "LKY", "PEP", "JKC", "DINGO", "SHIC"]}', 'ViaBTC pool configuration')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Add reward rate config (how real earnings convert to game tokens)
INSERT INTO system_config (key, value, description) VALUES
  ('viabtc_reward_rates', '{"LTC": 1.0, "DOGE": 0.5, "BELLS": 0.3, "LKY": 0.3, "PEP": 0.3, "JKC": 0.2, "DINGO": 0.2, "SHIC": 0.2}', 'ViaBTC coin reward multipliers')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
