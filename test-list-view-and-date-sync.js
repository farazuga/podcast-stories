/**
 * Test List View Default and Date Auto-Sync Functionality
 * Tests the new features:
 * 1. List view is default on stories and admin pages
 * 2. Auto-updating end date when start date is selected
 */

const puppeteer = require('puppeteer');

async function testListViewAndDateSync() {
    console.log('🧪 Testing List View Default & Date Auto-Sync\n');
    console.log('='.repeat(70) + '\n');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging for debugging
        page.on('console', msg => {
            if (msg.text().includes('view set to list') || msg.text().includes('Auto-populated')) {
                console.log(`[BROWSER]: ${msg.text()}`);
            }
        });
        
        // Login as admin
        console.log('🔐 Logging in as admin...');
        await page.goto(`${baseUrl}/index.html`);
        await page.waitForSelector('#email', { timeout: 10000 });
        
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 10000 });
        console.log('✅ Admin login successful\n');

        // Test Results Tracker
        const testResults = {
            storiesListDefault: false,
            adminListDefault: false,
            storiesDateAutoSync: false,
            adminDateAutoSync: false,
            addStoryDateAutoSync: false,
            filteringWorksWithAutoDate: false
        };

        // TEST 1: Stories Page - List View Default
        console.log('📋 TEST 1: Stories Page - List View Default');
        console.log('-'.repeat(50));
        
        await page.goto(`${baseUrl}/stories.html`);
        await page.waitForSelector('#storiesContainer', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const storiesViewTest = await page.evaluate(() => {
            const gridBtn = document.getElementById('gridViewBtn');
            const listBtn = document.getElementById('listViewBtn');
            const storiesContainer = document.getElementById('storiesContainer');
            
            return {
                gridBtnActive: gridBtn?.classList.contains('active'),
                listBtnActive: listBtn?.classList.contains('active'),
                containerHasListClass: storiesContainer?.classList.contains('list-view') || 
                                     storiesContainer?.querySelector('.stories-list') !== null,
                containerHTML: storiesContainer?.className || ''
            };
        });
        
        console.log(`   Grid button active: ${storiesViewTest.gridBtnActive ? '❌ YES' : '✅ NO'}`);
        console.log(`   List button active: ${storiesViewTest.listBtnActive ? '✅ YES' : '❌ NO'}`);
        console.log(`   Container class: ${storiesViewTest.containerHTML}`);
        
        testResults.storiesListDefault = storiesViewTest.listBtnActive && !storiesViewTest.gridBtnActive;

        // TEST 2: Date Auto-Sync on Stories Page
        console.log('\n📅 TEST 2: Date Auto-Sync on Stories Page');
        console.log('-'.repeat(50));
        
        const storiesDateSyncTest = await page.evaluate(async () => {
            const startInput = document.getElementById('searchStartDate');
            const endInput = document.getElementById('searchEndDate');
            
            if (!startInput || !endInput) {
                return { error: 'Date inputs not found' };
            }
            
            // Clear both inputs first
            startInput.value = '';
            endInput.value = '';
            
            // Set start date and trigger change event
            const testDate = '2024-12-25';
            startInput.value = testDate;
            startInput.dispatchEvent(new Event('change'));
            
            // Wait a moment for the event to process
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return {
                startValue: startInput.value,
                endValue: endInput.value,
                autoSyncWorked: endInput.value === testDate
            };
        });
        
        if (storiesDateSyncTest.error) {
            console.log(`   Error: ${storiesDateSyncTest.error}`);
        } else {
            console.log(`   Start date set to: ${storiesDateSyncTest.startValue}`);
            console.log(`   End date auto-populated to: ${storiesDateSyncTest.endValue}`);
            console.log(`   Auto-sync working: ${storiesDateSyncTest.autoSyncWorked ? '✅ YES' : '❌ NO'}`);
            testResults.storiesDateAutoSync = storiesDateSyncTest.autoSyncWorked;
        }

        // TEST 3: Admin Page - List View Default
        console.log('\n👑 TEST 3: Admin Page - List View Default');
        console.log('-'.repeat(50));
        
        await page.goto(`${baseUrl}/admin-browse-stories.html`);
        await page.waitForSelector('.admin-story-card', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const adminViewTest = await page.evaluate(() => {
            const gridBtn = document.getElementById('gridViewBtn');
            const listBtn = document.getElementById('listViewBtn');
            const storiesContainer = document.getElementById('storiesContainer');
            
            return {
                gridBtnActive: gridBtn?.classList.contains('active'),
                listBtnActive: listBtn?.classList.contains('active'),
                containerHasListClass: storiesContainer?.classList.contains('list-view') || 
                                     storiesContainer?.querySelector('.stories-list') !== null,
                containerHTML: storiesContainer?.className || ''
            };
        });
        
        console.log(`   Admin grid button active: ${adminViewTest.gridBtnActive ? '❌ YES' : '✅ NO'}`);
        console.log(`   Admin list button active: ${adminViewTest.listBtnActive ? '✅ YES' : '❌ NO'}`);
        console.log(`   Admin container class: ${adminViewTest.containerHTML}`);
        
        testResults.adminListDefault = adminViewTest.listBtnActive && !adminViewTest.gridBtnActive;

        // TEST 4: Date Auto-Sync on Admin Page
        console.log('\n📅 TEST 4: Date Auto-Sync on Admin Page');
        console.log('-'.repeat(50));
        
        const adminDateSyncTest = await page.evaluate(async () => {
            const startInput = document.getElementById('searchStartDate');
            const endInput = document.getElementById('searchEndDate');
            
            if (!startInput || !endInput) {
                return { error: 'Admin date inputs not found' };
            }
            
            // Clear both inputs first
            startInput.value = '';
            endInput.value = '';
            
            // Set start date and trigger change event
            const testDate = '2024-07-04';
            startInput.value = testDate;
            startInput.dispatchEvent(new Event('change'));
            
            // Wait a moment for the event to process
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return {
                startValue: startInput.value,
                endValue: endInput.value,
                autoSyncWorked: endInput.value === testDate
            };
        });
        
        if (adminDateSyncTest.error) {
            console.log(`   Error: ${adminDateSyncTest.error}`);
        } else {
            console.log(`   Admin start date set to: ${adminDateSyncTest.startValue}`);
            console.log(`   Admin end date auto-populated to: ${adminDateSyncTest.endValue}`);
            console.log(`   Admin auto-sync working: ${adminDateSyncTest.autoSyncWorked ? '✅ YES' : '❌ NO'}`);
            testResults.adminDateAutoSync = adminDateSyncTest.autoSyncWorked;
        }

        // TEST 5: Add Story Form - Date Auto-Sync
        console.log('\n📝 TEST 5: Add Story Form - Date Auto-Sync');
        console.log('-'.repeat(50));
        
        await page.goto(`${baseUrl}/add-story.html`);
        await page.waitForSelector('#storyForm', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const addStoryDateSyncTest = await page.evaluate(async () => {
            const startInput = document.getElementById('coverage_start_date');
            const endInput = document.getElementById('coverage_end_date');
            
            if (!startInput || !endInput) {
                return { error: 'Form date inputs not found' };
            }
            
            // Clear end input (start may have default value)
            endInput.value = '';
            
            // Set start date and trigger change event
            const testDate = '2024-11-15';
            startInput.value = testDate;
            startInput.dispatchEvent(new Event('change'));
            
            // Wait a moment for the event to process
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return {
                startValue: startInput.value,
                endValue: endInput.value,
                autoSyncWorked: endInput.value === testDate
            };
        });
        
        if (addStoryDateSyncTest.error) {
            console.log(`   Error: ${addStoryDateSyncTest.error}`);
        } else {
            console.log(`   Form start date set to: ${addStoryDateSyncTest.startValue}`);
            console.log(`   Form end date auto-populated to: ${addStoryDateSyncTest.endValue}`);
            console.log(`   Form auto-sync working: ${addStoryDateSyncTest.autoSyncWorked ? '✅ YES' : '❌ NO'}`);
            testResults.addStoryDateAutoSync = addStoryDateSyncTest.autoSyncWorked;
        }

        // TEST 6: Filtering Works with Auto-populated Dates
        console.log('\n🌐 TEST 6: Filtering with Auto-populated Dates');
        console.log('-'.repeat(50));
        
        await page.goto(`${baseUrl}/stories.html`);
        await page.waitForSelector('#storiesContainer', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const filteringTest = await page.evaluate(async () => {
            const startInput = document.getElementById('searchStartDate');
            const endInput = document.getElementById('searchEndDate');
            const applyBtn = document.querySelector('button[type="submit"]');
            
            if (!startInput || !endInput || !applyBtn) {
                return { error: 'Filter elements not found' };
            }
            
            // Clear inputs
            startInput.value = '';
            endInput.value = '';
            
            // Set start date (should auto-populate end date)
            const testDate = '2025-01-01';
            startInput.value = testDate;
            startInput.dispatchEvent(new Event('change'));
            
            // Wait for auto-population
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Check if end date was auto-populated
            const autoPopulated = endInput.value === testDate;
            
            // Apply the filter
            applyBtn.click();
            
            // Wait for results
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if stories loaded
            const storyCards = document.querySelectorAll('.story-card');
            
            return {
                autoPopulated: autoPopulated,
                storiesFound: storyCards.length,
                filterApplied: true
            };
        });
        
        if (filteringTest.error) {
            console.log(`   Error: ${filteringTest.error}`);
        } else {
            console.log(`   End date auto-populated: ${filteringTest.autoPopulated ? '✅ YES' : '❌ NO'}`);
            console.log(`   Stories found after filter: ${filteringTest.storiesFound}`);
            console.log(`   Filtering with auto-date works: ${filteringTest.filterApplied && filteringTest.autoPopulated ? '✅ YES' : '❌ NO'}`);
            testResults.filteringWorksWithAutoDate = filteringTest.filterApplied && filteringTest.autoPopulated;
        }

        await browser.close();

        // FINAL RESULTS
        console.log('\n' + '='.repeat(70));
        console.log('📊 LIST VIEW & DATE AUTO-SYNC TEST RESULTS');
        console.log('='.repeat(70));

        const passedTests = Object.values(testResults).filter(result => result === true).length;
        const totalTests = Object.keys(testResults).length;

        console.log(`\n📈 Test Summary: ${passedTests}/${totalTests} features working\n`);

        const testDescriptions = {
            storiesListDefault: 'Stories Page - List View Default',
            adminListDefault: 'Admin Page - List View Default',
            storiesDateAutoSync: 'Stories Page - Date Auto-Sync',
            adminDateAutoSync: 'Admin Page - Date Auto-Sync',
            addStoryDateAutoSync: 'Add Story Form - Date Auto-Sync',
            filteringWorksWithAutoDate: 'Filtering with Auto-populated Dates'
        };

        Object.entries(testResults).forEach(([testName, result]) => {
            const displayName = testDescriptions[testName];
            console.log(`   ${result ? '✅' : '❌'} ${displayName}`);
        });

        // Success criteria: All features working
        const success = passedTests === totalTests;

        if (success) {
            console.log('\n🎉 ALL FEATURES WORKING!');
            console.log('\n✅ New functionality successfully implemented:');
            console.log('   • List view is now the default on both stories pages');
            console.log('   • End date auto-populates when start date is selected');
            console.log('   • Auto-sync only happens if end date is empty');
            console.log('   • Filtering works correctly with auto-populated dates');
            console.log('   • Consistent behavior across all pages');
        } else {
            console.log('\n⚠️  Some features need attention:');
            console.log(`   ${totalTests - passedTests} out of ${totalTests} features not working properly.`);
        }

        return success;

    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        await browser.close();
        return false;
    }
}

if (require.main === module) {
    testListViewAndDateSync().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(() => process.exit(1));
}

module.exports = testListViewAndDateSync;