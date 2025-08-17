# Gmail OAuth2 Setup Guide

## 🎯 Choose Your Authentication Method

The email service now supports **both OAuth2 and App Passwords**. OAuth2 is more secure and recommended.

---

## 🔐 Option 1: OAuth2 Setup (Recommended)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name: `Podcast Stories Email` 
4. Click **Create**

### Step 2: Enable Gmail API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Gmail API** → **Enable**

### Step 3: Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. If prompted, configure **OAuth consent screen**:
   - User Type: **External**
   - App name: `Podcast Stories`
   - User support email: your email
   - Developer contact: your email
   - Add scope: `https://www.googleapis.com/auth/gmail.send`
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Podcast Stories Email`
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
5. **Copy Client ID and Client Secret**

### Step 4: Get Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Click the **Settings gear** (top right)
3. Check **Use your own OAuth credentials**
4. Enter your **Client ID** and **Client Secret**
5. In left panel, expand **Gmail API v1**
6. Select: `https://www.googleapis.com/auth/gmail.send`
7. Click **Authorize APIs**
8. Sign in with your Gmail account
9. Click **Exchange authorization code for tokens**
10. **Copy the Refresh Token**

### Step 5: Add Environment Variables to Railway

Add these to your **backend** Railway service:

```env
# Gmail OAuth2 Configuration (Recommended)
EMAIL_USER=your-email@gmail.com
GMAIL_CLIENT_ID=your-client-id.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
```

---

## 🔑 Option 2: App Password Setup (Simpler)

If you prefer the simpler approach:

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**

### Step 2: Generate App Password
1. Go to **Security** → **2-Step Verification** → **App passwords**
2. Select **Mail** → Generate
3. Copy the 16-character password

### Step 3: Add Environment Variables to Railway

```env
# Gmail App Password Configuration (Simpler)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

---

## 🚀 Deployment & Testing

### Priority Order:
1. **OAuth2 credentials** (if present) - more secure
2. **App password** (fallback) - simpler setup
3. **Disabled** (if neither) - graceful fallback

### Test After Setup:
```bash
# Test password reset
curl -X POST https://podcast-stories-production.up.railway.app/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## 🔧 Troubleshooting

### OAuth2 Issues:
- **"invalid_grant"**: Refresh token expired, regenerate it
- **"unauthorized_client"**: Check Client ID/Secret
- **"access_denied"**: Check OAuth consent screen setup

### App Password Issues:
- **"invalid_login"**: Ensure 2FA is enabled
- **"less_secure_apps"**: Use app password, not regular password

### General Issues:
- Check Railway logs for specific error messages
- Verify environment variables are set correctly
- Test with both authentication methods

---

## 📧 Email Features Available:

✅ **Teacher approval emails** with login credentials  
✅ **Teacher rejection notifications**  
✅ **Password reset emails** with secure tokens  
✅ **Automatic fallback** between authentication methods  
✅ **Production-ready** error handling  

---

## 🛡️ Security Benefits of OAuth2:

- **No static passwords** in environment variables
- **Automatic token refresh** prevents expiration issues  
- **Granular permissions** (only send email access)
- **Easy revocation** through Google Cloud Console
- **Audit trail** of API usage
- **Google's recommended approach** for production apps

Choose OAuth2 for maximum security, or App Password for simplicity!