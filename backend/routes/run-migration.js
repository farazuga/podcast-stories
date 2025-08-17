const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Run migration endpoint (one-time use)
router.get('/fix-constraint', async (req, res) => {
    try {
        // Check if constraint already exists
        const constraintCheck = await pool.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'password_reset_tokens' 
            AND constraint_type = 'UNIQUE'
        `);
        
        if (constraintCheck.rows.some(row => row.constraint_name === 'unique_user_id')) {
            return res.json({ 
                message: 'Constraint already exists!',
                status: 'already_fixed' 
            });
        }
        
        // Remove duplicates
        const deleteResult = await pool.query(`
            DELETE FROM password_reset_tokens 
            WHERE id NOT IN (
                SELECT MAX(id) 
                FROM password_reset_tokens 
                GROUP BY user_id
            )
        `);
        
        // Add unique constraint
        await pool.query(`
            ALTER TABLE password_reset_tokens 
            ADD CONSTRAINT unique_user_id UNIQUE (user_id)
        `);
        
        res.json({ 
            message: 'Migration completed successfully!',
            deleted_duplicates: deleteResult.rowCount,
            status: 'fixed'
        });
    } catch (error) {
        console.error('Migration failed:', error);
        res.status(500).json({ 
            error: 'Migration failed',
            details: error.message 
        });
    }
});

module.exports = router;