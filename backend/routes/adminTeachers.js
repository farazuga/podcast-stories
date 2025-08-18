const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all teachers with statistics
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.name,
        u.is_active,
        u.created_at,
        s.school_name,
        COUNT(DISTINCT c.id) as class_count,
        COUNT(DISTINCT e.student_id) as student_count
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN classes c ON u.id = c.teacher_id AND c.is_active = true
      LEFT JOIN enrollments e ON c.id = e.class_id
      WHERE u.role = 'teacher'
      GROUP BY u.id, u.username, u.email, u.name, u.is_active, u.created_at, s.school_name
      ORDER BY u.created_at DESC
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Create new teacher
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, username, password, school_id } = req.body;

    // Validate required fields
    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: 'Name, email, username, and password are required' });
    }

    // Check if username or email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create teacher
    const createTeacher = await pool.query(
      `INSERT INTO users (username, email, password, name, role, school_id, is_active) 
       VALUES ($1, $2, $3, $4, 'teacher', $5, true) 
       RETURNING id, username, email, name, created_at`,
      [username, email, hashedPassword, name, school_id || null]
    );

    res.status(201).json({
      message: 'Teacher created successfully',
      teacher: createTeacher.rows[0]
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// Deactivate teacher (soft delete)
router.post('/:teacherId/deactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Check if teacher exists
    const teacher = await pool.query(
      'SELECT id, username, is_active FROM users WHERE id = $1 AND role = $2',
      [teacherId, 'teacher']
    );

    if (teacher.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (!teacher.rows[0].is_active) {
      return res.status(400).json({ error: 'Teacher is already deactivated' });
    }

    // Deactivate teacher
    await pool.query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [teacherId]
    );

    res.json({ message: 'Teacher deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating teacher:', error);
    res.status(500).json({ error: 'Failed to deactivate teacher' });
  }
});

// Reactivate teacher
router.post('/:teacherId/reactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Check if teacher exists
    const teacher = await pool.query(
      'SELECT id, username, is_active FROM users WHERE id = $1 AND role = $2',
      [teacherId, 'teacher']
    );

    if (teacher.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    if (teacher.rows[0].is_active) {
      return res.status(400).json({ error: 'Teacher is already active' });
    }

    // Reactivate teacher
    await pool.query(
      'UPDATE users SET is_active = true WHERE id = $1',
      [teacherId]
    );

    res.json({ message: 'Teacher reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating teacher:', error);
    res.status(500).json({ error: 'Failed to reactivate teacher' });
  }
});

// Get teacher details
router.get('/:teacherId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teacherId } = req.params;

    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.name,
        u.is_active,
        u.created_at,
        s.school_name,
        COUNT(DISTINCT c.id) as class_count,
        COUNT(DISTINCT e.student_id) as student_count
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN classes c ON u.id = c.teacher_id AND c.is_active = true
      LEFT JOIN enrollments e ON c.id = e.class_id
      WHERE u.id = $1 AND u.role = 'teacher'
      GROUP BY u.id, u.username, u.email, u.name, u.is_active, u.created_at, s.school_name
    `;
    
    const result = await pool.query(query, [teacherId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching teacher details:', error);
    res.status(500).json({ error: 'Failed to fetch teacher details' });
  }
});

module.exports = router;