#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function debugStoriesLoading() {
    console.log('🔍 Debugging stories loading...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1280, height: 800 }
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => {
            console.log('📄 Page log:', msg.text());
        });
        
        // Enable error logging
        page.on('pageerror', error => {
            console.log('❌ Page error:', error.message);
        });
        
        // Enable network request logging
        page.on('response', response => {
            if (response.url().includes('/api/')) {
                console.log(`🌐 API Response: ${response.status()} ${response.url()}`);
            }
        });
        
        // Step 1: Login
        console.log('📝 Logging in...');
        await page.goto('https://podcast-stories-production.up.railway.app');
        
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', 'admin@vidpod.com');
        await page.type('input[type="password"]', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        console.log('✅ Login successful');
        
        // Step 2: Navigate to stories
        console.log('\n📚 Navigating to stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        
        // Wait longer for page to fully load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check various elements
        console.log('\n🔍 Checking page elements...');
        
        // Check if stories container exists
        const storiesContainer = await page.$('#storiesGrid');
        console.log(`📦 Stories container: ${storiesContainer ? 'Found' : 'Missing'}`);
        
        // Check for loading states
        const resultsCount = await page.$eval('#resultsCount', el => el.textContent).catch(() => 'Not found');
        console.log(`📊 Results count: "${resultsCount}"`);
        
        // Check for no results message
        const noResults = await page.$('#noResults');
        const noResultsVisible = await page.evaluate(el => el && el.style.display !== 'none', noResults);
        console.log(`🚫 No results shown: ${noResultsVisible}`);
        
        // Check localStorage for auth token
        const hasToken = await page.evaluate(() => {
            return localStorage.getItem('token') ? 'Found' : 'Missing';
        });
        console.log(`🔑 Auth token: ${hasToken}`);
        
        // Check if JavaScript loaded properly
        const jsLoaded = await page.evaluate(() => {
            return typeof window.loadStories === 'function' ? 'Functions loaded' : 'Functions missing';
        });
        console.log(`📜 JavaScript: ${jsLoaded}`);
        
        // Try to manually trigger story loading
        console.log('\n🔄 Attempting to manually load stories...');
        const manualLoad = await page.evaluate(async () => {
            if (typeof window.loadStories === 'function') {
                try {
                    await window.loadStories();
                    return 'Success';
                } catch (error) {
                    return 'Error: ' + error.message;
                }
            }
            return 'Function not available';
        });
        console.log(`📤 Manual load result: ${manualLoad}`);
        
        // Wait a bit more and check again
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const finalStoryCount = await page.$$eval('.story-card', cards => cards.length);
        console.log(`📊 Final story count: ${finalStoryCount}`);
        
        // Check pagination
        const pagination = await page.$('#paginationControls');
        const paginationVisible = await page.evaluate(el => el && el.style.display !== 'none', pagination);
        console.log(`📄 Pagination visible: ${paginationVisible}`);
        
        // Take a screenshot for debugging
        await page.screenshot({ 
            path: 'debug-stories-screenshot.png', 
            fullPage: true 
        });
        console.log('📸 Debug screenshot saved');
        
        // Keep browser open for manual inspection
        console.log('\n⏳ Keeping browser open for 30 seconds for manual inspection...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    } finally {
        await browser.close();
        console.log('\n🏁 Debug completed');
    }
}

debugStoriesLoading().catch(console.error);