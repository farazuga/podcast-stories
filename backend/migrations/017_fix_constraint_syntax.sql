-- Fix PostgreSQL Constraint Syntax Errors
-- Migration: 017_fix_constraint_syntax.sql
-- Purpose: Fix the remaining constraint syntax issues from 016 migration
-- Agent: Database Schema Architect (Final Fixes)
-- Date: August 29, 2025

-- Fix courses table constraint with proper PostgreSQL syntax
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

-- Fix lessons table constraint with proper PostgreSQL syntax  
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

-- Log completion
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('017_fix_constraint_syntax', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;