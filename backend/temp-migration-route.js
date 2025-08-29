const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('./config/database');

const router = express.Router();

// Temporary route to run lesson migration
router.get('/run-lesson-migration', async (req, res) => {
  try {
    console.log('🚀 Starting Lesson Management System Migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '015_create_lesson_management_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('⏳ Executing migration...');
    
    // Remove CONCURRENT from CREATE INDEX statements to avoid transaction block issues
    const cleanedSQL = migrationSQL.replace(/CREATE INDEX CONCURRENTLY/g, 'CREATE INDEX');
    
    // Execute the migration
    await db.query(cleanedSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const tableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('courses', 'lessons', 'lesson_materials', 'quizzes', 'quiz_questions', 'quiz_attempts', 'worksheets', 'worksheet_submissions', 'course_enrollments', 'student_progress')
      ORDER BY table_name;
    `);
    
    const tables = tableCheck.rows.map(row => row.table_name);
    
    res.json({
      success: true,
      message: 'Lesson Management System Migration completed successfully!',
      tablesCreated: tables,
      totalTables: tables.length
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.detail || 'No additional details'
    });
  }
});

// Fix schema mismatch
router.get('/fix-schema', async (req, res) => {
  try {
    console.log('🔧 Fixing lesson system schema mismatch...');
    
    // Add missing columns to courses table
    await db.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS total_weeks INTEGER,
      ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20),
      ADD COLUMN IF NOT EXISTS prerequisites TEXT,
      ADD COLUMN IF NOT EXISTS enrollment_limit INTEGER DEFAULT 30
    `);
    
    // Add missing columns to lessons table
    await db.query(`
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS lesson_number INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'beginner',
      ADD COLUMN IF NOT EXISTS is_quiz_required BOOLEAN DEFAULT false
    `);
    
    // Update total_weeks to match max_weeks for existing records
    await db.query(`
      UPDATE courses SET total_weeks = max_weeks WHERE total_weeks IS NULL
    `);
    
    console.log('✅ Schema mismatch fixed successfully!');
    
    res.json({
      success: true,
      message: 'Schema mismatch fixed successfully!',
      changes: [
        'Added total_weeks column to courses table',
        'Added difficulty_level column to courses table', 
        'Added prerequisites column to courses table',
        'Added enrollment_limit column to courses table'
      ]
    });
    
  } catch (error) {
    console.error('❌ Failed to fix schema:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;