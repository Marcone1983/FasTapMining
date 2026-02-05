require('dotenv').config();
const { Pool } = require('pg');

async function checkUser() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('\n🔍 Checking user 856208904...\n');

    const { rows } = await pool.query(
      'SELECT id, telegram_id, username, hashrate, total_taps FROM users WHERE telegram_id = $1',
      [856208904]
    );

    if (rows.length === 0) {
      console.log('❌ User not found in database!');
      console.log('\nUser will be auto-created on first tap.');
    } else {
      const user = rows[0];
      console.log('✅ User found:');
      console.log('   - ID:', user.id);
      console.log('   - Username:', user.username);
      console.log('   - Total Taps:', user.total_taps || 0);
      console.log('   - Hashrate:', user.hashrate || 0);

      // Check mining shares
      const { rows: shares } = await pool.query(
        'SELECT COUNT(*) as count FROM mining_shares WHERE user_id = $1',
        [user.id]
      );
      console.log('   - Mining Shares:', shares[0].count);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkUser();
