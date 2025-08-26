const puppeteer = require('puppeteer');

async function debugNavigation() {
    console.log('🔍 Debugging Navigation Issue');
    
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    await page.goto('https://podcast-stories-production.up.railway.app/');
    await page.type('#email', 'admin@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    await new Promise(r => setTimeout(r, 2000));
    
    const debug = await page.evaluate(() => {
        return {
            navbarUser: !!document.getElementById('navbarUser'),
            userName: !!document.getElementById('userName'),
            userRole: !!document.getElementById('userRole'),
            logoutBtn: !!document.getElementById('logoutBtn'),
            userNameText: document.getElementById('userName')?.textContent,
            userRoleText: document.getElementById('userRole')?.textContent,
            userInStorage: !!localStorage.getItem('user'),
            vidpodNav: typeof VidPODNav !== 'undefined'
        };
    });
    
    console.log('Debug Results:', debug);
    
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
}

debugNavigation().catch(console.error);
