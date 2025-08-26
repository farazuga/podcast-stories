#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * MANUAL STORIES TEST
 * Keep browser open for manual debugging
 */

async function manualStoriesTest() {
    console.log('🔧 MANUAL STORIES TEST - Browser stays open for debugging');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        devtools: true  // Open dev tools automatically
    });
    
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    
    // Keep console messages for reference
    page.on('console', msg => {
        console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    });
    
    try {
        console.log('\n1. Login first...');
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Login complete');
        
        // Check token state
        const tokenState = await page.evaluate(() => ({
            hasToken: !!localStorage.getItem('token'),
            tokenValue: localStorage.getItem('token')?.substring(0, 20) + '...',
            hasUser: !!localStorage.getItem('user')
        }));
        
        console.log(`Token: ${tokenState.hasToken ? '✅' : '❌'} ${tokenState.tokenValue}`);
        console.log(`User: ${tokenState.hasUser ? '✅' : '❌'}`);
        
        console.log('\\n2. Now manually navigate to stories.html in 5 seconds...');
        console.log('🔍 Watch the browser console for debug messages');
        console.log('📊 Check Network tab for API calls');
        console.log('⚠️  Pay attention to when token disappears');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('\\n3. Navigating to stories.html NOW...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        
        console.log('\\n🛑 BROWSER WILL STAY OPEN FOR MANUAL DEBUGGING');
        console.log('=' .repeat(60));
        console.log('INSTRUCTIONS:');
        console.log('1. Check browser console for debug messages');
        console.log('2. Check Network tab for failed requests');
        console.log('3. Check Application tab > Local Storage for token');
        console.log('4. Look for any errors or redirects');
        console.log('5. Try manually calling window.loadStories() in console');
        console.log('6. Close browser when done debugging');
        
        // Wait indefinitely until browser is closed manually
        await page.waitForSelector('html', { timeout: 0 });
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
    
    // Don't close browser - let user do it manually
    console.log('\\n👋 Browser closed by user');
}

manualStoriesTest().catch(console.error);