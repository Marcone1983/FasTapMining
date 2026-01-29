/**
 * Environment Variable Validation
 * Enterprise-grade startup validation
 */

const REQUIRED_VARS = {
  // Bot
  'TOKEN_API_BOT': 'Telegram Bot API Token',

  // Database
  'SUPABASE_URL': 'Supabase PostgreSQL connection URL',
  'SUPABASE_KEY': 'Supabase API key',
  'DB_HOST': 'Database host',
  'DB_PORT': 'Database port',
  'DB_NAME': 'Database name',
  'DB_USER': 'Database user',
  'DB_PASSWORD': 'Database password',

  // Owner/Admin
  'OWNER_TELEGRAM_IDS': 'Owner Telegram IDs (comma-separated)',
  'OWNER_WALLET_TON': 'Owner TON wallet address',
  'ADMIN_KEY': 'Admin API key',

  // External APIs
  'TONCENTER_API_KEY': 'TON Center API key for blockchain queries',

  // Application
  'WEBAPP_URL': 'Web application URL',
  'NODE_ENV': 'Node environment (production/development)'
};

const OPTIONAL_VARS = {
  'LIFETIME_ACCESS_PRICE': 'Lifetime access price in TON (default: 1.0)',
  'CHANGENOW_API_KEY': 'ChangeNOW API key for crypto conversion',
  'VIABTC_WORKER_NAME': 'ViaBTC worker name (default: FasTapMining.001)',
  'LOG_LEVEL': 'Logging level (default: info)'
};

/**
 * Validate required environment variables
 * @throws {Error} If required variables are missing
 */
function validateEnv() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const [varName, description] of Object.entries(REQUIRED_VARS)) {
    if (!process.env[varName]) {
      missing.push(`${varName} - ${description}`);
    }
  }

  // Check optional variables
  for (const [varName, description] of Object.entries(OPTIONAL_VARS)) {
    if (!process.env[varName]) {
      warnings.push(`${varName} - ${description}`);
    }
  }

  // Validate specific formats
  if (process.env.OWNER_TELEGRAM_IDS) {
    const ids = process.env.OWNER_TELEGRAM_IDS.split(',').map(id => id.trim());
    const invalidIds = ids.filter(id => !/^\d+$/.test(id));
    if (invalidIds.length > 0) {
      missing.push(`OWNER_TELEGRAM_IDS contains invalid IDs: ${invalidIds.join(', ')}`);
    }
  }

  if (process.env.OWNER_WALLET_TON) {
    const wallet = process.env.OWNER_WALLET_TON;
    if (!wallet.match(/^(UQ|EQ)[A-Za-z0-9_-]{46}$/)) {
      missing.push('OWNER_WALLET_TON has invalid format (expected TON address)');
    }
  }

  if (process.env.DB_PORT) {
    const port = parseInt(process.env.DB_PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      missing.push('DB_PORT must be a valid port number (1-65535)');
    }
  }

  // Report results
  if (missing.length > 0) {
    console.error('\n❌ ENVIRONMENT VALIDATION FAILED\n');
    console.error('Missing or invalid required variables:\n');
    missing.forEach(msg => console.error(`  ❌ ${msg}`));
    console.error('\nApplication cannot start. Fix environment configuration.\n');
    throw new Error('Environment validation failed');
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  OPTIONAL ENVIRONMENT VARIABLES NOT SET\n');
    warnings.forEach(msg => console.warn(`  ⚠️  ${msg}`));
    console.warn('\nUsing default values.\n');
  }

  console.log('✅ Environment validation passed\n');
}

/**
 * Get environment configuration summary
 */
function getEnvSummary() {
  return {
    nodeEnv: process.env.NODE_ENV,
    hasDatabase: !!process.env.SUPABASE_URL,
    hasBotToken: !!process.env.TOKEN_API_BOT,
    hasOwner: !!process.env.OWNER_TELEGRAM_IDS,
    hasTonAPI: !!process.env.TONCENTER_API_KEY,
    hasAdmin: !!process.env.ADMIN_KEY
  };
}

module.exports = {
  validateEnv,
  getEnvSummary,
  REQUIRED_VARS,
  OPTIONAL_VARS
};
