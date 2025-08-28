-- Lesson Management System Validation Script
-- Validates the database schema and tests all functions
-- Run this after executing 015_create_lesson_management_system.sql

-- =============================================================================
-- SCHEMA VALIDATION
-- Verify all tables, columns, and constraints were created correctly
-- =============================================================================

\echo 'Starting Lesson Management System Validation...'
\echo ''

-- Check table creation
\echo '=== TABLE VALIDATION ==='
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'courses', 'lessons', 'lesson_materials', 'quizzes', 'quiz_questions', 
            'quiz_attempts', 'worksheets', 'worksheet_submissions', 'student_progress', 'course_enrollments'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'courses', 'lessons', 'lesson_materials', 'quizzes', 'quiz_questions', 
    'quiz_attempts', 'worksheets', 'worksheet_submissions', 'student_progress', 'course_enrollments'
)
ORDER BY table_name;

-- Check function creation
\echo ''
\echo '=== FUNCTION VALIDATION ==='
SELECT 
    routine_name,
    '✓ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'calculate_lesson_completion', 'calculate_course_progress', 
    'update_student_progress', 'check_lesson_prerequisites'
)
ORDER BY routine_name;

-- Check foreign key constraints
\echo ''
\echo '=== FOREIGN KEY VALIDATION ==='
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✓ VALID' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN (
    'courses', 'lessons', 'lesson_materials', 'quizzes', 'quiz_questions', 
    'quiz_attempts', 'worksheets', 'worksheet_submissions', 'student_progress', 'course_enrollments'
)
ORDER BY tc.table_name, kcu.column_name;

-- Check indexes
\echo ''
\echo '=== INDEX VALIDATION ==='
SELECT 
    indexname,
    tablename,
    '✓ EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (
    indexname LIKE 'idx_%courses%' 
    OR indexname LIKE 'idx_%lessons%'
    OR indexname LIKE 'idx_%quiz%'
    OR indexname LIKE 'idx_%worksheet%'
    OR indexname LIKE 'idx_%progress%'
    OR indexname LIKE 'idx_%enrollment%'
)
ORDER BY tablename, indexname;

-- =============================================================================
-- DATA INTEGRITY TESTS
-- Test constraints and data validation rules
-- =============================================================================

\echo ''
\echo '=== DATA INTEGRITY TESTS ==='

-- Test 1: Course validation
\echo 'Test 1: Course constraints...'
DO $$
BEGIN
    -- Test valid course creation
    INSERT INTO courses (title, teacher_id, total_weeks) 
    VALUES ('Test Course', 1, 9);
    
    -- Test invalid total_weeks (should fail)
    BEGIN
        INSERT INTO courses (title, teacher_id, total_weeks) 
        VALUES ('Invalid Course', 1, 0);
        RAISE EXCEPTION 'Should not reach here - constraint failed to work';
    EXCEPTION 
        WHEN check_violation THEN
            RAISE NOTICE '✓ Course weeks constraint working';
    END;
    
    -- Clean up
    DELETE FROM courses WHERE title IN ('Test Course', 'Invalid Course');
END $$;

-- Test 2: Quiz attempts validation
\echo 'Test 2: Quiz attempt constraints...'
DO $$
DECLARE
    test_course_id INTEGER;
    test_lesson_id INTEGER;
    test_material_id INTEGER;
    test_quiz_id INTEGER;
    test_student_id INTEGER;
BEGIN
    -- Get a student ID for testing
    SELECT id INTO test_student_id FROM users WHERE role = 'student' LIMIT 1;
    
    IF test_student_id IS NOT NULL THEN
        -- Create test data
        INSERT INTO courses (title, teacher_id) VALUES ('Quiz Test Course', 1)
        RETURNING id INTO test_course_id;
        
        INSERT INTO lessons (course_id, title, week_number, lesson_number, is_published)
        VALUES (test_course_id, 'Quiz Test Lesson', 1, 1, true)
        RETURNING id INTO test_lesson_id;
        
        INSERT INTO lesson_materials (lesson_id, title, material_type)
        VALUES (test_lesson_id, 'Test Quiz Material', 'quiz')
        RETURNING id INTO test_material_id;
        
        INSERT INTO quizzes (material_id) VALUES (test_material_id)
        RETURNING id INTO test_quiz_id;
        
        -- Test unique attempt constraint
        INSERT INTO quiz_attempts (quiz_id, student_id, attempt_number, status)
        VALUES (test_quiz_id, test_student_id, 1, 'in_progress');
        
        BEGIN
            INSERT INTO quiz_attempts (quiz_id, student_id, attempt_number, status)
            VALUES (test_quiz_id, test_student_id, 1, 'in_progress');
            RAISE EXCEPTION 'Should not reach here - unique constraint failed';
        EXCEPTION 
            WHEN unique_violation THEN
                RAISE NOTICE '✓ Quiz attempt uniqueness constraint working';
        END;
        
        -- Clean up
        DELETE FROM courses WHERE id = test_course_id;
    ELSE
        RAISE NOTICE '⚠ No student found - skipping quiz attempt tests';
    END IF;
END $$;

-- Test 3: Student progress validation
\echo 'Test 3: Student progress constraints...'
DO $$
DECLARE
    test_course_id INTEGER;
    test_lesson_id INTEGER;
    test_student_id INTEGER;
BEGIN
    SELECT id INTO test_student_id FROM users WHERE role = 'student' LIMIT 1;
    
    IF test_student_id IS NOT NULL THEN
        INSERT INTO courses (title, teacher_id) VALUES ('Progress Test Course', 1)
        RETURNING id INTO test_course_id;
        
        INSERT INTO lessons (course_id, title, week_number, lesson_number, is_published)
        VALUES (test_course_id, 'Progress Test Lesson', 1, 1, true)
        RETURNING id INTO test_lesson_id;
        
        -- Test valid progress record
        INSERT INTO student_progress (student_id, course_id, lesson_id, completion_percentage)
        VALUES (test_student_id, test_course_id, test_lesson_id, 75.50);
        
        -- Test invalid completion percentage (should fail)
        BEGIN
            INSERT INTO student_progress (student_id, course_id, lesson_id, completion_percentage)
            VALUES (test_student_id, test_course_id, test_lesson_id + 1000, 150.00);
            RAISE EXCEPTION 'Should not reach here - percentage constraint failed';
        EXCEPTION 
            WHEN check_violation THEN
                RAISE NOTICE '✓ Progress percentage constraint working';
        END;
        
        -- Clean up
        DELETE FROM courses WHERE id = test_course_id;
    ELSE
        RAISE NOTICE '⚠ No student found - skipping progress tests';
    END IF;
END $$;

-- =============================================================================
-- FUNCTION TESTING
-- Test all custom functions with sample data
-- =============================================================================

\echo ''
\echo '=== FUNCTION TESTING ==='

DO $$
DECLARE
    test_teacher_id INTEGER;
    test_student_id INTEGER;
    test_course_id INTEGER;
    test_lesson_id INTEGER;
    test_material_id INTEGER;
    test_quiz_id INTEGER;
    test_worksheet_id INTEGER;
    completion_result DECIMAL(5,2);
    progress_result JSONB;
    prereq_result BOOLEAN;
BEGIN
    -- Get test user IDs
    SELECT id INTO test_teacher_id FROM users WHERE role = 'teacher' LIMIT 1;
    SELECT id INTO test_student_id FROM users WHERE role = 'student' LIMIT 1;
    
    IF test_teacher_id IS NOT NULL AND test_student_id IS NOT NULL THEN
        \echo 'Creating test data for function validation...'
        
        -- Create test course
        INSERT INTO courses (title, description, teacher_id, total_weeks)
        VALUES ('Function Test Course', 'Course for testing functions', test_teacher_id, 4)
        RETURNING id INTO test_course_id;
        
        -- Create test lesson
        INSERT INTO lessons (course_id, title, week_number, lesson_number, is_published)
        VALUES (test_course_id, 'Function Test Lesson', 1, 1, true)
        RETURNING id INTO test_lesson_id;
        
        -- Create quiz material
        INSERT INTO lesson_materials (lesson_id, title, material_type, is_required, is_graded)
        VALUES (test_lesson_id, 'Test Quiz', 'quiz', true, true)
        RETURNING id INTO test_material_id;
        
        INSERT INTO quizzes (material_id, passing_score) 
        VALUES (test_material_id, 70.00)
        RETURNING id INTO test_quiz_id;
        
        -- Create worksheet material
        INSERT INTO lesson_materials (lesson_id, title, material_type, is_required, is_graded)
        VALUES (test_lesson_id, 'Test Worksheet', 'worksheet', true, true)
        RETURNING id INTO test_material_id;
        
        INSERT INTO worksheets (material_id) 
        VALUES (test_material_id)
        RETURNING id INTO test_worksheet_id;
        
        -- Test Function 1: calculate_lesson_completion (should be 0% initially)
        SELECT calculate_lesson_completion(test_student_id, test_lesson_id) INTO completion_result;
        IF completion_result = 0.00 THEN
            RAISE NOTICE '✓ calculate_lesson_completion: Returns 0%% for no completions';
        ELSE
            RAISE NOTICE '✗ calculate_lesson_completion: Expected 0%%, got %', completion_result;
        END IF;
        
        -- Add passing quiz attempt
        INSERT INTO quiz_attempts (quiz_id, student_id, attempt_number, status, percentage_score)
        VALUES (test_quiz_id, test_student_id, 1, 'submitted', 85.00);
        
        -- Test completion after quiz (should be 50% - 1 of 2 required materials)
        SELECT calculate_lesson_completion(test_student_id, test_lesson_id) INTO completion_result;
        IF completion_result = 50.00 THEN
            RAISE NOTICE '✓ calculate_lesson_completion: Returns 50%% after 1 of 2 completions';
        ELSE
            RAISE NOTICE '✗ calculate_lesson_completion: Expected 50%%, got %', completion_result;
        END IF;
        
        -- Add worksheet submission
        INSERT INTO worksheet_submissions (worksheet_id, student_id, draft, submitted_at)
        VALUES (test_worksheet_id, test_student_id, false, CURRENT_TIMESTAMP);
        
        -- Test completion after both materials (should be 100%)
        SELECT calculate_lesson_completion(test_student_id, test_lesson_id) INTO completion_result;
        IF completion_result = 100.00 THEN
            RAISE NOTICE '✓ calculate_lesson_completion: Returns 100%% after all completions';
        ELSE
            RAISE NOTICE '✗ calculate_lesson_completion: Expected 100%%, got %', completion_result;
        END IF;
        
        -- Test Function 2: update_student_progress
        PERFORM update_student_progress(test_student_id, test_lesson_id);
        
        -- Check if progress was created/updated
        IF EXISTS (
            SELECT 1 FROM student_progress 
            WHERE student_id = test_student_id 
            AND lesson_id = test_lesson_id 
            AND status = 'completed'
        ) THEN
            RAISE NOTICE '✓ update_student_progress: Creates/updates progress correctly';
        ELSE
            RAISE NOTICE '✗ update_student_progress: Failed to create/update progress';
        END IF;
        
        -- Test Function 3: calculate_course_progress
        SELECT calculate_course_progress(test_student_id, test_course_id) INTO progress_result;
        
        IF (progress_result->>'total_lessons')::INTEGER = 1 
           AND (progress_result->>'completed_lessons')::INTEGER = 1 THEN
            RAISE NOTICE '✓ calculate_course_progress: Correctly calculates course metrics';
        ELSE
            RAISE NOTICE '✗ calculate_course_progress: Incorrect metrics - %', progress_result;
        END IF;
        
        -- Test Function 4: check_lesson_prerequisites (no prerequisites)
        SELECT check_lesson_prerequisites(test_student_id, test_lesson_id) INTO prereq_result;
        
        IF prereq_result = true THEN
            RAISE NOTICE '✓ check_lesson_prerequisites: Returns true for no prerequisites';
        ELSE
            RAISE NOTICE '✗ check_lesson_prerequisites: Should return true for no prerequisites';
        END IF;
        
        -- Create second lesson with prerequisites
        INSERT INTO lessons (course_id, title, week_number, lesson_number, requires_completion_of, is_published)
        VALUES (test_course_id, 'Prerequisite Test Lesson', 2, 1, ARRAY[test_lesson_id], true)
        RETURNING id INTO test_lesson_id;
        
        -- Test prerequisites (should be true since first lesson is completed)
        SELECT check_lesson_prerequisites(test_student_id, test_lesson_id) INTO prereq_result;
        
        IF prereq_result = true THEN
            RAISE NOTICE '✓ check_lesson_prerequisites: Returns true when prerequisites met';
        ELSE
            RAISE NOTICE '✗ check_lesson_prerequisites: Should return true when prerequisites met';
        END IF;
        
        -- Clean up test data
        DELETE FROM courses WHERE id = test_course_id;
        
        \echo 'Function testing completed successfully!'
        
    ELSE
        RAISE NOTICE '⚠ Missing teacher or student - skipping function tests';
    END IF;
END $$;

-- =============================================================================
-- PERFORMANCE TESTING
-- Test query performance on indexes
-- =============================================================================

\echo ''
\echo '=== PERFORMANCE TESTING ==='

-- Enable timing for performance analysis
\timing on

-- Test 1: Course queries by teacher
\echo 'Test 1: Course queries by teacher...'
SELECT COUNT(*) FROM courses WHERE teacher_id = 1;

-- Test 2: Lesson queries by course
\echo 'Test 2: Lesson queries by course...'
SELECT COUNT(*) FROM lessons WHERE course_id = 1;

-- Test 3: Student progress queries
\echo 'Test 3: Student progress queries...'
SELECT COUNT(*) FROM student_progress WHERE student_id = 1;

-- Test 4: Quiz attempt queries
\echo 'Test 4: Quiz attempt queries...'
SELECT COUNT(*) FROM quiz_attempts WHERE status = 'submitted';

\timing off

-- =============================================================================
-- SAMPLE DATA VALIDATION
-- Verify sample data was created correctly
-- =============================================================================

\echo ''
\echo '=== SAMPLE DATA VALIDATION ==='

-- Check if sample course exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM courses WHERE title = 'Introduction to Podcasting') 
        THEN '✓ Sample course created'
        ELSE '⚠ Sample course not found'
    END as sample_course_status;

-- Check if sample lesson exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM lessons WHERE title = 'What is Podcasting?') 
        THEN '✓ Sample lesson created'
        ELSE '⚠ Sample lesson not found'
    END as sample_lesson_status;

-- Check if sample quiz exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM lesson_materials lm
            JOIN quizzes q ON q.material_id = lm.id
            WHERE lm.title = 'Podcasting Basics Quiz'
        ) 
        THEN '✓ Sample quiz created'
        ELSE '⚠ Sample quiz not found'
    END as sample_quiz_status;

-- Check if sample worksheet exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM lesson_materials lm
            JOIN worksheets w ON w.material_id = lm.id
            WHERE lm.title = 'Podcast Analysis Worksheet'
        ) 
        THEN '✓ Sample worksheet created'
        ELSE '⚠ Sample worksheet not found'
    END as sample_worksheet_status;

-- =============================================================================
-- VALIDATION SUMMARY
-- Provide overall validation status
-- =============================================================================

\echo ''
\echo '=== VALIDATION SUMMARY ==='

SELECT 
    'Lesson Management System Validation Complete' as status,
    CURRENT_TIMESTAMP as completed_at;

-- Count total objects created
SELECT 
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN (
         'courses', 'lessons', 'lesson_materials', 'quizzes', 'quiz_questions', 
         'quiz_attempts', 'worksheets', 'worksheet_submissions', 'student_progress', 'course_enrollments'
     )) as tables_created,
    
    (SELECT COUNT(*) FROM information_schema.routines 
     WHERE routine_schema = 'public' 
     AND routine_name IN (
         'calculate_lesson_completion', 'calculate_course_progress', 
         'update_student_progress', 'check_lesson_prerequisites'
     )) as functions_created,
     
    (SELECT COUNT(*) FROM pg_indexes 
     WHERE schemaname = 'public' 
     AND (indexname LIKE 'idx_%courses%' 
          OR indexname LIKE 'idx_%lessons%'
          OR indexname LIKE 'idx_%quiz%'
          OR indexname LIKE 'idx_%worksheet%'
          OR indexname LIKE 'idx_%progress%'
          OR indexname LIKE 'idx_%enrollment%')
    ) as indexes_created;

\echo ''
\echo 'Validation script completed. Review the output above for any issues.'
\echo 'If all tests show ✓ status, the Lesson Management System is ready for use!'