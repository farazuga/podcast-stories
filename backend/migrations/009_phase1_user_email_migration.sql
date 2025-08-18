-- Phase 1: Email-based Authentication Migration
-- This migration resets all data and restructures the users table to use email as primary identifier
-- WARNING: This will delete ALL existing data in the system

-- Start transaction
BEGIN;

-- 1. DELETE ALL EXISTING DATA (Clean slate)
DELETE FROM user_favorites WHERE id > 0;
DELETE FROM user_classes WHERE user_id > 0;
DELETE FROM story_tags WHERE story_id > 0;
DELETE FROM story_interviewees WHERE story_id > 0;
DELETE FROM story_ideas WHERE id > 0;
DELETE FROM stories WHERE id > 0;
DELETE FROM classes WHERE id > 0;
DELETE FROM teacher_requests WHERE id > 0;
DELETE FROM password_reset_tokens WHERE id > 0;
DELETE FROM users WHERE id > 0;
DELETE FROM tags WHERE id > 0;
DELETE FROM interviewees WHERE id > 0;
DELETE FROM schools WHERE id > 0;

-- Reset all sequences to start fresh
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE schools_id_seq RESTART WITH 1;
ALTER SEQUENCE classes_id_seq RESTART WITH 1;
ALTER SEQUENCE story_ideas_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS stories_id_seq RESTART WITH 1;
ALTER SEQUENCE tags_id_seq RESTART WITH 1;
ALTER SEQUENCE interviewees_id_seq RESTART WITH 1;
ALTER SEQUENCE teacher_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE user_favorites_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_classes_user_id_seq RESTART WITH 1;

-- 2. MODIFY USERS TABLE SCHEMA
-- Drop existing constraints on username
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;

-- Make username nullable (email will be primary identifier)
ALTER TABLE users ALTER COLUMN username DROP NOT NULL;

-- Ensure email is NOT NULL and UNIQUE
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
DROP INDEX IF EXISTS idx_users_email;
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Add student_id field if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id VARCHAR(50);

-- Update role constraint to include all three roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('amitrace_admin', 'teacher', 'student'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);

-- 3. CREATE DEFAULT SCHOOL
INSERT INTO schools (school_name, created_by, created_at) 
VALUES ('VidPOD Default School', 1, NOW())
RETURNING id;

-- Store the school ID for use in user creation
-- Note: We'll use school_id = 1 since we reset the sequence

-- 4. CREATE THREE DEFAULT ACCOUNTS
-- Admin account (email: admin@vidpod.com, password: rumi&amaml)
INSERT INTO users (
    username, 
    password, 
    email, 
    name, 
    role, 
    school_id, 
    student_id, 
    created_at
) VALUES (
    'admin', 
    '$2b$10$9kmNCTT61nxs9qIt9m5NgusindcEsu4w5InzU8k0TC0ytQSdSUHnu',
    'admin@vidpod.com',
    'VidPOD Admin',
    'amitrace_admin',
    1,
    NULL,
    NOW()
);

-- Teacher account (email: teacher@vidpod.com, password: rumi&amaml)
INSERT INTO users (
    username, 
    password, 
    email, 
    name, 
    role, 
    school_id, 
    student_id, 
    created_at
) VALUES (
    'teacher', 
    '$2b$10$AT4RdjlGzUWPS2yQmHQvbOuRrlQezuxe/P8GNPmHyYZyOFNZZvfMm',
    'teacher@vidpod.com',
    'Demo Teacher',
    'teacher',
    1,
    NULL,
    NOW()
);

-- Student account (email: student@vidpod.com, password: rumi&amaml)
INSERT INTO users (
    username, 
    password, 
    email, 
    name, 
    role, 
    school_id, 
    student_id, 
    created_at
) VALUES (
    'student', 
    '$2b$10$fIbgL.UQFoBonLXFI9qk/O0ZRntyDnzCWZXUT0CgDXaxewPl8iCyG',
    'student@vidpod.com',
    'Demo Student',
    'student',
    1,
    'STU001',
    NOW()
);

-- 5. CREATE SAMPLE CLASS FOR TESTING
INSERT INTO classes (
    class_name,
    subject,
    description,
    class_code,
    teacher_id,
    school_id,
    is_active,
    created_at
) VALUES (
    'Demo Class',
    'Media Studies',
    'Sample class for testing VidPOD functionality',
    'DEMO',
    2, -- teacher user ID
    1, -- school ID
    true,
    NOW()
);

-- 6. ENROLL STUDENT IN DEMO CLASS
INSERT INTO user_classes (user_id, class_id, joined_at)
VALUES (3, 1, NOW()); -- student ID, class ID

-- 7. UPDATE SCHEMA VERSION
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO schema_version (version, description) 
VALUES (9, 'Phase 1: Email-based authentication migration with data reset');

-- Commit transaction
COMMIT;

-- Display migration summary
DO $$
BEGIN
    RAISE NOTICE '=== PHASE 1 MIGRATION COMPLETED ===';
    RAISE NOTICE 'Actions taken:';
    RAISE NOTICE '1. Deleted all existing data (users, stories, classes, etc.)';
    RAISE NOTICE '2. Modified users table to use email as primary identifier';
    RAISE NOTICE '3. Made username optional, email required and unique';
    RAISE NOTICE '4. Added student_id field for student identification';
    RAISE NOTICE '5. Created default school: "VidPOD Default School"';
    RAISE NOTICE '6. Created three default accounts:';
    RAISE NOTICE '   - admin@vidpod.com (amitrace_admin)';
    RAISE NOTICE '   - teacher@vidpod.com (teacher)'; 
    RAISE NOTICE '   - student@vidpod.com (student)';
    RAISE NOTICE '7. Created demo class with code: DEMO';
    RAISE NOTICE '8. Enrolled demo student in demo class';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Update backend password hashes with bcrypt("rumi&amaml")';
    RAISE NOTICE '2. Update authentication endpoints to use email';
    RAISE NOTICE '3. Update frontend login form to use email field';
    RAISE NOTICE '4. Test new authentication system';
END $$;