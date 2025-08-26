const puppeteer = require('puppeteer');

async function testLogout() {
    console.log('🚪 Testing Logout Fix');
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    
    let dialogAppeared = false;
    page.on('dialog', async dialog => {
        dialogAppeared = true;
        console.log(`❌ Dialog appeared: "${dialog.message()}"`);
        await dialog.accept();
    });
    
    try {
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await new Promise(r => setTimeout(r, 2000));
        
        console.log('✅ Logged in, testing logout...');
        await page.click('#logoutBtn');
        await new Promise(r => setTimeout(r, 2000));
        
        const currentUrl = page.url();
        const isLoggedOut = currentUrl.includes('index.html') || currentUrl.endsWith('/');
        
        console.log(`Logout success: ${isLoggedOut ? '✅' : '❌'}`);
        console.log(`No dialog: ${!dialogAppeared ? '✅' : '❌'}`);
        console.log(`URL: ${currentUrl}`);
        
        await new Promise(r => setTimeout(r, 2000));
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

testLogout().catch(console.error);