const puppeteer = require('puppeteer');

async function debugDashboard() {
    console.log('🔍 Debugging Dashboard Buttons');
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    
    try {
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('📋 Dashboard elements:');
        const elements = await page.evaluate(() => {
            const actionCards = document.querySelectorAll('.action-card');
            const results = [];
            
            actionCards.forEach((card, i) => {
                results.push({
                    index: i,
                    id: card.id || 'no-id',
                    text: card.textContent.trim().substring(0, 50),
                    onclick: card.getAttribute('onclick') || 'no-onclick',
                    href: card.getAttribute('href') || 'no-href'
                });
            });
            
            return {
                actionCards: results,
                favoritesAction: document.getElementById('favoritesAction') ? 'exists' : 'missing'
            };
        });
        
        console.log('Action cards found:', elements.actionCards.length);
        elements.actionCards.forEach(card => {
            console.log(`  ${card.index}: ID="${card.id}" Text="${card.text}" OnClick="${card.onclick}"`);
        });
        console.log(`favoritesAction element: ${elements.favoritesAction}`);
        
        await new Promise(r => setTimeout(r, 3000));
        
    } catch (error) {
        console.error('Debug failed:', error);
    } finally {
        await browser.close();
    }
}

debugDashboard().catch(console.error);
