const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyToken, isAmitraceAdmin } = require('../middleware/auth');
const emailService = require('../services/emailService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get all teacher requests (Amitrace Admin only)
router.get('/', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { status, school_id } = req.query;
    
    let query = `
      SELECT 
        tr.id,
        tr.name,
        tr.email,
        tr.message,
        tr.status,
        tr.requested_at,
        tr.approved_at,
        s.school_name,
        s.id as school_id,
        approved_by_user.username as approved_by_username
      FROM teacher_requests tr
      JOIN schools s ON tr.school_id = s.id
      LEFT JOIN users approved_by_user ON tr.approved_by = approved_by_user.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (status) {
      conditions.push(`tr.status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (school_id) {
      conditions.push(`tr.school_id = $${params.length + 1}`);
      params.push(school_id);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY tr.requested_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching teacher requests:', error);
    res.status(500).json({ error: 'Failed to fetch teacher requests' });
  }
});

// Get teacher request by ID (Amitrace Admin only)
router.get('/:id', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        tr.id,
        tr.name,
        tr.email,
        tr.message,
        tr.status,
        tr.requested_at,
        tr.approved_at,
        s.school_name,
        s.id as school_id,
        approved_by_user.username as approved_by_username
      FROM teacher_requests tr
      JOIN schools s ON tr.school_id = s.id
      LEFT JOIN users approved_by_user ON tr.approved_by = approved_by_user.id
      WHERE tr.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher request not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching teacher request:', error);
    res.status(500).json({ error: 'Failed to fetch teacher request' });
  }
});

// Submit teacher request (Public endpoint)
router.post('/', async (req, res) => {
  try {
    const { name, email, school_id, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !school_id) {
      return res.status(400).json({ 
        error: 'Name, email, and school are required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if email already exists as a user
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        error: 'An account with this email already exists' 
      });
    }
    
    // Check if email already has a pending request
    const existingRequest = await pool.query(
      'SELECT id FROM teacher_requests WHERE email = $1 AND status = $2',
      [email, 'pending']
    );
    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ 
        error: 'A pending request with this email already exists' 
      });
    }
    
    // Verify school exists
    const school = await pool.query('SELECT id FROM schools WHERE id = $1', [school_id]);
    if (school.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid school selected' });
    }
    
    const result = await pool.query(`
      INSERT INTO teacher_requests (name, email, school_id, message) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, email, school_id, message, status, requested_at
    `, [name.trim(), email.toLowerCase().trim(), school_id, message?.trim() || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating teacher request:', error);
    res.status(500).json({ error: 'Failed to submit teacher request' });
  }
});

// Approve teacher request (Amitrace Admin only)
router.post('/:id/approve', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required for teacher account creation' 
      });
    }
    
    // Get the teacher request
    const requestResult = await pool.query(
      'SELECT * FROM teacher_requests WHERE id = $1 AND status = $2',
      [id, 'pending']
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Pending teacher request not found' 
      });
    }
    
    const request = requestResult.rows[0];
    
    // Check if username already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Create user account
      const userResult = await pool.query(`
        INSERT INTO users (username, email, password_hash, role, name, school_id) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING id, username, email, role, name, school_id
      `, [username, request.email, hashedPassword, 'teacher', request.name, request.school_id]);
      
      // Update teacher request status
      await pool.query(`
        UPDATE teacher_requests 
        SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP 
        WHERE id = $3
      `, ['approved', req.user.id, id]);
      
      await pool.query('COMMIT');
      
      // Send approval email
      const emailResult = await emailService.sendTeacherApprovalEmail(
        request.email,
        request.name,
        username,
        password
      );
      
      if (!emailResult.success) {
        console.error('Failed to send approval email:', emailResult.error);
        // Don't fail the request, just log the error
      }
      
      res.json({
        message: 'Teacher request approved and account created. Login credentials sent via email.',
        teacher: userResult.rows[0],
        emailSent: emailResult.success
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error approving teacher request:', error);
    res.status(500).json({ error: 'Failed to approve teacher request' });
  }
});

// Reject teacher request (Amitrace Admin only)
router.post('/:id/reject', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the teacher request first for email notification
    const requestResult = await pool.query(
      'SELECT * FROM teacher_requests WHERE id = $1 AND status = $2',
      [id, 'pending']
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Pending teacher request not found' 
      });
    }
    
    const request = requestResult.rows[0];
    
    const result = await pool.query(`
      UPDATE teacher_requests 
      SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP 
      WHERE id = $3 AND status = $4
      RETURNING id, status
    `, ['rejected', req.user.id, id, 'pending']);
    
    // Send rejection email
    const emailResult = await emailService.sendTeacherRejectionEmail(
      request.email,
      request.name
    );
    
    if (!emailResult.success) {
      console.error('Failed to send rejection email:', emailResult.error);
      // Don't fail the request, just log the error
    }
    
    res.json({
      message: 'Teacher request rejected. Notification sent via email.',
      id: result.rows[0].id,
      emailSent: emailResult.success
    });
  } catch (error) {
    console.error('Error rejecting teacher request:', error);
    res.status(500).json({ error: 'Failed to reject teacher request' });
  }
});

// Delete teacher request (Amitrace Admin only)
router.delete('/:id', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM teacher_requests WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher request not found' });
    }
    
    res.json({ 
      message: 'Teacher request deleted successfully',
      id: result.rows[0].id 
    });
  } catch (error) {
    console.error('Error deleting teacher request:', error);
    res.status(500).json({ error: 'Failed to delete teacher request' });
  }
});

// Get teacher request statistics (Amitrace Admin only)
router.get('/stats/overview', verifyToken, isAmitraceAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) as total_count
      FROM teacher_requests
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching teacher request stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;