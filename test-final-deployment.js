#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * FINAL DEPLOYMENT TEST
 * Wait for deployment and test complete BUG #5 fix
 */

async function testFinalDeployment() {
    console.log('🚀 FINAL DEPLOYMENT TEST - Waiting for Railway');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    
    // Track console messages for debugging
    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
        });
    });
    
    let retryCount = 0;
    const maxRetries = 10;
    
    while (retryCount < maxRetries) {
        try {
            console.log(`\\n🔍 ATTEMPT ${retryCount + 1}/${maxRetries}: Checking deployment status`);
            console.log('-'.repeat(50));
            
            // Check if stories.js has been updated
            const checkResponse = await fetch('https://podcast-stories-production.up.railway.app/js/stories.js');
            const scriptContent = await checkResponse.text();
            const hasDebugMessage = scriptContent.includes('🔥 STORIES.JS LOADING - FIRST LINE EXECUTED');
            const hasApiUrlConst = scriptContent.includes('const API_URL');
            
            console.log(`   Stories.js debug message present: ${hasDebugMessage ? '✅' : '❌'}`);
            console.log(`   Old API_URL const present: ${hasApiUrlConst ? '❌ Still old' : '✅ Fixed'}`);
            
            if (hasDebugMessage && !hasApiUrlConst) {
                console.log('\\n🎉 DEPLOYMENT COMPLETE! Testing functionality...');
                break;
            }
            
            if (retryCount === maxRetries - 1) {
                console.log('\\n⚠️  Deployment taking longer than expected. Testing current state...');
                break;
            }
            
            retryCount++;
            console.log(`   Waiting 15 seconds for deployment...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
            
        } catch (error) {
            console.log(`   Error checking deployment: ${error.message}`);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 15000));
        }
    }
    
    try {
        console.log('\\n🔐 FINAL TEST: Login and test stories functionality');
        console.log('-'.repeat(50));
        
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
        
        // Clear previous messages
        consoleMessages.length = 0;
        
        // Navigate to stories
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for all initialization
        
        console.log('\\n📊 DEPLOYMENT VERIFICATION');
        console.log('-'.repeat(50));
        
        // Check for specific console messages
        const scriptLoadMessage = consoleMessages.find(msg => 
            msg.text.includes('🔥 STORIES.JS LOADING - FIRST LINE EXECUTED')
        );
        const initMessage = consoleMessages.find(msg => 
            msg.text.includes('initialization starting')
        );
        const apiUrlError = consoleMessages.find(msg => 
            msg.text.includes('API_URL') && msg.text.includes('already been declared')
        );
        
        console.log(`   Script Load Message: ${scriptLoadMessage ? '✅ Found' : '❌ Missing'}`);
        console.log(`   Initialization Message: ${initMessage ? '✅ Found' : '❌ Missing'}`);
        console.log(`   API_URL Error: ${apiUrlError ? '❌ Still present' : '✅ Resolved'}`);
        
        // Check function availability
        const functionsTest = await page.evaluate(() => {
            return {
                loadStories: typeof window.loadStories === 'function',
                displayStories: typeof window.displayStories === 'function',
                allStories: typeof window.allStories !== 'undefined',
                storiesCount: window.allStories ? window.allStories.length : 0
            };
        });
        
        console.log(`   loadStories Function: ${functionsTest.loadStories ? '✅' : '❌'}`);
        console.log(`   displayStories Function: ${functionsTest.displayStories ? '✅' : '❌'}`);
        console.log(`   allStories Available: ${functionsTest.allStories ? '✅' : '❌'}`);
        console.log(`   Stories Count: ${functionsTest.storiesCount}`);
        
        // Check visual display
        const visualTest = await page.evaluate(() => {
            const storyCards = document.querySelectorAll('.story-card');
            const noResults = document.getElementById('noResults');
            const resultsCount = document.getElementById('resultsCount');
            
            return {
                storyCardsCount: storyCards.length,
                noResultsVisible: noResults ? noResults.style.display !== 'none' : false,
                resultsCountText: resultsCount ? resultsCount.textContent : 'not found'
            };
        });
        
        console.log(`   Story Cards Displayed: ${visualTest.storyCardsCount}`);
        console.log(`   Results Count Text: "${visualTest.resultsCountText}"`);
        
        console.log('\\n🏆 FINAL ASSESSMENT');
        console.log('=' .repeat(60));
        
        const deploymentWorking = scriptLoadMessage && !apiUrlError;
        const functionsWorking = functionsTest.loadStories && functionsTest.displayStories;
        const storiesDisplayed = visualTest.storyCardsCount > 0;
        
        if (deploymentWorking && functionsWorking && storiesDisplayed) {
            console.log('🎉 COMPLETE SUCCESS! BUG #5 FULLY RESOLVED!');
            console.log('✅ Deployment successful');
            console.log('✅ JavaScript functions available');
            console.log('✅ Stories loading and displaying');
            console.log('🏆 PHASE 1 COMPLETE - Ready for PHASE 2!');
        } else if (deploymentWorking && functionsWorking) {
            console.log('⚠️  PARTIAL SUCCESS - Functions working, stories display needs work');
        } else if (deploymentWorking) {
            console.log('⚠️  DEPLOYMENT SUCCESSFUL - Function execution needs debugging');
        } else {
            console.log('❌ DEPLOYMENT ISSUES - Still waiting for Railway update');
        }
        
        return { 
            deploymentWorking, 
            functionsWorking, 
            storiesDisplayed,
            details: { functionsTest, visualTest }
        };
        
    } catch (error) {
        console.error('❌ Final test error:', error.message);
        return { success: false, error: error.message };
    }
    
    await browser.close();
}

testFinalDeployment().then(result => {
    console.log('\\n🏁 FINAL DEPLOYMENT TEST COMPLETE');
}).catch(console.error);