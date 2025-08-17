const express = require('express');
const router = express.Router();
const gmailService = require('../services/gmailService');

// Debug endpoint to check environment configuration
router.get('/env-check', (req, res) => {
    const envStatus = {
        EMAIL_USER: !!process.env.EMAIL_USER,
        GMAIL_CLIENT_ID: !!process.env.GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET: !!process.env.GMAIL_CLIENT_SECRET,
        GMAIL_REFRESH_TOKEN: !!process.env.GMAIL_REFRESH_TOKEN,
        EMAIL_PASS: !!process.env.EMAIL_PASS,
        NODE_ENV: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    };
    
    res.json({
        message: 'Environment variable status',
        config: envStatus,
        oauthConfigured: envStatus.EMAIL_USER && envStatus.GMAIL_CLIENT_ID && envStatus.GMAIL_CLIENT_SECRET && envStatus.GMAIL_REFRESH_TOKEN,
        appPasswordConfigured: envStatus.EMAIL_USER && envStatus.EMAIL_PASS
    });
});

// Test Gmail API teacher emails directly
router.post('/test-teacher-email', async (req, res) => {
    try {
        const { type, email } = req.body;
        
        console.log(`Testing ${type} email to:`, email);
        
        let result;
        if (type === 'approval') {
            result = await gmailService.sendTeacherApprovalEmail(
                email || 'amitrace.vidpod@gmail.com',
                'Debug Test Teacher',
                'debug_teacher_123',
                'TempPassword456'
            );
        } else if (type === 'rejection') {
            result = await gmailService.sendTeacherRejectionEmail(
                email || 'amitrace.vidpod@gmail.com',
                'Debug Test Teacher'
            );
        } else {
            return res.status(400).json({ error: 'Type must be "approval" or "rejection"' });
        }
        
        console.log('Gmail API result:', result);
        
        res.json({
            message: `${type} email test completed`,
            success: result.success,
            result: result
        });
    } catch (error) {
        console.error('Debug email test error:', error);
        res.status(500).json({ 
            error: 'Email test failed', 
            details: error.message 
        });
    }
});

module.exports = router;