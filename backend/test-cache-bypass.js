/**
 * CACHE BYPASS TEST: Force fresh load to check for deployment
 */

const puppeteer = require('puppeteer');

async function testWithCacheBypass() {
    console.log('🧪 CACHE BYPASS TEST: Force fresh deployment check');
    console.log('='.repeat(50));
    
    let browser;
    let page;
    
    try {
        browser = await puppeteer.launch({ 
            headless: false, 
            slowMo: 100,
            args: ['--disable-cache', '--disable-application-cache']
        });
        
        page = await browser.newPage();
        
        // Disable cache
        await page.setCacheEnabled(false);
        await page.setViewport({ width: 1200, height: 800 });
        
        // Add a cache-busting parameter
        const cacheBuster = Date.now();
        const testUrl = `https://podcast-stories-production.up.railway.app/stories.html?v=${cacheBuster}`;
        
        console.log('🌐 Navigating with cache bypass...');
        
        // Go directly to stories page with cache buster
        await page.goto(testUrl, { 
            waitUntil: 'networkidle0',
            timeout: 15000
        });
        
        // Check if we're redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('index.html') || currentUrl.includes('login')) {
            console.log('🔐 Login required, authenticating...');
            
            await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 5000 });
            const emailInput = await page.$('input[type="email"]');
            const usernameInput = await page.$('input[type="text"]');
            
            if (emailInput) {
                await page.type('input[type="email"]', 'admin@vidpod.com');
            } else if (usernameInput) {
                await page.type('input[type="text"]', 'admin');
            }
            
            await page.type('input[type="password"]', 'vidpod');
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            
            // Navigate to stories again with cache buster
            await page.goto(testUrl, { waitUntil: 'networkidle0' });
        }
        
        // Wait longer for JavaScript to execute
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Force a page refresh with cache bypass
        await page.reload({ waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const testResults = await page.evaluate(() => {
            // Check what JavaScript functions are available
            const jsCheck = {
                renderStoryCard: typeof window.renderStoryCard,
                updateSelection: typeof window.updateSelection,
                selectionMode: typeof window.selectionMode,
                selectedStories: typeof window.selectedStories,
                filteredStories: window.filteredStories ? window.filteredStories.length : 'undefined',
                allStories: window.allStories ? window.allStories.length : 'undefined'
            };
            
            // Get current card structure
            const firstCard = document.querySelector('.story-card');
            const cardStructure = {
                hasCard: !!firstCard,
                hasSelectionDiv: !!document.querySelector('.story-selection'),
                hasCheckboxes: document.querySelectorAll('.story-checkbox').length,
                sampleHTML: firstCard ? firstCard.innerHTML.substring(0, 800) : 'No card found'
            };
            
            return { jsCheck, cardStructure };
        });
        
        console.log('📊 JavaScript availability:', testResults.jsCheck);
        console.log('📋 Card structure check:');
        console.log(`   Has cards: ${testResults.cardStructure.hasCard}`);
        console.log(`   Has selection divs: ${testResults.cardStructure.hasSelectionDiv}`);
        console.log(`   Checkbox count: ${testResults.cardStructure.hasCheckboxes}`);
        
        console.log('\n🔍 Sample card HTML:');
        console.log(testResults.cardStructure.sampleHTML);
        
        // Check if the current deployed version has our changes
        if (testResults.cardStructure.hasSelectionDiv && testResults.cardStructure.hasCheckboxes > 0) {
            console.log('✅ DEPLOYMENT SUCCESS: Multi-select checkboxes are now present!');
            return true;
        } else {
            console.log('❌ DEPLOYMENT PENDING: Changes not yet deployed to production');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        return false;
    } finally {
        if (browser) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await browser.close();
        }
    }
}

// Run the test
testWithCacheBypass()
    .then(success => {
        console.log('\n' + '='.repeat(50));
        if (success) {
            console.log('🎉 CACHE BYPASS TEST: Deployment successful!');
        } else {
            console.log('⏳ CACHE BYPASS TEST: Still waiting for deployment...');
        }
    })
    .catch(console.error);