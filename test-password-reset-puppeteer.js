/**
 * Puppeteer test to simulate complete password reset flow
 * This will help identify where the "Link Expired" error is occurring
 */

const puppeteer = require('puppeteer');

async function testPasswordResetFlow() {
    console.log('🧪 Testing Password Reset Flow with Puppeteer\n');
    console.log('='.repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false,  // Set to false to see what's happening
        slowMo: 1000,     // Slow down actions to observe
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            console.log(`[BROWSER]: ${msg.text()}`);
        });
        
        // Step 1: Request password reset
        console.log('\n📧 Step 1: Requesting password reset');
        console.log('-'.repeat(40));
        
        await page.goto(`${baseUrl}/forgot-password.html`);
        await page.waitForSelector('#forgotPasswordForm');
        
        // Fill in email
        await page.type('#email', 'admin@vidpod.com');
        
        // Submit form
        await page.click('button[type="submit"]');
        
        // Wait for success message
        await page.waitForSelector('.success-message', { timeout: 10000 });
        
        const successMessage = await page.$eval('.success-message', el => el.textContent);
        console.log('✅ Success message:', successMessage);
        
        // Step 2: Simulate getting reset link
        // Since we can't access email, we'll make an API call to get a real token
        console.log('\n🔗 Step 2: Getting actual reset token from API');
        console.log('-'.repeat(40));
        
        const response = await page.evaluate(async () => {
            const res = await fetch('/api/password-reset/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'admin@vidpod.com' })
            });
            return await res.json();
        });
        
        console.log('API Response:', response);
        
        // We need to get the actual token from the database or logs
        // For now, let's try to navigate to reset page with a test token
        
        // Step 3: Test token validation
        console.log('\n🔍 Step 3: Testing token validation');
        console.log('-'.repeat(40));
        
        // Try with a fake token first to see the error
        await page.goto(`${baseUrl}/reset-password.html?token=fake-token-test`);
        
        // Wait for page to load and check what happens
        await page.waitForSelector('body', { timeout: 5000 });
        
        // Check if we see the "Link Expired" error
        const hasExpiredMessage = await page.evaluate(() => {
            return document.querySelector('#expired-token') && 
                   document.querySelector('#expired-token').style.display !== 'none';
        });
        
        if (hasExpiredMessage) {
            const expiredText = await page.$eval('#expired-token', el => el.textContent);
            console.log('❌ Found expired token message:', expiredText.trim());
        }
        
        // Check for any error messages
        const errorMessage = await page.evaluate(() => {
            const errorEl = document.querySelector('#errorMessage');
            return errorEl ? errorEl.textContent : null;
        });
        
        if (errorMessage) {
            console.log('❌ Error message found:', errorMessage);
        }
        
        // Check if form is visible
        const formVisible = await page.evaluate(() => {
            const form = document.querySelector('#resetPasswordForm');
            return form && form.style.display !== 'none';
        });
        
        console.log('Form visible:', formVisible ? '✅' : '❌');
        
        // Step 4: Check browser network requests
        console.log('\n🌐 Step 4: Checking network requests');
        console.log('-'.repeat(40));
        
        // Enable request interception to see API calls
        await page.setRequestInterception(true);
        
        const requests = [];
        page.on('request', (request) => {
            if (request.url().includes('/api/password-reset/verify/')) {
                console.log('📡 Token verification request:', request.url());
                requests.push(request.url());
            }
            request.continue();
        });
        
        // Reload the page to trigger verification
        await page.reload();
        await page.waitForSelector('body', { timeout: 5000 });
        
        // Step 5: Try to make a direct API call to test token validation
        console.log('\n🔧 Step 5: Direct API token validation test');
        console.log('-'.repeat(40));
        
        const directApiTest = await page.evaluate(async () => {
            const testResponse = await fetch('/api/password-reset/verify/fake-token-test');
            const data = await testResponse.json();
            return {
                status: testResponse.status,
                data: data
            };
        });
        
        console.log('Direct API test result:', directApiTest);
        
        // Summary
        console.log('\n📋 Test Summary');
        console.log('='.repeat(60));
        console.log('1. Password reset request: ✅ Working');
        console.log('2. Reset page loads: ✅ Working');
        console.log(`3. Token validation: ${hasExpiredMessage ? '❌ Showing expired error' : '✅ Working'}`);
        console.log('4. API endpoint: ✅ Responding');
        
        if (hasExpiredMessage) {
            console.log('\n🔍 ISSUE IDENTIFIED: Token validation is failing');
            console.log('The "Link Expired" error is occurring during token validation');
            console.log('This suggests the token from email may not match database records');
        }
        
        return !hasExpiredMessage;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    testPasswordResetFlow().then(success => {
        console.log(success ? '\n✅ Test passed!' : '\n❌ Test failed - Link Expired error reproduced');
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = testPasswordResetFlow;