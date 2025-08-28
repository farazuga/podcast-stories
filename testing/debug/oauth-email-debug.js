/**
 * OAuth Email Service Debug Tool
 * Tests OAuth configuration and token refresh for Gmail API
 */

const { google } = require('googleapis');
const puppeteer = require('puppeteer');

class OAuthEmailDebugger {
    constructor() {
        this.baseUrl = 'https://podcast-stories-production.up.railway.app';
        this.adminCredentials = {
            email: 'admin@vidpod.com',
            password: 'vidpod'
        };
        this.oauth2Client = null;
        this.gmail = null;
    }

    async debugOAuthConfig() {
        console.log('🔍 OAuth Configuration Debug\n');
        
        // Check environment variables (we'll need to get these from production)
        const requiredVars = ['EMAIL_USER', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'];
        const envStatus = {};
        
        // We can't access production env vars directly, but we can test if they work
        console.log('📋 Environment Variables Status:');
        requiredVars.forEach(varName => {
            const value = process.env[varName];
            envStatus[varName] = {
                set: !!value,
                length: value ? value.length : 0,
                value: value ? `${value.substring(0, 10)}...` : 'NOT SET'
            };
            console.log(`   ${varName}: ${envStatus[varName].set ? '✅ SET' : '❌ MISSING'} (${envStatus[varName].length} chars)`);
        });
        console.log('');

        return envStatus;
    }

    async testOAuthTokenRefresh() {
        console.log('🔄 Testing OAuth Token Refresh...\n');
        
        try {
            // Initialize OAuth client with production config (if available)
            if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
                console.log('❌ Missing OAuth credentials in local environment');
                console.log('   This test needs to be run with production environment variables');
                console.log('   or by testing the production API directly');
                return { success: false, error: 'Missing OAuth credentials' };
            }

            this.oauth2Client = new google.auth.OAuth2(
                process.env.GMAIL_CLIENT_ID,
                process.env.GMAIL_CLIENT_SECRET,
                'https://developers.google.com/oauthplayground'
            );

            this.oauth2Client.setCredentials({
                refresh_token: process.env.GMAIL_REFRESH_TOKEN
            });

            // Test token refresh
            console.log('🔑 Testing token refresh...');
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            console.log('✅ Token refresh successful');
            console.log(`   Access token expires: ${new Date(credentials.expiry_date)}`);
            console.log(`   Token type: ${credentials.token_type}`);
            console.log('');

            // Test Gmail API access
            console.log('📧 Testing Gmail API access...');
            this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
            
            const profile = await this.gmail.users.getProfile({ userId: 'me' });
            console.log('✅ Gmail API access successful');
            console.log(`   Email: ${profile.data.emailAddress}`);
            console.log(`   Messages total: ${profile.data.messagesTotal}`);
            console.log('');

            return { 
                success: true, 
                profile: profile.data,
                credentials: {
                    expires: new Date(credentials.expiry_date),
                    type: credentials.token_type
                }
            };

        } catch (error) {
            console.log('❌ OAuth test failed:');
            console.log(`   Error: ${error.message}`);
            if (error.code) {
                console.log(`   Code: ${error.code}`);
            }
            if (error.response && error.response.data) {
                console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            console.log('');
            
            return { success: false, error: error.message, details: error };
        }
    }

    async testProductionEmailService() {
        console.log('🌐 Testing Production Email Service...\n');

        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: { width: 1200, height: 800 }
        });
        
        try {
            const page = await browser.newPage();
            
            // Login as admin
            console.log('🔐 Logging in as admin...');
            await page.goto(`${this.baseUrl}/index.html`);
            await page.waitForSelector('#email');
            
            await page.type('#email', this.adminCredentials.email);
            await page.type('#password', this.adminCredentials.password);
            await page.click('button[type="submit"]');
            await page.waitForNavigation();
            
            const isLoggedIn = page.url().includes('admin.html');
            if (!isLoggedIn) {
                throw new Error('Failed to login as admin');
            }
            console.log('✅ Admin login successful');

            // Test email service by creating a test teacher request and approving it
            console.log('📝 Creating test teacher request...');
            
            const testEmail = `test.oauth.debug.${Date.now()}@example.com`;
            
            // Navigate to teacher registration (in new tab to keep admin session)
            const teacherPage = await browser.newPage();
            await teacherPage.goto(`${this.baseUrl}/register-teacher.html`);
            await teacherPage.waitForSelector('#first_name');
            
            // Fill teacher form
            await teacherPage.type('#first_name', 'OAuth');
            await teacherPage.type('#last_name', 'TestTeacher');
            await teacherPage.type('#email', testEmail);
            await teacherPage.type('#message', 'OAuth debug test request');
            
            // Select first available school
            const schoolOptions = await teacherPage.$$eval('#school_id option', options => 
                options.map(option => ({ value: option.value, text: option.textContent }))
            );
            const validSchool = schoolOptions.find(opt => opt.value && opt.value !== '' && !opt.text.includes('Select'));
            
            if (!validSchool) {
                throw new Error('No valid schools found');
            }
            
            await teacherPage.select('#school_id', validSchool.value);
            console.log(`   Selected school: ${validSchool.text}`);
            
            // Submit teacher request
            await teacherPage.click('button[type="submit"]');
            await teacherPage.waitForTimeout(2000); // Wait for submission
            console.log('✅ Teacher request submitted');
            
            await teacherPage.close();
            
            // Back to admin page to approve the request
            console.log('👥 Navigating to teacher requests...');
            await page.goto(`${this.baseUrl}/admin.html`);
            await page.waitForTimeout(2000);
            
            // Click teachers tab
            await page.evaluate(() => {
                window.showTab('teachers');
            });
            await page.waitForTimeout(3000);
            
            // Look for our test request and approve it
            const requestRows = await page.$$('.teacher-request-row, tr');
            console.log(`   Found ${requestRows.length} request rows`);
            
            let foundTestRequest = false;
            for (const row of requestRows) {
                const rowText = await row.evaluate(el => el.textContent);
                if (rowText && rowText.includes(testEmail)) {
                    console.log('✅ Found test teacher request');
                    foundTestRequest = true;
                    
                    // Try to find and click approve button
                    const approveBtn = await row.$('button[onclick*="approve"], .approve-btn, button:contains("Approve")');
                    if (approveBtn) {
                        console.log('🎯 Clicking approve button...');
                        await approveBtn.click();
                        await page.waitForTimeout(3000);
                        
                        // Check for success/error messages
                        const messages = await page.evaluate(() => {
                            const alerts = Array.from(document.querySelectorAll('.alert, .message, .notification'));
                            return alerts.map(alert => ({
                                text: alert.textContent,
                                className: alert.className
                            }));
                        });
                        
                        console.log('📨 Email Service Result:');
                        if (messages.length > 0) {
                            messages.forEach(msg => {
                                console.log(`   Message: ${msg.text}`);
                                console.log(`   Class: ${msg.className}`);
                            });
                        } else {
                            console.log('   No UI feedback messages found');
                        }
                        
                        return { 
                            success: true, 
                            testEmail, 
                            messages,
                            note: 'Check server logs for detailed email sending results'
                        };
                    }
                    break;
                }
            }
            
            if (!foundTestRequest) {
                console.log('❌ Test teacher request not found in admin panel');
                console.log('   This might indicate the 500 error is still occurring');
                return { success: false, error: 'Test request not found in admin panel' };
            }
            
        } catch (error) {
            console.log('❌ Production email test failed:', error.message);
            return { success: false, error: error.message };
        } finally {
            await browser.close();
        }
    }

    async runFullDiagnosis() {
        console.log('🚀 OAuth Email Service Full Diagnosis\n');
        console.log('='*50 + '\n');
        
        const results = {
            configCheck: null,
            tokenTest: null,
            productionTest: null
        };
        
        // Step 1: Check configuration
        results.configCheck = await this.debugOAuthConfig();
        
        // Step 2: Test token refresh (only if we have local env vars)
        results.tokenTest = await this.testOAuthTokenRefresh();
        
        // Step 3: Test production service
        results.productionTest = await this.testProductionEmailService();
        
        // Summary
        console.log('\n' + '='*50);
        console.log('📋 DIAGNOSIS SUMMARY\n');
        
        console.log('Configuration:', results.configCheck ? '✅ Variables present' : '❌ Missing variables');
        console.log('Token Refresh:', results.tokenTest?.success ? '✅ Working' : '❌ Failed');
        console.log('Production Test:', results.productionTest?.success ? '✅ Working' : '❌ Failed');
        
        if (!results.tokenTest?.success || !results.productionTest?.success) {
            console.log('\n🔧 TROUBLESHOOTING RECOMMENDATIONS:');
            
            if (!results.tokenTest?.success) {
                console.log('1. Verify Gmail OAuth setup:');
                console.log('   - Check Google Cloud Console project');
                console.log('   - Verify OAuth consent screen is configured');
                console.log('   - Ensure Gmail API is enabled');
                console.log('   - Regenerate refresh token if needed');
            }
            
            if (!results.productionTest?.success) {
                console.log('2. Check Railway environment variables:');
                console.log('   - All OAuth variables are set correctly');
                console.log('   - No extra spaces or special characters');
                console.log('   - EMAIL_USER matches the OAuth account');
            }
            
            console.log('3. Alternative: Switch to App Password method');
            console.log('   - Remove OAuth variables');
            console.log('   - Add EMAIL_PASS with Gmail app password');
        }
        
        return results;
    }
}

// Run diagnosis if called directly
if (require.main === module) {
    const debugger = new OAuthEmailDebugger();
    debugger.runFullDiagnosis().catch(console.error);
}

module.exports = OAuthEmailDebugger;