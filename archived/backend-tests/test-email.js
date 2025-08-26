// Email Service Test Script
require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmailService() {
    console.log('🧪 Testing Email Service...\n');
    
    // Check if email credentials are configured
    const hasOAuth = !!(process.env.GMAIL_CLIENT_ID && 
                       process.env.GMAIL_CLIENT_SECRET && 
                       process.env.GMAIL_REFRESH_TOKEN && 
                       process.env.EMAIL_USER);
    
    const hasAppPassword = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    
    if (!hasOAuth && !hasAppPassword) {
        console.log('❌ Email credentials not configured');
        console.log('\n🔐 Option 1: OAuth2 (Recommended)');
        console.log('EMAIL_USER=your-email@gmail.com');
        console.log('GMAIL_CLIENT_ID=your-client-id');
        console.log('GMAIL_CLIENT_SECRET=your-client-secret');
        console.log('GMAIL_REFRESH_TOKEN=your-refresh-token');
        console.log('\n🔑 Option 2: App Password (Simpler)');
        console.log('EMAIL_USER=your-email@gmail.com');
        console.log('EMAIL_PASS=your-app-specific-password');
        console.log('\n📖 See OAUTH_SETUP.md for detailed instructions');
        return;
    }
    
    console.log('✅ Email credentials found');
    console.log(`📧 Email User: ${process.env.EMAIL_USER}`);
    console.log(`🔐 Auth Method: ${hasOAuth ? 'OAuth2' : 'App Password'}\n`);
    
    // Test email methods
    const testEmail = process.env.EMAIL_USER; // Send test to yourself
    
    console.log('1. Testing Teacher Approval Email...');
    try {
        const result1 = await emailService.sendTeacherApprovalEmail(
            testEmail,
            'Test Teacher',
            'test_teacher',
            'temp_password123'
        );
        console.log(result1.success ? '✅ Teacher approval email test passed' : `❌ Failed: ${result1.error}`);
    } catch (error) {
        console.log(`❌ Teacher approval email error: ${error.message}`);
    }
    
    console.log('\n2. Testing Teacher Rejection Email...');
    try {
        const result2 = await emailService.sendTeacherRejectionEmail(
            testEmail,
            'Test Teacher'
        );
        console.log(result2.success ? '✅ Teacher rejection email test passed' : `❌ Failed: ${result2.error}`);
    } catch (error) {
        console.log(`❌ Teacher rejection email error: ${error.message}`);
    }
    
    console.log('\n3. Testing Password Reset Email...');
    try {
        const result3 = await emailService.sendPasswordResetEmail(
            testEmail,
            'Test User',
            'test_token_123456789'
        );
        console.log(result3.success ? '✅ Password reset email test passed' : `❌ Failed: ${result3.error}`);
    } catch (error) {
        console.log(`❌ Password reset email error: ${error.message}`);
    }
    
    console.log('\n🎉 Email service testing completed!');
    console.log('Check your email inbox for test messages.');
    process.exit(0);
}

testEmailService();