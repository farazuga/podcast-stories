const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const router = express.Router();

// Use the same database connection as the main server
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Admin endpoint to update test user passwords
router.post('/update-test-passwords', async (req, res) => {
    try {
        console.log('🔐 Updating test user passwords...');
        
        // Generate hash for "vidpod"
        const newPassword = 'vidpod';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update test users
        const testEmails = ['admin@vidpod.com', 'teacher@vidpod.com', 'student@vidpod.com'];
        
        const updateQuery = `
            UPDATE users 
            SET password = $1 
            WHERE email = ANY($2)
            RETURNING email, name, role;
        `;
        
        const result = await pool.query(updateQuery, [hashedPassword, testEmails]);
        
        console.log(`✅ Updated ${result.rows.length} users`);
        
        // Verify the updates
        const verifications = [];
        for (const email of testEmails) {
            const userResult = await pool.query('SELECT email, password FROM users WHERE email = $1', [email]);
            if (userResult.rows.length > 0) {
                const isValid = await bcrypt.compare('vidpod', userResult.rows[0].password);
                verifications.push({ email, passwordValid: isValid });
            }
        }
        
        res.json({
            message: 'Test passwords updated successfully',
            updatedUsers: result.rows,
            verifications: verifications,
            newCredentials: [
                'admin@vidpod.com / vidpod',
                'teacher@vidpod.com / vidpod', 
                'student@vidpod.com / vidpod'
            ]
        });
        
    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ error: 'Failed to update passwords' });
    }
});

module.exports = router;