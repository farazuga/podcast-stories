const express = require('express');
const { Pool } = require('pg');
const { verifyToken, isTeacherOrAbove, hasAnyRole } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// =============================================================================
// STUDENT PROGRESS TRACKING API ROUTES
// =============================================================================

/**
 * GET /api/progress/course/:courseId
 * Get student's progress for a specific course
 */
router.get('/course/:courseId', verifyToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.query.student_id || req.user.id;
    const userRole = req.user.role;

    // Permission check
    if (studentId !== req.user.id && !['teacher', 'amitrace_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied. You can only view your own progress.' });
    }

    // For teachers, verify they own the course
    if (userRole === 'teacher') {
      const courseCheck = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [courseId]);
      if (courseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }
      if (courseCheck.rows[0].teacher_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. You can only view progress for your own courses.' });
      }
    }

    // Check if student is enrolled
    if (userRole !== 'amitrace_admin') {
      const enrollmentCheck = await pool.query(
        'SELECT is_active FROM course_enrollments WHERE student_id = $1 AND course_id = $2',
        [studentId, courseId]
      );

      if (enrollmentCheck.rows.length === 0 || !enrollmentCheck.rows[0].is_active) {
        return res.status(403).json({ error: 'Student is not enrolled in this course.' });
      }
    }

    // Get overall course progress using database function
    const courseProgressResult = await pool.query(
      'SELECT calculate_course_progress($1, $2) as progress_data',
      [studentId, courseId]
    );

    const courseProgress = courseProgressResult.rows[0].progress_data;

    // Get detailed lesson progress
    const lessonProgressQuery = `
      SELECT 
        sp.*,
        l.title as lesson_title,
        l.week_number,
        l.lesson_number,
        l.is_published,
        calculate_lesson_completion($1, l.id) as completion_percentage,
        check_lesson_prerequisites($1, l.id) as prerequisites_met,
        (
          SELECT json_agg(
            json_build_object(
              'material_id', lm.id,
              'material_title', lm.title,
              'material_type', lm.material_type,
              'points_possible', lm.points_possible,
              'status', CASE 
                WHEN lm.material_type = 'quiz' THEN (
                  SELECT CASE 
                    WHEN MAX(qa.percentage_score) >= q.passing_score THEN 'passed'
                    WHEN COUNT(qa.id) > 0 THEN 'attempted'
                    ELSE 'not_started'
                  END
                  FROM quizzes q 
                  LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = $1
                  WHERE q.lesson_material_id = lm.id
                )
                WHEN lm.material_type = 'worksheet' THEN (
                  SELECT CASE 
                    WHEN MAX(ws.status) = 'submitted' THEN 'completed'
                    WHEN COUNT(ws.id) > 0 THEN 'in_progress'
                    ELSE 'not_started'
                  END
                  FROM worksheets w 
                  LEFT JOIN worksheet_submissions ws ON w.id = ws.worksheet_id AND ws.student_id = $1
                  WHERE w.lesson_material_id = lm.id
                )
                ELSE 'available'
              END
            )
          )
          FROM lesson_materials lm 
          WHERE lm.lesson_id = l.id
          ORDER BY lm.sort_order
        ) as materials_progress
      FROM lessons l
      LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND sp.student_id = $1
      WHERE l.course_id = $2
      ORDER BY l.week_number, l.lesson_number
    `;

    const lessonProgressResult = await pool.query(lessonProgressQuery, [studentId, courseId]);

    res.json({
      course_progress: courseProgress,
      lesson_progress: lessonProgressResult.rows
    });
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

/**
 * GET /api/progress/lesson/:lessonId
 * Get detailed progress for a specific lesson
 */
router.get('/lesson/:lessonId', verifyToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const studentId = req.query.student_id || req.user.id;
    const userRole = req.user.role;

    // Permission check
    if (studentId !== req.user.id && !['teacher', 'amitrace_admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied. You can only view your own progress.' });
    }

    // Check lesson access
    const hasAccess = await checkLessonAccess(req.user.id, lessonId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this lesson.' });
    }

    // Get lesson progress
    const progressQuery = `
      SELECT 
        sp.*,
        l.title as lesson_title,
        l.week_number,
        l.lesson_number,
        l.course_id,
        c.title as course_title,
        calculate_lesson_completion($1, $2) as completion_percentage,
        check_lesson_prerequisites($1, $2) as prerequisites_met
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND sp.student_id = $1
      WHERE l.id = $2
    `;

    const progressResult = await pool.query(progressQuery, [studentId, lessonId]);

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lessonProgress = progressResult.rows[0];

    // Get detailed material progress
    const materialProgressQuery = `
      SELECT 
        lm.*,
        CASE 
          WHEN lm.material_type = 'quiz' THEN (
            SELECT json_build_object(
              'best_score', MAX(qa.percentage_score),
              'attempts_count', COUNT(qa.id),
              'last_attempt', MAX(qa.submitted_at),
              'passed', COALESCE(MAX(qa.percentage_score) >= q.passing_score, false)
            )
            FROM quizzes q 
            LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = $1
            WHERE q.lesson_material_id = lm.id
          )
          WHEN lm.material_type = 'worksheet' THEN (
            SELECT json_build_object(
              'submission_count', COUNT(ws.id),
              'last_submission', MAX(ws.submitted_at),
              'status', COALESCE(MAX(ws.status), 'not_started'),
              'grade', MAX(ws.grade)
            )
            FROM worksheets w 
            LEFT JOIN worksheet_submissions ws ON w.id = ws.worksheet_id AND ws.student_id = $1
            WHERE w.lesson_material_id = lm.id
          )
          ELSE NULL
        END as progress_details
      FROM lesson_materials lm
      WHERE lm.lesson_id = $2
      ORDER BY lm.sort_order, lm.created_at
    `;

    const materialProgressResult = await pool.query(materialProgressQuery, [studentId, lessonId]);

    res.json({
      ...lessonProgress,
      materials: materialProgressResult.rows
    });
  } catch (error) {
    console.error('Error fetching lesson progress:', error);
    res.status(500).json({ error: 'Failed to fetch lesson progress' });
  }
});

/**
 * POST /api/progress/update
 * Manually update student progress (teachers and admins)
 */
router.post('/update', verifyToken, isTeacherOrAbove, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      student_id,
      lesson_id,
      status,
      completion_percentage,
      notes,
      force_unlock
    } = req.body;

    // Validation
    if (!student_id || !lesson_id) {
      return res.status(400).json({ 
        error: 'Student ID and lesson ID are required' 
      });
    }

    const validStatuses = ['not_started', 'in_progress', 'completed', 'passed', 'failed', 'skipped'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Check permissions
    const lessonCheck = await client.query(
      'SELECT c.teacher_id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1',
      [lesson_id]
    );

    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const canUpdate = 
      req.user.role === 'amitrace_admin' || 
      lessonCheck.rows[0].teacher_id === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({ 
        error: 'Access denied. You can only update progress for your own courses.' 
      });
    }

    // Check if student is enrolled in the course
    const enrollmentCheck = await client.query(
      `SELECT ce.is_active 
       FROM course_enrollments ce 
       JOIN lessons l ON ce.course_id = l.course_id 
       WHERE ce.student_id = $1 AND l.id = $2`,
      [student_id, lesson_id]
    );

    if (enrollmentCheck.rows.length === 0 || !enrollmentCheck.rows[0].is_active) {
      return res.status(400).json({ error: 'Student is not enrolled in this course' });
    }

    // Get or create progress record
    const existingProgress = await client.query(
      'SELECT * FROM student_progress WHERE student_id = $1 AND lesson_id = $2',
      [student_id, lesson_id]
    );

    let progressResult;

    if (existingProgress.rows.length > 0) {
      // Update existing progress
      const updates = [];
      const values = [];
      let paramCounter = 1;

      if (status !== undefined) {
        updates.push(`status = $${paramCounter}`);
        values.push(status);
        paramCounter++;
      }

      if (completion_percentage !== undefined) {
        updates.push(`completion_percentage = $${paramCounter}`);
        values.push(completion_percentage);
        paramCounter++;
      }

      if (notes !== undefined) {
        updates.push(`teacher_notes = $${paramCounter}`);
        values.push(notes);
        paramCounter++;
      }

      if (force_unlock !== undefined) {
        updates.push(`unlocked_at = $${paramCounter}`);
        values.push(force_unlock ? new Date() : null);
        paramCounter++;
      }

      // Set completion timestamp if status is completed or passed
      if (status === 'completed' || status === 'passed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(student_id, lesson_id);

        const query = `
          UPDATE student_progress 
          SET ${updates.join(', ')} 
          WHERE student_id = $${paramCounter} AND lesson_id = $${paramCounter + 1}
          RETURNING *
        `;
        
        progressResult = await client.query(query, values);
      } else {
        progressResult = { rows: [existingProgress.rows[0]] };
      }
    } else {
      // Create new progress record
      progressResult = await client.query(
        `INSERT INTO student_progress (
          student_id, lesson_id, course_id, status, completion_percentage,
          teacher_notes, unlocked_at, completed_at
        ) 
        SELECT $1, $2, l.course_id, $3, $4, $5, $6, $7
        FROM lessons l 
        WHERE l.id = $2
        RETURNING *`,
        [
          student_id,
          lesson_id,
          status || 'not_started',
          completion_percentage || 0,
          notes || null,
          force_unlock ? new Date() : null,
          (status === 'completed' || status === 'passed') ? new Date() : null
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Student progress updated successfully',
      progress: progressResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating student progress:', error);
    res.status(500).json({ error: 'Failed to update student progress' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/progress/unlock/:lessonId
 * Manually unlock a lesson for a student (override prerequisites)
 */
router.put('/unlock/:lessonId', verifyToken, isTeacherOrAbove, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { lessonId } = req.params;
    const { student_id, unlock_reason } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Check permissions
    const lessonCheck = await client.query(
      'SELECT c.teacher_id, l.title FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1',
      [lessonId]
    );

    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const canUnlock = 
      req.user.role === 'amitrace_admin' || 
      lessonCheck.rows[0].teacher_id === req.user.id;

    if (!canUnlock) {
      return res.status(403).json({ 
        error: 'Access denied. You can only unlock lessons in your own courses.' 
      });
    }

    // Check student enrollment
    const enrollmentCheck = await client.query(
      `SELECT ce.is_active 
       FROM course_enrollments ce 
       JOIN lessons l ON ce.course_id = l.course_id 
       WHERE ce.student_id = $1 AND l.id = $2`,
      [student_id, lessonId]
    );

    if (enrollmentCheck.rows.length === 0 || !enrollmentCheck.rows[0].is_active) {
      return res.status(400).json({ error: 'Student is not enrolled in this course' });
    }

    // Create or update progress record with unlock
    const upsertQuery = `
      INSERT INTO student_progress (
        student_id, lesson_id, course_id, status, unlocked_at, 
        unlock_reason, unlocked_by
      )
      SELECT $1, $2, l.course_id, 'not_started', CURRENT_TIMESTAMP, $3, $4
      FROM lessons l 
      WHERE l.id = $2
      ON CONFLICT (student_id, lesson_id) 
      DO UPDATE SET 
        unlocked_at = CURRENT_TIMESTAMP,
        unlock_reason = $3,
        unlocked_by = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await client.query(upsertQuery, [
      student_id,
      lessonId,
      unlock_reason || 'Manually unlocked by teacher',
      req.user.id
    ]);

    await client.query('COMMIT');

    res.json({
      message: `Lesson "${lessonCheck.rows[0].title}" unlocked successfully`,
      progress: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error unlocking lesson:', error);
    res.status(500).json({ error: 'Failed to unlock lesson' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/progress/analytics/course/:courseId
 * Get course analytics and progress overview (teachers and admins only)
 */
router.get('/analytics/course/:courseId', verifyToken, isTeacherOrAbove, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Check permissions
    if (userRole !== 'amitrace_admin') {
      const courseCheck = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [courseId]);
      
      if (courseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (courseCheck.rows[0].teacher_id !== userId) {
        return res.status(403).json({ 
          error: 'Access denied. You can only view analytics for your own courses.' 
        });
      }
    }

    // Get course overview
    const courseOverviewQuery = `
      SELECT 
        c.*,
        COUNT(DISTINCT ce.student_id) FILTER (WHERE ce.is_active = true) as enrolled_students,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT l.id) FILTER (WHERE l.is_published = true) as published_lessons
      FROM courses c
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      LEFT JOIN lessons l ON c.id = l.course_id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const courseOverview = await pool.query(courseOverviewQuery, [courseId]);

    if (courseOverview.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const courseData = courseOverview.rows[0];

    // Get student progress summary
    const studentProgressQuery = `
      SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        ce.enrolled_at,
        ce.progress_percentage,
        ce.current_lesson_id,
        calculate_course_progress(u.id, $1) as detailed_progress,
        COUNT(sp.id) as lessons_with_progress,
        COUNT(sp.id) FILTER (WHERE sp.status IN ('completed', 'passed')) as completed_lessons,
        AVG(sp.completion_percentage) as avg_completion
      FROM users u
      JOIN course_enrollments ce ON u.id = ce.student_id
      LEFT JOIN student_progress sp ON u.id = sp.student_id AND sp.course_id = $1
      WHERE ce.course_id = $1 AND ce.is_active = true
      GROUP BY u.id, u.name, u.email, ce.enrolled_at, ce.progress_percentage, ce.current_lesson_id
      ORDER BY u.name
    `;

    const studentProgress = await pool.query(studentProgressQuery, [courseId]);

    // Get lesson completion statistics
    const lessonStatsQuery = `
      SELECT 
        l.id as lesson_id,
        l.title as lesson_title,
        l.week_number,
        l.lesson_number,
        l.is_published,
        COUNT(DISTINCT sp.student_id) as students_started,
        COUNT(DISTINCT sp.student_id) FILTER (WHERE sp.status IN ('completed', 'passed')) as students_completed,
        ROUND(AVG(sp.completion_percentage), 2) as avg_completion_percentage,
        COUNT(DISTINCT lm.id) as total_materials,
        COUNT(DISTINCT lm.id) FILTER (WHERE lm.material_type = 'quiz') as quiz_count,
        COUNT(DISTINCT lm.id) FILTER (WHERE lm.material_type = 'worksheet') as worksheet_count
      FROM lessons l
      LEFT JOIN student_progress sp ON l.id = sp.lesson_id
      LEFT JOIN lesson_materials lm ON l.id = lm.lesson_id
      WHERE l.course_id = $1
      GROUP BY l.id, l.title, l.week_number, l.lesson_number, l.is_published
      ORDER BY l.week_number, l.lesson_number
    `;

    const lessonStats = await pool.query(lessonStatsQuery, [courseId]);

    // Get quiz performance analytics
    const quizPerformanceQuery = `
      SELECT 
        l.week_number,
        l.lesson_number,
        l.title as lesson_title,
        q.title as quiz_title,
        COUNT(DISTINCT qa.student_id) as students_attempted,
        ROUND(AVG(qa.percentage_score), 2) as avg_score,
        COUNT(DISTINCT qa.student_id) FILTER (WHERE qa.percentage_score >= q.passing_score) as students_passed,
        ROUND(AVG(qa.time_taken) / 60.0, 2) as avg_time_minutes
      FROM lessons l
      JOIN lesson_materials lm ON l.id = lm.lesson_id AND lm.material_type = 'quiz'
      JOIN quizzes q ON lm.id = q.lesson_material_id
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.is_practice = false
      WHERE l.course_id = $1
      GROUP BY l.week_number, l.lesson_number, l.title, q.id, q.title
      ORDER BY l.week_number, l.lesson_number
    `;

    const quizPerformance = await pool.query(quizPerformanceQuery, [courseId]);

    // Calculate overall course statistics
    const totalStudents = courseData.enrolled_students;
    const completionRate = studentProgress.rows.length > 0 
      ? studentProgress.rows.reduce((sum, student) => {
          const progress = student.detailed_progress;
          return sum + (progress?.overall_progress || 0);
        }, 0) / studentProgress.rows.length
      : 0;

    res.json({
      course_overview: courseData,
      overall_stats: {
        total_students: totalStudents,
        avg_completion_rate: Math.round(completionRate * 100) / 100,
        total_lessons: courseData.total_lessons,
        published_lessons: courseData.published_lessons
      },
      student_progress: studentProgress.rows,
      lesson_statistics: lessonStats.rows,
      quiz_performance: quizPerformance.rows
    });
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({ error: 'Failed to fetch course analytics' });
  }
});

/**
 * GET /api/progress/analytics/student/:studentId/course/:courseId
 * Get detailed analytics for a specific student in a course
 */
router.get('/analytics/student/:studentId/course/:courseId', verifyToken, isTeacherOrAbove, async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Check permissions
    if (userRole !== 'amitrace_admin') {
      const courseCheck = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [courseId]);
      
      if (courseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (courseCheck.rows[0].teacher_id !== userId) {
        return res.status(403).json({ 
          error: 'Access denied. You can only view analytics for your own courses.' 
        });
      }
    }

    // Get student information and enrollment
    const studentInfoQuery = `
      SELECT 
        u.*,
        ce.enrolled_at,
        ce.progress_percentage,
        ce.current_lesson_id,
        calculate_course_progress($1, $2) as course_progress
      FROM users u
      LEFT JOIN course_enrollments ce ON u.id = ce.student_id AND ce.course_id = $2
      WHERE u.id = $1
    `;

    const studentInfo = await pool.query(studentInfoQuery, [studentId, courseId]);

    if (studentInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!studentInfo.rows[0].enrolled_at) {
      return res.status(400).json({ error: 'Student is not enrolled in this course' });
    }

    // Get detailed lesson progress
    const lessonProgressQuery = `
      SELECT 
        l.*,
        sp.status,
        sp.completion_percentage,
        sp.time_spent,
        sp.unlocked_at,
        sp.started_at,
        sp.completed_at,
        sp.teacher_notes,
        sp.student_notes,
        calculate_lesson_completion($1, l.id) as calculated_completion
      FROM lessons l
      LEFT JOIN student_progress sp ON l.id = sp.lesson_id AND sp.student_id = $1
      WHERE l.course_id = $2
      ORDER BY l.week_number, l.lesson_number
    `;

    const lessonProgress = await pool.query(lessonProgressQuery, [studentId, courseId]);

    // Get quiz attempts summary
    const quizAttemptsQuery = `
      SELECT 
        l.week_number,
        l.lesson_number,
        l.title as lesson_title,
        q.title as quiz_title,
        q.passing_score,
        COUNT(qa.id) as total_attempts,
        MAX(qa.percentage_score) as best_score,
        MIN(qa.percentage_score) as worst_score,
        AVG(qa.percentage_score) as avg_score,
        MAX(qa.submitted_at) as last_attempt,
        SUM(qa.time_taken) as total_time_spent
      FROM lessons l
      JOIN lesson_materials lm ON l.id = lm.lesson_id AND lm.material_type = 'quiz'
      JOIN quizzes q ON lm.id = q.lesson_material_id
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = $1 AND qa.is_practice = false
      WHERE l.course_id = $2
      GROUP BY l.week_number, l.lesson_number, l.title, q.id, q.title, q.passing_score
      ORDER BY l.week_number, l.lesson_number
    `;

    const quizAttempts = await pool.query(quizAttemptsQuery, [studentId, courseId]);

    // Get worksheet submissions
    const worksheetSubmissionsQuery = `
      SELECT 
        l.week_number,
        l.lesson_number,
        l.title as lesson_title,
        w.title as worksheet_title,
        ws.status,
        ws.grade,
        ws.submitted_at,
        ws.graded_at,
        ws.feedback
      FROM lessons l
      JOIN lesson_materials lm ON l.id = lm.lesson_id AND lm.material_type = 'worksheet'
      JOIN worksheets w ON lm.id = w.lesson_material_id
      LEFT JOIN worksheet_submissions ws ON w.id = ws.worksheet_id AND ws.student_id = $1
      WHERE l.course_id = $2
      ORDER BY l.week_number, l.lesson_number
    `;

    const worksheetSubmissions = await pool.query(worksheetSubmissionsQuery, [studentId, courseId]);

    res.json({
      student_info: studentInfo.rows[0],
      lesson_progress: lessonProgress.rows,
      quiz_performance: quizAttempts.rows,
      worksheet_submissions: worksheetSubmissions.rows,
      summary: {
        total_lessons: lessonProgress.rows.length,
        completed_lessons: lessonProgress.rows.filter(l => ['completed', 'passed'].includes(l.status)).length,
        avg_lesson_completion: lessonProgress.rows.reduce((sum, l) => sum + (l.completion_percentage || 0), 0) / lessonProgress.rows.length,
        total_quiz_attempts: quizAttempts.rows.reduce((sum, q) => sum + (q.total_attempts || 0), 0),
        quizzes_passed: quizAttempts.rows.filter(q => q.best_score >= q.passing_score).length
      }
    });
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    res.status(500).json({ error: 'Failed to fetch student analytics' });
  }
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if user has access to a lesson
 */
async function checkLessonAccess(userId, lessonId, userRole) {
  try {
    if (userRole === 'amitrace_admin') {
      return true;
    }

    const accessQuery = `
      SELECT 1
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1 AND (
        $2 = 'teacher' AND c.teacher_id = $3
        OR
        $2 = 'student' AND EXISTS (
          SELECT 1 FROM course_enrollments ce 
          WHERE ce.course_id = c.id AND ce.student_id = $3 AND ce.is_active = true
        )
      )
    `;

    const result = await pool.query(accessQuery, [lessonId, userRole, userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking lesson access:', error);
    return false;
  }
}

module.exports = router;