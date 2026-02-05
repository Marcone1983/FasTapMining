#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function checkPools() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const { rows } = await pool.query('SELECT id, name, token, is_active, difficulty, block_reward, weight FROM mining_pools ORDER BY id');

    console.log('\n📊 Mining Pools in Database:\n');

    if (rows.length === 0) {
      console.log('❌ No pools found in database!');
      console.log('\nYou need to create the ViaBTC pool.');
      console.log('\nRun this SQL:');
      console.log('psql $DATABASE_URL -f database/fix-pools-viabtc.sql');
    } else {
      rows.forEach(p => {
        console.log(`${p.is_active ? '✅' : '❌'} ID: ${p.id} | Name: ${p.name} | Token: ${p.token} | Weight: ${p.weight}`);
      });
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkPools();
