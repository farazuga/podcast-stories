const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Remove the problematic unique constraint
router.get('/remove-unique-constraint', async (req, res) => {
  try {
    // Check current constraints
    const beforeConstraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'password_reset_tokens' AND constraint_type = 'UNIQUE'
    `);
    
    console.log('Constraints before:', beforeConstraints.rows);
    
    // Remove unique_user_id constraint
    await pool.query('ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS unique_user_id');
    console.log('Dropped unique_user_id constraint');
    
    // Remove any other unique constraints on user_id
    await pool.query('ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_key');
    console.log('Dropped password_reset_tokens_user_id_key constraint');
    
    // Check constraints after
    const afterConstraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'password_reset_tokens' AND constraint_type = 'UNIQUE'
    `);
    
    console.log('Constraints after:', afterConstraints.rows);
    
    res.json({
      success: true,
      message: 'Unique constraints removed successfully',
      constraints_before: beforeConstraints.rows,
      constraints_after: afterConstraints.rows
    });
    
  } catch (error) {
    console.error('Failed to remove constraint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;