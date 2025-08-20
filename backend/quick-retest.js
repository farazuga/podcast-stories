/**
 * QUICK RETEST: Current status check
 */

const puppeteer = require('puppeteer');

async function quickRetest() {
    console.log('⚡ QUICK RETEST: Current multi-select status');
    console.log('='.repeat(40));
    
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        // Skip login, just check the page structure
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { 
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Quick check without login (will show public/default state)
        const quickCheck = await page.evaluate(() => {
            const cards = document.querySelectorAll('.story-card').length;
            const selections = document.querySelectorAll('.story-selection').length;
            const checkboxes = document.querySelectorAll('.story-checkbox').length;
            const sampleHTML = document.querySelector('.story-card')?.outerHTML.substring(0, 200) || 'No cards';
            
            return { cards, selections, checkboxes, sampleHTML };
        });
        
        console.log('📊 Current State:');
        console.log(`   Story cards: ${quickCheck.cards}`);
        console.log(`   Selection divs: ${quickCheck.selections}`);  
        console.log(`   Checkboxes: ${quickCheck.checkboxes}`);
        console.log(`   Sample: ${quickCheck.sampleHTML}`);
        
        if (quickCheck.checkboxes > 0) {
            console.log('✅ GOOD: Checkboxes are in the HTML');
            console.log('⏳ Still waiting for CSS deployment for full functionality');
        } else {
            console.log('❌ ISSUE: Checkboxes still not in HTML - deployment pending');
        }
        
        return quickCheck.checkboxes > 0;
        
    } catch (error) {
        console.error('Quick test error:', error.message);
        return false;
    } finally {
        if (browser) await browser.close();
    }
}

quickRetest().then(success => {
    console.log('\n='.repeat(40));
    console.log(success ? '✅ HTML structure is ready' : '❌ Still deploying');
});