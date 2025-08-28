/**
 * Quick deployment check
 */

const puppeteer = require('puppeteer');

async function checkDeployment() {
    console.log('🧪 Checking Deployment Status\n');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.text().includes('Default view set to list') || 
                msg.text().includes('view set to list') ||
                msg.text().includes('Auto-populated')) {
                console.log(`[BROWSER]: ${msg.text()}`);
            }
        });
        
        // Login as admin
        console.log('🔐 Logging in...');
        await page.goto(`${baseUrl}/index.html`);
        await page.waitForSelector('#email', { timeout: 10000 });
        
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 10000 });
        
        // Go to stories page and check for console messages
        console.log('📚 Checking stories page...');
        await page.goto(`${baseUrl}/stories.html`);
        await page.waitForSelector('#storiesContainer', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check current view mode in JavaScript
        const currentViewMode = await page.evaluate(() => {
            return window.currentViewMode || 'unknown';
        });
        
        console.log(`Current view mode: ${currentViewMode}`);
        
        await browser.close();
        
        if (currentViewMode === 'list') {
            console.log('✅ Deployment successful - list view is active');
            return true;
        } else {
            console.log('❌ Deployment not yet active - still showing grid view');
            return false;
        }

    } catch (error) {
        console.error('❌ Check failed:', error.message);
        await browser.close();
        return false;
    }
}

if (require.main === module) {
    checkDeployment().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(() => process.exit(1));
}

module.exports = checkDeployment;