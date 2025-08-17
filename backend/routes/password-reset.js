const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const gmailService = require('../services/gmailService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Request password reset
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, username, name, email FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    
    if (userResult.rows.length === 0) {
      // Return success even if user doesn't exist (security best practice)
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Store reset token in database
    await pool.query(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at) 
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET token = $2, expires_at = $3, used = false, created_at = CURRENT_TIMESTAMP
    `, [user.id, resetToken, expiresAt]);
    
    // Try Gmail API first, then fall back to SMTP
    let emailResult = await gmailService.sendPasswordResetEmail(
      user.email, 
      user.name || user.username, 
      resetToken
    );
    
    // If Gmail API fails, try SMTP
    if (!emailResult.success) {
      console.log('Gmail API failed, trying SMTP...');
      emailResult = await emailService.sendPasswordResetEmail(
        user.email, 
        user.name || user.username, 
        resetToken
      );
    }
    
    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      // Still return success to user for security
    } else {
      console.log('Password reset email sent successfully');
    }
    
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Verify reset token
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await pool.query(`
      SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email, u.username
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1
    `, [token]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }
    
    const resetRequest = result.rows[0];
    
    // Check if token is expired
    if (new Date() > new Date(resetRequest.expires_at)) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    
    // Check if token has been used
    if (resetRequest.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }
    
    res.json({ 
      valid: true, 
      email: resetRequest.email,
      username: resetRequest.username
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Failed to verify reset token' });
  }
});

// Reset password
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Verify token again
    const tokenResult = await pool.query(`
      SELECT prt.id, prt.user_id, prt.expires_at, prt.used
      FROM password_reset_tokens prt
      WHERE prt.token = $1
    `, [token]);
    
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }
    
    const resetRequest = tokenResult.rows[0];
    
    // Check if token is expired
    if (new Date() > new Date(resetRequest.expires_at)) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    
    // Check if token has been used
    if (resetRequest.used) {
      return res.status(400).json({ error: 'Reset token has already been used' });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Update user password
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashedPassword, resetRequest.user_id]
      );
      
      // Mark token as used
      await pool.query(
        'UPDATE password_reset_tokens SET used = true WHERE id = $1',
        [resetRequest.id]
      );
      
      await pool.query('COMMIT');
      
      res.json({ message: 'Password has been reset successfully' });
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Clean up expired tokens (can be called periodically)
router.delete('/cleanup', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP'
    );
    
    res.json({ 
      message: 'Expired tokens cleaned up',
      deletedCount: result.rowCount 
    });
    
  } catch (error) {
    console.error('Token cleanup error:', error);
    res.status(500).json({ error: 'Failed to clean up tokens' });
  }
});

module.exports = router;