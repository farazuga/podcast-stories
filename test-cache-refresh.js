/**
 * Test to verify the deployed admin.js has the POST method fix
 */

const puppeteer = require('puppeteer');

async function testCacheRefresh() {
    console.log('🔄 Testing Cache Refresh for Admin Panel');
    console.log('======================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    // Monitor all network requests
    page.on('request', request => {
        if (request.url().includes('admin.js')) {
            console.log(`📥 Loading admin.js: ${request.url()}`);
        }
    });
    
    // Capture API requests
    page.on('response', response => {
        if (response.url().includes('/api/teacher-requests/') && response.url().includes('/approve')) {
            console.log(`📡 API Request: ${response.request().method()} ${response.url()}`);
            console.log(`📡 API Response: ${response.status()}`);
        }
    });
    
    try {
        console.log('1️⃣ Login with hard cache refresh...');
        
        // Go to the page with cache disabled
        await page.setCacheEnabled(false);
        await page.goto('https://podcast-stories-production.up.railway.app/index.html', {
            waitUntil: 'networkidle0'
        });
        
        await page.evaluate(() => { 
            localStorage.clear(); 
            sessionStorage.clear();
        });
        
        await page.waitForSelector('#email');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        console.log('2️⃣ Navigate to teachers tab with cache disabled...');
        
        // Disable cache for admin page too
        await page.setCacheEnabled(false);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await page.click('.tab-btn[data-tab="teachers"]');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('3️⃣ Check current HTTP method in admin.js...');
        
        // Check what method is being used in the JavaScript
        const methodCheck = await page.evaluate(() => {
            // Check if we can find the approveTeacherRequest function
            const scripts = Array.from(document.getElementsByTagName('script'));
            const adminScript = scripts.find(script => script.src && script.src.includes('admin.js'));
            
            return {
                adminScriptFound: !!adminScript,
                adminScriptSrc: adminScript ? adminScript.src : 'not found',
                timestamp: new Date().toISOString()
            };
        });
        
        console.log('Admin script info:', methodCheck);
        
        console.log('4️⃣ Try to approve a teacher request...');
        
        // Look for approve buttons
        const approveBtn = await page.$('.btn-approve');
        if (!approveBtn) {
            console.log('No approve button found');
            await browser.close();
            return;
        }
        
        await approveBtn.click();
        await page.waitForSelector('#approvalModal[style*="block"]', { timeout: 5000 });
        
        console.log('5️⃣ Submit approval and monitor request...');
        
        const approveFormBtn = await page.$('#approveTeacherForm button[type="submit"]');
        await approveFormBtn.click();
        
        // Wait for the request
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
    } finally {
        console.log('\n📸 Taking screenshot for inspection...');
        await page.screenshot({ path: 'cache-refresh-test.png', fullPage: true });
        await browser.close();
    }
}

testCacheRefresh().catch(console.error);