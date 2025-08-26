const puppeteer = require('puppeteer');

async function debugTokenIssue() {
    console.log('🔧 Debugging Token Persistence Issue...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 200,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => console.log(`📄 PAGE:`, msg.text()));
        page.on('error', err => console.log(`❌ ERROR:`, err.message));
        
        // Navigate to login
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        console.log('🔐 Logging in...');
        
        // Login
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        // Wait for potential redirect
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔍 Checking token immediately after login...');
        
        const tokenCheckResult = await page.evaluate(() => {
            return {
                url: window.location.href,
                token: localStorage.getItem('token'),
                user: localStorage.getItem('user'),
                allKeys: Object.keys(localStorage),
                tokenLength: localStorage.getItem('token') ? localStorage.getItem('token').length : 0
            };
        });
        
        console.log('📊 Token Status:', tokenCheckResult);
        
        // Wait a bit more and check again
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔍 Checking token after 3 second delay...');
        
        const tokenCheckResult2 = await page.evaluate(() => {
            return {
                url: window.location.href,
                token: localStorage.getItem('token'),
                user: localStorage.getItem('user'),
                allKeys: Object.keys(localStorage),
                tokenLength: localStorage.getItem('token') ? localStorage.getItem('token').length : 0
            };
        });
        
        console.log('📊 Token Status After Delay:', tokenCheckResult2);
        
        // Try to manually go to admin page
        console.log('🏛️ Manually navigating to admin page...');
        
        await page.goto('https://podcast-stories-production.up.railway.app/admin.html', {
            waitUntil: 'networkidle2'
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔍 Checking token after manual admin navigation...');
        
        const tokenCheckResult3 = await page.evaluate(() => {
            return {
                url: window.location.href,
                token: localStorage.getItem('token'),
                user: localStorage.getItem('user'),
                allKeys: Object.keys(localStorage),
                tokenLength: localStorage.getItem('token') ? localStorage.getItem('token').length : 0,
                allStorageData: {...localStorage}
            };
        });
        
        console.log('📊 Final Token Status:', tokenCheckResult3);
        
        // Check if any JavaScript functions are interfering
        const jsCheck = await page.evaluate(() => {
            return {
                authJsLoaded: typeof window.API_URL !== 'undefined',
                checkAuthFunction: typeof checkAuth !== 'undefined',
                logoutFunction: typeof logout !== 'undefined'
            };
        });
        
        console.log('📜 JavaScript Status:', jsCheck);
        
        // Take screenshot
        await page.screenshot({ path: 'token-debug.png', fullPage: true });
        console.log('📸 Debug screenshot saved: token-debug.png');
        
    } catch (error) {
        console.error('🚨 Debug failed:', error.message);
    } finally {
        await browser.close();
    }
}

debugTokenIssue().catch(console.error);