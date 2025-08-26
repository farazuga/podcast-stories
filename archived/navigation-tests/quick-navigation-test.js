const puppeteer = require('puppeteer');

async function quickNavigationTest() {
    console.log('🔧 Quick Navigation Test');
    console.log('========================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 50,
        args: ['--no-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Login
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const results = await page.evaluate(() => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const adminBrowse = document.querySelector('[href="/admin-browse-stories.html"]');
            const adminPanel = document.querySelector('[href="/admin.html"]');
            
            return {
                userRole: user.role,
                hasToken: !!localStorage.getItem('token'),
                adminBrowseVisible: adminBrowse ? adminBrowse.style.display !== 'none' : false,
                adminPanelVisible: adminPanel ? adminPanel.style.display !== 'none' : false,
                url: window.location.href
            };
        });
        
        console.log('Results:');
        console.log(`  User role: ${results.userRole}`);
        console.log(`  Has token: ${results.hasToken ? '✅' : '❌'}`);
        console.log(`  Admin Browse visible: ${results.adminBrowseVisible ? '✅' : '❌'}`);
        console.log(`  Admin Panel visible: ${results.adminPanelVisible ? '✅' : '❌'}`);
        console.log(`  Current URL: ${results.url}`);
        
        const success = results.hasToken && results.adminBrowseVisible && results.adminPanelVisible && !results.url.includes('index.html');
        console.log(`\n${success ? '✅ SUCCESS' : '❌ STILL FAILING'}: Navigation ${success ? 'working' : 'not working'}`);
        
    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

quickNavigationTest().catch(console.error);