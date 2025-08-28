/**
 * Quick OAuth Email Production Test
 * Tests if OAuth is working by submitting and approving a teacher request
 */

const puppeteer = require('puppeteer');

class OAuthProductionChecker {
    constructor() {
        this.baseUrl = 'https://podcast-stories-production.up.railway.app';
        this.browser = null;
        this.page = null;
    }

    async init() {
        this.browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: { width: 1400, height: 900 }
        });
        this.page = await this.browser.newPage();

        // Listen for console messages to catch email service logs
        this.page.on('console', (msg) => {
            if (msg.text().includes('email') || msg.text().includes('OAuth') || msg.text().includes('Gmail')) {
                console.log('🖥️  Browser Console:', msg.text());
            }
        });

        // Listen for network requests to catch API responses
        this.page.on('response', async (response) => {
            if (response.url().includes('/teacher-requests') && response.request().method() === 'POST') {
                try {
                    const responseData = await response.json();
                    console.log('📡 Teacher Request API Response:', {
                        status: response.status(),
                        url: response.url(),
                        data: responseData
                    });
                } catch (error) {
                    console.log('📡 Teacher Request API Response (non-JSON):', {
                        status: response.status(),
                        url: response.url(),
                        statusText: response.statusText()
                    });
                }
            }
        });
    }

    async loginAsAdmin() {
        console.log('🔐 Logging in as admin...');
        
        await this.page.goto(`${this.baseUrl}/index.html`);
        await this.page.waitForSelector('#email', { timeout: 10000 });
        
        await this.page.type('#email', 'admin@vidpod.com');
        await this.page.type('#password', 'vidpod');
        await this.page.click('button[type="submit"]');
        
        try {
            await this.page.waitForNavigation({ timeout: 10000 });
            const currentUrl = this.page.url();
            
            if (currentUrl.includes('admin.html')) {
                console.log('✅ Admin login successful');
                return true;
            } else {
                console.log('❌ Login failed - redirected to:', currentUrl);
                return false;
            }
        } catch (error) {
            console.log('❌ Login timeout or navigation error:', error.message);
            return false;
        }
    }

    async submitTestTeacherRequest() {
        console.log('📝 Submitting test teacher request...');
        
        const testEmail = `oauth.test.${Date.now()}@example.com`;
        console.log('   Test email:', testEmail);
        
        // Open teacher registration in new tab
        const teacherPage = await this.browser.newPage();
        
        try {
            await teacherPage.goto(`${this.baseUrl}/register-teacher.html`);
            await teacherPage.waitForSelector('#first_name', { timeout: 10000 });
            
            // Fill the form
            await teacherPage.type('#first_name', 'OAuth');
            await teacherPage.type('#last_name', 'TestUser');
            await teacherPage.type('#email', testEmail);
            await teacherPage.type('#message', 'OAuth email service test');
            
            // Select first available school
            const schoolSelected = await teacherPage.evaluate(() => {
                const schoolSelect = document.querySelector('#school_id');
                if (!schoolSelect) return false;
                
                const options = schoolSelect.querySelectorAll('option');
                for (let option of options) {
                    if (option.value && option.value !== '' && !option.textContent.includes('Select')) {
                        schoolSelect.value = option.value;
                        return { value: option.value, text: option.textContent };
                    }
                }
                return false;
            });
            
            if (!schoolSelected) {
                throw new Error('No valid schools found');
            }
            
            console.log(`   Selected school: ${schoolSelected.text}`);
            
            // Submit the form
            await teacherPage.click('button[type="submit"]');
            await teacherPage.waitForTimeout(3000);
            
            // Check for success message
            const messages = await teacherPage.evaluate(() => {
                const alerts = Array.from(document.querySelectorAll('.alert, .message, .success, .error'));
                return alerts.map(el => ({
                    text: el.textContent.trim(),
                    className: el.className
                }));
            });
            
            console.log('✅ Teacher request submitted');
            if (messages.length > 0) {
                console.log('   Messages:', messages);
            }
            
            await teacherPage.close();
            return { success: true, testEmail, messages };
            
        } catch (error) {
            await teacherPage.close();
            throw error;
        }
    }

    async approveTeacherRequest(testEmail) {
        console.log('👥 Approving teacher request...');
        
        // Navigate to admin teacher requests
        await this.page.goto(`${this.baseUrl}/admin.html`);
        await this.page.waitForTimeout(2000);
        
        // Click teachers tab
        console.log('   Clicking teachers tab...');
        await this.page.evaluate(() => {
            if (typeof window.showTab === 'function') {
                window.showTab('teachers');
            } else {
                console.error('showTab function not available');
            }
        });
        
        await this.page.waitForTimeout(5000); // Wait for data to load
        
        // Look for the test request
        console.log('   Looking for test request...');
        const requestFound = await this.page.evaluate((email) => {
            // Look for the email in the page content
            const pageText = document.body.textContent || document.body.innerText || '';
            return pageText.includes(email);
        }, testEmail);
        
        if (!requestFound) {
            console.log('❌ Test request not found in admin panel');
            console.log('   This suggests the 500 error is still occurring');
            
            // Check for error messages
            const errorMessages = await this.page.evaluate(() => {
                const errors = Array.from(document.querySelectorAll('.error, .alert-danger, [class*="error"]'));
                return errors.map(el => el.textContent.trim()).filter(text => text.length > 0);
            });
            
            if (errorMessages.length > 0) {
                console.log('   Error messages found:', errorMessages);
            }
            
            return { success: false, error: 'Request not found in admin panel' };
        }
        
        console.log('✅ Test request found in admin panel');
        
        // Try to find and click approve button
        const approvalResult = await this.page.evaluate((email) => {
            // Look for table rows containing the email
            const rows = Array.from(document.querySelectorAll('tr, .request-row'));
            let targetRow = null;
            
            for (const row of rows) {
                if (row.textContent && row.textContent.includes(email)) {
                    targetRow = row;
                    break;
                }
            }
            
            if (!targetRow) {
                return { success: false, error: 'Could not find row with email' };
            }
            
            // Look for approve button in that row
            const approveButtons = targetRow.querySelectorAll('button, a, [onclick]');
            let approveBtn = null;
            
            for (const btn of approveButtons) {
                const btnText = btn.textContent || btn.title || btn.getAttribute('title') || '';
                const onClick = btn.getAttribute('onclick') || '';
                
                if (btnText.toLowerCase().includes('approve') || onClick.includes('approve')) {
                    approveBtn = btn;
                    break;
                }
            }
            
            if (!approveBtn) {
                return { success: false, error: 'Could not find approve button' };
            }
            
            // Click the approve button
            approveBtn.click();
            return { success: true, buttonText: approveBtn.textContent };
            
        }, testEmail);
        
        if (!approvalResult.success) {
            console.log('❌ Could not approve request:', approvalResult.error);
            return approvalResult;
        }
        
        console.log('🎯 Clicked approve button');
        await this.page.waitForTimeout(5000); // Wait for approval to process
        
        // Check for success/error messages about email sending
        const emailResults = await this.page.evaluate(() => {
            const messages = Array.from(document.querySelectorAll('.alert, .message, .notification, .success, .error'));
            return messages.map(el => ({
                text: el.textContent.trim(),
                className: el.className,
                style: el.style.display
            })).filter(msg => msg.text.length > 0);
        });
        
        console.log('📧 Email Service Results:');
        if (emailResults.length > 0) {
            emailResults.forEach(msg => {
                console.log(`   ${msg.className.includes('success') ? '✅' : '⚠️'} ${msg.text}`);
            });
        } else {
            console.log('   No visible feedback about email sending');
        }
        
        return { 
            success: true, 
            emailResults,
            note: 'Check Railway logs for detailed email service information'
        };
    }

    async runOAuthTest() {
        try {
            await this.init();
            
            console.log('🚀 OAuth Email Service Production Test\n');
            console.log('='*50 + '\n');
            
            // Step 1: Login as admin
            const loginSuccess = await this.loginAsAdmin();
            if (!loginSuccess) {
                throw new Error('Failed to login as admin');
            }
            
            // Step 2: Submit test teacher request
            const submission = await this.submitTestTeacherRequest();
            if (!submission.success) {
                throw new Error('Failed to submit teacher request');
            }
            
            // Step 3: Approve the request (this triggers email sending)
            const approval = await this.approveTeacherRequest(submission.testEmail);
            
            // Results summary
            console.log('\n' + '='*50);
            console.log('📋 OAUTH EMAIL TEST RESULTS\n');
            
            console.log('Teacher Request Submission:', submission.success ? '✅ SUCCESS' : '❌ FAILED');
            console.log('Admin Panel Access:', '✅ SUCCESS');
            console.log('Request Approval:', approval.success ? '✅ SUCCESS' : '❌ FAILED');
            
            if (approval.emailResults && approval.emailResults.length > 0) {
                console.log('\nEmail Service Feedback:');
                approval.emailResults.forEach(result => {
                    const status = result.text.toLowerCase().includes('error') || result.text.toLowerCase().includes('failed') ? '❌' : '✅';
                    console.log(`   ${status} ${result.text}`);
                });
            }
            
            console.log('\n🔍 NEXT STEPS:');
            console.log('1. Check Railway application logs for detailed email service messages');
            console.log('2. Look for OAuth token refresh errors or Gmail API failures');
            console.log('3. Verify that the teacher received the invitation email');
            console.log(`4. Test email: ${submission.testEmail}`);
            
            console.log('\n📝 Railway Log Commands:');
            console.log('   railway logs --follow');
            console.log('   Or check Railway dashboard → your service → Logs tab');
            
            return {
                submissionSuccess: submission.success,
                approvalSuccess: approval.success,
                testEmail: submission.testEmail,
                emailResults: approval.emailResults
            };
            
        } catch (error) {
            console.log('❌ Test failed:', error.message);
            return { success: false, error: error.message };
        } finally {
            if (this.browser) {
                console.log('\n👀 Browser kept open for manual inspection');
                console.log('   Press Ctrl+C to close when done inspecting');
                // Keep browser open for inspection
            }
        }
    }
}

// Run test if called directly
if (require.main === module) {
    const checker = new OAuthProductionChecker();
    
    // Handle cleanup on Ctrl+C
    process.on('SIGINT', async () => {
        console.log('\n👋 Cleaning up...');
        if (checker.browser) {
            await checker.browser.close();
        }
        process.exit();
    });
    
    checker.runOAuthTest().catch(console.error);
}

module.exports = OAuthProductionChecker;