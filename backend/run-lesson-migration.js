const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  console.log('🚀 Starting Lesson Management System Migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '015_create_lesson_management_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('⏳ Executing migration...\n');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Lesson Management System Migration completed successfully!\n');
    
    // Verify tables were created
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('courses', 'lessons', 'lesson_materials', 'quizzes', 'quiz_questions', 'quiz_attempts', 'worksheets', 'worksheet_submissions', 'course_enrollments', 'student_progress')
      ORDER BY table_name;
    `);
    
    console.log('📊 Created tables:');
    tableCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    console.log('\n🎉 Lesson system is ready for testing!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('   Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();