const puppeteer = require('puppeteer');

async function testAdminLogin() {
    console.log('🔍 Testing Admin Login with Puppeteer...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Show browser for debugging
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1280, height: 720 });
        
        // Enable console logging from the page
        page.on('console', msg => console.log(`📄 PAGE LOG:`, msg.text()));
        page.on('error', err => console.log(`❌ PAGE ERROR:`, err.message));
        page.on('pageerror', err => console.log(`🚨 PAGE SCRIPT ERROR:`, err.message));
        
        console.log('🌐 Navigating to login page...');
        
        // Navigate to login page
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        console.log('📋 Page loaded, checking form elements...');
        
        // Take screenshot of login page
        await page.screenshot({ path: 'login-page.png', fullPage: true });
        console.log('📸 Screenshot saved: login-page.png');
        
        // Check if login form exists
        const emailInput = await page.$('#email');
        const passwordInput = await page.$('#password');
        const loginButton = await page.$('button[type="submit"]');
        
        if (!emailInput || !passwordInput || !loginButton) {
            console.log('❌ Login form elements not found!');
            console.log('Email input:', !!emailInput);
            console.log('Password input:', !!passwordInput);
            console.log('Login button:', !!loginButton);
            return;
        }
        
        console.log('✅ Login form elements found');
        
        // Fill in admin credentials
        console.log('📝 Filling in admin credentials...');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🔐 Submitting login form...');
        
        // Submit form and wait for navigation
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
            page.click('button[type="submit"]')
        ]);
        
        console.log('🔄 Login submitted, checking current URL...');
        
        const currentUrl = page.url();
        console.log('📍 Current URL:', currentUrl);
        
        // Check for error messages
        const errorMessage = await page.$('.error-message');
        if (errorMessage) {
            const errorText = await page.evaluate(el => el.textContent, errorMessage);
            console.log('❌ Error message found:', errorText);
        }
        
        // Check localStorage for token and user data
        const token = await page.evaluate(() => localStorage.getItem('token'));
        const user = await page.evaluate(() => localStorage.getItem('user'));
        
        console.log('🔑 Token in localStorage:', token ? 'Present' : 'Missing');
        console.log('👤 User in localStorage:', user ? JSON.parse(user) : 'Missing');
        
        // Take screenshot after login attempt
        await page.screenshot({ path: 'after-login.png', fullPage: true });
        console.log('📸 Screenshot saved: after-login.png');
        
        // Try to navigate directly to admin page
        console.log('🏛️ Attempting to navigate to admin page...');
        await page.goto('https://podcast-stories-production.up.railway.app/admin.html', {
            waitUntil: 'networkidle2',
            timeout: 10000
        });
        
        const adminUrl = page.url();
        console.log('📍 Admin page URL:', adminUrl);
        
        // Check if we're redirected back to login
        if (adminUrl.includes('index.html') || adminUrl === 'https://podcast-stories-production.up.railway.app/') {
            console.log('❌ Redirected back to login - authentication failed');
        } else {
            console.log('✅ Successfully reached admin page');
        }
        
        // Check for navigation on admin page
        const navigation = await page.$('nav');
        const navigationComment = await page.evaluate(() => {
            return document.documentElement.innerHTML.includes('Navigation will auto-load here');
        });
        
        console.log('🧭 Static navigation found:', !!navigation);
        console.log('🧭 Unified navigation comment found:', navigationComment);
        
        // Check if navigation.js is loaded
        const navigationScript = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script'));
            return scripts.some(script => script.src && script.src.includes('navigation.js'));
        });
        
        console.log('📜 Navigation.js script loaded:', navigationScript);
        
        // Take final screenshot
        await page.screenshot({ path: 'admin-page.png', fullPage: true });
        console.log('📸 Screenshot saved: admin-page.png');
        
        // Test API connectivity
        console.log('🔌 Testing API connectivity...');
        
        const apiResponse = await page.evaluate(async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                return {
                    status: response.status,
                    ok: response.ok,
                    data: await response.text()
                };
            } catch (error) {
                return {
                    error: error.message
                };
            }
        });
        
        console.log('🔌 API Response:', apiResponse);
        
    } catch (error) {
        console.error('🚨 Test failed:', error.message);
        try {
            const page = await browser.newPage();
            await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
            console.log('📸 Error screenshot saved: error-screenshot.png');
        } catch (screenshotError) {
            console.log('Could not take error screenshot');
        }
    } finally {
        console.log('🏁 Closing browser...');
        await browser.close();
    }
}

// Run the test
testAdminLogin().catch(console.error);