const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyToken, isAmitraceAdmin } = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all schools (Amitrace Admin only)
router.get('/', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id, 
        s.school_name, 
        s.created_at,
        u.username as created_by_username,
        (SELECT COUNT(*) FROM users WHERE school_id = s.id) as user_count,
        (SELECT COUNT(*) FROM teacher_requests WHERE school_id = s.id) as teacher_request_count
      FROM schools s
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.school_name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// Get school by ID (Amitrace Admin only)
router.get('/:id', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        s.id, 
        s.school_name, 
        s.created_at,
        u.username as created_by_username
      FROM schools s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

// Create new school (Amitrace Admin only)
router.post('/', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { school_name } = req.body;
    
    if (!school_name || school_name.trim() === '') {
      return res.status(400).json({ error: 'School name is required' });
    }
    
    // Check if school name already exists
    const existingSchool = await pool.query(
      'SELECT id FROM schools WHERE school_name = $1',
      [school_name.trim()]
    );
    
    if (existingSchool.rows.length > 0) {
      return res.status(400).json({ error: 'School name already exists' });
    }
    
    const result = await pool.query(`
      INSERT INTO schools (school_name, created_by) 
      VALUES ($1, $2) 
      RETURNING id, school_name, created_at
    `, [school_name.trim(), req.user.id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

// Update school (Amitrace Admin only)
router.put('/:id', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { school_name } = req.body;
    
    if (!school_name || school_name.trim() === '') {
      return res.status(400).json({ error: 'School name is required' });
    }
    
    // Check if school exists
    const existingSchool = await pool.query('SELECT id FROM schools WHERE id = $1', [id]);
    if (existingSchool.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    // Check if new name conflicts with existing school
    const nameConflict = await pool.query(
      'SELECT id FROM schools WHERE school_name = $1 AND id != $2',
      [school_name.trim(), id]
    );
    
    if (nameConflict.rows.length > 0) {
      return res.status(400).json({ error: 'School name already exists' });
    }
    
    const result = await pool.query(`
      UPDATE schools 
      SET school_name = $1 
      WHERE id = $2 
      RETURNING id, school_name, created_at
    `, [school_name.trim(), id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating school:', error);
    res.status(500).json({ error: 'Failed to update school' });
  }
});

// Delete school (Amitrace Admin only)
router.delete('/:id', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if school has users assigned
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE school_id = $1', [id]);
    if (parseInt(usersCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete school with assigned users. Please reassign users first.' 
      });
    }
    
    // Check if school has teacher requests
    const requestsCount = await pool.query('SELECT COUNT(*) as count FROM teacher_requests WHERE school_id = $1', [id]);
    if (parseInt(requestsCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete school with pending teacher requests. Please resolve requests first.' 
      });
    }
    
    // Check if school has classes
    const classesCount = await pool.query('SELECT COUNT(*) as count FROM classes WHERE school_id = $1', [id]);
    if (parseInt(classesCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete school with existing classes. Please remove classes first.' 
      });
    }
    
    const result = await pool.query('DELETE FROM schools WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    res.json({ message: 'School deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting school:', error);
    res.status(500).json({ error: 'Failed to delete school' });
  }
});

// Get school statistics (Amitrace Admin only)
router.get('/:id/stats', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'teacher') as teacher_count,
        (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'student') as student_count,
        (SELECT COUNT(*) FROM classes WHERE school_id = $1) as class_count,
        (SELECT COUNT(*) FROM teacher_requests WHERE school_id = $1 AND status = 'pending') as pending_requests
    `, [id]);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching school stats:', error);
    res.status(500).json({ error: 'Failed to fetch school statistics' });
  }
});

module.exports = router;