#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const testConnection = async () => {
  console.log('Testing database connection...\n');
  console.log('Using credentials from .env:');
  console.log('- Host:', process.env.DB_HOST);
  console.log('- Port:', process.env.DB_PORT);
  console.log('- Database:', process.env.DB_NAME);
  console.log('- User:', process.env.DB_USER);
  console.log('- Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : 'NOT SET');
  console.log();

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    console.log('✅ CONNECTION SUCCESSFUL!');
    console.log('Server time:', result.rows[0].time);
    console.log('PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    process.exit(0);
  } catch (error) {
    console.log('❌ CONNECTION FAILED!');
    console.log('Error:', error.message);
    console.log();

    if (error.message.includes('password authentication failed')) {
      console.log('🔧 SOLUTION: Update the DB_PASSWORD in your .env file');
      console.log();
      console.log('To get the correct password:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Select your project: rjrayejemhxuqpydwgcd');
      console.log('3. Go to Settings → Database');
      console.log('4. Find "Database password" or reset it');
      console.log('5. Update .env file with the new password');
      console.log('6. Restart the bot: pm2 restart fastap-bot');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
};

testConnection();
