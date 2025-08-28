const express = require('express');
const { Pool } = require('pg');
const { verifyToken, isTeacherOrAbove, isAdmin, hasAnyRole } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// =============================================================================
// COURSE MANAGEMENT API ROUTES
// =============================================================================

/**
 * GET /api/courses
 * List courses based on user role:
 * - Teachers: Only their created courses
 * - Students: Courses they're enrolled in
 * - Admins: All courses
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, status, school_id } = req.query;
    const userRole = req.user.role;
    const userId = req.user.id;
    
    let query = `
      SELECT 
        c.*, 
        COALESCE(u.name, u.email) as teacher_name,
        u.email as teacher_email,
        s.name as school_name,
        (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrolled_count,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lesson_count
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN schools s ON c.school_id = s.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCounter = 1;

    // Role-based filtering
    if (userRole === 'teacher') {
      query += ` AND c.teacher_id = $${paramCounter}`;
      params.push(userId);
      paramCounter++;
    } else if (userRole === 'student') {
      query += ` AND c.id IN (
        SELECT ce.course_id 
        FROM course_enrollments ce 
        WHERE ce.student_id = $${paramCounter} AND ce.is_active = true
      )`;
      params.push(userId);
      paramCounter++;
    }
    // Admins see all courses - no additional filtering needed

    // Search filter
    if (search) {
      query += ` AND (c.title ILIKE $${paramCounter} OR c.description ILIKE $${paramCounter})`;
      params.push(`%${search}%`);
      paramCounter++;
    }

    // Status filter
    if (status === 'active') {
      query += ` AND c.is_active = true`;
    } else if (status === 'inactive') {
      query += ` AND c.is_active = false`;
    }

    // School filter (admin only)
    if (school_id && userRole === 'amitrace_admin') {
      query += ` AND c.school_id = $${paramCounter}`;
      params.push(school_id);
      paramCounter++;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

/**
 * GET /api/courses/:id
 * Get detailed course information including lessons
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get course details
    const courseQuery = `
      SELECT 
        c.*, 
        COALESCE(u.name, u.email) as teacher_name,
        u.email as teacher_email,
        s.name as school_name,
        (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.is_active = true) as enrolled_count
      FROM courses c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN schools s ON c.school_id = s.id
      WHERE c.id = $1
    `;

    const courseResult = await pool.query(courseQuery, [id]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // Check access permissions
    const hasAccess = 
      userRole === 'amitrace_admin' || 
      course.teacher_id === userId ||
      await checkStudentEnrollment(userId, id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. You are not enrolled in this course.' });
    }

    // Get lessons for this course
    const lessonsQuery = `
      SELECT 
        l.*,
        (SELECT COUNT(*) FROM lesson_materials lm WHERE lm.lesson_id = l.id) as material_count,
        CASE 
          WHEN $2 = 'student' THEN (
            SELECT sp.status 
            FROM student_progress sp 
            WHERE sp.student_id = $3 AND sp.lesson_id = l.id
          )
          ELSE NULL
        END as progress_status
      FROM lessons l
      WHERE l.course_id = $1 
      AND (l.is_published = true OR $2 != 'student')
      ORDER BY l.week_number, l.lesson_number
    `;

    const lessonsResult = await pool.query(lessonsQuery, [id, userRole, userId]);

    // Check enrollment status for students
    let enrollmentStatus = null;
    if (userRole === 'student') {
      const enrollmentQuery = await pool.query(
        'SELECT is_active, enrolled_at, current_lesson_id FROM course_enrollments WHERE student_id = $1 AND course_id = $2',
        [userId, id]
      );
      enrollmentStatus = enrollmentQuery.rows[0] || null;
    }

    res.json({
      ...course,
      lessons: lessonsResult.rows,
      enrollment_status: enrollmentStatus
    });
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
});

/**
 * POST /api/courses
 * Create new course (teachers and admins only)
 */
router.post('/', verifyToken, isTeacherOrAbove, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      title,
      description,
      total_weeks,
      difficulty_level,
      learning_objectives,
      prerequisites,
      is_template,
      school_id
    } = req.body;

    // Validation
    if (!title || !description || !total_weeks) {
      return res.status(400).json({ 
        error: 'Title, description, and total_weeks are required' 
      });
    }

    if (total_weeks < 1 || total_weeks > 52) {
      return res.status(400).json({ 
        error: 'Total weeks must be between 1 and 52' 
      });
    }

    // For teachers, use their school_id if not specified
    let finalSchoolId = school_id;
    if (req.user.role === 'teacher' && !school_id) {
      const userQuery = await client.query('SELECT school_id FROM users WHERE id = $1', [req.user.id]);
      finalSchoolId = userQuery.rows[0]?.school_id;
    }

    const courseResult = await client.query(
      `INSERT INTO courses (
        title, description, teacher_id, total_weeks, difficulty_level,
        learning_objectives, prerequisites, is_template, school_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        title,
        description,
        req.user.id,
        total_weeks,
        difficulty_level || 'beginner',
        JSON.stringify(learning_objectives || []),
        JSON.stringify(prerequisites || []),
        is_template || false,
        finalSchoolId
      ]
    );

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Course created successfully',
      course: courseResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/courses/:id
 * Update course (course teacher or admin only)
 */
router.put('/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      title,
      description,
      total_weeks,
      difficulty_level,
      learning_objectives,
      prerequisites,
      is_template,
      is_active
    } = req.body;

    // Check if user can edit this course
    const courseCheck = await client.query('SELECT teacher_id FROM courses WHERE id = $1', [id]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const canEdit = 
      req.user.role === 'amitrace_admin' || 
      courseCheck.rows[0].teacher_id === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied. You can only edit your own courses.' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCounter = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCounter}`);
      values.push(title);
      paramCounter++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCounter}`);
      values.push(description);
      paramCounter++;
    }

    if (total_weeks !== undefined) {
      if (total_weeks < 1 || total_weeks > 52) {
        return res.status(400).json({ error: 'Total weeks must be between 1 and 52' });
      }
      updates.push(`total_weeks = $${paramCounter}`);
      values.push(total_weeks);
      paramCounter++;
    }

    if (difficulty_level !== undefined) {
      updates.push(`difficulty_level = $${paramCounter}`);
      values.push(difficulty_level);
      paramCounter++;
    }

    if (learning_objectives !== undefined) {
      updates.push(`learning_objectives = $${paramCounter}`);
      values.push(JSON.stringify(learning_objectives));
      paramCounter++;
    }

    if (prerequisites !== undefined) {
      updates.push(`prerequisites = $${paramCounter}`);
      values.push(JSON.stringify(prerequisites));
      paramCounter++;
    }

    if (is_template !== undefined) {
      updates.push(`is_template = $${paramCounter}`);
      values.push(is_template);
      paramCounter++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCounter}`);
      values.push(is_active);
      paramCounter++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`;
    
    const result = await client.query(query, values);

    await client.query('COMMIT');
    
    res.json({
      message: 'Course updated successfully',
      course: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Failed to update course' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/courses/:id
 * Delete course (course teacher or admin only)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if user can delete this course
    const courseCheck = await client.query('SELECT teacher_id, title FROM courses WHERE id = $1', [id]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const canDelete = 
      req.user.role === 'amitrace_admin' || 
      courseCheck.rows[0].teacher_id === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied. You can only delete your own courses.' });
    }

    // Check if there are enrolled students
    const enrollmentCheck = await client.query(
      'SELECT COUNT(*) as count FROM course_enrollments WHERE course_id = $1 AND is_active = true',
      [id]
    );

    const enrolledCount = parseInt(enrollmentCheck.rows[0].count);
    
    if (enrolledCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete course. There are ${enrolledCount} active enrollments.`,
        suggestion: 'Deactivate the course instead or remove all student enrollments first.'
      });
    }

    // Delete course (cascade will handle lessons, materials, etc.)
    const result = await client.query('DELETE FROM courses WHERE id = $1 RETURNING title', [id]);

    await client.query('COMMIT');
    
    res.json({ 
      message: `Course "${result.rows[0].title}" deleted successfully`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/courses/:id/enroll
 * Enroll student in course
 */
router.post('/:id/enroll', verifyToken, hasAnyRole(['student', 'admin', 'amitrace_admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const courseId = req.params.id;
    const studentId = req.body.student_id || req.user.id; // Allow admin to enroll others
    
    // Only admins can enroll other students
    if (studentId !== req.user.id && req.user.role !== 'amitrace_admin') {
      return res.status(403).json({ error: 'Access denied. You can only enroll yourself.' });
    }

    // Check if course exists and is active
    const courseCheck = await client.query(
      'SELECT id, title, is_active, total_weeks FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!courseCheck.rows[0].is_active) {
      return res.status(400).json({ error: 'Cannot enroll in inactive course' });
    }

    // Check if already enrolled
    const existingEnrollment = await client.query(
      'SELECT is_active FROM course_enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (existingEnrollment.rows.length > 0) {
      if (existingEnrollment.rows[0].is_active) {
        return res.status(400).json({ error: 'Already enrolled in this course' });
      } else {
        // Reactivate enrollment
        await client.query(
          'UPDATE course_enrollments SET is_active = true, enrolled_at = CURRENT_TIMESTAMP WHERE student_id = $1 AND course_id = $2',
          [studentId, courseId]
        );
      }
    } else {
      // Create new enrollment
      await client.query(
        'INSERT INTO course_enrollments (student_id, course_id, is_active) VALUES ($1, $2, true)',
        [studentId, courseId]
      );
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      message: `Successfully enrolled in "${courseCheck.rows[0].title}"`,
      course_id: courseId,
      student_id: studentId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error enrolling in course:', error);
    res.status(500).json({ error: 'Failed to enroll in course' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/courses/:id/enroll
 * Unenroll student from course
 */
router.delete('/:id/enroll', verifyToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const courseId = req.params.id;
    const studentId = req.body.student_id || req.user.id;
    
    // Only admins can unenroll other students
    if (studentId !== req.user.id && req.user.role !== 'amitrace_admin') {
      return res.status(403).json({ error: 'Access denied. You can only unenroll yourself.' });
    }

    const result = await client.query(
      'UPDATE course_enrollments SET is_active = false WHERE student_id = $1 AND course_id = $2 RETURNING *',
      [studentId, courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    await client.query('COMMIT');
    
    res.json({ message: 'Successfully unenrolled from course' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error unenrolling from course:', error);
    res.status(500).json({ error: 'Failed to unenroll from course' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/courses/:id/enrollments
 * Get course enrollment list (teacher and admin only)
 */
router.get('/:id/enrollments', verifyToken, isTeacherOrAbove, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user can view enrollments
    if (userRole !== 'amitrace_admin') {
      const courseCheck = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [courseId]);
      
      if (courseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (courseCheck.rows[0].teacher_id !== userId) {
        return res.status(403).json({ error: 'Access denied. You can only view enrollments for your own courses.' });
      }
    }

    const enrollmentsQuery = `
      SELECT 
        ce.*,
        u.name as student_name,
        u.email as student_email,
        u.student_id,
        (
          SELECT calculate_course_progress(ce.student_id, ce.course_id)
        ) as progress_data
      FROM course_enrollments ce
      JOIN users u ON ce.student_id = u.id
      WHERE ce.course_id = $1
      ORDER BY ce.enrolled_at DESC
    `;

    const result = await pool.query(enrollmentsQuery, [courseId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching course enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch course enrollments' });
  }
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if student is enrolled in course
 */
async function checkStudentEnrollment(studentId, courseId) {
  try {
    const result = await pool.query(
      'SELECT is_active FROM course_enrollments WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );
    return result.rows.length > 0 && result.rows[0].is_active;
  } catch (error) {
    console.error('Error checking student enrollment:', error);
    return false;
  }
}

module.exports = router;