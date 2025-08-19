/**
 * SIMPLE PUPPETEER TEST: Multi-select Functionality Verification
 * 
 * Quick test to verify if checkboxes are visible on stories page
 */

const puppeteer = require('puppeteer');

async function testMultiSelectVisibility() {
    console.log('🧪 SIMPLE TEST: Multi-select Checkbox Visibility');
    console.log('='.repeat(50));
    
    let browser;
    let page;
    
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 100 });
        page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        
        // Go directly to the stories page (assuming it will redirect to login if needed)
        console.log('🌐 Navigating to stories page...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { 
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Check current URL - if redirected to login, we need to login
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('index.html') || currentUrl.includes('login')) {
            console.log('🔐 Detected login redirect, logging in...');
            
            // Fill login form
            await page.waitForSelector('input[type="text"], input[type="email"]', { timeout: 5000 });
            const emailInput = await page.$('input[type="email"]');
            const usernameInput = await page.$('input[type="text"]');
            
            if (emailInput) {
                await page.type('input[type="email"]', 'admin@vidpod.com');
            } else if (usernameInput) {
                await page.type('input[type="text"]', 'admin');
            }
            
            await page.type('input[type="password"]', 'vidpod');
            await page.click('button[type="submit"]');
            
            // Wait for login redirect
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            console.log('✅ Login successful');
            
            // Navigate to stories page again
            await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { 
                waitUntil: 'networkidle0' 
            });
        }
        
        console.log('📖 Now on stories page, checking for multi-select elements...');
        
        // Wait for stories to load
        await new Promise(resolve => setTimeout(resolve, 2000)); // Give it time to load
        
        // Check for key multi-select elements
        console.log('🔍 Checking for multi-select elements...');
        
        const results = await page.evaluate(() => {
            return {
                // Check for select all checkbox
                selectAllCheckbox: !!document.getElementById('selectAllCheckbox'),
                selectAllCheckboxVisible: document.getElementById('selectAllCheckbox')?.offsetParent !== null,
                
                // Check for story checkboxes
                storyCheckboxes: document.querySelectorAll('.story-checkbox').length,
                storyCheckboxesVisible: Array.from(document.querySelectorAll('.story-checkbox')).filter(cb => cb.offsetParent !== null).length,
                
                // Check for bulk actions bar
                bulkActionsBar: !!document.getElementById('bulkActionsBar'),
                bulkActionsBarVisible: document.getElementById('bulkActionsBar')?.style.display !== 'none',
                
                // Check for story cards
                storyCards: document.querySelectorAll('.story-card').length,
                
                // Check current selectionMode value
                selectionMode: window.selectionMode,
                selectedStoriesSize: window.selectedStories ? window.selectedStories.size : 'N/A',
                
                // Check if stories are loaded
                storiesLoaded: window.filteredStories ? window.filteredStories.length : 0
            };
        });
        
        console.log('📊 Test Results:');
        console.log(`   Stories loaded: ${results.storiesLoaded}`);
        console.log(`   Story cards found: ${results.storyCards}`);
        console.log(`   Select all checkbox exists: ${results.selectAllCheckbox}`);
        console.log(`   Select all checkbox visible: ${results.selectAllCheckboxVisible}`);
        console.log(`   Story checkboxes found: ${results.storyCheckboxes}`);
        console.log(`   Story checkboxes visible: ${results.storyCheckboxesVisible}`);
        console.log(`   Bulk actions bar exists: ${results.bulkActionsBar}`);
        console.log(`   Bulk actions bar visible: ${results.bulkActionsBarVisible}`);
        console.log(`   Selection mode: ${results.selectionMode}`);
        console.log(`   Selected stories: ${results.selectedStoriesSize}`);
        
        // Diagnosis
        console.log('\n🔬 DIAGNOSIS:');
        
        if (results.storyCards === 0) {
            console.log('❌ No story cards found - stories may not be loading');
        } else if (results.storyCheckboxes === 0) {
            console.log('❌ ISSUE CONFIRMED: Story checkboxes are NOT present');
            console.log('   This means selectionMode is false, preventing checkboxes from rendering');
        } else if (results.storyCheckboxesVisible === 0) {
            console.log('❌ Story checkboxes exist but are not visible');
        } else {
            console.log('✅ Multi-select checkboxes are working correctly');
        }
        
        if (!results.selectAllCheckboxVisible) {
            console.log('   Select all checkbox is not visible');
        }
        
        return {
            success: results.storyCheckboxes > 0 && results.storyCheckboxesVisible > 0,
            results
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testMultiSelectVisibility()
    .then(result => {
        console.log('\n' + '='.repeat(50));
        if (result.success) {
            console.log('🎉 TEST PASSED: Multi-select functionality is visible and working');
        } else {
            console.log('🚨 TEST FAILED: Multi-select functionality has issues');
            console.log('   Likely cause: Checkboxes only render when selectionMode=true');
            console.log('   Solution: Modify renderStoryCard() to always show checkboxes');
        }
    })
    .catch(console.error);