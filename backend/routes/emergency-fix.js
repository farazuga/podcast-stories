/**
 * Emergency database fix routes
 */

const express = require('express');
const router = express.Router();
const { createMissingTable } = require('../create-missing-table');

// Emergency fix endpoint
router.post('/create-password-reset-tokens-table', async (req, res) => {
    try {
        console.log('🚨 EMERGENCY FIX: Creating password_reset_tokens table');
        
        const success = await createMissingTable();
        
        if (success) {
            res.json({
                success: true,
                message: 'password_reset_tokens table created successfully - teacher approval should now work'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to create table'
            });
        }
    } catch (error) {
        console.error('Emergency fix error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;