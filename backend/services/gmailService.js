const { google } = require('googleapis');

class GmailService {
    constructor() {
        this.gmail = null;
        this.oauth2Client = null;
        this.initialized = false;
        this.initializeGmail();
    }

    async initializeGmail() {
        try {
            if (!this.hasOAuthCredentials()) {
                console.warn('Gmail OAuth credentials not configured');
                return;
            }

            console.log('Initializing Gmail API with OAuth2...');
            
            this.oauth2Client = new google.auth.OAuth2(
                process.env.GMAIL_CLIENT_ID,
                process.env.GMAIL_CLIENT_SECRET,
                'https://developers.google.com/oauthplayground'
            );

            this.oauth2Client.setCredentials({
                refresh_token: process.env.GMAIL_REFRESH_TOKEN
            });

            // Initialize Gmail API
            this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
            
            console.log('Gmail API initialized successfully');
            this.initialized = true;
        } catch (error) {
            console.error('Gmail API initialization failed:', error.message);
            this.gmail = null;
            this.initialized = false;
        }
    }

    hasOAuthCredentials() {
        return !!(process.env.GMAIL_CLIENT_ID && 
                 process.env.GMAIL_CLIENT_SECRET && 
                 process.env.GMAIL_REFRESH_TOKEN && 
                 process.env.EMAIL_USER);
    }

    async sendEmail(to, subject, html) {
        if (!this.gmail || !this.initialized) {
            console.warn('Gmail API not available');
            return { success: false, error: 'Gmail API not configured' };
        }

        try {
            // Create email message
            const message = [
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                `From: "Podcast Stories" <${process.env.EMAIL_USER}>`,
                `To: ${to}`,
                `Subject: ${subject}`,
                '',
                html
            ].join('\n');

            // Encode message
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            // Send email using Gmail API
            const result = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage
                }
            });

            console.log('Email sent successfully via Gmail API:', result.data.id);
            return { success: true, messageId: result.data.id };
        } catch (error) {
            console.error('Failed to send email via Gmail API:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Convenience methods matching the existing emailService interface
    async sendPasswordResetEmail(userEmail, userName, resetToken) {
        const subject = 'Password Reset Request - Podcast Stories';
        const resetUrl = `https://frontend-production-b75b.up.railway.app/reset-password.html?token=${resetToken}`;
        
        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ff6b35; color: white; padding: 20px; text-align: center;">
                <h1>📻 Podcast Stories</h1>
                <h2>Password Reset Request</h2>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
                <p>Hello ${userName},</p>
                
                <p>We received a request to reset your password for your Podcast Stories account.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background: #ff6b35; color: white; padding: 15px 30px; text-decoration: none; 
                              border-radius: 5px; font-weight: bold; display: inline-block;">
                        Reset My Password
                    </a>
                </div>
                
                <p>If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">
                    ${resetUrl}
                </p>
                
                <p>This link will expire in 1 hour for security.</p>
                
                <p>If you didn't request this password reset, you can safely ignore this email.</p>
                
                <p>Best regards,<br>
                The Podcast Stories Team</p>
            </div>
        </div>
        `;

        return await this.sendEmail(userEmail, subject, html);
    }

    async sendTeacherApprovalEmail(teacherEmail, teacherName, username, password) {
        const subject = 'Teacher Account Approved - Podcast Stories';
        
        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ff6b35; color: white; padding: 20px; text-align: center;">
                <h1>📻 Podcast Stories</h1>
                <h2>Welcome, ${teacherName}!</h2>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
                <p>Great news! Your teacher account request has been approved.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #ff6b35;">Your Login Credentials:</h3>
                    <p><strong>Username:</strong> ${username}</p>
                    <p><strong>Password:</strong> ${password}</p>
                    <p><strong>Login URL:</strong> <a href="https://frontend-production-b75b.up.railway.app">https://frontend-production-b75b.up.railway.app</a></p>
                </div>
                
                <p>Welcome to Podcast Stories!<br>
                The Admin Team</p>
            </div>
        </div>
        `;

        return await this.sendEmail(teacherEmail, subject, html);
    }

    async sendTeacherRejectionEmail(teacherEmail, teacherName) {
        const subject = 'Teacher Account Request Update - Podcast Stories';
        
        const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ff6b35; color: white; padding: 20px; text-align: center;">
                <h1>📻 Podcast Stories</h1>
                <h2>Account Request Update</h2>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
                <p>Dear ${teacherName},</p>
                
                <p>Thank you for your interest in Podcast Stories. After reviewing your teacher account request, 
                we are unable to approve it at this time.</p>
                
                <p>If you believe this decision was made in error, please contact your system administrator.</p>
                
                <p>Thank you for your understanding.<br>
                The Admin Team</p>
            </div>
        </div>
        `;

        return await this.sendEmail(teacherEmail, subject, html);
    }
}

module.exports = new GmailService();