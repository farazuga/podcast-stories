const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { verifyToken, isTeacherOrAbove, hasAnyRole } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Configure multer for lesson material uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/lesson-materials/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow various file types for educational materials
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|mp4|mp3|wav|txt|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, audio, and video files are allowed.'));
    }
  }
});

// =============================================================================
// LESSON MANAGEMENT API ROUTES
// =============================================================================

/**
 * GET /api/lessons/course/:courseId
 * Get all lessons for a specific course
 */
router.get('/course/:courseId', verifyToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check course access
    const hasAccess = await checkCourseAccess(userId, courseId, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. You do not have access to this course.' });
    }

    let query = `
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
        END as progress_status,
        CASE 
          WHEN $2 = 'student' THEN (
            SELECT check_lesson_prerequisites($3, l.id)
          )
          ELSE true
        END as prerequisites_met
      FROM lessons l
      WHERE l.course_id = $1
    `;

    // Students only see published lessons
    if (userRole === 'student') {
      query += ` AND l.is_published = true`;
    }

    query += ` ORDER BY l.week_number, l.lesson_number`;

    const result = await pool.query(query, [courseId, userRole, userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching course lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

/**
 * GET /api/lessons/:id
 * Get detailed lesson information with materials
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get lesson details
    const lessonQuery = `
      SELECT 
        l.*,
        c.title as course_title,
        c.teacher_id,
        CASE 
          WHEN $2 = 'student' THEN (
            SELECT sp.status 
            FROM student_progress sp 
            WHERE sp.student_id = $3 AND sp.lesson_id = l.id
          )
          ELSE NULL
        END as progress_status,
        CASE 
          WHEN $2 = 'student' THEN (
            SELECT check_lesson_prerequisites($3, l.id)
          )
          ELSE true
        END as prerequisites_met
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1
    `;

    const lessonResult = await pool.query(lessonQuery, [id, userRole, userId]);

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonResult.rows[0];

    // Check access permissions
    const hasAccess = await checkCourseAccess(userId, lesson.course_id, userRole);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. You do not have access to this lesson.' });
    }

    // Students can only see published lessons
    if (userRole === 'student' && !lesson.is_published) {
      return res.status(403).json({ error: 'This lesson is not yet published.' });
    }

    // Get lesson materials
    const materialsQuery = `
      SELECT 
        lm.*,
        CASE 
          WHEN lm.material_type = 'quiz' THEN (
            SELECT json_build_object(
              'id', q.id,
              'title', q.title,
              'description', q.description,
              'time_limit', q.time_limit,
              'attempts_allowed', q.attempts_allowed,
              'passing_score', q.passing_score,
              'question_count', (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id)
            )
            FROM quizzes q WHERE q.lesson_material_id = lm.id
          )
          WHEN lm.material_type = 'worksheet' THEN (
            SELECT json_build_object(
              'id', w.id,
              'title', w.title,
              'description', w.description,
              'form_fields', w.form_fields,
              'max_file_size', w.max_file_size
            )
            FROM worksheets w WHERE w.lesson_material_id = lm.id
          )
          ELSE NULL
        END as material_details
      FROM lesson_materials lm
      WHERE lm.lesson_id = $1
      ORDER BY lm.sort_order, lm.created_at
    `;

    const materialsResult = await pool.query(materialsQuery, [id]);

    res.json({
      ...lesson,
      materials: materialsResult.rows
    });
  } catch (error) {
    console.error('Error fetching lesson details:', error);
    res.status(500).json({ error: 'Failed to fetch lesson details' });
  }
});

/**
 * POST /api/lessons
 * Create new lesson (teachers and admins only)
 */
router.post('/', verifyToken, isTeacherOrAbove, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      course_id,
      title,
      description,
      content,
      week_number,
      lesson_number,
      vocabulary_terms,
      requires_completion_of,
      unlock_criteria,
      is_published
    } = req.body;

    // Validation
    if (!course_id || !title || !week_number || !lesson_number) {
      return res.status(400).json({ 
        error: 'Course ID, title, week number, and lesson number are required' 
      });
    }

    // Check if user can create lessons for this course
    const courseCheck = await client.query('SELECT teacher_id, total_weeks FROM courses WHERE id = $1', [course_id]);
    
    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const canCreate = 
      req.user.role === 'amitrace_admin' || 
      courseCheck.rows[0].teacher_id === req.user.id;

    if (!canCreate) {
      return res.status(403).json({ error: 'Access denied. You can only create lessons for your own courses.' });
    }

    // Validate week number
    if (week_number < 1 || week_number > courseCheck.rows[0].total_weeks) {
      return res.status(400).json({ 
        error: `Week number must be between 1 and ${courseCheck.rows[0].total_weeks}` 
      });
    }

    // Check for duplicate lesson position
    const duplicateCheck = await client.query(
      'SELECT id FROM lessons WHERE course_id = $1 AND week_number = $2 AND lesson_number = $3',
      [course_id, week_number, lesson_number]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: `A lesson already exists at Week ${week_number}, Lesson ${lesson_number}` 
      });
    }

    const lessonResult = await client.query(
      `INSERT INTO lessons (
        course_id, title, description, content, week_number, lesson_number,
        vocabulary_terms, requires_completion_of, unlock_criteria, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        course_id,
        title,
        description || '',
        content || '',
        week_number,
        lesson_number,
        JSON.stringify(vocabulary_terms || []),
        requires_completion_of || [],
        JSON.stringify(unlock_criteria || {}),
        is_published || false
      ]
    );

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Lesson created successfully',
      lesson: lessonResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/lessons/:id
 * Update lesson (lesson course teacher or admin only)
 */
router.put('/:id', verifyToken, isTeacherOrAbove, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      title,
      description,
      content,
      week_number,
      lesson_number,
      vocabulary_terms,
      requires_completion_of,
      unlock_criteria,
      is_published
    } = req.body;

    // Check if user can edit this lesson
    const lessonCheck = await client.query(
      'SELECT l.*, c.teacher_id, c.total_weeks FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1',
      [id]
    );
    
    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonCheck.rows[0];
    const canEdit = 
      req.user.role === 'amitrace_admin' || 
      lesson.teacher_id === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied. You can only edit lessons in your own courses.' });
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

    if (content !== undefined) {
      updates.push(`content = $${paramCounter}`);
      values.push(content);
      paramCounter++;
    }

    if (week_number !== undefined) {
      if (week_number < 1 || week_number > lesson.total_weeks) {
        return res.status(400).json({ 
          error: `Week number must be between 1 and ${lesson.total_weeks}` 
        });
      }

      // Check for conflicts if changing position
      if (week_number !== lesson.week_number || (lesson_number !== undefined && lesson_number !== lesson.lesson_number)) {
        const conflictCheck = await client.query(
          'SELECT id FROM lessons WHERE course_id = $1 AND week_number = $2 AND lesson_number = $3 AND id != $4',
          [lesson.course_id, week_number, lesson_number || lesson.lesson_number, id]
        );

        if (conflictCheck.rows.length > 0) {
          return res.status(400).json({ 
            error: `A lesson already exists at Week ${week_number}, Lesson ${lesson_number || lesson.lesson_number}` 
          });
        }
      }

      updates.push(`week_number = $${paramCounter}`);
      values.push(week_number);
      paramCounter++;
    }

    if (lesson_number !== undefined) {
      updates.push(`lesson_number = $${paramCounter}`);
      values.push(lesson_number);
      paramCounter++;
    }

    if (vocabulary_terms !== undefined) {
      updates.push(`vocabulary_terms = $${paramCounter}`);
      values.push(JSON.stringify(vocabulary_terms));
      paramCounter++;
    }

    if (requires_completion_of !== undefined) {
      updates.push(`requires_completion_of = $${paramCounter}`);
      values.push(requires_completion_of);
      paramCounter++;
    }

    if (unlock_criteria !== undefined) {
      updates.push(`unlock_criteria = $${paramCounter}`);
      values.push(JSON.stringify(unlock_criteria));
      paramCounter++;
    }

    if (is_published !== undefined) {
      updates.push(`is_published = $${paramCounter}`);
      values.push(is_published);
      paramCounter++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE lessons SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`;
    
    const result = await client.query(query, values);

    await client.query('COMMIT');
    
    res.json({
      message: 'Lesson updated successfully',
      lesson: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/lessons/:id
 * Delete lesson (lesson course teacher or admin only)
 */
router.delete('/:id', verifyToken, isTeacherOrAbove, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Check if user can delete this lesson
    const lessonCheck = await client.query(
      'SELECT l.title, c.teacher_id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1',
      [id]
    );
    
    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonCheck.rows[0];
    const canDelete = 
      req.user.role === 'amitrace_admin' || 
      lesson.teacher_id === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied. You can only delete lessons in your own courses.' });
    }

    // Check if there are student progress records
    const progressCheck = await client.query(
      'SELECT COUNT(*) as count FROM student_progress WHERE lesson_id = $1',
      [id]
    );

    const progressCount = parseInt(progressCheck.rows[0].count);
    
    if (progressCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete lesson. There are ${progressCount} student progress records.`,
        suggestion: 'Unpublish the lesson instead or archive it.'
      });
    }

    // Delete lesson (cascade will handle materials, quizzes, etc.)
    const result = await client.query('DELETE FROM lessons WHERE id = $1 RETURNING title', [id]);

    await client.query('COMMIT');
    
    res.json({ 
      message: `Lesson "${result.rows[0].title}" deleted successfully`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/lessons/:id/materials
 * Add material to lesson (file upload support)
 */
router.post('/:id/materials', verifyToken, isTeacherOrAbove, upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const lessonId = req.params.id;
    const {
      title,
      description,
      material_type,
      points_possible,
      time_limit,
      sort_order,
      availability_start,
      availability_end,
      url
    } = req.body;

    // Check if user can add materials to this lesson
    const lessonCheck = await client.query(
      'SELECT c.teacher_id FROM lessons l JOIN courses c ON l.course_id = c.id WHERE l.id = $1',
      [lessonId]
    );
    
    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const canAdd = 
      req.user.role === 'amitrace_admin' || 
      lessonCheck.rows[0].teacher_id === req.user.id;

    if (!canAdd) {
      return res.status(403).json({ error: 'Access denied. You can only add materials to your own lessons.' });
    }

    // Validation
    if (!title || !material_type) {
      return res.status(400).json({ 
        error: 'Title and material type are required' 
      });
    }

    const validTypes = ['vocabulary', 'quiz', 'worksheet', 'video', 'audio', 'reading', 'assignment', 'resource'];
    if (!validTypes.includes(material_type)) {
      return res.status(400).json({ 
        error: `Invalid material type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Handle file upload
    let filePath = null;
    let fileName = null;
    let fileSize = null;

    if (req.file) {
      filePath = req.file.path;
      fileName = req.file.originalname;
      fileSize = req.file.size;
    }

    const materialResult = await client.query(
      `INSERT INTO lesson_materials (
        lesson_id, title, description, material_type, file_path, file_name, file_size,
        points_possible, time_limit, sort_order, availability_start, availability_end, url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        lessonId,
        title,
        description || '',
        material_type,
        filePath,
        fileName,
        fileSize,
        points_possible || 0,
        time_limit || null,
        sort_order || 0,
        availability_start || null,
        availability_end || null,
        url || null
      ]
    );

    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Material added successfully',
      material: materialResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Warning: Failed to clean up uploaded file during error:', unlinkError.message);
      }
    }
    
    console.error('Error adding material:', error);
    res.status(500).json({ error: 'Failed to add material' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/lessons/:id/materials/:materialId
 * Update lesson material
 */
router.put('/:id/materials/:materialId', verifyToken, isTeacherOrAbove, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id: lessonId, materialId } = req.params;
    const {
      title,
      description,
      points_possible,
      time_limit,
      sort_order,
      availability_start,
      availability_end,
      url
    } = req.body;

    // Check permissions
    const materialCheck = await client.query(
      `SELECT lm.*, c.teacher_id 
       FROM lesson_materials lm 
       JOIN lessons l ON lm.lesson_id = l.id 
       JOIN courses c ON l.course_id = c.id 
       WHERE lm.id = $1 AND lm.lesson_id = $2`,
      [materialId, lessonId]
    );
    
    if (materialCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const canEdit = 
      req.user.role === 'amitrace_admin' || 
      materialCheck.rows[0].teacher_id === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied.' });
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

    if (points_possible !== undefined) {
      updates.push(`points_possible = $${paramCounter}`);
      values.push(points_possible);
      paramCounter++;
    }

    if (time_limit !== undefined) {
      updates.push(`time_limit = $${paramCounter}`);
      values.push(time_limit);
      paramCounter++;
    }

    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramCounter}`);
      values.push(sort_order);
      paramCounter++;
    }

    if (availability_start !== undefined) {
      updates.push(`availability_start = $${paramCounter}`);
      values.push(availability_start);
      paramCounter++;
    }

    if (availability_end !== undefined) {
      updates.push(`availability_end = $${paramCounter}`);
      values.push(availability_end);
      paramCounter++;
    }

    if (url !== undefined) {
      updates.push(`url = $${paramCounter}`);
      values.push(url);
      paramCounter++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(materialId);

    const query = `UPDATE lesson_materials SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`;
    
    const result = await client.query(query, values);

    await client.query('COMMIT');
    
    res.json({
      message: 'Material updated successfully',
      material: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/lessons/:id/materials/:materialId
 * Delete lesson material
 */
router.delete('/:id/materials/:materialId', verifyToken, isTeacherOrAbove, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id: lessonId, materialId } = req.params;

    // Check permissions and get file info
    const materialCheck = await client.query(
      `SELECT lm.title, lm.file_path, c.teacher_id 
       FROM lesson_materials lm 
       JOIN lessons l ON lm.lesson_id = l.id 
       JOIN courses c ON l.course_id = c.id 
       WHERE lm.id = $1 AND lm.lesson_id = $2`,
      [materialId, lessonId]
    );
    
    if (materialCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = materialCheck.rows[0];
    const canDelete = 
      req.user.role === 'amitrace_admin' || 
      material.teacher_id === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Delete material
    await client.query('DELETE FROM lesson_materials WHERE id = $1', [materialId]);

    // Clean up file if it exists
    if (material.file_path) {
      try {
        await fs.unlink(material.file_path);
      } catch (fileError) {
        console.error('Warning: Failed to delete associated file:', fileError.message);
      }
    }

    await client.query('COMMIT');
    
    res.json({ 
      message: `Material "${material.title}" deleted successfully`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  } finally {
    client.release();
  }
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if user has access to a course
 */
async function checkCourseAccess(userId, courseId, userRole) {
  try {
    if (userRole === 'amitrace_admin') {
      return true;
    }

    if (userRole === 'teacher') {
      const result = await pool.query('SELECT id FROM courses WHERE id = $1 AND teacher_id = $2', [courseId, userId]);
      return result.rows.length > 0;
    }

    if (userRole === 'student') {
      const result = await pool.query(
        'SELECT is_active FROM course_enrollments WHERE student_id = $1 AND course_id = $2',
        [userId, courseId]
      );
      return result.rows.length > 0 && result.rows[0].is_active;
    }

    return false;
  } catch (error) {
    console.error('Error checking course access:', error);
    return false;
  }
}

module.exports = router;