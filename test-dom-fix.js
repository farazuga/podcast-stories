#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * TEST DOM CONTENT LOADED FIX
 * Verify that immediate execution fixes stories.js initialization
 */

async function testDomFix() {
    console.log('🔧 TESTING DOM CONTENT LOADED FIX');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    
    // Track console messages
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    try {
        console.log('\n🔐 Login and navigate to stories');
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
        
        // Clear messages from login
        consoleMessages.length = 0;
        
        // Navigate to stories
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 8000)); // Wait for initialization
        
        console.log('\n📊 Console Messages Analysis');
        console.log('-'.repeat(40));
        
        const initMessages = consoleMessages.filter(msg => 
            msg.includes('initialization') || 
            msg.includes('DOM loading') || 
            msg.includes('DOM already loaded')
        );
        
        console.log(`   Initialization Messages: ${initMessages.length}`);
        initMessages.forEach(msg => console.log(`     ${msg}`));
        
        console.log('\n🔍 Function Availability Test');
        console.log('-'.repeat(40));
        
        const functionsTest = await page.evaluate(() => {
            return {
                loadStories: typeof window.loadStories === 'function',
                displayStories: typeof window.displayStories === 'function',
                allStories: typeof window.allStories !== 'undefined',
                checkAuth: typeof window.checkAuth === 'function',
                initializeStoriesPage: typeof window.initializeStoriesPage === 'function',
                // Check if stories were actually loaded
                storiesLoaded: window.allStories ? window.allStories.length : 0
            };
        });
        
        console.log(`   loadStories Function: ${functionsTest.loadStories ? '✅' : '❌'}`);
        console.log(`   displayStories Function: ${functionsTest.displayStories ? '✅' : '❌'}`);
        console.log(`   allStories Variable: ${functionsTest.allStories ? '✅' : '❌'}`);
        console.log(`   checkAuth Function: ${functionsTest.checkAuth ? '✅' : '❌'}`);
        console.log(`   initializeStoriesPage Function: ${functionsTest.initializeStoriesPage ? '✅' : '❌'}`);
        console.log(`   Stories Loaded Count: ${functionsTest.storiesLoaded}`);
        
        console.log('\n🎯 Visual Verification');
        console.log('-'.repeat(40));
        
        const visualTest = await page.evaluate(() => {
            const storiesGrid = document.getElementById('storiesGrid');
            const storyCards = document.querySelectorAll('.story-card');
            const noResults = document.getElementById('noResults');
            const resultsCount = document.getElementById('resultsCount');
            
            return {
                storiesGridExists: !!storiesGrid,
                storiesGridContent: storiesGrid ? storiesGrid.innerHTML.length : 0,
                storyCardsCount: storyCards.length,
                noResultsVisible: noResults ? noResults.style.display !== 'none' : false,
                resultsCountText: resultsCount ? resultsCount.textContent : 'not found'
            };
        });
        
        console.log(`   Stories Grid Exists: ${visualTest.storiesGridExists ? '✅' : '❌'}`);
        console.log(`   Stories Grid Content: ${visualTest.storiesGridContent} chars`);
        console.log(`   Story Cards Found: ${visualTest.storyCardsCount}`);
        console.log(`   No Results Showing: ${visualTest.noResultsVisible ? '⚠️ YES' : '✅ NO'}`);
        console.log(`   Results Count Text: "${visualTest.resultsCountText}"`);
        
        console.log('\n📈 SUCCESS DETERMINATION');
        console.log('=' .repeat(60));
        
        const success = functionsTest.loadStories && 
                       functionsTest.displayStories && 
                       functionsTest.allStories;
        
        const storiesDisplayed = visualTest.storyCardsCount > 0;
        
        if (success && storiesDisplayed) {
            console.log('🎉 COMPLETE SUCCESS! BUG #5 is FULLY FIXED!');
            console.log('✅ All JavaScript functions are available');
            console.log('✅ Stories are loading and displaying correctly');
            console.log('✅ DOM Content Loaded issue resolved');
            console.log('🏆 PHASE 1 COMPLETE - Ready for PHASE 2!');
        } else if (success && !storiesDisplayed) {
            console.log('⚠️  PARTIAL SUCCESS - Functions available but stories not displaying');
            console.log('✅ JavaScript execution fixed');
            console.log('❌ Stories display issue remains');
        } else {
            console.log('❌ FIX INCOMPLETE - Functions still not available');
        }
        
        return { success, storiesDisplayed, functionsTest, visualTest };
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        return { success: false, error: error.message };
    }
    
    await browser.close();
}

testDomFix().then(result => {
    console.log('\n🏁 DOM FIX TEST COMPLETE');
}).catch(console.error);