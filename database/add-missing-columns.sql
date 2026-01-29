-- Add missing columns to users table for production functionality

-- Add hashrate column (current mining hashrate)
ALTER TABLE users ADD COLUMN IF NOT EXISTS hashrate DECIMAL(18, 2) DEFAULT 0;

-- Add wallet columns for multi-coin support
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_ton VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_bells VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_lky VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pep VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_jkc VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_dingo VARCHAR(66);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_shic VARCHAR(66);

-- Add lifetime access granted timestamp
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_access_granted_at TIMESTAMPTZ;

-- Create index for hashrate queries
CREATE INDEX IF NOT EXISTS idx_users_hashrate ON users(hashrate DESC) WHERE hashrate > 0;

-- Create index for lifetime access users
CREATE INDEX IF NOT EXISTS idx_users_lifetime_access ON users(has_lifetime_access) WHERE has_lifetime_access = TRUE;
