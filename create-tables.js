require('dotenv').config();
const { Pool } = require('pg');

async function createTables() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Creating missing tables...\n');

    // Create mining_shares table (THIS IS THE CRITICAL ONE!)
    console.log('   Creating mining_shares...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mining_shares (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pool_id VARCHAR(20) NOT NULL REFERENCES mining_pools(id),
        shares BIGINT NOT NULL DEFAULT 0,
        taps INT NOT NULL DEFAULT 0,
        hashrate DECIMAL(18, 2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    console.log('   ✅ mining_shares created');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shares_user ON mining_shares(user_id);
      CREATE INDEX IF NOT EXISTS idx_shares_pool ON mining_shares(pool_id);
      CREATE INDEX IF NOT EXISTS idx_shares_expires ON mining_shares(expires_at);
      CREATE INDEX IF NOT EXISTS idx_shares_user_pool ON mining_shares(user_id, pool_id);
    `);

    // Create blocks table
    console.log('   Creating blocks...');
    await pool.query(`
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
      )
    `);
    console.log('   ✅ blocks created');

    // Create user_balances table
    console.log('   Creating user_balances...');
    await pool.query(`
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
      )
    `);
    console.log('   ✅ user_balances created');

    // Create marketplace_purchases table
    console.log('   Creating marketplace_purchases...');
    await pool.query(`
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
      )
    `);
    console.log('   ✅ marketplace_purchases created');

    // Create transactions table
    console.log('   Creating transactions...');
    await pool.query(`
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
      )
    `);
    console.log('   ✅ transactions created');

    // Create referrals table
    console.log('   Creating referrals...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id BIGSERIAL PRIMARY KEY,
        referrer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_amount DECIMAL(18, 8) DEFAULT 0,
        total_earned DECIMAL(18, 8) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(referrer_id, referred_id)
      )
    `);
    console.log('   ✅ referrals created');

    // Create user_achievements table
    console.log('   Creating user_achievements...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        earned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, achievement_name)
      )
    `);
    console.log('   ✅ user_achievements created');

    console.log('\n✅ All tables created successfully!\n');

    // Verify
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('mining_shares', 'blocks', 'user_balances', 'marketplace_purchases', 'transactions', 'referrals', 'user_achievements')
      ORDER BY table_name
    `);

    console.log('📊 Created tables:');
    rows.forEach(row => console.log(`   ✅ ${row.table_name}`));

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createTables();
