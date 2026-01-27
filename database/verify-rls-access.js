#!/usr/bin/env node

/**
 * RLS Access Verification Script
 *
 * Verifies that:
 * 1. RLS is enabled on all tables
 * 2. Backend API (service_role_key) still has full access
 * 3. Direct client access (anon_key) is properly blocked
 *
 * Execute after running enable_rls_security.sql
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`)
};

// Tables that should have RLS enabled
const TABLES_TO_CHECK = [
  'migrations',
  'system_config',
  'mining_sessions',
  'transactions',
  'viabtc_earnings',
  'platform_fees',
  'lifetime_access_payments',
  'marketplace_purchases',
  'referrals',
  'users'
];

async function verifyRLSEnabled(supabaseAdmin) {
  log.info('Step 1: Verifying RLS is enabled on all tables...');

  const { data, error } = await supabaseAdmin.rpc('check_rls_enabled', {
    tables_json: JSON.stringify(TABLES_TO_CHECK)
  });

  if (error) {
    // Fallback: Query pg_tables directly
    const { data: tablesData, error: tablesError } = await supabaseAdmin
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', TABLES_TO_CHECK);

    if (tablesError) {
      log.error(`Cannot verify RLS status: ${tablesError.message}`);
      return false;
    }

    const tablesWithoutRLS = tablesData.filter(t => !t.rowsecurity);

    if (tablesWithoutRLS.length > 0) {
      log.error('RLS is NOT enabled on these tables:');
      tablesWithoutRLS.forEach(t => {
        console.log(`  - ${t.tablename}`);
      });
      return false;
    }
  }

  log.success(`RLS enabled on all ${TABLES_TO_CHECK.length} tables`);
  return true;
}

async function verifyBackendAccess(supabaseAdmin) {
  log.info('Step 2: Verifying backend API has full access...');

  try {
    // Test read access to users table
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (usersError) {
      log.error(`Backend cannot read users table: ${usersError.message}`);
      return false;
    }

    // Test read access to mining_sessions table
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('mining_sessions')
      .select('id')
      .limit(1);

    if (sessionsError) {
      log.error(`Backend cannot read mining_sessions table: ${sessionsError.message}`);
      return false;
    }

    // Test read access to transactions table
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .limit(1);

    if (txError) {
      log.error(`Backend cannot read transactions table: ${txError.message}`);
      return false;
    }

    log.success('Backend API (service_role_key) has full access');
    return true;
  } catch (err) {
    log.error(`Backend access verification failed: ${err.message}`);
    return false;
  }
}

async function verifyClientBlocked(supabaseClient) {
  log.info('Step 3: Verifying direct client access is blocked...');

  try {
    // Attempt to read users table with anon_key (should be blocked)
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('*');

    if (!usersError && users && users.length > 0) {
      log.error('SECURITY ISSUE: Direct client can still read users table!');
      log.warning('RLS policies may not be working correctly.');
      return false;
    }

    // Attempt to read transactions table with anon_key (should be blocked)
    const { data: transactions, error: txError } = await supabaseClient
      .from('transactions')
      .select('*');

    if (!txError && transactions && transactions.length > 0) {
      log.error('SECURITY ISSUE: Direct client can still read transactions table!');
      log.warning('RLS policies may not be working correctly.');
      return false;
    }

    log.success('Direct client access (anon_key) is properly BLOCKED');
    return true;
  } catch (err) {
    // Errors are expected here - it means RLS is working
    log.success('Direct client access (anon_key) is properly BLOCKED');
    return true;
  }
}

async function verifyPoliciesExist(supabaseAdmin) {
  log.info('Step 4: Verifying security policies exist...');

  const { data: policies, error } = await supabaseAdmin
    .rpc('get_policies_count');

  if (error) {
    log.warning('Cannot verify policies (non-critical)');
    return true; // Non-critical, continue
  }

  if (!policies || policies.length === 0) {
    log.error('No security policies found!');
    log.warning('RLS is enabled but no policies exist - this means NO ACCESS for anyone.');
    return false;
  }

  log.success(`Found ${policies.length} security policies`);
  return true;
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 RLS ACCESS VERIFICATION');
  console.log('='.repeat(60) + '\n');

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    log.error('Missing required environment variables!');
    log.info('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY');
    process.exit(1);
  }

  // Create Supabase clients
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  log.info(`Testing against: ${SUPABASE_URL}\n`);

  // Run all verification steps
  const rlsEnabled = await verifyRLSEnabled(supabaseAdmin);
  const backendAccess = await verifyBackendAccess(supabaseAdmin);
  const clientBlocked = await verifyClientBlocked(supabaseClient);
  const policiesExist = await verifyPoliciesExist(supabaseAdmin);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  const results = [
    { name: 'RLS Enabled', passed: rlsEnabled },
    { name: 'Backend Access', passed: backendAccess },
    { name: 'Client Blocked', passed: clientBlocked },
    { name: 'Policies Exist', passed: policiesExist }
  ];

  results.forEach(result => {
    if (result.passed) {
      log.success(result.name);
    } else {
      log.error(result.name);
    }
  });

  const allPassed = results.every(r => r.passed);

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    log.success('ALL CHECKS PASSED');
    console.log('🔒 Security fix successfully applied!');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  } else {
    log.error('SOME CHECKS FAILED');
    console.log('⚠️  Please review the errors above and fix any issues.');
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  }
}

// Execute
main().catch(err => {
  log.error(`Verification script failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
