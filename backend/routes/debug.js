const express = require('express');
const router = express.Router();

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

module.exports = router;