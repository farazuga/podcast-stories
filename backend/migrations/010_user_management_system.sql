-- Migration 010: User Management System Implementation
-- Date: January 19, 2025
-- Purpose: Add super_admin role and setup CASCADE relationships for user management

-- Step 1: Add super_admin role to check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('amitrace_admin', 'super_admin', 'teacher', 'student'));

-- Step 2: Create super admin user with email-based authentication
INSERT INTO users (email, password, name, role, created_at) 
VALUES (
    'superadmin@vidpod.com', 
    '$2b$10$rL8YZ9vqW1nR8sJ4tK6mZ.OGH5j7VzBjqP3mC8nE2xF9aH6bI1dLm', -- 'rumi&amaml'
    'Super Administrator',
    'super_admin',
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Step 3: Ensure CASCADE relationships for proper deletion
-- Update classes foreign key to CASCADE on user deletion
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;
ALTER TABLE classes ADD CONSTRAINT classes_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update user_classes (student enrollments) to CASCADE
ALTER TABLE user_classes DROP CONSTRAINT IF EXISTS user_classes_user_id_fkey;
ALTER TABLE user_classes ADD CONSTRAINT user_classes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_classes DROP CONSTRAINT IF EXISTS user_classes_class_id_fkey;
ALTER TABLE user_classes ADD CONSTRAINT user_classes_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- Update story_ideas to CASCADE (stories by deleted users)
ALTER TABLE story_ideas DROP CONSTRAINT IF EXISTS story_ideas_uploaded_by_fkey;
ALTER TABLE story_ideas ADD CONSTRAINT story_ideas_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;

-- Update user_favorites to CASCADE
ALTER TABLE user_favorites DROP CONSTRAINT IF EXISTS user_favorites_user_id_fkey;
ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_favorites DROP CONSTRAINT IF EXISTS user_favorites_story_id_fkey;
ALTER TABLE user_favorites ADD CONSTRAINT user_favorites_story_id_fkey 
FOREIGN KEY (story_id) REFERENCES story_ideas(id) ON DELETE CASCADE;

-- Update teacher_requests to handle deleted admin references
ALTER TABLE teacher_requests DROP CONSTRAINT IF EXISTS teacher_requests_approved_by_fkey;
ALTER TABLE teacher_requests ADD CONSTRAINT teacher_requests_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Step 4: Create indexes for better performance on user management queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_user_classes_user_id ON user_classes(user_id);

-- Step 5: Create view for user management statistics
CREATE OR REPLACE VIEW user_management_stats AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    COALESCE(class_stats.class_count, 0) as class_count,
    COALESCE(student_stats.student_count, 0) as student_count,
    COALESCE(story_stats.story_count, 0) as story_count
FROM users u
LEFT JOIN (
    SELECT teacher_id, COUNT(*) as class_count
    FROM classes 
    WHERE is_active = true
    GROUP BY teacher_id
) class_stats ON u.id = class_stats.teacher_id
LEFT JOIN (
    SELECT c.teacher_id, COUNT(DISTINCT uc.user_id) as student_count
    FROM classes c
    JOIN user_classes uc ON c.id = uc.class_id
    WHERE c.is_active = true
    GROUP BY c.teacher_id
) student_stats ON u.id = student_stats.teacher_id
LEFT JOIN (
    SELECT uploaded_by, COUNT(*) as story_count
    FROM story_ideas
    GROUP BY uploaded_by
) story_stats ON u.id = story_stats.uploaded_by
WHERE u.role IN ('teacher', 'amitrace_admin', 'super_admin');

-- Step 6: Create function to calculate deletion impact
CREATE OR REPLACE FUNCTION get_user_deletion_impact(user_id_param INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
    class_count INTEGER;
    student_count INTEGER;
    story_count INTEGER;
    favorite_count INTEGER;
BEGIN
    -- Count classes that will be deleted
    SELECT COUNT(*) INTO class_count
    FROM classes 
    WHERE teacher_id = user_id_param;
    
    -- Count students that will be removed from classes
    SELECT COUNT(DISTINCT uc.user_id) INTO student_count
    FROM classes c
    JOIN user_classes uc ON c.id = uc.class_id
    WHERE c.teacher_id = user_id_param;
    
    -- Count stories that will be deleted
    SELECT COUNT(*) INTO story_count
    FROM story_ideas 
    WHERE uploaded_by = user_id_param;
    
    -- Count favorites that will be deleted
    SELECT COUNT(*) INTO favorite_count
    FROM user_favorites 
    WHERE user_id = user_id_param;
    
    -- Build result JSON
    result := json_build_object(
        'classes_to_delete', class_count,
        'students_to_unenroll', student_count,
        'stories_to_delete', story_count,
        'favorites_to_delete', favorite_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Verification queries
SELECT 'Migration 010 completed successfully' as status;
SELECT COUNT(*) as super_admin_count FROM users WHERE role = 'super_admin';
SELECT email, name, role FROM users WHERE role IN ('super_admin', 'amitrace_admin') ORDER BY role DESC;