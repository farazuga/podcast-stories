const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const emailService = require('../services/emailService');
const gmailService = require('../services/gmailService');
const passwordUtils = require('../utils/password-utils');
const tokenService = require('../utils/token-service');

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
    
    // Get user by email using unified service
    const user = await tokenService.getUserByEmail(email);
    
    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }
    
    // Generate reset token using unified service
    let resetToken;
    try {
      resetToken = await tokenService.createPasswordResetToken(user.id);
      console.log('Token created successfully');
    } catch (tokenError) {
      console.error('Token creation failed:', tokenError.message);
      return res.status(500).json({ error: 'Failed to create reset token: ' + tokenError.message });
    }
    
    console.log('Attempting to send password reset email to:', user.email);
    
    // Try Gmail API first, then fall back to SMTP
    console.log('Trying Gmail API...');
    let emailResult = await gmailService.sendPasswordResetEmail(
      user.email, 
      user.name || user.username, 
      resetToken
    );
    
    console.log('Gmail API result:', emailResult);
    
    // If Gmail API fails, try SMTP
    if (!emailResult.success) {
      console.log('Gmail API failed, trying SMTP...');
      emailResult = await emailService.sendPasswordResetEmail(
        user.email, 
        user.name || user.username, 
        resetToken
      );
      console.log('SMTP result:', emailResult);
    }
    
    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      // Still return success to user for security
    } else {
      console.log('Password reset email sent successfully via', emailResult.messageId ? 'Gmail API' : 'SMTP');
    }
    
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request: ' + error.message });
  }
});

// Verify reset token
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const validation = await tokenService.validateToken(token);
    
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }
    
    res.json({ 
      valid: true, 
      email: validation.user.email,
      username: validation.user.username,
      name: validation.user.name,
      role: validation.user.role
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Failed to verify reset token' });
  }
});

// Reset password - unified endpoint for all password resets
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    // Validate password using unified utility
    const passwordValidation = passwordUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }
    
    // Validate token using unified service
    const tokenValidation = await tokenService.validateToken(token);
    if (!tokenValidation.isValid) {
      return res.status(400).json({ error: tokenValidation.error });
    }
    
    // Hash password using unified utility
    const hashedPassword = await passwordUtils.hashPassword(password);
    
    // Update password and mark tokens as used
    const success = await tokenService.updateUserPassword(tokenValidation.user.id, hashedPassword);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update password' });
    }
    
    res.json({ message: 'Password has been reset successfully' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Clean up expired tokens (can be called periodically)
router.delete('/cleanup', async (req, res) => {
  try {
    const deletedCount = await tokenService.cleanupExpiredTokens();
    
    res.json({ 
      message: 'Expired tokens cleaned up',
      deletedCount 
    });
    
  } catch (error) {
    console.error('Token cleanup error:', error);
    res.status(500).json({ error: 'Failed to clean up tokens' });
  }
});

module.exports = router;