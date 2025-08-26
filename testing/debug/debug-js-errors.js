#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * DEBUG JAVASCRIPT ERRORS preventing stories.js execution
 */

async function debugJSErrors() {
    console.log('🔍 DEBUGGING JAVASCRIPT ERRORS IN STORIES.JS');
    console.log('=' .repeat(60));
    
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
    
    // Track page errors
    const pageErrors = [];
    page.on('pageerror', error => {
        pageErrors.push({
            message: error.message,
            stack: error.stack
        });
    });
    
    try {
        console.log('\n🔐 STEP 1: Navigate to stories page directly');
        console.log('-'.repeat(40));
        
        // Login first
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        // Clear messages from login
        allMessages.length = 0;
        pageErrors.length = 0;
        
        // Navigate to stories page
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for all scripts
        
        console.log('\n📜 STEP 2: JavaScript Messages Analysis');
        console.log('-'.repeat(40));
        
        console.log(`   Total Console Messages: ${allMessages.length}`);
        console.log(`   Page Errors: ${pageErrors.length}`);
        
        // Show all console messages
        if (allMessages.length > 0) {
            console.log('\n   📝 All Console Messages:');
            allMessages.forEach((msg, index) => {
                const location = msg.location.url ? ` (${msg.location.url.split('/').pop()}:${msg.location.lineNumber})` : '';
                console.log(`     ${index + 1}. [${msg.type.toUpperCase()}] ${msg.text}${location}`);
            });
        }
        
        // Show page errors
        if (pageErrors.length > 0) {
            console.log('\n   🚨 Page Errors:');
            pageErrors.forEach((error, index) => {
                console.log(`     ${index + 1}. ${error.message}`);
                if (error.stack) {
                    console.log(`        Stack: ${error.stack.split('\n')[0]}`);
                }
            });
        }
        
        console.log('\n🔍 STEP 3: Check Script Loading');
        console.log('-'.repeat(40));
        
        const scriptAnalysis = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script'));
            const storiesScript = scripts.find(script => script.src && script.src.includes('stories.js'));
            
            return {
                totalScripts: scripts.length,
                scriptSources: scripts.map(script => script.src || 'inline').filter(src => src !== 'inline'),
                storiesScriptLoaded: !!storiesScript,
                storiesScriptSrc: storiesScript ? storiesScript.src : null,
                storiesScriptError: storiesScript ? !!storiesScript.onerror : null,
                // Check if DOMContentLoaded fired
                documentReady: document.readyState,
                // Check for window.loadStories after potential execution
                loadStoriesExists: typeof window.loadStories,
                windowGlobals: Object.keys(window).filter(key => 
                    key.includes('Stories') || 
                    key.includes('stories') || 
                    key === 'allStories' ||
                    key === 'currentUser' ||
                    key === 'API_URL'
                )
            };
        });
        
        console.log('   Script Loading Analysis:');
        console.log(`     Total Scripts: ${scriptAnalysis.totalScripts}`);
        console.log(`     Stories.js Loaded: ${scriptAnalysis.storiesScriptLoaded ? '✅' : '❌'}`);
        console.log(`     Stories.js Src: ${scriptAnalysis.storiesScriptSrc || 'Not found'}`);
        console.log(`     Document Ready: ${scriptAnalysis.documentReady}`);
        console.log(`     loadStories Function: ${scriptAnalysis.loadStoriesExists}`);
        
        console.log('\n     Scripts Found:');
        scriptAnalysis.scriptSources.forEach((src, index) => {
            const filename = src.split('/').pop();
            console.log(`       ${index + 1}. ${filename}`);
        });
        
        console.log('\n     Window Globals Related to Stories:');
        if (scriptAnalysis.windowGlobals.length > 0) {
            scriptAnalysis.windowGlobals.forEach(global => {
                console.log(`       • ${global}`);
            });
        } else {
            console.log('       No story-related globals found');
        }
        
        console.log('\n🧪 STEP 4: Manual Function Check');
        console.log('-'.repeat(40));
        
        const functionCheck = await page.evaluate(() => {
            // Try to access specific functions that should exist
            const checks = {
                loadStories: typeof window.loadStories,
                checkAuth: typeof window.checkAuth,
                loadUserInfo: typeof window.loadUserInfo,
                loadTags: typeof window.loadTags,
                displayStories: typeof window.displayStories,
                renderStoryCard: typeof window.renderStoryCard,
                allStoriesVar: typeof window.allStories,
                currentUserVar: typeof window.currentUser
            };
            
            // Check if DOMContentLoaded listener fired
            let domContentLoadedFired = 'unknown';
            try {
                // This is a rough check - see if initialization seems to have run
                domContentLoadedFired = window.allStories !== undefined ? 'likely yes' : 'likely no';
            } catch (e) {
                domContentLoadedFired = 'error checking';
            }
            
            return {
                ...checks,
                domContentLoadedFired
            };
        });
        
        console.log('   Function Availability:');
        Object.entries(functionCheck).forEach(([name, type]) => {
            if (name === 'domContentLoadedFired') {
                console.log(`     DOM Loaded Event: ${type}`);
            } else {
                const available = type === 'function' || type === 'object';
                console.log(`     ${name}: ${available ? '✅' : '❌'} (${type})`);
            }
        });
        
        console.log('\n🎯 STEP 5: Root Cause Analysis');
        console.log('-'.repeat(40));
        
        let rootCause = 'Unknown';
        let solution = 'Investigate further';
        
        const hasErrors = pageErrors.length > 0;
        const hasJSErrors = allMessages.some(msg => msg.type === 'error' && !msg.text.includes('favicon'));
        const scriptsLoaded = scriptAnalysis.storiesScriptLoaded;
        const functionsAvailable = functionCheck.loadStories === 'function';
        
        if (hasErrors) {
            rootCause = 'JavaScript execution errors preventing script from running';
            solution = 'Fix JavaScript syntax/runtime errors';
        } else if (!scriptsLoaded) {
            rootCause = 'stories.js not loading from server';
            solution = 'Check script tag and file availability';
        } else if (hasJSErrors) {
            rootCause = 'JavaScript errors in console preventing execution';
            solution = 'Fix console JavaScript errors';
        } else if (!functionsAvailable) {
            rootCause = 'stories.js loaded but functions not defined';
            solution = 'Check for scoping issues or execution problems';
        } else {
            rootCause = 'Functions available but not being called properly';
            solution = 'Check DOMContentLoaded event and initialization sequence';
        }
        
        console.log(`   🔍 Root Cause: ${rootCause}`);
        console.log(`   💡 Solution: ${solution}`);
        
        console.log('\n📊 SUMMARY');
        console.log('=' .repeat(60));
        
        const diagnostics = {
            scriptsLoaded,
            hasErrors,
            hasJSErrors,
            functionsAvailable,
            canFixImmediately: hasErrors || hasJSErrors
        };
        
        Object.entries(diagnostics).forEach(([check, status]) => {
            if (typeof status === 'boolean') {
                console.log(`   ${check}: ${status ? '✅' : '❌'}`);
            }
        });
        
        return { rootCause, solution, diagnostics, pageErrors, allMessages };
        
    } catch (error) {
        console.error('❌ Debug error:', error.message);
        return { error: error.message };
    }
    
    await browser.close();
}

debugJSErrors().then(result => {
    console.log('\n🏁 JAVASCRIPT ERROR DEBUG COMPLETE');
    if (result.solution) {
        console.log(`🎯 NEXT ACTION: ${result.solution}`);
    }
}).catch(console.error);