# SMTP Email Configuration

## Environment Variables Required

Add these environment variables to your Railway deployment:

### Gmail SMTP Configuration (Recommended)
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

### Alternative SMTP Providers
For other email providers, update the transporter configuration in `/backend/services/emailService.js`:

```javascript
// Example for custom SMTP
this.transporter = nodemailer.createTransporter({
    host: 'smtp.yourdomain.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
```

## Gmail App Password Setup

1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Go to Security → 2-Step Verification → App passwords
   - Select "Mail" as the app
   - Copy the generated 16-character password
   - Use this as `EMAIL_PASS` (not your regular Gmail password)

## Testing Email Functionality

1. Set environment variables in Railway
2. Deploy the application
3. Test password reset:
   - Go to `/forgot-password.html`
   - Enter a valid user email
   - Check email delivery
4. Test teacher approval emails:
   - Submit a teacher request
   - Approve it from admin panel
   - Verify email delivery

## Email Features Implemented

- ✅ Teacher approval notifications with login credentials
- ✅ Teacher rejection notifications
- ✅ Password reset emails with secure tokens
- ✅ HTML email templates with branding
- ✅ Automatic fallback to plain text
- ✅ Error handling and logging

## URLs Used in Emails

All email templates use production URLs:
- Login: `https://frontend-production-b75b.up.railway.app`
- Password Reset: `https://frontend-production-b75b.up.railway.app/reset-password.html?token={token}`

## Security Features

- Reset tokens expire in 1 hour
- Tokens can only be used once
- Email addresses are validated
- Secure password hashing (bcrypt)
- No sensitive data logged in emails