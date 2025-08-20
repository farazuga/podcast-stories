#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * TEST SCRIPT LOADING
 * Check if stories.js is executing at all
 */

async function testScriptLoading() {
    console.log('🔍 TESTING SCRIPT LOADING');
    console.log('=' .repeat(50));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    
    // Track ALL console messages
    const allMessages = [];
    page.on('console', msg => {
        allMessages.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
        });
    });
    
    try {
        // Login
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('Login completed');
        
        // Clear messages
        allMessages.length = 0;
        
        // Navigate to stories
        console.log('Navigating to stories...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('\\nAll Console Messages:');
        console.log('-'.repeat(40));
        
        allMessages.forEach((msg, index) => {
            const file = msg.location?.url ? msg.location.url.split('/').pop() : 'unknown';
            const line = msg.location?.lineNumber || '?';
            console.log(`${index + 1}. [${msg.type}] ${msg.text} (${file}:${line})`);
        });
        
        console.log('\\nSpecific Script Loading Messages:');
        console.log('-'.repeat(40));
        
        const scriptMessages = allMessages.filter(msg => 
            msg.text.includes('STORIES.JS LOADING') ||
            msg.text.includes('Auth.js loaded') ||
            msg.text.includes('DOM loading') ||
            msg.text.includes('DOM already loaded') ||
            msg.text.includes('initialization')
        );
        
        if (scriptMessages.length > 0) {
            scriptMessages.forEach(msg => console.log(`✅ ${msg.text}`));
        } else {
            console.log('❌ No script loading messages found');
        }
        
        console.log('\\nScript Tag Analysis:');
        console.log('-'.repeat(40));
        
        const scriptInfo = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            const storiesScript = scripts.find(s => s.src.includes('stories.js'));
            
            return {
                totalScripts: scripts.length,
                scriptSrcs: scripts.map(s => s.src.split('/').pop()),
                storiesScriptFound: !!storiesScript,
                storiesScriptSrc: storiesScript ? storiesScript.src : null
            };
        });
        
        console.log(`Total Scripts: ${scriptInfo.totalScripts}`);
        console.log(`Scripts: ${scriptInfo.scriptSrcs.join(', ')}`);
        console.log(`Stories Script Found: ${scriptInfo.storiesScriptFound ? '✅' : '❌'}`);
        
        if (scriptInfo.storiesScriptFound) {
            console.log(`Stories Script URL: ${scriptInfo.storiesScriptSrc}`);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
    
    await browser.close();
}

testScriptLoading().catch(console.error);