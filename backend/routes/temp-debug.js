const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Check password reset token constraints
router.get('/check-constraints', async (req, res) => {
  try {
    // Check what constraints exist on password_reset_tokens
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'password_reset_tokens'
    `);
    
    // Check if the table exists
    const tableExists = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'password_reset_tokens'
    `);
    
    // Get sample data from the table if it exists
    let sampleData = [];
    if (tableExists.rows.length > 0) {
      try {
        const sample = await pool.query(`
          SELECT id, user_id, expires_at, used, created_at 
          FROM password_reset_tokens 
          ORDER BY created_at DESC 
          LIMIT 3
        `);
        sampleData = sample.rows;
      } catch (error) {
        sampleData = [`Error getting sample data: ${error.message}`];
      }
    }
    
    res.json({
      table_exists: tableExists.rows.length > 0,
      constraints: constraints.rows,
      sample_data: sampleData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Constraint check failed:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Try to create a test token
router.post('/test-token-creation', async (req, res) => {
  try {
    const testUserId = 1; // Admin user
    const testToken = 'test-token-' + Date.now();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    const result = await pool.query(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at, used) 
      VALUES ($1, $2, $3, false) 
      RETURNING id
    `, [testUserId, testToken, expiresAt]);
    
    res.json({
      success: true,
      token_id: result.rows[0].id,
      test_token: testToken,
      message: 'Test token created successfully'
    });
    
  } catch (error) {
    console.error('Token creation failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;