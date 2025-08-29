const db = require('./config/database');

async function fixSchemaMismatch() {
  console.log('🔧 Fixing lesson system schema mismatch...');
  
  try {
    // Add missing columns to courses table
    await db.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS total_weeks INTEGER,
      ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20),
      ADD COLUMN IF NOT EXISTS prerequisites TEXT,
      ADD COLUMN IF NOT EXISTS enrollment_limit INTEGER DEFAULT 30
    `);
    
    // Update total_weeks to match max_weeks for existing records
    await db.query(`
      UPDATE courses SET total_weeks = max_weeks WHERE total_weeks IS NULL
    `);
    
    console.log('✅ Schema mismatch fixed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to fix schema:', error.message);
    process.exit(1);
  }
}

fixSchemaMismatch();