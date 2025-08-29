// Simple Constraint Fix - No Migration Logging
// Purpose: Fix remaining PostgreSQL constraint syntax
// Usage: node fix-constraints-simple.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/podcast_stories',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixConstraints() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Applying constraint fixes...');
    
    // Fix courses table constraint with proper PostgreSQL syntax
    try {
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'courses_total_weeks_positive' 
            AND table_name = 'courses'
          ) THEN
            ALTER TABLE courses ADD CONSTRAINT courses_total_weeks_positive 
            CHECK (total_weeks > 0 AND total_weeks <= 52);
          END IF;
        END $$;
      `);
      console.log('✅ Fixed courses constraint');
    } catch (error) {
      console.log('⚠️ Courses constraint:', error.message);
    }

    // Fix lessons table constraint with proper PostgreSQL syntax  
    try {
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'lessons_lesson_number_positive' 
            AND table_name = 'lessons'
          ) THEN
            ALTER TABLE lessons ADD CONSTRAINT lessons_lesson_number_positive 
            CHECK (lesson_number > 0);
          END IF;
        END $$;
      `);
      console.log('✅ Fixed lessons constraint');
    } catch (error) {
      console.log('⚠️ Lessons constraint:', error.message);
    }
    
    // Verify key schema columns exist
    const schemaCheck = await client.query(`
      SELECT 
        c.table_name,
        string_agg(c.column_name, ', ' ORDER BY c.ordinal_position) as columns
      FROM information_schema.columns c
      WHERE c.table_name IN ('courses', 'lessons', 'quizzes', 'schools')
      AND c.table_schema = 'public'
      GROUP BY c.table_name
      ORDER BY c.table_name
    `);
    
    console.log('📊 Schema Status:');
    schemaCheck.rows.forEach(row => {
      console.log(`  ${row.table_name}: ${row.columns.split(',').length} columns`);
    });
    
    // Check for key columns we need
    const keyColumnCheck = await client.query(`
      SELECT 
        t.table_name,
        CASE 
          WHEN t.table_name = 'courses' THEN 
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'total_weeks') THEN '✅' ELSE '❌' END ||
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'difficulty_level') THEN '✅' ELSE '❌' END
          WHEN t.table_name = 'lessons' THEN
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'lesson_number') THEN '✅' ELSE '❌' END ||
            CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'requires_completion_of') THEN '✅' ELSE '❌' END
          ELSE '✅✅'
        END as status
      FROM information_schema.tables t
      WHERE t.table_name IN ('courses', 'lessons', 'quizzes', 'schools')
      AND t.table_schema = 'public'
      ORDER BY t.table_name
    `);
    
    console.log('🔍 Key Column Status:');
    keyColumnCheck.rows.forEach(row => {
      const allGood = !row.status.includes('❌');
      console.log(`  ${row.table_name}: ${allGood ? '✅ All key columns present' : '⚠️ Some columns missing'}`);
    });
    
    console.log('🎉 Constraint fixes completed!');
    
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
  fixConstraints().then(() => {
    console.log('✅ Database constraint fixes completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { fixConstraints };