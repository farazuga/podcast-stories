const puppeteer = require('puppeteer');

async function testDashboardSimple() {
    console.log('🏠 Simple Dashboard Test');
    const browser = await puppeteer.launch({ headless: false, slowMo: 200 });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.text().includes('dashboard') || msg.text().includes('Dashboard')) {
            console.log('CONSOLE:', msg.text());
        }
    });
    
    try {
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('Waiting 10 seconds for dashboard to fully load...');
        await new Promise(r => setTimeout(r, 10000));
        
        const check = await page.evaluate(() => {
            return {
                favoritesAction: !!document.getElementById('favoritesAction'),
                quickActions: !!document.querySelector('.quick-actions'),
                actionCards: document.querySelectorAll('.action-card').length
            };
        });
        
        console.log('Favorites action exists:', check.favoritesAction);
        console.log('Quick actions section exists:', check.quickActions);
        console.log('Action cards count:', check.actionCards);
        
        if (check.favoritesAction) {
            console.log('✅ Testing favorites click...');
            await page.click('#favoritesAction');
            await new Promise(r => setTimeout(r, 3000));
            
            const url = page.url();
            console.log('Final URL:', url);
            console.log('Success:', url.includes('stories.html?favorites=true') ? '✅' : '❌');
        }
        
        await new Promise(r => setTimeout(r, 3000));
        
    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testDashboardSimple().catch(console.error);
