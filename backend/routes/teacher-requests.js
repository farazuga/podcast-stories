const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyToken, isAmitraceAdmin } = require('../middleware/auth');
const emailService = require('../services/emailService');
const gmailService = require('../services/gmailService');
const passwordGenerator = require('../utils/passwordGenerator');
const validationHelpers = require('../utils/validationHelpers');
const tokenUtils = require('../utils/tokenUtils');
const { createLogger } = require('../utils/logger');
const bcrypt = require('bcrypt');

// Create logger instance
const logger = createLogger('teacher-requests');
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Helper function to check if a user exists by email
 * @param {object} clientOrPool - Database client or pool
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if user exists
 */
async function userExistsByEmail(clientOrPool, email) {
  const normalizedEmail = email?.trim().toLowerCase();
  const result = await clientOrPool.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );
  return result.rows.length > 0;
}

/**
 * Create a generic error response based on environment
 * @param {Error} error - Error object
 * @param {string} userMessage - Message to show to user
 * @returns {object} Error response object
 */
function createErrorResponse(error, userMessage) {
  if (isProduction) {
    return { error: userMessage || 'An unexpected error occurred' };
  } else {
    return {
      error: userMessage || error.message,
      details: error.message,
      code: error.code
    };
  }
}

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
    logger.error('Error fetching teacher requests', error);
    res.status(500).json(createErrorResponse(error, 'Failed to fetch teacher requests'));
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
    logger.error('Error fetching teacher request', error);
    res.status(500).json(createErrorResponse(error, 'Failed to fetch teacher request'));
  }
});

// Submit teacher request (Public endpoint)
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, name, email, school_id, message } = req.body;
    
    // Normalize email (Comment 3)
    const normalizedEmail = email?.trim().toLowerCase();
    
    // Use first_name/last_name if provided, otherwise fall back to name
    const finalFirstName = first_name || (name ? name.split(' ')[0] : '');
    const finalLastName = last_name || '';
    const finalName = name || (first_name && last_name ? `${first_name} ${last_name}` : first_name || '');
    
    // Validate required fields
    if ((!finalFirstName && !finalName) || !normalizedEmail || !school_id) {
      return res.status(400).json({ 
        error: 'First name (or full name), email, and school are required' 
      });
    }
    
    // Validate email format
    if (!validationHelpers.isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if email already exists as a user (Comment 7 - using helper)
    if (await userExistsByEmail(pool, normalizedEmail)) {
      // Comment 5 - Use 409 for conflicts
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }
    
    // Check if email already has a pending request
    const existingRequest = await pool.query(
      'SELECT id FROM teacher_requests WHERE LOWER(email) = LOWER($1) AND status = $2',
      [normalizedEmail, 'pending']
    );
    if (existingRequest.rows.length > 0) {
      // Comment 5 - Use 409 for conflicts
      return res.status(409).json({ 
        error: 'A pending request with this email already exists' 
      });
    }
    
    // Verify school exists
    const school = await pool.query('SELECT id FROM schools WHERE id = $1', [school_id]);
    if (school.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid school selected' });
    }
    
    const result = await pool.query(`
      INSERT INTO teacher_requests (name, first_name, last_name, email, school_id, message) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, name, first_name, last_name, email, school_id, message, status, requested_at
    `, [
      finalName.trim(), 
      finalFirstName.trim(), 
      finalLastName.trim(),
      normalizedEmail, // Use normalized email
      school_id, 
      message?.trim() || null
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Comment 13 - Check for unique constraint violation
    if (error.code === '23505') {
      logger.warn('Unique constraint violation on teacher request submission', { email: normalizedEmail });
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }
    logger.error('Error creating teacher request', error);
    res.status(500).json(createErrorResponse(error, 'Failed to submit teacher request'));
  }
});

// Approve teacher request (Amitrace Admin only)
router.post('/:id/approve', verifyToken, isAmitraceAdmin, async (req, res) => {
  // Comment 1 - Acquire a client from the pool for transaction
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    logger.info('Approving teacher request', { requestId: id, adminId: req.user.id });
    
    // Comment 15 - Rename generatedPassword to initialPassword
    const initialPassword = passwordGenerator.generateKidFriendlyPassword();
    
    // Comment 9 - Add password validation
    const passwordValidation = validationHelpers.validateGeneratedPassword(initialPassword);
    if (!passwordValidation.valid) {
      logger.error('Generated password failed validation', passwordValidation);
      return res.status(500).json(createErrorResponse(
        new Error('Password generation failed'),
        'Failed to generate secure password'
      ));
    }
    
    logger.debug('Generated initial password for teacher request', { requestId: id });
    
    // Start transaction with client
    await client.query('BEGIN');
    
    // Comment 4 - Add FOR UPDATE row lock and re-check status
    const requestResult = await client.query(
      'SELECT * FROM teacher_requests WHERE id = $1 AND status = $2 FOR UPDATE',
      [id, 'pending']
    );
    
    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Pending teacher request not found' 
      });
    }
    
    const request = requestResult.rows[0];
    
    // Comment 3 - Normalize email
    const normalizedEmail = request.email?.trim().toLowerCase();
    
    // Comment 7 - Use helper function for user existence check
    if (await userExistsByEmail(client, normalizedEmail)) {
      await client.query('ROLLBACK');
      // Comment 5 - Use 409 for conflicts
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }
    
    // Comment 14 - Generate secure token instead of sending password
    const invitationToken = tokenUtils.generateTeacherInvitationToken(
      normalizedEmail,
      request.id,
      { name: request.name, school_id: request.school_id }
    );
    
    // Hash temporary password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(initialPassword, saltRounds);
    
    logger.info('Starting teacher approval transaction', {
      requestId: id,
      email: normalizedEmail,
      school_id: request.school_id
    });
    
    // Create user account with transaction client
    logger.info('Creating teacher user account');
    const userResult = await client.query(`
      INSERT INTO users (email, password, role, name, school_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id, email, role, name, school_id
    `, [normalizedEmail, hashedPassword, 'teacher', request.name, request.school_id]);
    
    logger.info('User account created successfully', { userId: userResult.rows[0].id });
    
    // Comment 12 - Update with processed_at and action_type fields
    logger.info('Updating teacher request status');
    await client.query(`
      UPDATE teacher_requests 
      SET status = $1, 
          approved_by = $2, 
          approved_at = CURRENT_TIMESTAMP,
          processed_at = CURRENT_TIMESTAMP,
          action_type = $3
      WHERE id = $4
    `, ['approved', req.user.id, 'approved', id]);
    
    logger.info('Committing transaction');
    await client.query('COMMIT');
    logger.info('Transaction committed successfully');
    
    // Comment 15 - Rename emailResult to mailResult
    let mailResult = { success: false };
    
    // Comment 14 - Create secure invitation URL
    const baseUrl = process.env.APP_BASE_URL || 'https://podcast-stories-production.up.railway.app';
    const invitationUrl = tokenUtils.createTeacherInvitationUrl(baseUrl, invitationToken.token);
    
    // Comment 11 - Wrap email sending in try-catch blocks
    logger.info('Sending teacher approval email', { email: normalizedEmail });
    
    try {
      // Try Gmail API first
      mailResult = await gmailService.sendTeacherApprovalEmail(
        normalizedEmail,
        request.name,
        normalizedEmail,
        invitationUrl // Send invitation URL instead of password
      );
    } catch (emailError) {
      logger.error('Gmail API failed for approval email', emailError);
      mailResult = { success: false, error: emailError.message };
    }
    
    // Fallback to SMTP if Gmail API fails
    if (!mailResult.success) {
      logger.info('Trying SMTP fallback for approval email');
      try {
        mailResult = await emailService.sendTeacherApprovalEmail(
          normalizedEmail,
          request.name,
          normalizedEmail,
          invitationUrl // Send invitation URL instead of password
        );
      } catch (smtpError) {
        logger.error('SMTP fallback also failed for approval email', smtpError);
        mailResult = { success: false, error: smtpError.message };
      }
    }
    
    if (!mailResult.success) {
      logger.error('Failed to send approval email after all attempts', mailResult.error);
    }
    
    res.json({
      message: 'Teacher request approved and account created. Invitation link sent via email.',
      teacher: userResult.rows[0],
      emailSent: mailResult.success,
      invitationSent: true
    });
  } catch (error) {
    // Ensure client is released if transaction failed
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error during rollback', rollbackError);
      }
    }
    
    // Comment 13 - Check for unique constraint violation
    if (error.code === '23505') {
      logger.warn('Unique constraint violation during teacher approval', error);
      return res.status(409).json({ 
        error: 'An account with this email already exists' 
      });
    }
    
    logger.error('Error approving teacher request', error);
    // Comment 8 & 10 - Return generic error in production
    res.status(500).json(createErrorResponse(error, 'Failed to approve teacher request'));
  } finally {
    // Comment 1 - Always release the client
    if (client) {
      client.release();
    }
  }
});

// Reject teacher request (Amitrace Admin only)
router.post('/:id/reject', verifyToken, isAmitraceAdmin, async (req, res) => {
  // Comment 1 - Use client for transaction consistency
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    logger.info('Rejecting teacher request', { requestId: id, adminId: req.user.id });
    
    await client.query('BEGIN');
    
    // Comment 4 - Add FOR UPDATE lock
    const requestResult = await client.query(
      'SELECT * FROM teacher_requests WHERE id = $1 AND status = $2 FOR UPDATE',
      [id, 'pending']
    );
    
    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        error: 'Pending teacher request not found' 
      });
    }
    
    const request = requestResult.rows[0];
    const normalizedEmail = request.email?.trim().toLowerCase();
    
    // Comment 12 - Update with processed_at and action_type
    const result = await client.query(`
      UPDATE teacher_requests 
      SET status = $1, 
          approved_by = $2, 
          approved_at = CURRENT_TIMESTAMP,
          processed_at = CURRENT_TIMESTAMP,
          action_type = $3 
      WHERE id = $4 AND status = $5
      RETURNING id, status
    `, ['rejected', req.user.id, 'rejected', id, 'pending']);
    
    await client.query('COMMIT');
    
    // Comment 15 - Rename emailResult to mailResult
    let mailResult = { success: false };
    
    // Comment 11 - Wrap email sending in try-catch
    logger.info('Sending teacher rejection email', { email: normalizedEmail });
    
    try {
      mailResult = await gmailService.sendTeacherRejectionEmail(
        normalizedEmail,
        request.name
      );
    } catch (emailError) {
      logger.error('Gmail API failed for rejection email', emailError);
      mailResult = { success: false, error: emailError.message };
    }
    
    // Fallback to SMTP if Gmail API fails
    if (!mailResult.success) {
      logger.info('Trying SMTP fallback for rejection email');
      try {
        mailResult = await emailService.sendTeacherRejectionEmail(
          normalizedEmail,
          request.name
        );
      } catch (smtpError) {
        logger.error('SMTP fallback also failed for rejection email', smtpError);
        mailResult = { success: false, error: smtpError.message };
      }
    }
    
    if (!mailResult.success) {
      logger.error('Failed to send rejection email after all attempts', mailResult.error);
    }
    
    res.json({
      message: 'Teacher request rejected. Notification sent via email.',
      id: result.rows[0].id,
      emailSent: mailResult.success
    });
  } catch (error) {
    // Ensure rollback on error
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error during rollback', rollbackError);
      }
    }
    
    logger.error('Error rejecting teacher request', error);
    res.status(500).json(createErrorResponse(error, 'Failed to reject teacher request'));
  } finally {
    // Always release client
    if (client) {
      client.release();
    }
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
    logger.error('Error deleting teacher request', error);
    res.status(500).json(createErrorResponse(error, 'Failed to delete teacher request'));
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
    logger.error('Error fetching teacher request stats', error);
    res.status(500).json(createErrorResponse(error, 'Failed to fetch statistics'));
  }
});

// Set password using invitation token (Comment 14 - secure password flow)
router.post('/set-password', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    // Validate token
    const tokenValidation = tokenUtils.validateTeacherInvitationToken(token);
    if (!tokenValidation.valid) {
      logger.warn('Invalid teacher invitation token attempt', { error: tokenValidation.error });
      return res.status(400).json({ error: tokenValidation.error });
    }
    
    const { email, requestId } = tokenValidation.payload;
    const normalizedEmail = email?.trim().toLowerCase();
    
    // Comment 9 - Validate password strength
    const passwordValidation = validationHelpers.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: passwordValidation.message,
        strength: passwordValidation.strength 
      });
    }
    
    // Additional password requirements check
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }
    
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    
    if (!(hasUppercase && hasLowercase && hasNumbers)) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase, lowercase, and numbers' 
      });
    }
    
    await client.query('BEGIN');
    
    // Check if user exists and token hasn't been used
    const userResult = await client.query(
      'SELECT id, password FROM users WHERE LOWER(email) = LOWER($1) FOR UPDATE',
      [normalizedEmail]
    );
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User account not found' });
    }
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update user password
    await client.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userResult.rows[0].id]
    );
    
    // Mark the token as used (by updating the request)
    await client.query(
      'UPDATE teacher_requests SET password_set_at = CURRENT_TIMESTAMP WHERE id = $1',
      [requestId]
    );
    
    await client.query('COMMIT');
    
    logger.info('Teacher password successfully set', { email: normalizedEmail });
    
    res.json({ 
      success: true,
      message: 'Password set successfully. You can now log in with your email and new password.' 
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error during rollback', rollbackError);
      }
    }
    
    logger.error('Error setting teacher password', error);
    res.status(500).json(createErrorResponse(error, 'Failed to set password'));
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;