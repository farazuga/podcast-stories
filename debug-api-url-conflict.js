#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * DEBUG API_URL CONFLICT with Fresh Browser
 * Force browser to ignore cache and check exact error
 */

async function debugApiUrlConflict() {
    console.log('🔍 DEBUGGING API_URL CONFLICT - Fresh Browser');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    });
    
    const page = await browser.newPage();
    
    // Completely disable cache
    await page.setCacheEnabled(false);
    await page.setExtraHTTPHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    // Track JavaScript errors with detailed source info
    const jsErrors = [];
    const scriptLoads = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            jsErrors.push({
                text: msg.text(),
                location: msg.location(),
                type: msg.type()
            });
        }
    });
    
    // Track all script loads
    page.on('response', response => {
        if (response.url().includes('.js') && response.status() === 200) {
            scriptLoads.push({
                url: response.url().split('/').pop(),
                status: response.status()
            });
        }
    });
    
    try {
        console.log('\n🔐 STEP 1: Fresh login with cache disabled');
        console.log('-'.repeat(40));
        
        // Login with completely fresh session
        await page.goto('https://podcast-stories-production.up.railway.app/', {
            waitUntil: 'networkidle0'
        });
        
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        await page.reload({ waitUntil: 'networkidle0' });
        
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        console.log('   Fresh login completed');
        
        // Clear error tracking from login
        jsErrors.length = 0;
        scriptLoads.length = 0;
        
        console.log('\n📜 STEP 2: Navigate to stories with script tracking');
        console.log('-'.repeat(40));
        
        // Navigate to stories page with network monitoring
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', {
            waitUntil: 'networkidle0'
        });
        
        // Wait for all scripts to process
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log(`   Scripts Loaded: ${scriptLoads.length}`);
        scriptLoads.forEach((script, index) => {
            console.log(`     ${index + 1}. ${script.url} (${script.status})`);
        });
        
        console.log(`\n   JavaScript Errors: ${jsErrors.length}`);
        jsErrors.forEach((error, index) => {
            const fileName = error.location?.url ? error.location.url.split('/').pop() : 'unknown';
            const lineNumber = error.location?.lineNumber || '?';
            console.log(`     ${index + 1}. ${error.text}`);
            console.log(`        Source: ${fileName}:${lineNumber}`);
        });
        
        console.log('\n🔍 STEP 3: Check current API_URL state');
        console.log('-'.repeat(40));
        
        const apiUrlState = await page.evaluate(() => {
            // Check if API_URL exists in window
            const hasWindowApiUrl = 'API_URL' in window;
            const apiUrlValue = window.API_URL;
            
            // Try to redeclare to see what happens
            let redeclareTest = 'success';
            try {
                eval('const API_URL_TEST = "test";');
            } catch (e) {
                redeclareTest = e.message;
            }
            
            // Check if there are multiple script tags with API_URL
            const scriptTags = Array.from(document.querySelectorAll('script[src]'));
            const scriptSources = scriptTags.map(script => script.src);
            
            return {
                hasWindowApiUrl,
                apiUrlValue,
                redeclareTest,
                scriptSources,
                totalScripts: scriptTags.length
            };
        });
        
        console.log(`   Window.API_URL exists: ${apiUrlState.hasWindowApiUrl ? '✅' : '❌'}`);
        console.log(`   API_URL value: ${apiUrlState.apiUrlValue || 'undefined'}`);
        console.log(`   Redeclare test: ${apiUrlState.redeclareTest}`);
        console.log(`   Total script tags: ${apiUrlState.totalScripts}`);
        
        console.log('\n🔍 STEP 4: Test stories.js functions directly');
        console.log('-'.repeat(40));
        
        const functionsTest = await page.evaluate(() => {
            // Check each function individually
            const functions = [
                'loadStories', 'displayStories', 'checkAuth', 
                'loadUserInfo', 'loadTags', 'setViewMode'
            ];
            
            const results = {};
            functions.forEach(funcName => {
                results[funcName] = {
                    exists: typeof window[funcName] === 'function',
                    type: typeof window[funcName]
                };
            });
            
            // Check if DOMContentLoaded fired for stories.js
            let domLoadedStatus = 'unknown';
            try {
                // Check if stories initialization variables are set
                domLoadedStatus = typeof window.allStories !== 'undefined' ? 'fired' : 'not fired';
            } catch (e) {
                domLoadedStatus = 'error checking';
            }
            
            return {
                functions: results,
                domLoadedStatus,
                allStoriesType: typeof window.allStories
            };
        });
        
        console.log('   Function Availability:');
        Object.entries(functionsTest.functions).forEach(([name, info]) => {
            console.log(`     ${name}: ${info.exists ? '✅' : '❌'} (${info.type})`);
        });
        console.log(`   DOM Loaded Status: ${functionsTest.domLoadedStatus}`);
        console.log(`   allStories Type: ${functionsTest.allStoriesType}`);
        
        console.log('\n📊 DIAGNOSIS');
        console.log('=' .repeat(60));
        
        // Determine the issue
        const hasApiUrlError = jsErrors.some(error => 
            error.text.includes('API_URL') || error.text.includes('already been declared')
        );
        
        const functionsAvailable = Object.values(functionsTest.functions)
            .some(func => func.exists);
        
        if (hasApiUrlError) {
            console.log('❌ API_URL redeclaration error still present');
            console.log('   This is blocking stories.js from executing');
            
            // Find which specific error
            const apiUrlError = jsErrors.find(error => 
                error.text.includes('API_URL') || error.text.includes('already been declared')
            );
            
            if (apiUrlError) {
                const sourceFile = apiUrlError.location?.url?.split('/').pop() || 'unknown';
                console.log(`   Error in: ${sourceFile}:${apiUrlError.location?.lineNumber || '?'}`);
                console.log(`   Full error: ${apiUrlError.text}`);
            }
        } else if (!functionsAvailable) {
            console.log('❌ No API_URL error, but stories.js functions still not available');
            console.log('   This suggests a different JavaScript execution issue');
        } else {
            console.log('✅ JavaScript functions are available!');
            console.log('   API_URL conflict has been resolved');
        }
        
        return { hasApiUrlError, functionsAvailable, jsErrors };
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
        return { error: error.message };
    }
    
    await browser.close();
}

debugApiUrlConflict().catch(console.error);