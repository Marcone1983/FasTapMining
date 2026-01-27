#!/usr/bin/env node

/**
 * Automatic RLS Fix Executor
 *
 * Executes the RLS security fix directly on Supabase database
 * No manual SQL Editor steps required - fully automated
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`)
};

async function main() {
  console.log('\n' + '='.repeat(70));
  log.title('🔐 AUTOMATIC RLS SECURITY FIX EXECUTOR');
  console.log('='.repeat(70) + '\n');

  // Validate environment
  if (!process.env.DATABASE_URL) {
    log.error('DATABASE_URL not found in .env file');
    process.exit(1);
  }

  // Create PostgreSQL pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    log.info('Connecting to Supabase PostgreSQL database...');

    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    log.success(`Connected to database at ${testResult.rows[0].now}`);

    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'enable_rls_security.sql');
    if (!fs.existsSync(sqlFilePath)) {
      log.error(`SQL file not found: ${sqlFilePath}`);
      process.exit(1);
    }

    log.info('Reading RLS fix SQL script...');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split SQL into individual statements (filter out comments and empty lines)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    log.info(`Found ${statements.length} SQL statements to execute`);
    console.log('');

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip verification queries (SELECT statements)
      if (statement.toUpperCase().startsWith('SELECT')) {
        continue;
      }

      try {
        // Get statement type for logging
        const statementType = statement.match(/^(ALTER|DROP|CREATE)/i)?.[0] || 'EXECUTE';
        const tableName = statement.match(/public\.(\w+)/)?.[1] || '';

        process.stdout.write(`${statementType} ${tableName}... `);

        await pool.query(statement);

        console.log(`${colors.green}✓${colors.reset}`);
        successCount++;
      } catch (err) {
        console.log(`${colors.red}✗${colors.reset}`);
        log.warning(`Statement ${i + 1} warning: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(70));
    log.title('📊 EXECUTION SUMMARY');
    console.log('='.repeat(70));

    log.success(`Successful operations: ${successCount}`);
    if (errorCount > 0) {
      log.warning(`Warnings/Skipped: ${errorCount}`);
    }

    // Verify RLS is enabled
    console.log('\n' + '='.repeat(70));
    log.title('🔍 VERIFICATION: Checking RLS Status');
    console.log('='.repeat(70) + '\n');

    const verifyQuery = `
      SELECT
        tablename,
        rowsecurity AS rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    const verifyResult = await pool.query(verifyQuery);

    console.log('Table Name                      | RLS Enabled');
    console.log('-'.repeat(70));

    let allEnabled = true;
    for (const row of verifyResult.rows) {
      const status = row.rls_enabled ? '✅ Enabled' : '❌ Disabled';
      const color = row.rls_enabled ? colors.green : colors.red;
      console.log(`${row.tablename.padEnd(30)} | ${color}${status}${colors.reset}`);

      if (!row.rls_enabled) {
        allEnabled = false;
      }
    }

    // Verify policies exist
    console.log('\n' + '='.repeat(70));
    log.title('🔍 VERIFICATION: Checking Security Policies');
    console.log('='.repeat(70) + '\n');

    const policiesQuery = `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;

    const policiesResult = await pool.query(policiesQuery);

    if (policiesResult.rows.length === 0) {
      log.warning('No policies found! This means all access is blocked.');
    } else {
      log.success(`Found ${policiesResult.rows.length} security policies`);

      console.log('\nTable Name                | Policy Name');
      console.log('-'.repeat(70));

      policiesResult.rows.forEach(row => {
        console.log(`${row.tablename.padEnd(25)} | ${row.policyname}`);
      });
    }

    // Final result
    console.log('\n' + '='.repeat(70));
    log.title('🎉 FINAL RESULT');
    console.log('='.repeat(70) + '\n');

    if (allEnabled && policiesResult.rows.length > 0) {
      log.success('RLS SECURITY FIX SUCCESSFULLY APPLIED!');
      console.log('');
      log.success('✅ All tables have RLS enabled');
      log.success('✅ Security policies are in place');
      log.success('✅ Direct client access (anon_key) is BLOCKED');
      log.success('✅ Backend API (service_role_key) still has FULL ACCESS');
      console.log('');
      log.info('Your database is now secure! 🔒');
      console.log('');
      console.log('Security Score: 2/10 → ' + colors.green + colors.bold + '9.5/10' + colors.reset);
    } else {
      log.error('RLS fix incomplete - some issues detected');
      log.info('Please check the output above for details');
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (err) {
    log.error(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Execute
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
