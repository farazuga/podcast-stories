#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * TEST CRITICAL BUG #5 FIX
 * Verify that API_URL redeclaration error is resolved
 */

async function testCriticalFix() {
    console.log('🔧 TESTING CRITICAL BUG #5 FIX - API_URL Redeclaration');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    
    // Track all errors
    const jsErrors = [];
    const pageErrors = [];
    
    page.on('console', msg => {
        if (msg.type() === 'error') {
            jsErrors.push(msg.text());
        }
    });
    
    page.on('pageerror', error => {
        pageErrors.push(error.message);
    });
    
    try {
        console.log('\n🔐 STEP 1: Login and navigate to stories');
        console.log('-'.repeat(40));
        
        // Login
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        await page.waitForSelector('#email', { timeout: 10000 });
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('   Login completed');
        
        // Clear error arrays from login phase
        jsErrors.length = 0;
        pageErrors.length = 0;
        
        // Navigate to stories
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for all scripts
        
        console.log('\n📊 STEP 2: JavaScript Error Analysis');
        console.log('-'.repeat(40));
        
        console.log(`   JavaScript Errors: ${jsErrors.length}`);
        console.log(`   Page Errors: ${pageErrors.length}`);
        
        // Show any remaining errors
        if (jsErrors.length > 0) {
            console.log('\n   JavaScript Errors Found:');
            jsErrors.forEach((error, index) => {
                if (!error.includes('favicon.ico')) {
                    console.log(`     ${index + 1}. ${error}`);
                }
            });
        }
        
        if (pageErrors.length > 0) {
            console.log('\n   Page Errors Found:');
            pageErrors.forEach((error, index) => {
                console.log(`     ${index + 1}. ${error}`);
            });
        }
        
        console.log('\n🔍 STEP 3: Function Availability Test');
        console.log('-'.repeat(40));
        
        const functionTest = await page.evaluate(() => {
            return {
                API_URL_available: typeof window.API_URL !== 'undefined',
                API_URL_value: window.API_URL,
                loadStories_available: typeof window.loadStories === 'function',
                allStories_available: typeof window.allStories !== 'undefined',
                displayStories_available: typeof window.displayStories === 'function',
                checkAuth_available: typeof window.checkAuth === 'function',
                documentReady: document.readyState
            };
        });
        
        console.log(`   API_URL Available: ${functionTest.API_URL_available ? '✅' : '❌'}`);
        console.log(`   API_URL Value: ${functionTest.API_URL_value || 'undefined'}`);
        console.log(`   loadStories Function: ${functionTest.loadStories_available ? '✅' : '❌'}`);
        console.log(`   allStories Variable: ${functionTest.allStories_available ? '✅' : '❌'}`);
        console.log(`   displayStories Function: ${functionTest.displayStories_available ? '✅' : '❌'}`);
        console.log(`   checkAuth Function: ${functionTest.checkAuth_available ? '✅' : '❌'}`);
        console.log(`   Document Ready: ${functionTest.documentReady}`);
        
        console.log('\n🎯 STEP 4: Stories Loading Test');
        console.log('-'.repeat(40));
        
        const storiesTest = await page.evaluate(() => {
            const storiesGrid = document.getElementById('storiesGrid');
            const storyCards = document.querySelectorAll('.story-card');
            const noResults = document.getElementById('noResults');
            
            return {
                storiesGrid_exists: !!storiesGrid,
                storiesGrid_content: storiesGrid ? storiesGrid.innerHTML.length : 0,
                storyCards_count: storyCards.length,
                noResults_visible: noResults ? noResults.style.display !== 'none' : false
            };
        });
        
        console.log(`   Stories Grid Exists: ${storiesTest.storiesGrid_exists ? '✅' : '❌'}`);
        console.log(`   Stories Grid Content: ${storiesTest.storiesGrid_content} chars`);
        console.log(`   Story Cards Count: ${storiesTest.storyCards_count}`);
        console.log(`   No Results Showing: ${storiesTest.noResults_visible ? '⚠️ YES' : '✅ NO'}`);
        
        console.log('\n📈 FINAL RESULT');
        console.log('=' .repeat(60));
        
        // Determine if the fix worked
        const apiUrlErrors = [...jsErrors, ...pageErrors].filter(error => 
            error.includes('API_URL') || error.includes('already been declared')
        );
        
        const functionsWorking = functionTest.loadStories_available && 
                               functionTest.displayStories_available && 
                               functionTest.API_URL_available;
        
        const storiesLoaded = storiesTest.storyCards_count > 0;
        
        if (apiUrlErrors.length === 0 && functionsWorking) {
            console.log('🎉 SUCCESS! Critical BUG #5 has been FIXED!');
            console.log('✅ No more API_URL redeclaration errors');
            console.log('✅ All JavaScript functions are available');
            
            if (storiesLoaded) {
                console.log('✅ Stories are loading correctly');
                console.log('🏆 PHASE 1 COMPLETE - Moving to PHASE 2');
            } else {
                console.log('⚠️  Functions available but stories not loading - investigate API response');
            }
        } else {
            console.log('❌ Fix incomplete - still have issues:');
            if (apiUrlErrors.length > 0) {
                console.log('  • API_URL errors still present');
            }
            if (!functionsWorking) {
                console.log('  • JavaScript functions still not available');
            }
        }
        
        return {
            success: apiUrlErrors.length === 0 && functionsWorking,
            storiesLoaded,
            details: {
                apiUrlErrors: apiUrlErrors.length,
                functionsWorking,
                storiesCount: storiesTest.storyCards_count
            }
        };
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        return { success: false, error: error.message };
    }
    
    await browser.close();
}

testCriticalFix().then(result => {
    console.log('\n🏁 CRITICAL FIX TEST COMPLETE');
    if (result.success) {
        console.log('🎯 Ready to proceed to PHASE 2!');
    }
}).catch(console.error);