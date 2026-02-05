require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

async function executeSql() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📋 Reading SQL file...\n');

    let sql = fs.readFileSync('./database/EXECUTE-ALL-TABLES-NOW.sql', 'utf8');

    // Remove verification queries (SELECT statements at end)
    sql = sql.split('-- VERIFICATION QUERIES')[0];

    console.log('⚙️  Executing SQL...\n');

    await pool.query(sql);

    console.log('✅ All tables created successfully!\n');

    // Now run verification
    console.log('🔍 Verifying tables...\n');

    const { rows } = await pool.query(`
      SELECT 'mining_pools' as table_name, COUNT(*) as count FROM mining_pools
      UNION ALL
      SELECT 'mining_shares', COUNT(*) FROM mining_shares
      UNION ALL
      SELECT 'blocks', COUNT(*) FROM blocks
      UNION ALL
      SELECT 'marketplace_purchases', COUNT(*) FROM marketplace_purchases
      UNION ALL
      SELECT 'user_balances', COUNT(*) FROM user_balances
      UNION ALL
      SELECT 'transactions', COUNT(*) FROM transactions
      UNION ALL
      SELECT 'referrals', COUNT(*) FROM referrals
      UNION ALL
      SELECT 'users', COUNT(*) FROM users
      ORDER BY table_name
    `);

    console.log('📊 Table Status:\n');
    rows.forEach(row => {
      console.log(`   ✅ ${row.table_name.padEnd(25)} ${row.count} records`);
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

executeSql();
