// One-time setup endpoint to create missing database tables
const db = require('../database/db');
const logger = require('../utils/logger').loggers.api;

module.exports = async (req, res) => {
  // Security: only allow in development or with secret key
  const setupKey = req.query.key;
  if (setupKey !== 'fastap-setup-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    logger.info('[SETUP] Creating missing tables...');

    // Create user_achievements table
    await db.query(`
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

    logger.info('[SETUP] user_achievements table created');

    // Create marketplace_purchases if not exists
    await db.query(`
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

    logger.info('[SETUP] marketplace_purchases table created');

    // Verify tables exist
    const { rows } = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user_achievements', 'marketplace_purchases')
      ORDER BY table_name
    `);

    res.status(200).json({
      success: true,
      message: 'Setup completed successfully',
      tables: rows.map(r => r.table_name)
    });

  } catch (error) {
    logger.error('[SETUP] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
