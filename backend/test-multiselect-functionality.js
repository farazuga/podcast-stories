/**
 * COMPREHENSIVE MULTI-SELECT FUNCTIONALITY TEST
 * 
 * Tests both visibility and functionality of multi-select checkboxes
 */

const puppeteer = require('puppeteer');

async function testMultiSelectFunctionality() {
    console.log('🧪 COMPREHENSIVE TEST: Multi-select Functionality');
    console.log('='.repeat(60));
    
    let browser;
    let page;
    
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 150 });
        page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        
        // Navigate and login
        console.log('🔐 Logging in and navigating to stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/index.html', { 
            waitUntil: 'networkidle0' 
        });
        
        // Login
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
        
        // Navigate to stories
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { 
            waitUntil: 'networkidle0' 
        });
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('📊 Analyzing page state...');
        
        const analysis = await page.evaluate(() => {
            // Get all relevant elements
            const storyCards = document.querySelectorAll('.story-card');
            const storySelections = document.querySelectorAll('.story-selection');
            const storyCheckboxes = document.querySelectorAll('.story-checkbox');
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            const bulkActionsBar = document.getElementById('bulkActionsBar');
            
            // Check visibility
            const visibleCheckboxes = Array.from(storyCheckboxes).filter(cb => {
                const rect = cb.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && cb.offsetParent !== null;
            });
            
            // Get some sample HTML for debugging
            const sampleCard = storyCards[0];
            const sampleCardHTML = sampleCard ? sampleCard.outerHTML.substring(0, 500) : 'No cards found';
            
            return {
                totalCards: storyCards.length,
                storySelectionDivs: storySelections.length,
                totalCheckboxes: storyCheckboxes.length,
                visibleCheckboxes: visibleCheckboxes.length,
                selectAllExists: !!selectAllCheckbox,
                selectAllVisible: selectAllCheckbox ? selectAllCheckbox.offsetParent !== null : false,
                bulkActionsExists: !!bulkActionsBar,
                sampleCardHTML,
                windowVars: {
                    selectedStories: window.selectedStories ? window.selectedStories.size : 'undefined',
                    selectionMode: window.selectionMode,
                    filteredStories: window.filteredStories ? window.filteredStories.length : 'undefined'
                }
            };
        });
        
        console.log('📋 Analysis Results:');
        console.log(`   Story cards: ${analysis.totalCards}`);
        console.log(`   Story selection divs: ${analysis.storySelectionDivs}`);
        console.log(`   Total checkboxes: ${analysis.totalCheckboxes}`);
        console.log(`   Visible checkboxes: ${analysis.visibleCheckboxes}`);
        console.log(`   Select all checkbox: ${analysis.selectAllExists} (visible: ${analysis.selectAllVisible})`);
        console.log(`   Bulk actions bar: ${analysis.bulkActionsExists}`);
        console.log(`   Window variables:`, analysis.windowVars);
        
        // Show sample card HTML for debugging
        console.log('🔍 Sample card HTML (first 500 chars):');
        console.log(analysis.sampleCardHTML);
        
        // Test Results Assessment
        let testsPassed = 0;
        let testsTotal = 0;
        
        // Test 1: Basic elements exist
        testsTotal++;
        if (analysis.totalCards > 0) {
            console.log('✅ Test 1: Story cards are present');
            testsPassed++;
        } else {
            console.log('❌ Test 1: No story cards found');
        }
        
        // Test 2: Selection divs exist
        testsTotal++;
        if (analysis.storySelectionDivs > 0) {
            console.log('✅ Test 2: Story selection divs are present');
            testsPassed++;
        } else {
            console.log('❌ Test 2: Story selection divs are missing');
        }
        
        // Test 3: Checkboxes exist
        testsTotal++;
        if (analysis.totalCheckboxes > 0) {
            console.log('✅ Test 3: Story checkboxes are present');
            testsPassed++;
        } else {
            console.log('❌ Test 3: Story checkboxes are missing');
        }
        
        // Test 4: Checkboxes are visible
        testsTotal++;
        if (analysis.visibleCheckboxes > 0) {
            console.log('✅ Test 4: Story checkboxes are visible');
            testsPassed++;
            
            // Test 5: Try to interact with a checkbox
            testsTotal++;
            try {
                console.log('🖱️  Testing checkbox interaction...');
                
                // Click the first visible checkbox
                await page.click('.story-checkbox');
                
                // Wait for UI updates
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if selection worked
                const selectionResult = await page.evaluate(() => {
                    const selectedCount = document.getElementById('selectedCount');
                    const bulkActionsBar = document.getElementById('bulkActionsBar');
                    const checkedCheckboxes = document.querySelectorAll('.story-checkbox:checked');
                    
                    return {
                        selectedCountText: selectedCount ? selectedCount.textContent : 'not found',
                        bulkActionsVisible: bulkActionsBar ? bulkActionsBar.style.display !== 'none' : false,
                        checkedCheckboxes: checkedCheckboxes.length,
                        selectedStoriesSize: window.selectedStories ? window.selectedStories.size : 0
                    };
                });
                
                console.log('📊 Selection test results:', selectionResult);
                
                if (selectionResult.checkedCheckboxes > 0 || selectionResult.selectedStoriesSize > 0) {
                    console.log('✅ Test 5: Checkbox interaction works');
                    testsPassed++;
                    
                    // Test 6: Bulk actions become visible
                    testsTotal++;
                    if (selectionResult.bulkActionsVisible) {
                        console.log('✅ Test 6: Bulk actions bar appears on selection');
                        testsPassed++;
                    } else {
                        console.log('❌ Test 6: Bulk actions bar does not appear');
                    }
                } else {
                    console.log('❌ Test 5: Checkbox interaction failed');
                }
                
            } catch (error) {
                console.log('❌ Test 5: Checkbox interaction error:', error.message);
            }
            
        } else {
            console.log('❌ Test 4: Story checkboxes are not visible');
        }
        
        // Final Assessment
        const successRate = Math.round((testsPassed / testsTotal) * 100);
        console.log('\n' + '='.repeat(60));
        console.log(`🎯 FINAL RESULTS: ${testsPassed}/${testsTotal} tests passed (${successRate}%)`);
        
        if (successRate >= 80) {
            console.log('🎉 MULTI-SELECT FUNCTIONALITY IS WORKING!');
        } else if (successRate >= 50) {
            console.log('⚠️  MULTI-SELECT FUNCTIONALITY IS PARTIALLY WORKING');
        } else {
            console.log('🚨 MULTI-SELECT FUNCTIONALITY HAS MAJOR ISSUES');
        }
        
        return {
            success: successRate >= 80,
            testsPassed,
            testsTotal,
            successRate,
            analysis
        };
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (browser) {
            // Keep browser open for 3 seconds to see results
            await new Promise(resolve => setTimeout(resolve, 3000));
            await browser.close();
        }
    }
}

// Run the test
testMultiSelectFunctionality()
    .then(result => {
        console.log('\n' + '='.repeat(60));
        if (result.success) {
            console.log('🎊 COMPREHENSIVE TEST PASSED: Multi-select is functional!');
        } else {
            console.log('⚠️  COMPREHENSIVE TEST: Issues found, see results above');
        }
        process.exit(result.success ? 0 : 1);
    })
    .catch(console.error);