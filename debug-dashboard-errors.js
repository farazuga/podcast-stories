const puppeteer = require('puppeteer');

async function debugDashboardErrors() {
    console.log('🔍 Debugging Dashboard Errors');
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    
    // Log all console messages
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('error', error => console.log('ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url()));
    
    try {
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await new Promise(r => setTimeout(r, 5000));
        
        console.log('📋 HTML structure check:');
        const htmlCheck = await page.evaluate(() => {
            return {
                hasContainer: !!document.querySelector('.container'),
                hasQuickActions: !!document.querySelector('.quick-actions'),
                hasActionCards: !!document.querySelector('.action-cards'),
                bodyHTML: document.body.innerHTML.substring(0, 500)
            };
        });
        
        console.log('Container exists:', htmlCheck.hasContainer);
        console.log('Quick actions exists:', htmlCheck.hasQuickActions);
        console.log('Action cards exists:', htmlCheck.hasActionCards);
        console.log('Body HTML preview:', htmlCheck.bodyHTML);
        
        await new Promise(r => setTimeout(r, 3000));
        
    } catch (error) {
        console.error('Debug failed:', error);
    } finally {
        await browser.close();
    }
}

debugDashboardErrors().catch(console.error);
