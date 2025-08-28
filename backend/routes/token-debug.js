const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get latest password reset tokens
router.get('/latest-tokens', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        prt.id,
        prt.user_id,
        prt.token,
        prt.expires_at,
        prt.used,
        prt.created_at,
        u.email,
        u.role
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      ORDER BY prt.created_at DESC
      LIMIT 5
    `);
    
    res.json({
      success: true,
      tokens: result.rows.map(token => ({
        ...token,
        token: token.token.substring(0, 8) + '...' // Hide most of the token for security
      }))
    });
    
  } catch (error) {
    console.error('Failed to get tokens:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Create test token and verify it works
router.post('/test-flow', async (req, res) => {
  try {
    // Get admin user ID
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@vidpod.com']);
    
    if (userResult.rows.length === 0) {
      return res.json({
        success: false,
        error: 'Admin user not found'
      });
    }
    
    const userId = userResult.rows[0].id;
    
    // Create a test token manually
    const testToken = 'test-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Insert token
    const insertResult = await pool.query(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at, used, created_at)
      VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
      RETURNING id
    `, [userId, testToken, expiresAt]);
    
    // Try to validate the token
    const validateResult = await pool.query(`
      SELECT 
        prt.id,
        prt.user_id,
        prt.expires_at,
        prt.used,
        u.email,
        u.role
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1
    `, [testToken]);
    
    const isValid = validateResult.rows.length > 0 && 
                   new Date() <= new Date(validateResult.rows[0].expires_at) &&
                   !validateResult.rows[0].used;
    
    res.json({
      success: true,
      token_created: insertResult.rows[0].id,
      token_validated: validateResult.rows.length > 0,
      is_valid: isValid,
      validation_data: validateResult.rows[0] || null,
      test_token: testToken.substring(0, 8) + '...',
      full_test_token: testToken // Only for testing - remove in production
    });
    
  } catch (error) {
    console.error('Test flow failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;