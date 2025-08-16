const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyToken, isTeacherOrAbove, isAmitraceAdmin, hasAnyRole } = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Generate unique 4-digit class code
async function generateClassCode() {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    const existing = await pool.query('SELECT id FROM classes WHERE class_code = $1', [code]);
    if (existing.rows.length === 0) {
      return code;
    }
    
    attempts++;
  }
  
  throw new Error('Unable to generate unique class code after maximum attempts');
}

// Get all classes (filtered by user role)
router.get('/', verifyToken, hasAnyRole(['teacher', 'admin', 'amitrace_admin', 'student']), async (req, res) => {
  try {
    let query;
    let params;
    
    if (req.user.role === 'teacher') {
      // Teachers see only their classes
      query = `
        SELECT 
          c.id,
          c.class_name,
          c.subject,
          c.description,
          c.class_code,
          c.is_active,
          c.created_at,
          s.school_name,
          (SELECT COUNT(*) FROM user_classes uc WHERE uc.class_id = c.id) as student_count
        FROM classes c
        JOIN schools s ON c.school_id = s.id
        WHERE c.teacher_id = $1
        ORDER BY c.created_at DESC
      `;
      params = [req.user.id];
    } else if (req.user.role === 'student') {
      // Students see only classes they're enrolled in
      query = `
        SELECT 
          c.id,
          c.class_name,
          c.subject,
          c.description,
          c.class_code,
          c.is_active,
          c.created_at,
          s.school_name,
          u.name as teacher_name,
          uc.joined_at,
          (SELECT COUNT(*) FROM user_classes uc2 WHERE uc2.class_id = c.id) as student_count
        FROM classes c
        JOIN schools s ON c.school_id = s.id
        JOIN users u ON c.teacher_id = u.id
        JOIN user_classes uc ON c.id = uc.class_id
        WHERE uc.user_id = $1 AND c.is_active = true
        ORDER BY uc.joined_at DESC
      `;
      params = [req.user.id];
    } else {
      // Admins see all classes
      const { school_id, teacher_id } = req.query;
      query = `
        SELECT 
          c.id,
          c.class_name,
          c.subject,
          c.description,
          c.class_code,
          c.is_active,
          c.created_at,
          s.school_name,
          u.name as teacher_name,
          (SELECT COUNT(*) FROM user_classes uc WHERE uc.class_id = c.id) as student_count
        FROM classes c
        JOIN schools s ON c.school_id = s.id
        JOIN users u ON c.teacher_id = u.id
      `;
      
      params = [];
      const conditions = [];
      
      if (school_id) {
        conditions.push(`c.school_id = $${params.length + 1}`);
        params.push(school_id);
      }
      
      if (teacher_id) {
        conditions.push(`c.teacher_id = $${params.length + 1}`);
        params.push(teacher_id);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY c.created_at DESC`;
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class by ID (with enrollment info)
router.get('/:id', verifyToken, hasAnyRole(['teacher', 'admin', 'amitrace_admin', 'student']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get class details
    const classResult = await pool.query(`
      SELECT 
        c.id,
        c.class_name,
        c.subject,
        c.description,
        c.class_code,
        c.is_active,
        c.created_at,
        c.teacher_id,
        s.school_name,
        s.id as school_id,
        u.name as teacher_name,
        u.email as teacher_email
      FROM classes c
      JOIN schools s ON c.school_id = s.id
      JOIN users u ON c.teacher_id = u.id
      WHERE c.id = $1
    `, [id]);
    
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    const classData = classResult.rows[0];
    
    // Check permissions
    if (req.user.role === 'teacher' && classData.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Not your class.' });
    }
    
    if (req.user.role === 'student') {
      // Check if student is enrolled
      const enrollment = await pool.query(
        'SELECT id FROM user_classes WHERE user_id = $1 AND class_id = $2',
        [req.user.id, id]
      );
      if (enrollment.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied. Not enrolled in this class.' });
      }
    }
    
    // Get enrolled students (not visible to students)
    if (req.user.role !== 'student') {
      const studentsResult = await pool.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.student_id,
          uc.joined_at
        FROM user_classes uc
        JOIN users u ON uc.user_id = u.id
        WHERE uc.class_id = $1 AND u.role = 'student'
        ORDER BY uc.joined_at DESC
      `, [id]);
      
      classData.students = studentsResult.rows;
    }
    
    res.json(classData);
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// Create new class (Teachers and above)
router.post('/', verifyToken, isTeacherOrAbove, async (req, res) => {
  try {
    const { class_name, subject, description } = req.body;
    
    if (!class_name || class_name.trim() === '') {
      return res.status(400).json({ error: 'Class name is required' });
    }
    
    // Get user's school
    const userResult = await pool.query('SELECT school_id FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || !userResult.rows[0].school_id) {
      return res.status(400).json({ error: 'User must be assigned to a school to create classes' });
    }
    
    const school_id = userResult.rows[0].school_id;
    
    // Generate unique class code
    const class_code = await generateClassCode();
    
    const result = await pool.query(`
      INSERT INTO classes (class_name, subject, description, class_code, teacher_id, school_id) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, class_name, subject, description, class_code, teacher_id, school_id, is_active, created_at
    `, [
      class_name.trim(), 
      subject?.trim() || null, 
      description?.trim() || null, 
      class_code, 
      req.user.id, 
      school_id
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class (Teacher of the class or admin)
router.put('/:id', verifyToken, isTeacherOrAbove, async (req, res) => {
  try {
    const { id } = req.params;
    const { class_name, subject, description, is_active } = req.body;
    
    // Get class to check ownership
    const classResult = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [id]);
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Check permissions
    if (req.user.role === 'teacher' && classResult.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Not your class.' });
    }
    
    const result = await pool.query(`
      UPDATE classes 
      SET 
        class_name = COALESCE($1, class_name),
        subject = COALESCE($2, subject),
        description = COALESCE($3, description),
        is_active = COALESCE($4, is_active)
      WHERE id = $5 
      RETURNING id, class_name, subject, description, class_code, teacher_id, school_id, is_active, created_at
    `, [
      class_name?.trim() || null,
      subject?.trim() || null,
      description?.trim() || null,
      is_active,
      id
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class (Teacher of the class or admin)
router.delete('/:id', verifyToken, isTeacherOrAbove, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get class to check ownership
    const classResult = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [id]);
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Check permissions
    if (req.user.role === 'teacher' && classResult.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Not your class.' });
    }
    
    // Delete class (this will cascade delete user_classes due to foreign key)
    const result = await pool.query('DELETE FROM classes WHERE id = $1 RETURNING id', [id]);
    
    res.json({ 
      message: 'Class deleted successfully',
      id: result.rows[0].id 
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Join class by code (Students only)
router.post('/join', verifyToken, hasAnyRole(['student']), async (req, res) => {
  try {
    const { class_code } = req.body;
    
    if (!class_code || class_code.trim() === '') {
      return res.status(400).json({ error: 'Class code is required' });
    }
    
    // Find class by code
    const classResult = await pool.query(`
      SELECT id, class_name, is_active, school_id 
      FROM classes 
      WHERE class_code = $1
    `, [class_code.trim().toUpperCase()]);
    
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid class code' });
    }
    
    const classData = classResult.rows[0];
    
    if (!classData.is_active) {
      return res.status(400).json({ error: 'This class is no longer active' });
    }
    
    // Check if student is already enrolled
    const existingEnrollment = await pool.query(
      'SELECT id FROM user_classes WHERE user_id = $1 AND class_id = $2',
      [req.user.id, classData.id]
    );
    
    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'You are already enrolled in this class' });
    }
    
    // Enroll student
    const enrollResult = await pool.query(`
      INSERT INTO user_classes (user_id, class_id) 
      VALUES ($1, $2) 
      RETURNING id, joined_at
    `, [req.user.id, classData.id]);
    
    res.status(201).json({
      message: 'Successfully joined class',
      class_name: classData.class_name,
      enrollment: enrollResult.rows[0]
    });
  } catch (error) {
    console.error('Error joining class:', error);
    res.status(500).json({ error: 'Failed to join class' });
  }
});

// Leave class (Students only)
router.post('/:id/leave', verifyToken, hasAnyRole(['student']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM user_classes WHERE user_id = $1 AND class_id = $2 RETURNING id',
      [req.user.id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    res.json({ message: 'Successfully left class' });
  } catch (error) {
    console.error('Error leaving class:', error);
    res.status(500).json({ error: 'Failed to leave class' });
  }
});

// Remove student from class (Teacher of the class or admin)
router.delete('/:id/students/:studentId', verifyToken, isTeacherOrAbove, async (req, res) => {
  try {
    const { id, studentId } = req.params;
    
    // Get class to check ownership
    const classResult = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [id]);
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Check permissions
    if (req.user.role === 'teacher' && classResult.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Not your class.' });
    }
    
    const result = await pool.query(
      'DELETE FROM user_classes WHERE user_id = $1 AND class_id = $2 RETURNING id',
      [studentId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student enrollment not found' });
    }
    
    res.json({ message: 'Student removed from class successfully' });
  } catch (error) {
    console.error('Error removing student:', error);
    res.status(500).json({ error: 'Failed to remove student from class' });
  }
});

// Regenerate class code (Teacher of the class or admin)
router.post('/:id/regenerate-code', verifyToken, isTeacherOrAbove, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get class to check ownership
    const classResult = await pool.query('SELECT teacher_id FROM classes WHERE id = $1', [id]);
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Check permissions
    if (req.user.role === 'teacher' && classResult.rows[0].teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Not your class.' });
    }
    
    // Generate new code
    const new_code = await generateClassCode();
    
    const result = await pool.query(
      'UPDATE classes SET class_code = $1 WHERE id = $2 RETURNING class_code',
      [new_code, id]
    );
    
    res.json({ 
      message: 'Class code regenerated successfully',
      new_class_code: result.rows[0].class_code 
    });
  } catch (error) {
    console.error('Error regenerating class code:', error);
    res.status(500).json({ error: 'Failed to regenerate class code' });
  }
});

module.exports = router;