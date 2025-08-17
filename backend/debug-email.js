// Debug Email Service in Production
require('dotenv').config();
const emailService = require('./services/emailService');

async function debugEmailService() {
    console.log('🔍 Debugging Email Service...\n');
    
    // Check environment variables
    console.log('📧 Environment Variables:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.log('GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('GMAIL_REFRESH_TOKEN:', process.env.GMAIL_REFRESH_TOKEN ? 'SET' : 'NOT SET');
    console.log('');
    
    // Check authentication method
    const hasOAuth = !!(process.env.GMAIL_CLIENT_ID && 
                       process.env.GMAIL_CLIENT_SECRET && 
                       process.env.GMAIL_REFRESH_TOKEN && 
                       process.env.EMAIL_USER);
    
    const hasAppPassword = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    
    console.log('🔐 Authentication Status:');
    console.log('OAuth2 Configured:', hasOAuth ? '✅' : '❌');
    console.log('App Password Configured:', hasAppPassword ? '✅' : '❌');
    console.log('');
    
    if (!hasOAuth && !hasAppPassword) {
        console.log('❌ No email authentication configured');
        return;
    }
    
    // Test direct email sending
    console.log('📨 Testing Direct Email Send...');
    try {
        const result = await emailService.sendPasswordResetEmail(
            'amitrace.vidpod@gmail.com',
            'Debug Test User',
            'debug_token_12345'
        );
        
        console.log('Email Send Result:', result);
        
        if (result.success) {
            console.log('✅ Email sent successfully!');
            console.log('Message ID:', result.messageId);
        } else {
            console.log('❌ Email failed to send');
            console.log('Error:', result.error);
        }
    } catch (error) {
        console.log('❌ Email service error:', error.message);
        console.log('Full error:', error);
    }
}

debugEmailService();