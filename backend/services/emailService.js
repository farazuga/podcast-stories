const nodemailer = require('nodemailer');
const { google } = require('googleapis');

class EmailService {
    constructor() {
        this.transporter = null;
        this.oauth2Client = null;
        this.initialized = false;
        this.initializeTransporter();
    }

    async initializeTransporter() {
        try {
            // Check if OAuth credentials are provided
            if (this.hasOAuthCredentials()) {
                console.log('Initializing email service with OAuth2...');
                await this.initializeOAuth();
            } else if (this.hasAppPasswordCredentials()) {
                console.log('Initializing email service with app password...');
                this.initializeAppPassword();
            } else {
                console.warn('No email credentials configured. Email functionality will be disabled.');
                this.transporter = null;
                return;
            }

            // Skip verification for OAuth to avoid authentication issues
            if (this.transporter) {
                if (this.hasOAuthCredentials()) {
                    console.log('OAuth2 email service configured (skipping verification)');
                    this.initialized = true;
                } else {
                    // Only verify for app password
                    this.transporter.verify((error, success) => {
                        if (error) {
                            console.error('Email configuration error:', error);
                            this.transporter = null;
                            this.initialized = false;
                        } else {
                            console.log('Email service ready');
                            this.initialized = true;
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Failed to initialize email service:', error);
            this.transporter = null;
        }
    }

    hasOAuthCredentials() {
        return !!(process.env.GMAIL_CLIENT_ID && 
                 process.env.GMAIL_CLIENT_SECRET && 
                 process.env.GMAIL_REFRESH_TOKEN && 
                 process.env.EMAIL_USER);
    }

    hasAppPasswordCredentials() {
        return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    }

    async initializeOAuth() {
        try {
            console.log('Initializing OAuth2 with user:', process.env.EMAIL_USER);
            
            this.oauth2Client = new google.auth.OAuth2(
                process.env.GMAIL_CLIENT_ID,
                process.env.GMAIL_CLIENT_SECRET,
                'https://developers.google.com/oauthplayground' // Redirect URL
            );

            this.oauth2Client.setCredentials({
                refresh_token: process.env.GMAIL_REFRESH_TOKEN
            });

            // Get access token
            console.log('Getting OAuth2 access token...');
            const accessToken = await this.oauth2Client.getAccessToken();
            
            if (!accessToken.token) {
                throw new Error('Failed to get access token');
            }

            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.EMAIL_USER,
                    clientId: process.env.GMAIL_CLIENT_ID,
                    clientSecret: process.env.GMAIL_CLIENT_SECRET,
                    refreshToken: process.env.GMAIL_REFRESH_TOKEN
                }
            });

            console.log('OAuth2 email service initialized successfully');
            this.initialized = true;
        } catch (error) {
            console.error('OAuth2 initialization failed:', error.message);
            console.error('Full error:', error);
            
            // Fallback to app password if available
            if (this.hasAppPasswordCredentials()) {
                console.log('Falling back to app password authentication...');
                this.initializeAppPassword();
            } else {
                throw error;
            }
        }
    }

    initializeAppPassword() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        console.log('App password email service initialized successfully');
        this.initialized = true;
    }

    async sendEmail(to, subject, html, text = null) {
        // Wait for initialization if not ready
        if (!this.initialized && this.transporter) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (!this.transporter) {
            console.warn('Email service not available');
            return { success: false, error: 'Email service not configured' };
        }

        try {
            const mailOptions = {
                from: `"Podcast Stories" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: subject,
                html: html,
                text: text || this.stripHtml(html)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', result.messageId);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('Failed to send email:', error);
            return { success: false, error: error.message };
        }
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '');
    }

    // Teacher approval notification with auto-generated password
    async sendTeacherApprovalEmail(teacherEmail, teacherName, loginEmail, invitationUrl) {
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
                    <h3 style="color: #ff6b35;">Complete Your Account Setup:</h3>
                    <p>Please click the link below to set your password and activate your account:</p>
                    <p style="margin: 20px 0;"><a href="${invitationUrl}" style="background: #ff6b35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">Set Your Password</a></p>
                    <p><small>This link will expire in 7 days for security reasons.</small></p>
                    <p><strong>Your login email:</strong> ${loginEmail}</p>
                </div>
                
                <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #0066cc; margin-top: 0;">About Your Password:</h4>
                    <ul style="margin-bottom: 0;">
                        <li>Generated using kid-friendly words for easy memorization</li>
                        <li>Includes numbers for security</li>
                        <li>Please change it after your first login for personalization</li>
                        <li>Make note of it now as this email is the only time it will be shown</li>
                    </ul>
                </div>
                
                <div style="background: #e6f4ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4>Getting Started:</h4>
                    <ol>
                        <li>Login with your email address and password above</li>
                        <li>Navigate to "My Classes" to create your first class</li>
                        <li>Share the 4-digit class code with your students</li>
                        <li>Start managing podcast story ideas with your class!</li>
                    </ol>
                </div>
                
                <p style="color: #666; font-size: 0.9em;">
                    <strong>Security Note:</strong> Your password was auto-generated for security. We recommend changing it after your first login to something personal and memorable.
                </p>
                
                <p>If you have any questions, please contact your system administrator.</p>
                
                <p>Welcome to Podcast Stories!<br>
                The Admin Team</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #666; font-size: 0.8em;">
                <p>This is an automated message from Podcast Stories.<br>
                Please do not reply to this email.</p>
            </div>
        </div>
        `;

        return await this.sendEmail(teacherEmail, subject, html);
    }

    // Teacher rejection notification
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
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>What you can do:</strong></p>
                    <ul>
                        <li>Contact your school administrator for assistance</li>
                        <li>Verify your school email address and affiliation</li>
                        <li>Submit a new request with additional information</li>
                    </ul>
                </div>
                
                <p>If you believe this decision was made in error, please contact your system administrator 
                with additional verification of your teaching credentials.</p>
                
                <p>Thank you for your understanding.<br>
                The Admin Team</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #666; font-size: 0.8em;">
                <p>This is an automated message from Podcast Stories.<br>
                Please do not reply to this email.</p>
            </div>
        </div>
        `;

        return await this.sendEmail(teacherEmail, subject, html);
    }

    // Password reset email
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
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Security Information:</strong></p>
                    <ul>
                        <li>This link will expire in 1 hour</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your current password remains unchanged until you complete the reset</li>
                    </ul>
                </div>
                
                <p>If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">
                    ${resetUrl}
                </p>
                
                <p>If you didn't request this password reset, you can safely ignore this email.</p>
                
                <p>Best regards,<br>
                The Podcast Stories Team</p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #666; font-size: 0.8em;">
                <p>This is an automated message from Podcast Stories.<br>
                Please do not reply to this email.</p>
            </div>
        </div>
        `;

        return await this.sendEmail(userEmail, subject, html);
    }
}

module.exports = new EmailService();