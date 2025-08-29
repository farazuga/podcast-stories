-- VidPOD Lesson System Schema Repair Migration
-- Migration: 016_fix_lesson_schema_comprehensive.sql  
-- Purpose: Fix all schema inconsistencies discovered during testing
-- Agent: Database Schema Architect
-- Date: August 29, 2025

-- ================================
-- PHASE 1: COURSES TABLE FIXES
-- ================================

-- Add missing columns to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS total_weeks INTEGER,
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS prerequisites TEXT DEFAULT '[]',
ADD COLUMN IF NOT EXISTS enrollment_limit INTEGER DEFAULT 30;

-- Update total_weeks to match max_weeks for existing records
UPDATE courses SET total_weeks = max_weeks WHERE total_weeks IS NULL;

-- Add constraints for courses
ALTER TABLE courses 
ADD CONSTRAINT IF NOT EXISTS courses_difficulty_check 
CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));

-- ================================
-- PHASE 2: LESSONS TABLE FIXES  
-- ================================

-- Add missing columns to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS lesson_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS is_quiz_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_completion_of INTEGER,
ADD COLUMN IF NOT EXISTS unlock_criteria JSONB DEFAULT '{"type": "none"}'::jsonb,
ADD COLUMN IF NOT EXISTS vocabulary_terms JSONB DEFAULT '{}'::jsonb;

-- Add foreign key constraint for requires_completion_of
ALTER TABLE lessons 
ADD CONSTRAINT IF NOT EXISTS lessons_completion_fkey 
FOREIGN KEY (requires_completion_of) REFERENCES lessons(id);

-- Add unique constraint for lesson positioning
ALTER TABLE lessons 
DROP CONSTRAINT IF EXISTS lessons_course_week_lesson_unique,
ADD CONSTRAINT lessons_course_week_lesson_unique 
UNIQUE (course_id, week_number, lesson_number);

-- ================================
-- PHASE 3: QUIZZES TABLE FIXES
-- ================================

-- Add missing columns to quizzes table  
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS attempts_allowed INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30;

-- Update existing records with defaults
UPDATE quizzes 
SET attempts_allowed = max_attempts 
WHERE attempts_allowed IS NULL AND max_attempts IS NOT NULL;

UPDATE quizzes 
SET time_limit = time_limit_minutes 
WHERE time_limit IS NULL AND time_limit_minutes IS NOT NULL;

-- ================================
-- PHASE 4: QUIZ_QUESTIONS FIXES
-- ================================

-- Ensure answer_data column exists and has proper structure
ALTER TABLE quiz_questions 
ALTER COLUMN answer_data SET DEFAULT '{}'::jsonb;

-- Add answer_options column if it doesn't exist (for compatibility)
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS answer_options JSONB DEFAULT '{}'::jsonb;

-- ================================
-- PHASE 5: SCHOOLS TABLE INTEGRATION
-- ================================

-- Check if schools table needs name column (courses routes expect s.name)
-- Add school_name column if it doesn't exist
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Update name column with school_name for existing records
UPDATE schools 
SET name = school_name 
WHERE name IS NULL AND school_name IS NOT NULL;

-- ================================
-- PHASE 6: LESSON_MATERIALS FIXES
-- ================================

-- Ensure lesson_materials table supports quiz integration
-- Add quiz_id column for direct quiz-material relationship
ALTER TABLE lesson_materials
ADD COLUMN IF NOT EXISTS quiz_id INTEGER,
ADD CONSTRAINT IF NOT EXISTS lesson_materials_quiz_fkey 
FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;

-- ================================
-- PHASE 7: PERFORMANCE INDEXES
-- ================================

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_number ON lessons(course_id, lesson_number);
CREATE INDEX IF NOT EXISTS idx_lessons_difficulty ON lessons(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_lessons_completion ON lessons(requires_completion_of);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty ON courses(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_courses_enrollment_limit ON courses(enrollment_limit);

-- ================================
-- PHASE 8: DATA VALIDATION
-- ================================

-- Ensure all lesson numbers are positive
UPDATE lessons SET lesson_number = 1 WHERE lesson_number IS NULL OR lesson_number <= 0;

-- Ensure all courses have total_weeks
UPDATE courses SET total_weeks = 9 WHERE total_weeks IS NULL OR total_weeks <= 0;

-- ================================
-- PHASE 9: FINAL CONSTRAINTS
-- ================================

-- Add check constraints for data integrity
ALTER TABLE lessons 
ADD CONSTRAINT IF NOT EXISTS lessons_lesson_number_positive 
CHECK (lesson_number > 0);

ALTER TABLE courses
ADD CONSTRAINT IF NOT EXISTS courses_total_weeks_positive 
CHECK (total_weeks > 0 AND total_weeks <= 52);

-- ================================
-- MIGRATION COMPLETE
-- ================================

-- Log completion
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('016_fix_lesson_schema_comprehensive', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;