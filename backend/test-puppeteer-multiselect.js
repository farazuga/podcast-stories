/**
 * PUPPETEER TEST: Browse Stories Multi-select Verification
 * 
 * This test uses Puppeteer to verify that multi-select functionality
 * is working correctly in the browse stories view.
 */

const puppeteer = require('puppeteer');

async function testBrowseStoriesMultiSelect() {
    console.log('🧪 PUPPETEER TEST: Browse Stories Multi-select Verification');
    console.log('='.repeat(70));
    
    let browser;
    let page;
    
    try {
        // Launch browser
        console.log('🚀 Launching browser...');
        browser = await puppeteer.launch({ 
            headless: false, // Set to false to see the browser
            slowMo: 100, // Slow down operations for visibility
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        
        // Navigate to login page first
        console.log('🔐 Navigating to login page...');
        await page.goto('https://podcast-stories-production.up.railway.app/login.html', { 
            waitUntil: 'networkidle0' 
        });
        
        // Login as admin
        console.log('🔑 Logging in as admin...');
        await page.type('#username', 'admin');
        await page.type('#password', 'admin123');
        await page.click('button[type="submit"]');
        
        // Wait for login redirect
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log('✅ Login successful');
        
        // Navigate to browse stories (stories.html)
        console.log('📖 Navigating to browse stories...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { 
            waitUntil: 'networkidle0' 
        });
        
        // Wait for stories to load
        console.log('⏳ Waiting for stories to load...');
        await page.waitForSelector('.story-grid', { timeout: 10000 });
        
        // Test Results Object
        const testResults = {
            pageLoaded: false,
            storiesFound: false,
            checkboxesPresent: false,
            selectAllButton: false,
            bulkActionsBar: false,
            checkboxFunctionality: false,
            bulkOperations: false,
            errors: []
        };
        
        // Test 1: Check if page loaded correctly
        const title = await page.title();
        console.log(`📄 Page title: ${title}`);
        testResults.pageLoaded = title.includes('VidPOD') || title.includes('Stories');
        
        // Test 2: Check if stories are loaded
        const storyCards = await page.$$('.story-card');
        const storyCount = storyCards.length;
        console.log(`📚 Found ${storyCount} story cards`);
        testResults.storiesFound = storyCount > 0;
        
        // Test 3: Check for checkboxes in story cards
        const checkboxes = await page.$$('.story-checkbox');
        const checkboxCount = checkboxes.length;
        console.log(`☑️  Found ${checkboxCount} story checkboxes`);
        testResults.checkboxesPresent = checkboxCount > 0;
        
        if (checkboxCount === 0) {
            console.log('🔍 Debugging: Looking for any checkbox-like elements...');
            const allInputs = await page.$$('input[type="checkbox"]');
            console.log(`   Found ${allInputs.length} total checkboxes on page`);
            
            // Check if there are any elements with checkbox-related classes
            const checkboxElements = await page.evaluate(() => {
                const elements = [];
                document.querySelectorAll('*').forEach(el => {
                    if (el.className && (
                        el.className.includes('checkbox') || 
                        el.className.includes('story-checkbox') ||
                        el.className.includes('selection')
                    )) {
                        elements.push({
                            tagName: el.tagName,
                            className: el.className,
                            id: el.id,
                            textContent: el.textContent?.substring(0, 50)
                        });
                    }
                });
                return elements;
            });
            console.log('   Checkbox-related elements:', checkboxElements);
        }
        
        // Test 4: Check for Select All button
        let selectAllButton = await page.$('#selectAllBtn');
        if (!selectAllButton) {
            selectAllButton = await page.$('button[onclick*="selectAll"]');
        }
        if (!selectAllButton) {
            selectAllButton = await page.$('button[onclick*="toggleSelectAll"]');
        }
        console.log(`🔘 Select All button: ${selectAllButton ? 'Found' : 'NOT FOUND'}`);
        testResults.selectAllButton = !!selectAllButton;
        
        // Test 5: Check for bulk actions bar
        const bulkActionsBar = await page.$('.bulk-actions-bar');
        console.log(`📋 Bulk actions bar: ${bulkActionsBar ? 'Found' : 'NOT FOUND'}`);
        testResults.bulkActionsBar = !!bulkActionsBar;
        
        // Test 6: Test checkbox functionality if checkboxes exist
        if (checkboxCount > 0) {
            console.log('🧪 Testing checkbox functionality...');
            
            // Try to click the first checkbox
            try {
                await checkboxes[0].click();
                console.log('   ✅ First checkbox clicked successfully');
                
                // Wait a moment for any UI updates
                await page.waitForTimeout(500);
                
                // Check if checkbox is now checked
                const isChecked = await checkboxes[0].evaluate(el => el.checked);
                console.log(`   ☑️  First checkbox checked: ${isChecked}`);
                testResults.checkboxFunctionality = isChecked;
                
                // Check if bulk actions bar appeared
                const bulkBarVisible = await page.evaluate(() => {
                    const bar = document.querySelector('.bulk-actions-bar');
                    return bar && bar.style.display !== 'none';
                });
                console.log(`   📋 Bulk actions bar visible after selection: ${bulkBarVisible}`);
                
            } catch (error) {
                console.log(`   ❌ Error clicking checkbox: ${error.message}`);
                testResults.errors.push(`Checkbox click error: ${error.message}`);
            }
        }
        
        // Test 7: Check for bulk operation buttons
        const bulkButtons = await page.$$('button[onclick*="bulk"]');
        console.log(`🔘 Found ${bulkButtons.length} bulk operation buttons`);
        
        if (bulkButtons.length > 0) {
            for (let i = 0; i < bulkButtons.length; i++) {
                const buttonText = await bulkButtons[i].evaluate(el => el.textContent?.trim());
                const onclickAttr = await bulkButtons[i].evaluate(el => el.getAttribute('onclick'));
                console.log(`   Button ${i + 1}: "${buttonText}" - onclick: ${onclickAttr}`);
            }
            testResults.bulkOperations = true;
        }
        
        // Additional debugging: Check the page's JavaScript functions
        console.log('🔍 Checking for multi-select JavaScript functions...');
        const jsInfo = await page.evaluate(() => {
            return {
                toggleSelectAll: typeof window.toggleSelectAll === 'function',
                bulkFavorite: typeof window.bulkFavorite === 'function',
                bulkDelete: typeof window.bulkDelete === 'function',
                bulkExport: typeof window.bulkExport === 'function',
                updateSelectionUI: typeof window.updateSelectionUI === 'function',
                selectedStories: typeof window.selectedStories !== 'undefined',
                selectedStoriesSize: window.selectedStories ? window.selectedStories.size : 'N/A'
            };
        });
        
        console.log('📋 JavaScript Functions Available:');
        Object.entries(jsInfo).forEach(([func, available]) => {
            console.log(`   ${func}: ${available}`);
        });
        
        // Test Results Summary
        console.log('\n' + '='.repeat(70));
        console.log('🎯 TEST RESULTS SUMMARY');
        console.log('='.repeat(70));
        
        const allTestsPassed = Object.entries(testResults).every(([key, value]) => 
            key === 'errors' || (Array.isArray(value) ? value.length === 0 : value === true)
        );
        
        Object.entries(testResults).forEach(([test, result]) => {
            if (test !== 'errors') {
                const status = result ? '✅' : '❌';
                console.log(`${status} ${test}: ${result}`);
            }
        });
        
        if (testResults.errors.length > 0) {
            console.log('\n❌ ERRORS FOUND:');
            testResults.errors.forEach(error => {
                console.log(`   • ${error}`);
            });
        }
        
        console.log(`\n🎯 OVERALL STATUS: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ ISSUES FOUND'}`);
        
        if (!testResults.checkboxesPresent) {
            console.log('\n🔧 DIAGNOSIS: Multi-select checkboxes are MISSING from stories.html');
            console.log('   This indicates the multi-select implementation was not applied to the browse stories view.');
        }
        
        return {
            success: allTestsPassed,
            results: testResults,
            jsInfo: jsInfo,
            storyCount: storyCount,
            checkboxCount: checkboxCount
        };
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testBrowseStoriesMultiSelect()
    .then(result => {
        console.log('\n' + '='.repeat(70));
        if (result.success) {
            console.log('🎊 PUPPETEER TEST: SUCCESS');
            console.log(`   Multi-select functionality is working in browse stories`);
        } else {
            console.log('⚠️  PUPPETEER TEST: ISSUES DETECTED');
            console.log(`   Multi-select functionality needs debugging in browse stories`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        }
    })
    .catch(console.error);