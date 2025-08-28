const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Quick fix to drop the unique constraint that's preventing password resets
router.get('/drop-unique-constraint', async (req, res) => {
  try {
    console.log('Dropping unique constraint on password_reset_tokens...');
    
    // First, let's see what constraints exist
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'password_reset_tokens'
    `);
    
    console.log('Found constraints:', constraints.rows);
    
    // Drop the unique_user_id constraint that was created by the other migration
    try {
      await pool.query('ALTER TABLE password_reset_tokens DROP CONSTRAINT unique_user_id');
      console.log('Dropped unique_user_id constraint');
    } catch (error) {
      console.log('unique_user_id constraint not found or already dropped:', error.message);
    }
    
    // Test token creation
    const testUserId = 1;
    const testToken1 = 'test1-' + Date.now();
    const testToken2 = 'test2-' + Date.now();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    // Try to create two tokens for the same user (this should work after dropping constraint)
    await pool.query(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at, used) 
      VALUES ($1, $2, $3, false)
    `, [testUserId, testToken1, expiresAt]);
    
    await pool.query(`
      INSERT INTO password_reset_tokens (user_id, token, expires_at, used) 
      VALUES ($1, $2, $3, false)
    `, [testUserId, testToken2, expiresAt]);
    
    console.log('Successfully created two tokens for same user - constraint removed!');
    
    res.json({
      success: true,
      message: 'Unique constraint dropped and tested successfully',
      constraints_before: constraints.rows,
      test_tokens_created: 2
    });
    
  } catch (error) {
    console.error('Quick fix failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;