const puppeteer = require('puppeteer');

async function finalAdminVerificationTest() {
    console.log('🔎 Final Admin Login Verification Test');
    console.log('=====================================');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 50,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.text().includes('🔧') || msg.text().includes('✅') || msg.text().includes('❌')) {
                console.log(`📄 ${msg.text()}`);
            }
        });
        
        console.log('1️⃣ Testing admin login flow...');
        
        // Navigate to login
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        // Login
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        // Wait for redirect and admin page load
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('2️⃣ Checking authentication status...');
        
        const authStatus = await page.evaluate(() => {
            return {
                url: window.location.href,
                hasToken: !!localStorage.getItem('token'),
                hasUser: !!localStorage.getItem('user'),
                tokenLength: localStorage.getItem('token') ? localStorage.getItem('token').length : 0
            };
        });
        
        console.log(`📍 Current URL: ${authStatus.url}`);
        console.log(`🔑 Token Present: ${authStatus.hasToken ? '✅' : '❌'}`);
        console.log(`👤 User Data: ${authStatus.hasUser ? '✅' : '❌'}`);
        
        if (!authStatus.hasToken) {
            console.log('❌ FAILED: No authentication token found');
            return;
        }
        
        if (!authStatus.url.includes('admin.html')) {
            console.log('❌ FAILED: Not on admin page');
            return;
        }
        
        console.log('3️⃣ Testing admin functionality...');
        
        // Test tab switching
        const tabTest = await page.evaluate(() => {
            const tabs = document.querySelectorAll('.tab-btn');
            return {
                tabCount: tabs.length,
                firstTabText: tabs[0] ? tabs[0].textContent.trim() : 'none'
            };
        });
        
        console.log(`📑 Admin Tabs: ${tabTest.tabCount} found`);
        
        // Test API calls are working
        const apiTest = await page.evaluate(async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/schools', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                return {
                    status: response.status,
                    working: response.ok
                };
            } catch (error) {
                return {
                    status: 'error',
                    working: false,
                    error: error.message
                };
            }
        });
        
        console.log(`🔌 API Calls: ${apiTest.working ? '✅ Working' : '❌ Failed'} (${apiTest.status})`);
        
        // Test that no logout is called inappropriately
        console.log('4️⃣ Testing token persistence...');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const finalTokenCheck = await page.evaluate(() => {
            return {
                stillHasToken: !!localStorage.getItem('token'),
                stillOnAdminPage: window.location.href.includes('admin.html')
            };
        });
        
        console.log(`🔒 Token Persisted: ${finalTokenCheck.stillHasToken ? '✅' : '❌'}`);
        console.log(`🏛️ Still on Admin: ${finalTokenCheck.stillOnAdminPage ? '✅' : '❌'}`);
        
        // Final verdict
        const success = authStatus.hasToken && 
                       authStatus.url.includes('admin.html') && 
                       apiTest.working && 
                       finalTokenCheck.stillHasToken && 
                       finalTokenCheck.stillOnAdminPage;
        
        console.log('\n🎯 FINAL VERDICT:');
        console.log('================');
        
        if (success) {
            console.log('🟢 ✅ ADMIN LOGIN WORKING PERFECTLY!');
            console.log('   - Authentication successful');
            console.log('   - Token preserved');
            console.log('   - Admin page accessible');
            console.log('   - API calls working');
            console.log('   - No redirect loops');
            console.log('\n🎉 CRITICAL BUG SUCCESSFULLY FIXED!');
        } else {
            console.log('🔴 ❌ Issues still remain:');
            if (!authStatus.hasToken) console.log('   - No authentication token');
            if (!authStatus.url.includes('admin.html')) console.log('   - Not on admin page');
            if (!apiTest.working) console.log('   - API calls failing');
            if (!finalTokenCheck.stillHasToken) console.log('   - Token not persisted');
            if (!finalTokenCheck.stillOnAdminPage) console.log('   - Redirected away from admin');
        }
        
        // Take final screenshot
        await page.screenshot({ path: 'final-admin-verification.png', fullPage: true });
        console.log('\n📸 Screenshot saved: final-admin-verification.png');
        
    } catch (error) {
        console.error('🚨 Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

finalAdminVerificationTest().catch(console.error);