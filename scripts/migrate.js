require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  console.log('🔄 Starting database migrations...\n');

  const migrationsDir = path.join(__dirname, '../database/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('⚠️  No migration files found');
    await pool.end();
    return;
  }

  // Create migrations tracking table if not exists
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (error) {
    console.error('❌ Error creating migrations table:', error.message);
    await pool.end();
    process.exit(1);
  }

  // Get already executed migrations
  const executedResult = await pool.query('SELECT filename FROM migrations');
  const executedMigrations = new Set(executedResult.rows.map(row => row.filename));

  // Run pending migrations
  for (const filename of migrationFiles) {
    if (executedMigrations.has(filename)) {
      console.log(`⏭️  Skipping ${filename} (already executed)`);
      continue;
    }

    console.log(`⚙️  Running migration: ${filename}`);

    const filePath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
      await pool.query('COMMIT');

      console.log(`✅ Successfully executed: ${filename}\n`);
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error(`❌ Error executing ${filename}:`, error.message);
      await pool.end();
      process.exit(1);
    }
  }

  console.log('🎉 All migrations completed successfully!');
  await pool.end();
  process.exit(0);
}

runMigrations().catch(error => {
  console.error('❌ Migration error:', error);
  process.exit(1);
});
