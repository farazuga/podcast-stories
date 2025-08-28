-- VidPOD Lesson Management System Database Migration
-- Migration: 015_create_lesson_management_system.sql
-- Created by: Agent 1 - Database Schema Architect
-- Date: August 28, 2025

-- Create lesson management schema for VidPOD educational system

-- 1. COURSES TABLE
-- Manages teacher-created courses with 9-week curriculum structure
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
    max_weeks INTEGER DEFAULT 9 CHECK (max_weeks BETWEEN 1 AND 52),
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false,
    learning_objectives JSONB DEFAULT '[]'::jsonb,
    vocabulary_terms JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    UNIQUE (teacher_id, title)
);

CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_courses_school_id ON courses(school_id);
CREATE INDEX idx_courses_active ON courses(is_active);

-- 2. LESSONS TABLE
-- Individual lessons within courses (Week 1, Week 2, etc.)
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    week_number INTEGER NOT NULL CHECK (week_number > 0),
    sort_order INTEGER DEFAULT 0,
    content TEXT,
    learning_objectives JSONB DEFAULT '[]'::jsonb,
    vocabulary_terms JSONB DEFAULT '{}'::jsonb,
    prerequisites JSONB DEFAULT '[]'::jsonb,
    unlock_criteria JSONB DEFAULT '{
        "type": "prerequisite",
        "required_completion": 100,
        "required_grade": 70
    }'::jsonb,
    estimated_duration_minutes INTEGER DEFAULT 50,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (course_id, week_number)
);

CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_week_number ON lessons(course_id, week_number);
CREATE INDEX idx_lessons_published ON lessons(is_published);

-- 3. LESSON MATERIALS TABLE
-- Quizzes, worksheets, and resources associated with lessons
CREATE TABLE IF NOT EXISTS lesson_materials (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    material_type VARCHAR(20) NOT NULL CHECK (material_type IN (
        'quiz', 'worksheet', 'resource', 'video', 'audio', 'document'
    )),
    description TEXT,
    file_path VARCHAR(500),
    file_size BIGINT,
    content_data JSONB DEFAULT '{}'::jsonb,
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lesson_materials_lesson_id ON lesson_materials(lesson_id);
CREATE INDEX idx_lesson_materials_type ON lesson_materials(material_type);

-- 4. QUIZZES TABLE
-- Quiz configuration and metadata
CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    time_limit_minutes INTEGER,
    max_attempts INTEGER DEFAULT 1 CHECK (max_attempts > 0),
    grading_method VARCHAR(20) DEFAULT 'best' CHECK (grading_method IN (
        'best', 'latest', 'average', 'first'
    )),
    passing_score INTEGER DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
    show_correct_answers BOOLEAN DEFAULT true,
    show_results_immediately BOOLEAN DEFAULT true,
    randomize_questions BOOLEAN DEFAULT false,
    require_password BOOLEAN DEFAULT false,
    quiz_password VARCHAR(100),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX idx_quizzes_published ON quizzes(is_published);

-- 5. QUIZ QUESTIONS TABLE
-- Individual questions within quizzes
CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN (
        'multiple_choice', 'true_false', 'short_answer', 'essay', 
        'fill_blank', 'matching', 'ordering'
    )),
    points INTEGER DEFAULT 1 CHECK (points > 0),
    sort_order INTEGER DEFAULT 0,
    answer_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    explanation TEXT,
    hint TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_type ON quiz_questions(question_type);
CREATE INDEX idx_quiz_questions_sort ON quiz_questions(quiz_id, sort_order);

-- 6. QUIZ ATTEMPTS TABLE
-- Student quiz submissions and scores
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    earned_points INTEGER DEFAULT 0,
    percentage_score DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT false,
    responses JSONB DEFAULT '{}'::jsonb,
    time_taken_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (quiz_id, student_id, attempt_number)
);

CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX idx_quiz_attempts_completed ON quiz_attempts(is_completed);

-- 7. WORKSHEETS TABLE
-- Customizable forms and activities
CREATE TABLE IF NOT EXISTS worksheets (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    grading_rubric JSONB DEFAULT '{}'::jsonb,
    max_points INTEGER DEFAULT 100,
    is_published BOOLEAN DEFAULT false,
    allow_multiple_submissions BOOLEAN DEFAULT false,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_worksheets_lesson_id ON worksheets(lesson_id);
CREATE INDEX idx_worksheets_published ON worksheets(is_published);
CREATE INDEX idx_worksheets_due_date ON worksheets(due_date);

-- 8. WORKSHEET SUBMISSIONS TABLE
-- Student worksheet responses
CREATE TABLE IF NOT EXISTS worksheet_submissions (
    id SERIAL PRIMARY KEY,
    worksheet_id INTEGER NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_draft BOOLEAN DEFAULT true,
    submitted_at TIMESTAMP,
    graded_at TIMESTAMP,
    grade DECIMAL(5,2),
    feedback TEXT,
    graded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_worksheet_submissions_worksheet_id ON worksheet_submissions(worksheet_id);
CREATE INDEX idx_worksheet_submissions_student_id ON worksheet_submissions(student_id);
CREATE INDEX idx_worksheet_submissions_graded ON worksheet_submissions(graded_at);

-- 9. COURSE ENROLLMENTS TABLE
-- Student enrollment in courses
CREATE TABLE IF NOT EXISTS course_enrollments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    current_lesson_id INTEGER REFERENCES lessons(id),
    is_active BOOLEAN DEFAULT true,
    final_grade DECIMAL(5,2),
    
    -- Constraints
    UNIQUE (course_id, student_id)
);

CREATE INDEX idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX idx_course_enrollments_active ON course_enrollments(is_active);

-- 10. STUDENT PROGRESS TABLE
-- Comprehensive progress tracking
CREATE TABLE IF NOT EXISTS student_progress (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN (
        'not_started', 'in_progress', 'completed', 'locked'
    )),
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    grade DECIMAL(5,2),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE (student_id, lesson_id)
);

CREATE INDEX idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX idx_student_progress_lesson_id ON student_progress(lesson_id);
CREATE INDEX idx_student_progress_course_id ON student_progress(course_id);
CREATE INDEX idx_student_progress_status ON student_progress(status);

-- DATABASE UTILITY FUNCTIONS

-- Function 1: Calculate lesson completion percentage
CREATE OR REPLACE FUNCTION calculate_lesson_completion(p_student_id INTEGER, p_lesson_id INTEGER)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_materials INTEGER := 0;
    completed_materials INTEGER := 0;
    completion_pct DECIMAL(5,2) := 0.00;
BEGIN
    -- Count total required materials for lesson
    SELECT COUNT(*)
    INTO total_materials
    FROM lesson_materials lm
    WHERE lm.lesson_id = p_lesson_id AND lm.is_required = true;
    
    -- Count completed quizzes
    SELECT COUNT(DISTINCT qa.quiz_id)
    INTO completed_materials
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN lesson_materials lm ON q.lesson_id = lm.lesson_id
    WHERE qa.student_id = p_student_id 
    AND q.lesson_id = p_lesson_id 
    AND qa.is_completed = true
    AND lm.is_required = true
    AND lm.material_type = 'quiz';
    
    -- Count completed worksheets
    SELECT completed_materials + COUNT(DISTINCT ws.worksheet_id)
    INTO completed_materials
    FROM worksheet_submissions ws
    JOIN worksheets w ON ws.worksheet_id = w.id
    JOIN lesson_materials lm ON w.lesson_id = lm.lesson_id
    WHERE ws.student_id = p_student_id
    AND w.lesson_id = p_lesson_id
    AND ws.is_draft = false
    AND lm.is_required = true
    AND lm.material_type = 'worksheet';
    
    -- Calculate percentage
    IF total_materials > 0 THEN
        completion_pct := (completed_materials::DECIMAL / total_materials::DECIMAL) * 100;
    ELSE
        completion_pct := 100.00; -- No required materials = complete
    END IF;
    
    RETURN LEAST(completion_pct, 100.00);
END;
$$ LANGUAGE plpgsql;

-- Function 2: Calculate course progress
CREATE OR REPLACE FUNCTION calculate_course_progress(p_student_id INTEGER, p_course_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_lessons INTEGER := 0;
    completed_lessons INTEGER := 0;
    total_grade DECIMAL(10,2) := 0.00;
    lesson_count INTEGER := 0;
    avg_grade DECIMAL(5,2) := 0.00;
    completion_pct DECIMAL(5,2) := 0.00;
BEGIN
    -- Count total lessons in course
    SELECT COUNT(*) INTO total_lessons
    FROM lessons WHERE course_id = p_course_id AND is_published = true;
    
    -- Count completed lessons and calculate average grade
    SELECT 
        COUNT(*) FILTER (WHERE status = 'completed'),
        COALESCE(AVG(grade) FILTER (WHERE grade IS NOT NULL), 0.00)
    INTO completed_lessons, avg_grade
    FROM student_progress 
    WHERE student_id = p_student_id AND course_id = p_course_id;
    
    -- Calculate completion percentage
    IF total_lessons > 0 THEN
        completion_pct := (completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100;
    END IF;
    
    -- Build result JSON
    result := json_build_object(
        'course_id', p_course_id,
        'student_id', p_student_id,
        'total_lessons', total_lessons,
        'completed_lessons', completed_lessons,
        'completion_percentage', completion_pct,
        'average_grade', avg_grade,
        'status', CASE 
            WHEN completion_pct = 100 THEN 'completed'
            WHEN completion_pct > 0 THEN 'in_progress'
            ELSE 'not_started'
        END,
        'updated_at', CURRENT_TIMESTAMP
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Update student progress
CREATE OR REPLACE FUNCTION update_student_progress(p_student_id INTEGER, p_lesson_id INTEGER)
RETURNS VOID AS $$
DECLARE
    p_course_id INTEGER;
    completion_pct DECIMAL(5,2);
    lesson_grade DECIMAL(5,2);
BEGIN
    -- Get course_id for lesson
    SELECT course_id INTO p_course_id FROM lessons WHERE id = p_lesson_id;
    
    -- Calculate completion percentage
    completion_pct := calculate_lesson_completion(p_student_id, p_lesson_id);
    
    -- Calculate grade (average of quiz and worksheet grades)
    WITH lesson_grades AS (
        SELECT AVG(qa.percentage_score) as avg_score
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.student_id = p_student_id 
        AND q.lesson_id = p_lesson_id 
        AND qa.is_completed = true
        UNION ALL
        SELECT AVG(ws.grade)
        FROM worksheet_submissions ws
        JOIN worksheets w ON ws.worksheet_id = w.id
        WHERE ws.student_id = p_student_id
        AND w.lesson_id = p_lesson_id
        AND ws.is_draft = false
        AND ws.grade IS NOT NULL
    )
    SELECT COALESCE(AVG(avg_score), 0.00) INTO lesson_grade FROM lesson_grades;
    
    -- Update or insert progress record
    INSERT INTO student_progress (
        student_id, lesson_id, course_id, 
        completion_percentage, grade, status,
        updated_at, last_accessed_at
    ) VALUES (
        p_student_id, p_lesson_id, p_course_id,
        completion_pct, lesson_grade,
        CASE 
            WHEN completion_pct = 100 THEN 'completed'
            WHEN completion_pct > 0 THEN 'in_progress'
            ELSE 'not_started'
        END,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT (student_id, lesson_id) DO UPDATE SET
        completion_percentage = EXCLUDED.completion_percentage,
        grade = EXCLUDED.grade,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP,
        last_accessed_at = CURRENT_TIMESTAMP,
        completed_at = CASE 
            WHEN EXCLUDED.completion_percentage = 100 AND student_progress.completed_at IS NULL 
            THEN CURRENT_TIMESTAMP 
            ELSE student_progress.completed_at 
        END;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Check lesson prerequisites
CREATE OR REPLACE FUNCTION check_lesson_prerequisites(p_student_id INTEGER, p_lesson_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    lesson_prerequisites JSONB;
    prereq_lesson_id INTEGER;
    required_completion DECIMAL(5,2) := 70.00;
    required_grade DECIMAL(5,2) := 70.00;
    student_completion DECIMAL(5,2);
    student_grade DECIMAL(5,2);
    all_met BOOLEAN := true;
BEGIN
    -- Get lesson prerequisites
    SELECT prerequisites INTO lesson_prerequisites 
    FROM lessons WHERE id = p_lesson_id;
    
    -- If no prerequisites, lesson is unlocked
    IF lesson_prerequisites IS NULL OR jsonb_array_length(lesson_prerequisites) = 0 THEN
        RETURN true;
    END IF;
    
    -- Check each prerequisite
    FOR prereq_lesson_id IN SELECT jsonb_array_elements_text(lesson_prerequisites)::INTEGER LOOP
        -- Get student progress for prerequisite lesson
        SELECT completion_percentage, COALESCE(grade, 0.00)
        INTO student_completion, student_grade
        FROM student_progress
        WHERE student_id = p_student_id AND lesson_id = prereq_lesson_id;
        
        -- Check if requirements are met
        IF student_completion < required_completion OR student_grade < required_grade THEN
            all_met := false;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN all_met;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS for automatic updates

-- Trigger: Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worksheets_updated_at BEFORE UPDATE ON worksheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SAMPLE DATA for testing (optional)

-- Insert sample course
INSERT INTO courses (title, description, teacher_id, school_id, learning_objectives) 
SELECT 
    'Introduction to Podcasting', 
    'A comprehensive 9-week course on podcast production and storytelling',
    u.id,
    1,
    '[
        "Understand basic podcast production workflow",
        "Learn audio editing techniques", 
        "Develop storytelling skills",
        "Create engaging podcast content"
    ]'::jsonb
FROM users u WHERE u.role = 'teacher' LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample lessons
WITH sample_course AS (
    SELECT id FROM courses WHERE title = 'Introduction to Podcasting' LIMIT 1
)
INSERT INTO lessons (course_id, title, description, week_number, content, learning_objectives)
SELECT 
    sc.id,
    'Week ' || week_num || ': ' || 
    CASE week_num
        WHEN 1 THEN 'Introduction to Podcasting'
        WHEN 2 THEN 'Podcast Pre-Production'
        WHEN 3 THEN 'Audio Production Basics'
        ELSE 'Advanced Topics'
    END,
    'Lesson description for week ' || week_num,
    week_num,
    'Sample lesson content for week ' || week_num,
    '[
        "Learning objective 1",
        "Learning objective 2", 
        "Learning objective 3"
    ]'::jsonb
FROM sample_course sc
CROSS JOIN generate_series(1, 3) AS week_num
ON CONFLICT DO NOTHING;

-- Create performance indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_progress_composite 
    ON student_progress(student_id, course_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quiz_attempts_composite 
    ON quiz_attempts(student_id, quiz_id, is_completed);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lessons_course_week 
    ON lessons(course_id, week_number, is_published);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

-- Migration completed successfully
SELECT 'VidPOD Lesson Management System - Database migration completed successfully!' as status;