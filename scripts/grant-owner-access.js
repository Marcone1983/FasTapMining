const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const OWNER_WALLET = 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR';

(async () => {
  try {
    console.log('🔍 Searching for owner wallet:', OWNER_WALLET);

    // Find user with owner wallet
    const { rows } = await pool.query(`
      SELECT id, telegram_id, username, wallet_address, has_lifetime_access
      FROM users
      WHERE UPPER(REPLACE(wallet_address, ' ', '')) = UPPER(REPLACE($1, ' ', ''))
      LIMIT 1
    `, [OWNER_WALLET]);

    if (rows.length === 0) {
      console.log('⚠️  No user found with owner wallet');
      console.log('💡 Make sure you connected your wallet in the app first');
    } else {
      const user = rows[0];
      console.log('\n✅ Owner found:');
      console.log('  Telegram ID:', user.telegram_id);
      console.log('  Username:', user.username);
      console.log('  Has Lifetime Access:', user.has_lifetime_access);

      if (!user.has_lifetime_access) {
        // Grant lifetime access
        await pool.query(`
          UPDATE users
          SET has_lifetime_access = TRUE,
              lifetime_access_granted_at = NOW()
          WHERE id = $1
        `, [user.id]);

        console.log('\n🎉 LIFETIME ACCESS GRANTED!');
        console.log('✅ Owner can now use the app without paywall');
      } else {
        console.log('\n✅ Owner already has lifetime access');
      }
    }

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
