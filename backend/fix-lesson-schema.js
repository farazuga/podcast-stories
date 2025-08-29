const db = require('./config/database');

async function fixLessonSchema() {
  console.log('🔧 Comprehensive Lesson System Schema Fix...\n');
  
  try {
    console.log('1️⃣ Adding missing columns to lessons table...');
    await db.query(`
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS lesson_number INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'beginner',
      ADD COLUMN IF NOT EXISTS is_quiz_required BOOLEAN DEFAULT false
    `);
    console.log('✅ Lessons table updated');
    
    console.log('2️⃣ Adding unique constraint for lessons...');
    await db.query(`
      ALTER TABLE lessons 
      DROP CONSTRAINT IF EXISTS lessons_course_week_lesson_unique,
      ADD CONSTRAINT lessons_course_week_lesson_unique 
      UNIQUE (course_id, week_number, lesson_number)
    `);
    console.log('✅ Lessons constraints updated');
    
    console.log('3️⃣ Adding missing columns to quizzes table...');
    await db.query(`
      ALTER TABLE quizzes 
      ADD COLUMN IF NOT EXISTS attempts_allowed INTEGER DEFAULT 3,
      ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30
    `);
    console.log('✅ Quizzes table updated');
    
    console.log('4️⃣ Verifying all lesson system tables...');
    const tableCheck = await db.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('courses', 'lessons', 'quizzes', 'quiz_questions', 'quiz_attempts')
      ORDER BY table_name, ordinal_position;
    `);
    
    console.log('📊 Current schema structure:');
    let currentTable = '';
    tableCheck.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        console.log(`\n📋 ${row.table_name.toUpperCase()} TABLE:`);
        currentTable = row.table_name;
      }
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    console.log('\n✅ Lesson system schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    if (error.detail) {
      console.error('   Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run the fix
fixLessonSchema();