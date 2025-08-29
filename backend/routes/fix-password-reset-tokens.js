/**
 * Emergency fix route for password_reset_tokens table
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Emergency fix endpoint to create password_reset_tokens table
router.post('/create-password-reset-tokens-table', async (req, res) => {
    try {
        console.log('🔧 Creating password_reset_tokens table...');
        
        // Check if table exists
        const checkResult = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_name = 'password_reset_tokens'
        `);
        
        if (checkResult.rows.length > 0) {
            return res.json({
                success: true,
                message: 'password_reset_tokens table already exists',
                action: 'none'
            });
        }
        
        // Create the table
        await pool.query(`
            CREATE TABLE password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create indexes
        await pool.query(`CREATE INDEX idx_password_reset_token ON password_reset_tokens(token)`);
        await pool.query(`CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at)`);
        await pool.query(`CREATE INDEX idx_password_reset_user_expires ON password_reset_tokens(user_id, expires_at, used)`);
        
        console.log('✅ password_reset_tokens table created successfully');
        
        res.json({
            success: true,
            message: 'password_reset_tokens table created successfully',
            action: 'created'
        });
        
    } catch (error) {
        console.error('❌ Failed to create password_reset_tokens table:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create password_reset_tokens table',
            error: error.message
        });
    }
});

// Check table status endpoint
router.get('/check-password-reset-tokens-table', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'password_reset_tokens'
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length === 0) {
            res.json({
                exists: false,
                message: 'password_reset_tokens table does not exist - this is the cause of teacher approval 500 error'
            });
        } else {
            res.json({
                exists: true,
                message: 'password_reset_tokens table exists',
                columns: result.rows
            });
        }
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;