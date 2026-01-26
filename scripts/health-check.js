require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');

async function healthCheck() {
  console.log('\n🏥 Running Health Checks...\n');

  const checks = {
    database: false,
    changenow: false,
    toncenter: false,
    envVars: false
  };

  // Check environment variables
  console.log('1️⃣ Checking environment variables...');
  const requiredVars = [
    'DATABASE_URL',
    'TOKEN_API_BOT',
    'CHANGENOW_API_KEY',
    'TONCENTER_API_KEY',
    'OWNER_WALLET_TON'
  ];

  let envOk = true;
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`   ❌ Missing: ${varName}`);
      envOk = false;
    }
  }

  if (envOk) {
    console.log('   ✅ All required environment variables present');
    checks.envVars = true;
  } else {
    console.log('   ❌ Missing required environment variables');
  }

  // Check database connection
  console.log('\n2️⃣ Checking database connection...');
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await pool.query('SELECT NOW()');
    console.log('   ✅ Database connection successful');
    checks.database = true;
    await pool.end();
  } catch (error) {
    console.error('   ❌ Database connection failed:', error.message);
  }

  // Check ChangeNOW API
  console.log('\n3️⃣ Checking ChangeNOW API...');
  try {
    const response = await axios.get('https://api.changenow.io/v2/exchange/currencies', {
      params: { active: true },
      headers: { 'x-changenow-api-key': process.env.CHANGENOW_API_KEY },
      timeout: 5000
    });

    if (response.status === 200) {
      console.log('   ✅ ChangeNOW API accessible');
      checks.changenow = true;
    }
  } catch (error) {
    console.error('   ❌ ChangeNOW API failed:', error.message);
  }

  // Check TON Center API
  console.log('\n4️⃣ Checking TON Center API...');
  try {
    const response = await axios.get('https://toncenter.com/api/v2/getMasterchainInfo', {
      params: { api_key: process.env.TONCENTER_API_KEY },
      timeout: 5000
    });

    if (response.data.ok) {
      console.log('   ✅ TON Center API accessible');
      checks.toncenter = true;
    }
  } catch (error) {
    console.error('   ❌ TON Center API failed:', error.message);
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Health Check Summary');
  console.log('═'.repeat(60));

  const allPassed = Object.values(checks).every(check => check === true);

  Object.entries(checks).forEach(([name, status]) => {
    console.log(`${status ? '✅' : '❌'} ${name.padEnd(20)} - ${status ? 'OK' : 'FAILED'}`);
  });

  console.log('═'.repeat(60));

  if (allPassed) {
    console.log('\n🎉 All health checks passed! System is ready.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some health checks failed. Please fix the issues above.\n');
    process.exit(1);
  }
}

healthCheck().catch(error => {
  console.error('\n❌ Health check error:', error.message);
  process.exit(1);
});
