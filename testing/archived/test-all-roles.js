const puppeteer = require('puppeteer');

async function testAllRoles() {
    console.log('🧪 Testing All User Roles');
    const browser = await puppeteer.launch({ headless: true });
    
    const users = [
        { email: 'admin@vidpod.com', password: 'vidpod', expectedRole: 'Admin' },
        { email: 'teacher@vidpod.com', password: 'vidpod', expectedRole: 'Teacher' },
        { email: 'student@vidpod.com', password: 'vidpod', expectedRole: 'Student' }
    ];
    
    for (const user of users) {
        const page = await browser.newPage();
        
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', user.email);
        await page.type('#password', user.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await new Promise(r => setTimeout(r, 2000));
        
        const result = await page.evaluate(() => {
            return {
                userName: document.getElementById('userName')?.textContent,
                userRole: document.getElementById('userRole')?.textContent,
                logoutBtn: !!document.getElementById('logoutBtn')
            };
        });
        
        const logoutStatus = result.logoutBtn ? '✅' : '❌';
        console.log(`${user.expectedRole}: Name="${result.userName}", Role="${result.userRole}", Logout=${logoutStatus}`);
        await page.close();
    }
    
    await browser.close();
}

testAllRoles().catch(console.error);