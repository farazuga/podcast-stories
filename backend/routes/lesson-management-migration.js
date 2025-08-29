const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * POST /api/lesson-migration/setup
 * Create all lesson management system tables and functions
 */
router.post('/setup', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting lesson management system setup...');
    
    await client.query('BEGIN');
    
    // 1. Create courses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
        total_weeks INTEGER DEFAULT 9 CHECK (total_weeks BETWEEN 1 AND 52),
        difficulty_level VARCHAR(20) DEFAULT 'beginner',
        is_active BOOLEAN DEFAULT true,
        is_template BOOLEAN DEFAULT false,
        learning_objectives JSONB DEFAULT '[]'::jsonb,
        prerequisites JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Create lessons table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        week_number INTEGER NOT NULL CHECK (week_number > 0),
        lesson_number INTEGER DEFAULT 1 CHECK (lesson_number > 0),
        content TEXT,
        difficulty_level VARCHAR(20) DEFAULT 'beginner',
        learning_objectives JSONB DEFAULT '[]'::jsonb,
        vocabulary_terms JSONB DEFAULT '{}'::jsonb,
        requires_completion_of INTEGER REFERENCES lessons(id),
        unlock_criteria JSONB DEFAULT '{"type": "none"}'::jsonb,
        estimated_duration_minutes INTEGER DEFAULT 50,
        is_published BOOLEAN DEFAULT false,
        is_quiz_required BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE (course_id, week_number, lesson_number)
      )
    `);
    
    // 3. Create lesson materials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_materials (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        material_type VARCHAR(20) NOT NULL CHECK (material_type IN (
          'vocabulary', 'quiz', 'worksheet', 'video', 'audio', 'reading', 'assignment', 'resource'
        )),
        file_path VARCHAR(500),
        file_name VARCHAR(255),
        file_size BIGINT,
        url TEXT,
        content_data JSONB DEFAULT '{}'::jsonb,
        points_possible INTEGER DEFAULT 0,
        time_limit INTEGER,
        sort_order INTEGER DEFAULT 0,
        is_required BOOLEAN DEFAULT false,
        availability_start TIMESTAMP,
        availability_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 4. Create course enrollments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_enrollments (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        current_lesson_id INTEGER REFERENCES lessons(id),
        is_active BOOLEAN DEFAULT true,
        final_grade DECIMAL(5,2),
        
        UNIQUE (course_id, student_id)
      )
    `);
    
    // 5. Create student progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_progress (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN (
          'not_started', 'in_progress', 'completed', 'locked', 'passed', 'failed', 'skipped'
        )),
        completion_percentage DECIMAL(5,2) DEFAULT 0.00,
        grade DECIMAL(5,2),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        time_spent_seconds INTEGER DEFAULT 0,
        teacher_notes TEXT,
        student_notes TEXT,
        unlocked_at TIMESTAMP,
        unlock_reason TEXT,
        unlocked_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE (student_id, lesson_id)
      )
    `);
    
    // 6. Create quizzes table (simplified for testing)
    await client.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        lesson_material_id INTEGER REFERENCES lesson_materials(id) ON DELETE CASCADE,
        lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        time_limit INTEGER,
        attempts_allowed INTEGER DEFAULT 3,
        passing_score INTEGER DEFAULT 70,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 7. Create quiz attempts table (for testing)
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP,
        percentage_score DECIMAL(5,2) DEFAULT 0.00,
        is_completed BOOLEAN DEFAULT false,
        is_practice BOOLEAN DEFAULT false,
        time_taken INTEGER,
        responses JSONB DEFAULT '{}'::jsonb,
        
        UNIQUE (quiz_id, student_id, attempt_number)
      )
    `);
    
    // 8. Create worksheets table (simplified)
    await client.query(`
      CREATE TABLE IF NOT EXISTS worksheets (
        id SERIAL PRIMARY KEY,
        lesson_material_id INTEGER REFERENCES lesson_materials(id) ON DELETE CASCADE,
        lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        form_fields JSONB DEFAULT '[]'::jsonb,
        max_file_size INTEGER DEFAULT 10485760,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 9. Create worksheet submissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS worksheet_submissions (
        id SERIAL PRIMARY KEY,
        worksheet_id INTEGER NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        responses JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'graded')),
        submitted_at TIMESTAMP,
        graded_at TIMESTAMP,
        grade DECIMAL(5,2),
        feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create essential database functions
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_lesson_completion(p_student_id INTEGER, p_lesson_id INTEGER)
      RETURNS DECIMAL(5,2) AS $$
      DECLARE
        total_materials INTEGER := 0;
        completed_materials INTEGER := 0;
        completion_pct DECIMAL(5,2) := 0.00;
      BEGIN
        -- Count total required materials for lesson
        SELECT COUNT(*) INTO total_materials
        FROM lesson_materials lm
        WHERE lm.lesson_id = p_lesson_id AND lm.is_required = true;
        
        -- If no required materials, consider lesson complete if progress exists
        IF total_materials = 0 THEN
          SELECT CASE WHEN COUNT(*) > 0 THEN 100.00 ELSE 0.00 END
          INTO completion_pct
          FROM student_progress sp
          WHERE sp.student_id = p_student_id AND sp.lesson_id = p_lesson_id;
          
          RETURN completion_pct;
        END IF;
        
        -- Count completed materials (simplified check)
        SELECT COUNT(*) INTO completed_materials
        FROM lesson_materials lm
        WHERE lm.lesson_id = p_lesson_id 
        AND lm.is_required = true
        AND (
          lm.material_type = 'reading' OR -- Assume reading materials are always available
          EXISTS (
            SELECT 1 FROM quiz_attempts qa 
            JOIN quizzes q ON qa.quiz_id = q.id 
            WHERE q.lesson_material_id = lm.id 
            AND qa.student_id = p_student_id 
            AND qa.is_completed = true
          ) OR
          EXISTS (
            SELECT 1 FROM worksheet_submissions ws 
            JOIN worksheets w ON ws.worksheet_id = w.id 
            WHERE w.lesson_material_id = lm.id 
            AND ws.student_id = p_student_id 
            AND ws.status = 'submitted'
          )
        );
        
        -- Calculate percentage
        completion_pct := (completed_materials::DECIMAL / total_materials::DECIMAL) * 100;
        RETURN LEAST(completion_pct, 100.00);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_course_progress(p_student_id INTEGER, p_course_id INTEGER)
      RETURNS JSONB AS $$
      DECLARE
        result JSONB;
        total_lessons INTEGER := 0;
        completed_lessons INTEGER := 0;
        avg_grade DECIMAL(5,2) := 0.00;
        completion_pct DECIMAL(5,2) := 0.00;
      BEGIN
        -- Count total published lessons
        SELECT COUNT(*) INTO total_lessons
        FROM lessons WHERE course_id = p_course_id AND is_published = true;
        
        -- Count completed lessons and calculate average grade
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('completed', 'passed')),
          COALESCE(AVG(grade) FILTER (WHERE grade IS NOT NULL), 0.00)
        INTO completed_lessons, avg_grade
        FROM student_progress 
        WHERE student_id = p_student_id AND course_id = p_course_id;
        
        -- Calculate completion percentage
        IF total_lessons > 0 THEN
          completion_pct := (completed_lessons::DECIMAL / total_lessons::DECIMAL) * 100;
        END IF;
        
        -- Build result
        result := json_build_object(
          'course_id', p_course_id,
          'student_id', p_student_id,
          'total_lessons', total_lessons,
          'completed_lessons', completed_lessons,
          'overall_progress', completion_pct,
          'average_grade', avg_grade,
          'status', CASE 
            WHEN completion_pct = 100 THEN 'completed'
            WHEN completion_pct > 0 THEN 'in_progress'
            ELSE 'not_started'
          END
        );
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      CREATE OR REPLACE FUNCTION check_lesson_prerequisites(p_student_id INTEGER, p_lesson_id INTEGER)
      RETURNS BOOLEAN AS $$
      DECLARE
        prereq_lesson_id INTEGER;
        student_completion DECIMAL(5,2);
        required_completion DECIMAL(5,2) := 70.00;
      BEGIN
        -- Get prerequisite lesson ID
        SELECT requires_completion_of INTO prereq_lesson_id
        FROM lessons WHERE id = p_lesson_id;
        
        -- If no prerequisite, lesson is available
        IF prereq_lesson_id IS NULL THEN
          RETURN true;
        END IF;
        
        -- Check if prerequisite lesson is completed
        SELECT COALESCE(completion_percentage, 0.00) INTO student_completion
        FROM student_progress
        WHERE student_id = p_student_id AND lesson_id = prereq_lesson_id;
        
        RETURN student_completion >= required_completion;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create essential indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_courses_school_id ON courses(school_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson_id ON lesson_materials(lesson_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_student_progress_lesson_id ON student_progress(lesson_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_student_progress_course_id ON student_progress(course_id)`);
    
    await client.query('COMMIT');
    
    console.log('✅ Lesson management system setup completed successfully');
    
    res.json({
      success: true,
      message: 'Lesson management system setup completed successfully',
      tables_created: [
        'courses',
        'lessons', 
        'lesson_materials',
        'course_enrollments',
        'student_progress',
        'quizzes',
        'quiz_attempts',
        'worksheets',
        'worksheet_submissions'
      ],
      functions_created: [
        'calculate_lesson_completion',
        'calculate_course_progress', 
        'check_lesson_prerequisites'
      ]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up lesson management system:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to setup lesson management system',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/lesson-migration/sample-data
 * Create sample data for testing
 */
router.post('/sample-data', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get teacher ID (use any teacher or admin)
    const teacherQuery = await client.query(
      "SELECT id, name FROM users WHERE role IN ('teacher', 'amitrace_admin') ORDER BY id LIMIT 1"
    );
    
    if (teacherQuery.rows.length === 0) {
      return res.status(400).json({ error: 'No teacher found to create sample course' });
    }
    
    const teacherId = teacherQuery.rows[0].id;
    
    // Create sample course
    const courseResult = await client.query(`
      INSERT INTO courses (title, description, teacher_id, total_weeks, learning_objectives)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      'Sample Podcasting Course',
      'A comprehensive course on podcast production and storytelling techniques',
      teacherId,
      4,
      JSON.stringify([
        'Understand basic podcast production workflow',
        'Learn audio editing techniques',
        'Develop storytelling skills',
        'Create engaging content'
      ])
    ]);
    
    let courseId;
    if (courseResult.rows.length > 0) {
      courseId = courseResult.rows[0].id;
    } else {
      // Course already exists, get its ID
      const existingCourse = await client.query(
        'SELECT id FROM courses WHERE title = $1 AND teacher_id = $2',
        ['Sample Podcasting Course', teacherId]
      );
      courseId = existingCourse.rows[0].id;
    }
    
    // Create sample lessons
    const lessons = [
      { week: 1, title: 'Introduction to Podcasting', description: 'Learn the basics of podcast production' },
      { week: 2, title: 'Audio Recording Techniques', description: 'Master recording quality audio' },
      { week: 3, title: 'Storytelling for Podcasts', description: 'Develop compelling narrative skills' },
      { week: 4, title: 'Editing and Publishing', description: 'Polish and distribute your podcast' }
    ];
    
    for (const lesson of lessons) {
      await client.query(`
        INSERT INTO lessons (course_id, title, description, week_number, is_published, content)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (course_id, week_number, lesson_number) DO NOTHING
      `, [
        courseId,
        lesson.title,
        lesson.description,
        lesson.week,
        true,
        `Sample content for ${lesson.title}. This lesson covers important concepts and practical exercises.`
      ]);
    }
    
    // Get student for enrollment
    const studentQuery = await client.query(
      "SELECT id FROM users WHERE role = 'student' ORDER BY id LIMIT 1"
    );
    
    if (studentQuery.rows.length > 0) {
      const studentId = studentQuery.rows[0].id;
      
      // Enroll student in course
      await client.query(`
        INSERT INTO course_enrollments (course_id, student_id, is_active)
        VALUES ($1, $2, $3)
        ON CONFLICT (course_id, student_id) DO UPDATE SET is_active = true
      `, [courseId, studentId, true]);
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Sample data created successfully',
      course_id: courseId,
      lessons_created: lessons.length,
      teacher_id: teacherId
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating sample data:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create sample data',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

module.exports = router;