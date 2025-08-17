// Test OAuth Token Generation
const { google } = require('googleapis');

async function testOAuthToken() {
    console.log('🔍 Testing OAuth Token Generation...\n');
    
    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID || 'YOUR_CLIENT_ID',
        process.env.GMAIL_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
        'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN'
    });

    try {
        console.log('🔄 Attempting to get access token...');
        const accessToken = await oauth2Client.getAccessToken();
        console.log('✅ Access token generated successfully!');
        console.log('Token:', accessToken.token ? 'Valid' : 'Invalid');
        
        // Test Gmail API access
        console.log('\n📧 Testing Gmail API access...');
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        console.log('✅ Gmail API access successful!');
        console.log('Email:', profile.data.emailAddress);
        
    } catch (error) {
        console.log('❌ OAuth token generation failed:');
        console.log('Error:', error.message);
        
        if (error.message.includes('invalid_grant')) {
            console.log('\n🔧 Fix: Refresh token expired. Need to regenerate it.');
        } else if (error.message.includes('unauthorized_client')) {
            console.log('\n🔧 Fix: Check client ID/secret configuration.');
        } else if (error.message.includes('insufficient_scope')) {
            console.log('\n🔧 Fix: Need to add gmail.send scope.');
        }
    }
}

testOAuthToken();