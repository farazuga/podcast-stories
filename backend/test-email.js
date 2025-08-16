// Email Service Test Script
require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmailService() {
    console.log('🧪 Testing Email Service...\n');
    
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('❌ Email credentials not configured');
        console.log('Set EMAIL_USER and EMAIL_PASS environment variables');
        console.log('\nFor Gmail:');
        console.log('EMAIL_USER=your-email@gmail.com');
        console.log('EMAIL_PASS=your-app-specific-password');
        return;
    }
    
    console.log('✅ Email credentials found');
    console.log(`📧 Email User: ${process.env.EMAIL_USER}\n`);
    
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