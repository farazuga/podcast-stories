#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * ULTIMATE FINAL TEST
 * Complete verification of all bug fixes and student user flow
 */

async function ultimateFinalTest() {
    console.log('🏆 ULTIMATE FINAL TEST - Complete Student Flow Verification');
    console.log('=' .repeat(80));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        args: ['--disable-web-security', '--no-cache']
    });
    
    const page = await browser.newPage();
    
    // Disable cache to get latest files
    await page.setCacheEnabled(false);
    
    let consoleMessages = [];
    let consoleErrors = [];
    
    page.on('console', msg => {
        consoleMessages.push(`${msg.type()}: ${msg.text()}`);
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    try {
        console.log('\n🔄 STEP 1: Clear all data and start fresh');
        console.log('-'.repeat(50));
        
        // Go to login page and clear everything
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        console.log('   Cleared all browser storage');
        
        console.log('\n🔐 STEP 2: Login as student');
        console.log('-'.repeat(50));
        
        await page.reload({ waitUntil: 'networkidle0' });
        await page.waitForSelector('#email', { timeout: 15000 });
        
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        
        const loginStart = Date.now();
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 20000 });
        const loginTime = Date.now() - loginStart;
        
        const afterLogin = await page.evaluate(() => ({
            currentURL: window.location.href,
            hasToken: !!localStorage.getItem('token'),
            hasUser: !!localStorage.getItem('user'),
            tokenLength: localStorage.getItem('token')?.length || 0
        }));
        
        console.log(`   Login Time: ${loginTime}ms`);
        console.log(`   Current URL: ${afterLogin.currentURL}`);
        console.log(`   Token Stored: ${afterLogin.hasToken ? '✅' : '❌'} (${afterLogin.tokenLength} chars)`);
        console.log(`   User Data: ${afterLogin.hasUser ? '✅' : '❌'}`);
        console.log(`   Redirect Success: ${afterLogin.currentURL.includes('dashboard.html') ? '✅' : '❌'}`);
        
        console.log('\n📚 STEP 3: Navigate to stories page');
        console.log('-'.repeat(50));
        
        const navStart = Date.now();
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { 
            waitUntil: 'networkidle0' 
        });
        const navTime = Date.now() - navStart;
        
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const afterNavigation = await page.evaluate(() => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            
            return {
                tokenStillExists: !!token,
                tokenLength: token?.length || 0,
                userStillExists: !!user,
                pageLoaded: document.readyState === 'complete',
                storiesContainer: !!document.querySelector('#storiesGrid, .stories-grid'),
                storiesCount: document.querySelectorAll('.story-card').length,
                searchForm: !!document.querySelector('#searchForm'),
                viewControls: !!document.querySelector('.view-controls'),
                tagsDropdown: !!document.querySelector('#searchTags'),
                currentURL: window.location.href
            };
        });
        
        console.log(`   Navigation Time: ${navTime}ms`);
        console.log(`   Token Preserved: ${afterNavigation.tokenStillExists ? '✅' : '❌'} (${afterNavigation.tokenLength} chars)`);
        console.log(`   User Data Preserved: ${afterNavigation.userStillExists ? '✅' : '❌'}`);
        console.log(`   Page Loaded: ${afterNavigation.pageLoaded ? '✅' : '❌'}`);
        console.log(`   Stories Container: ${afterNavigation.storiesContainer ? '✅' : '❌'}`);
        console.log(`   Stories Loaded: ${afterNavigation.storiesCount > 0 ? '✅' : '❌'} (${afterNavigation.storiesCount} stories)`);
        console.log(`   Search Form: ${afterNavigation.searchForm ? '✅' : '❌'}`);
        console.log(`   View Controls: ${afterNavigation.viewControls ? '✅' : '❌'}`);
        console.log(`   Tags Dropdown: ${afterNavigation.tagsDropdown ? '✅' : '❌'}`);
        
        console.log('\n🎛️ STEP 4: Test story interactions');
        console.log('-'.repeat(50));
        
        // Test view mode switching
        let viewModeTest = { error: 'View controls not found' };
        const listViewBtn = await page.$('#listViewBtn');
        if (listViewBtn) {
            await listViewBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            viewModeTest = await page.evaluate(() => {
                const listCards = document.querySelectorAll('.story-card-list');
                const firstCard = listCards[0];
                
                return {
                    listViewActive: document.querySelector('#listViewBtn.active') !== null,
                    listCardsFound: listCards.length > 0,
                    hasDateElement: firstCard ? !!firstCard.querySelector('.story-date-compact') : false,
                    hasCheckbox: firstCard ? !!firstCard.querySelector('.story-checkbox-compact input') : false,
                    hasFavoriteStar: firstCard ? !!firstCard.querySelector('.favorite-star') : false
                };
            });
        }
        
        console.log(`   List View Button: ${listViewBtn ? '✅' : '❌'}`);
        console.log(`   List View Active: ${viewModeTest.listViewActive ? '✅' : '❌'}`);
        console.log(`   List Cards: ${viewModeTest.listCardsFound ? '✅' : '❌'}`);
        console.log(`   Date Elements: ${viewModeTest.hasDateElement ? '✅' : '❌'}`);
        console.log(`   Checkboxes: ${viewModeTest.hasCheckbox ? '✅' : '❌'}`);
        console.log(`   Favorite Stars: ${viewModeTest.hasFavoriteStar ? '✅' : '❌'}`);
        
        // Test favorite functionality
        let favoriteTest = { error: 'No favorite buttons found' };
        const favoriteBtn = await page.$('.favorite-star, .favorite-btn');
        if (favoriteBtn) {
            const initialState = await page.evaluate(btn => btn.textContent, favoriteBtn);
            await favoriteBtn.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            const newState = await page.evaluate(btn => btn.textContent, favoriteBtn);
            
            favoriteTest = {
                buttonFound: true,
                initialState,
                newState,
                stateChanged: initialState !== newState
            };
        }
        
        console.log(`   Favorite Button: ${favoriteBtn ? '✅' : '❌'}`);
        console.log(`   Favorite Toggle: ${favoriteTest.stateChanged ? '✅' : '❌'}`);
        
        console.log('\n🔍 STEP 5: Console messages analysis');
        console.log('-'.repeat(50));
        
        const relevantErrors = consoleErrors.filter(error => 
            !error.includes('favicon.ico') && 
            !error.includes('DevTools') &&
            !error.includes('WebSocket')
        );
        
        console.log(`   Total Console Messages: ${consoleMessages.length}`);
        console.log(`   Console Errors: ${consoleErrors.length}`);
        console.log(`   Relevant Errors: ${relevantErrors.length}`);
        
        if (relevantErrors.length > 0) {
            console.log('\n   ⚠️  Relevant Errors Found:');
            relevantErrors.slice(0, 5).forEach((error, index) => {
                console.log(`     ${index + 1}. ${error.substring(0, 100)}...`);
            });
        }
        
        console.log('\n📊 FINAL ASSESSMENT');
        console.log('=' .repeat(80));
        
        // Score each component
        const scores = {
            login: afterLogin.hasToken && afterLogin.currentURL.includes('dashboard.html') ? 1 : 0,
            tokenPreservation: afterNavigation.tokenStillExists ? 1 : 0,
            storiesLoading: afterNavigation.storiesCount > 0 ? 1 : 0,
            pageElements: (afterNavigation.storiesContainer && afterNavigation.searchForm && afterNavigation.viewControls) ? 1 : 0,
            listView: viewModeTest.listViewActive && viewModeTest.listCardsFound ? 1 : 0,
            interactions: favoriteTest.stateChanged ? 1 : 0,
            errorLevel: relevantErrors.length === 0 ? 1 : (relevantErrors.length <= 2 ? 0.5 : 0)
        };
        
        const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
        const maxScore = Object.keys(scores).length;
        const successRate = ((totalScore / maxScore) * 100).toFixed(1);
        
        console.log(`\n🎯 Component Scores:`);
        console.log(`   Login Process: ${scores.login === 1 ? '✅' : '❌'} (${scores.login}/1)`);
        console.log(`   Token Preservation: ${scores.tokenPreservation === 1 ? '✅' : '❌'} (${scores.tokenPreservation}/1)`);
        console.log(`   Stories Loading: ${scores.storiesLoading === 1 ? '✅' : '❌'} (${scores.storiesLoading}/1)`);
        console.log(`   Page Elements: ${scores.pageElements === 1 ? '✅' : '❌'} (${scores.pageElements}/1)`);
        console.log(`   List View: ${scores.listView === 1 ? '✅' : '❌'} (${scores.listView}/1)`);
        console.log(`   Interactions: ${scores.interactions === 1 ? '✅' : '❌'} (${scores.interactions}/1)`);
        console.log(`   Error Level: ${scores.errorLevel === 1 ? '✅' : scores.errorLevel === 0.5 ? '⚠️' : '❌'} (${scores.errorLevel}/1)`);
        
        console.log(`\n📈 Overall Success Rate: ${successRate}%`);
        
        if (successRate >= 90) {
            console.log('\n🎉 EXCELLENT! Student user flow is working correctly!');
            console.log('✅ All critical bugs have been resolved');
            console.log('✅ Token handling is functioning properly');
            console.log('✅ Navigation and interactions work as expected');
        } else if (successRate >= 75) {
            console.log('\n👍 GOOD! Most functionality is working');
            console.log('⚠️  Some minor issues remain but core functionality is solid');
        } else {
            console.log('\n⚠️  NEEDS WORK! Critical issues still present');
            console.log('❌ Additional debugging required');
        }
        
        // Take final screenshot
        await page.screenshot({ 
            path: './ultimate-final-test-result.png', 
            fullPage: true 
        });
        console.log('\n📸 Final screenshot saved: ultimate-final-test-result.png');
        
        return {
            successRate: parseFloat(successRate),
            scores,
            errorCount: relevantErrors.length,
            details: {
                afterLogin,
                afterNavigation,
                viewModeTest,
                favoriteTest
            }
        };
        
    } catch (error) {
        console.error('\n❌ Ultimate test error:', error.message);
        return { successRate: 0, error: error.message };
    }
    
    await browser.close();
}

ultimateFinalTest().then(result => {
    console.log('\n🏁 TEST COMPLETE');
    if (result.successRate >= 90) {
        console.log('🎉 SYSTEMATIC DEBUGGING SUCCESSFUL!');
    }
}).catch(console.error);