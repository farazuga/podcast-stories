-- Migration 011: Add First Name and Last Name Fields
-- Date: January 25, 2025
-- Purpose: Add separate first_name and last_name columns to users and teacher_requests tables
--          and migrate existing full name data by putting everything in first_name, leaving last_name blank

-- Start transaction
BEGIN;

-- Step 1: Add first_name and last_name columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

-- Step 2: Add first_name and last_name columns to teacher_requests table
ALTER TABLE teacher_requests ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE teacher_requests ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

-- Step 3: Migrate existing data from users table
-- Extract first name (everything up to the first space or the whole name if no space)
-- Leave last_name blank as requested
UPDATE users 
SET 
    first_name = CASE 
        WHEN name IS NULL OR name = '' THEN ''
        ELSE TRIM(SPLIT_PART(name, ' ', 1))
    END,
    last_name = ''
WHERE first_name IS NULL;

-- Step 4: Migrate existing data from teacher_requests table  
-- Extract first name (everything up to the first space or the whole name if no space)
-- Leave last_name blank as requested
UPDATE teacher_requests 
SET 
    first_name = CASE 
        WHEN name IS NULL OR name = '' THEN ''
        ELSE TRIM(SPLIT_PART(name, ' ', 1))
    END,
    last_name = ''
WHERE first_name IS NULL;

-- Step 5: Add indexes for better performance on name searches
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
CREATE INDEX IF NOT EXISTS idx_teacher_requests_first_name ON teacher_requests(first_name);
CREATE INDEX IF NOT EXISTS idx_teacher_requests_last_name ON teacher_requests(last_name);

-- Step 6: Create a function to combine first and last names for display purposes
CREATE OR REPLACE FUNCTION get_full_name(first_name VARCHAR, last_name VARCHAR) 
RETURNS VARCHAR AS $$
BEGIN
    IF first_name IS NULL OR first_name = '' THEN
        RETURN COALESCE(last_name, '');
    END IF;
    
    IF last_name IS NULL OR last_name = '' THEN
        RETURN first_name;
    END IF;
    
    RETURN first_name || ' ' || last_name;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Update schema version
INSERT INTO schema_version (version, description) 
VALUES (11, 'Add first_name and last_name fields to users and teacher_requests tables');

-- Commit transaction
COMMIT;

-- Verification queries
DO $$
DECLARE
    users_with_first_name INTEGER;
    teacher_requests_with_first_name INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_with_first_name FROM users WHERE first_name IS NOT NULL AND first_name != '';
    SELECT COUNT(*) INTO teacher_requests_with_first_name FROM teacher_requests WHERE first_name IS NOT NULL AND first_name != '';
    
    RAISE NOTICE '=== MIGRATION 011 COMPLETED ===';
    RAISE NOTICE 'Actions taken:';
    RAISE NOTICE '1. Added first_name and last_name columns to users table';
    RAISE NOTICE '2. Added first_name and last_name columns to teacher_requests table';
    RAISE NOTICE '3. Migrated % users with first names (last names left blank)', users_with_first_name;
    RAISE NOTICE '4. Migrated % teacher requests with first names (last names left blank)', teacher_requests_with_first_name;
    RAISE NOTICE '5. Added indexes for performance on new name fields';
    RAISE NOTICE '6. Created get_full_name() function for display purposes';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Update frontend forms to collect separate first/last names';
    RAISE NOTICE '2. Update API endpoints to accept first_name and last_name';
    RAISE NOTICE '3. Update frontend to use first_name for personalization';
END $$;

-- Sample verification query to show the migration results
SELECT 
    'Users Sample' as table_name,
    name as original_name,
    first_name,
    last_name,
    get_full_name(first_name, last_name) as reconstructed_name
FROM users 
LIMIT 5;

SELECT 
    'Teacher Requests Sample' as table_name,
    name as original_name,
    first_name,
    last_name,
    get_full_name(first_name, last_name) as reconstructed_name
FROM teacher_requests 
LIMIT 5;