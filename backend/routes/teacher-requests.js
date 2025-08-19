const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyToken, isAmitraceAdmin } = require('../middleware/auth');
const emailService = require('../services/emailService');
const gmailService = require('../services/gmailService');

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
        COALESCE(approved_by_user.name, approved_by_user.email) as approved_by_name
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
        COALESCE(approved_by_user.name, approved_by_user.email) as approved_by_name
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
    const { password } = req.body;
    
    console.log('Approving teacher request:', id);
    
    // Validate required fields
    if (!password) {
      return res.status(400).json({ 
        error: 'Password is required for teacher account creation' 
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
    console.log('Starting teacher approval transaction for request:', id);
    console.log('Creating user with data:', {
      username,
      email: request.email,
      role: 'teacher',
      name: request.name,
      school_id: request.school_id
    });
    
    await pool.query('BEGIN');
    
    try {
      // Create user account
      console.log('Attempting to create user account...');
      const userResult = await pool.query(`
        INSERT INTO users (email, password, role, name, school_id) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id, email, role, name, school_id
      `, [request.email, hashedPassword, 'teacher', request.name, request.school_id]);
      
      console.log('User account created successfully:', userResult.rows[0]);
      
      // Update teacher request status
      console.log('Updating teacher request status to approved...');
      await pool.query(`
        UPDATE teacher_requests 
        SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP 
        WHERE id = $3
      `, ['approved', req.user.id, id]);
      
      console.log('Teacher request status updated successfully');
      console.log('Committing transaction...');
      await pool.query('COMMIT');
      console.log('Transaction committed successfully');
      
      // Send approval email - try Gmail API first
      console.log('Sending teacher approval email to:', request.email);
      let emailResult = await gmailService.sendTeacherApprovalEmail(
        request.email,
        request.name,
        request.email, // Use email as login
        password
      );
      
      // Fallback to SMTP if Gmail API fails
      if (!emailResult.success) {
        console.log('Gmail API failed for approval email, trying SMTP...');
        emailResult = await emailService.sendTeacherApprovalEmail(
          request.email,
          request.name,
          request.email, // Use email as login
          password
        );
      }
      
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
      console.error('Transaction failed, rolling back:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        column: error.column
      });
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error approving teacher request:', error);
    console.error('Full error object:', error);
    res.status(500).json({ 
      error: 'Failed to approve teacher request',
      details: error.message,
      code: error.code 
    });
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
    
    // Send rejection email - try Gmail API first
    console.log('Sending teacher rejection email to:', request.email);
    let emailResult = await gmailService.sendTeacherRejectionEmail(
      request.email,
      request.name
    );
    
    // Fallback to SMTP if Gmail API fails
    if (!emailResult.success) {
      console.log('Gmail API failed for rejection email, trying SMTP...');
      emailResult = await emailService.sendTeacherRejectionEmail(
        request.email,
        request.name
      );
    }
    
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