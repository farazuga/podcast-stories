// Direct Database Migration Runner
// Purpose: Run migrations without needing server restart
// Usage: node run-migration-direct.js

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Try to import the database configuration from the app
let pool;
try {
  const config = require('./config/environment');
  pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} catch (configError) {
  // Fallback to direct environment
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running direct database migration...');
    
    // Read the constraint fix migration
    const migrationPath = path.join(__dirname, 'migrations', '017_fix_constraint_syntax.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Constraint fixes applied successfully');
    
    // Verify schema state
    const schemaCheck = await client.query(`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_name IN ('courses', 'lessons', 'quizzes', 'schools')
      AND t.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position
    `);
    
    // Group by table for easy verification
    const tableColumns = {};
    schemaCheck.rows.forEach(row => {
      if (!tableColumns[row.table_name]) tableColumns[row.table_name] = [];
      if (row.column_name) tableColumns[row.table_name].push(row.column_name);
    });
    
    console.log('📊 Schema Verification:');
    Object.entries(tableColumns).forEach(([table, columns]) => {
      console.log(`  ${table}: ${columns.length} columns`);
      
      // Check for key columns we added
      const keyColumns = {
        courses: ['total_weeks', 'difficulty_level', 'prerequisites', 'enrollment_limit'],
        lessons: ['lesson_number', 'difficulty_level', 'requires_completion_of', 'vocabulary_terms'],
        quizzes: ['attempts_allowed', 'time_limit'],
        schools: ['name']
      };
      
      if (keyColumns[table]) {
        const missing = keyColumns[table].filter(col => !columns.includes(col));
        if (missing.length === 0) {
          console.log(`    ✅ All expected columns present`);
        } else {
          console.log(`    ❌ Missing: ${missing.join(', ')}`);
        }
      }
    });
    
    console.log('🎉 Database schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };