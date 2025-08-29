// Fix Missing Schema Columns
// Purpose: Add the remaining columns that weren't applied in the comprehensive migration
// Usage: node fix-missing-schema.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/podcast_stories',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixMissingSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing missing schema columns...\n');
    
    // Fix quizzes table - add missing columns
    console.log('📝 Updating quizzes table:');
    try {
      await client.query(`
        ALTER TABLE quizzes 
        ADD COLUMN IF NOT EXISTS attempts_allowed INTEGER DEFAULT 3,
        ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30
      `);
      console.log('   ✅ Added attempts_allowed and time_limit columns');
    } catch (error) {
      console.log('   ⚠️ Quizzes update error:', error.message);
    }
    
    // Update existing quiz records with defaults
    try {
      const quizUpdateResult = await client.query(`
        UPDATE quizzes 
        SET attempts_allowed = COALESCE(max_attempts, 3),
            time_limit = COALESCE(time_limit_minutes, 30)
        WHERE attempts_allowed IS NULL OR time_limit IS NULL
      `);
      console.log(`   ✅ Updated ${quizUpdateResult.rowCount} existing quiz records`);
    } catch (error) {
      console.log('   ⚠️ Quiz update error:', error.message);
    }
    
    // Fix schools table - add missing name column
    console.log('\n🏫 Updating schools table:');
    try {
      await client.query(`
        ALTER TABLE schools 
        ADD COLUMN IF NOT EXISTS name VARCHAR(255)
      `);
      console.log('   ✅ Added name column');
    } catch (error) {
      console.log('   ⚠️ Schools update error:', error.message);
    }
    
    // Update existing school records
    try {
      const schoolUpdateResult = await client.query(`
        UPDATE schools 
        SET name = school_name 
        WHERE name IS NULL AND school_name IS NOT NULL
      `);
      console.log(`   ✅ Updated ${schoolUpdateResult.rowCount} existing school records`);
    } catch (error) {
      console.log('   ⚠️ School name update error:', error.message);
    }
    
    // Verify the fixes
    console.log('\n🔍 Verifying fixes:');
    
    const verificationQueries = [
      {
        name: 'quizzes columns',
        query: `SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'quizzes' AND column_name IN ('attempts_allowed', 'time_limit')`
      },
      {
        name: 'schools columns', 
        query: `SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'schools' AND column_name = 'name'`
      }
    ];
    
    for (const check of verificationQueries) {
      const result = await client.query(check.query);
      console.log(`   ${result.rows.length > 0 ? '✅' : '❌'} ${check.name}: ${result.rows.length} columns found`);
    }
    
    console.log('\n🎉 Missing schema fixes completed successfully!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixMissingSchema().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { fixMissingSchema };