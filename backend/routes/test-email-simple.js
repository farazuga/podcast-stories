const express = require('express');
const router = express.Router();
const gmailService = require('../services/gmailService');

// Simple teacher email test
router.get('/teacher-rejection', async (req, res) => {
    try {
        console.log('Testing teacher rejection email...');
        
        const result = await gmailService.sendTeacherRejectionEmail(
            'amitrace.vidpod@gmail.com',
            'Debug Test Teacher'
        );
        
        console.log('Teacher rejection email result:', result);
        
        res.json({
            message: 'Teacher rejection email test completed',
            success: result.success,
            result: result
        });
    } catch (error) {
        console.error('Teacher rejection email test error:', error);
        res.status(500).json({ 
            error: 'Teacher rejection email test failed', 
            details: error.message 
        });
    }
});

router.get('/teacher-approval', async (req, res) => {
    try {
        console.log('Testing teacher approval email...');
        
        const result = await gmailService.sendTeacherApprovalEmail(
            'amitrace.vidpod@gmail.com',
            'Debug Test Teacher',
            'debug_teacher_username',
            'DebugPassword123'
        );
        
        console.log('Teacher approval email result:', result);
        
        res.json({
            message: 'Teacher approval email test completed',
            success: result.success,
            result: result
        });
    } catch (error) {
        console.error('Teacher approval email test error:', error);
        res.status(500).json({ 
            error: 'Teacher approval email test failed', 
            details: error.message 
        });
    }
});

module.exports = router;