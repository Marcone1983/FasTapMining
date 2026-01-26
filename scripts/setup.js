#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 FasTap Mining - Automated Setup                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

function exec(command, description) {
  console.log(`\n⚙️  ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} - Done`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Failed`);
    return false;
  }
}

function checkEnvVariable(varName) {
  if (!process.env[varName]) {
    console.error(`❌ Missing environment variable: ${varName}`);
    return false;
  }
  console.log(`✅ Found: ${varName}`);
  return true;
}

async function setup() {
  console.log('\n📋 Step 1: Checking Environment Variables\n');

  const requiredVars = [
    'DATABASE_URL',
    'TOKEN_API_BOT',
    'OWNER_WALLET_TON',
    'OWNER_WALLET_BELLS',
    'OWNER_WALLET_LKY',
    'OWNER_WALLET_PEP',
    'OWNER_WALLET_JKC',
    'OWNER_WALLET_DINGO',
    'OWNER_WALLET_SHIC',
    'CHANGENOW_API_KEY',
    'TONCENTER_API_KEY',
    'ADMIN_KEY'
  ];

  let allVarsPresent = true;
  for (const varName of requiredVars) {
    if (!checkEnvVariable(varName)) {
      allVarsPresent = false;
    }
  }

  if (!allVarsPresent) {
    console.error('\n❌ Missing required environment variables!');
    console.error('Please set them in .env file or environment.');
    process.exit(1);
  }

  console.log('\n📋 Step 2: Installing Dependencies\n');
  if (!exec('npm install', 'Installing npm packages')) {
    process.exit(1);
  }

  console.log('\n📋 Step 3: Running Database Migrations\n');
  if (!exec('npm run migrate', 'Running database migrations')) {
    process.exit(1);
  }

  console.log('\n📋 Step 4: Creating Logs Directory\n');
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✅ Logs directory created');
  } else {
    console.log('✅ Logs directory already exists');
  }

  console.log('\n📋 Step 5: Installing PM2 (Process Manager)\n');
  try {
    execSync('which pm2', { stdio: 'ignore' });
    console.log('✅ PM2 already installed');
  } catch {
    if (!exec('npm install -g pm2', 'Installing PM2 globally')) {
      console.warn('⚠️  PM2 installation failed - you may need to install it manually');
    }
  }

  console.log('\n📋 Step 6: Health Check\n');
  exec('npm run health', 'Running health check');

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ✅ Setup Complete!                                         ║
║                                                               ║
║   Next Steps:                                                ║
║   1. Start bot: npm run bot                                  ║
║   2. Start workers: npm run workers                          ║
║   3. Check logs: npm run workers:logs                        ║
║                                                               ║
║   Or use PM2 directly:                                       ║
║   pm2 start ecosystem.config.js                              ║
║   pm2 logs                                                   ║
║   pm2 monit                                                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

setup().catch(error => {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
});
