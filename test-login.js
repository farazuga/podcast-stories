const puppeteer = require('puppeteer');

async function testLogin() {
    const browser = await puppeteer.launch({ 
        headless: true, // Run headless for quick check
        defaultViewport: null
    });
    
    const page = await browser.newPage();
    
    // Test accounts - using actual deployed credentials
    const accounts = [
        { username: 'admin@vidpod.com', password: 'rumi&amaml', role: 'Admin' },
        { username: 'teacher@vidpod.com', password: 'rumi&amaml', role: 'Teacher' },
        { username: 'student@vidpod.com', password: 'rumi&amaml', role: 'Student' }
    ];
    
    try {
        for (const account of accounts) {
            console.log(`\n🧪 Testing ${account.role} login: ${account.username}`);
            
            // Navigate to login page
            console.log(`   Navigating to login page...`);
            await page.goto('https://podcast-stories-production.up.railway.app/', { 
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            
            console.log(`   Page loaded. Checking for login form...`);
            
            // Wait for login form
            await page.waitForSelector('#loginForm', { timeout: 15000 });
            console.log(`   Login form found!`);
            
            // Check current page title and input fields
            const pageTitle = await page.title();
            const inputFields = await page.$$eval('input', inputs => 
                inputs.map(input => ({ 
                    id: input.id, 
                    type: input.type, 
                    placeholder: input.placeholder
                }))
            );
            console.log(`   Page title: ${pageTitle}`);
            console.log(`   Available fields:`, inputFields);
            
            // Clear and fill in credentials using the actual field names  
            await page.click('#email');
            await page.keyboard.down('Control');
            await page.keyboard.press('a');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.type('#email', account.username);
            
            await page.click('#password');
            await page.keyboard.down('Control');
            await page.keyboard.press('a');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.type('#password', account.password);
            
            // Submit form
            await page.click('button[type="submit"]');
            
            // Wait for navigation or error
            try {
                await page.waitForNavigation({ timeout: 5000 });
                
                // Check if we're redirected to dashboard
                const currentUrl = page.url();
                console.log(`✅ Login successful! Redirected to: ${currentUrl}`);
                
                // Check for user info on page
                try {
                    await page.waitForSelector('#userInfo', { timeout: 3000 });
                    const userInfo = await page.$eval('#userInfo', el => el.textContent);
                    console.log(`   User info displayed: ${userInfo}`);
                } catch (e) {
                    console.log(`   Note: User info element not found (might be on different page)`);
                }
                
                // Check for role-specific elements
                if (account.role === 'Admin') {
                    try {
                        await page.waitForSelector('#adminLink', { timeout: 2000 });
                        console.log(`   ✅ Admin link visible`);
                    } catch (e) {
                        console.log(`   ⚠️  Admin link not found`);
                    }
                }
                
                if (account.role === 'Teacher') {
                    try {
                        await page.waitForSelector('#teacherLink', { timeout: 2000 });
                        console.log(`   ✅ Teacher link visible`);
                    } catch (e) {
                        console.log(`   ⚠️  Teacher link not found`);
                    }
                }
                
                // Logout for next test
                try {
                    await page.click('button[onclick="logout()"]');
                    await page.waitForNavigation({ timeout: 3000 });
                    console.log(`   ✅ Logout successful`);
                } catch (e) {
                    console.log(`   ⚠️  Logout button not found or failed`);
                    // Clear localStorage manually
                    await page.evaluate(() => {
                        localStorage.clear();
                    });
                }
                
            } catch (navError) {
                // Check for error message on page
                try {
                    const errorMsg = await page.$eval('.error-message', el => el.textContent);
                    console.log(`❌ Login failed: ${errorMsg}`);
                } catch (e) {
                    console.log(`❌ Login failed: No navigation occurred (possible invalid credentials)`);
                }
            }
            
            // Clear form for next test
            await page.evaluate(() => {
                const emailField = document.getElementById('email');
                const passwordField = document.getElementById('password');
                if (emailField) emailField.value = '';
                if (passwordField) passwordField.value = '';
            });
            
            // Wait a moment between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n🎉 Login testing completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
testLogin().catch(console.error);