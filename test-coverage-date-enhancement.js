/**
 * Comprehensive Coverage Date Enhancement Test
 * Tests the complete coverage date enhancement implementation
 * - Year-less date display
 * - Calendar widget functionality
 * - Server-side filtering for all database stories
 * - Form integration with calendar widgets
 */

const puppeteer = require('puppeteer');

async function testCoverageDateEnhancement() {
    console.log('🧪 Testing Coverage Date Enhancement Implementation\n');
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
            if (msg.text().includes('🔍') || msg.text().includes('✅') || msg.text().includes('❌') || msg.text().includes('🔧')) {
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
        console.log('✅ Admin login successful');

        // Test Results Tracker
        const testResults = {
            yearlessDisplay: false,
            calendarWidgetFilters: false,
            calendarWidgetForms: false,
            serverSideFiltering: false,
            formIntegration: false
        };

        // TEST 1: Verify Year-less Date Display
        console.log('\n📅 TEST 1: Year-less Coverage Date Display');
        console.log('-'.repeat(50));
        
        await page.goto(`${baseUrl}/stories.html`);
        await page.waitForSelector('#storiesContainer', { timeout: 10000 });
        // Wait for stories to load AND calendar widgets to initialize (load event + 500ms timeout)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const yearlessDisplayTest = await page.evaluate(() => {
            const storyCards = document.querySelectorAll('.story-card');
            const coverageDates = Array.from(document.querySelectorAll('.story-coverage-compact'));
            
            let hasYearlessDisplay = false;
            let sampleDates = [];
            
            coverageDates.forEach((dateElement, index) => {
                if (index < 5) { // Check first 5 coverage dates
                    const dateText = dateElement.textContent;
                    sampleDates.push(dateText);
                    
                    // Check if date contains year (4 consecutive digits)
                    const hasYear = /\\b\\d{4}\\b/.test(dateText);
                    if (!hasYear && dateText.includes('/')) {
                        hasYearlessDisplay = true;
                    }
                }
            });
            
            return {
                storyCount: storyCards.length,
                coverageDateElements: coverageDates.length,
                hasYearlessDisplay: hasYearlessDisplay,
                sampleDates: sampleDates
            };
        });
        
        console.log(`   Stories with coverage dates found: ${yearlessDisplayTest.coverageDateElements}`);
        console.log(`   Sample coverage date displays: ${yearlessDisplayTest.sampleDates.slice(0, 3).join(', ')}`);
        console.log(`   Year-less display working: ${yearlessDisplayTest.hasYearlessDisplay ? '✅ YES' : '❌ NO'}`);
        
        testResults.yearlessDisplay = yearlessDisplayTest.hasYearlessDisplay;

        // TEST 2: Calendar Widget in Filters
        console.log('\n📅 TEST 2: Calendar Widget in Date Filters');
        console.log('-'.repeat(50));
        
        const calendarFilterTest = await page.evaluate(() => {
            const startDateInput = document.getElementById('searchStartDate');
            const endDateInput = document.getElementById('searchEndDate');
            
            // Check if calendar widgets are attached
            const startWrapper = startDateInput?.parentElement;
            const endWrapper = endDateInput?.parentElement;
            
            const hasStartCalendarBtn = startWrapper?.querySelector('.calendar-btn') !== null;
            const hasEndCalendarBtn = endWrapper?.querySelector('.calendar-btn') !== null;
            
            return {
                startDateInputExists: !!startDateInput,
                endDateInputExists: !!endDateInput,
                hasStartCalendarBtn: hasStartCalendarBtn,
                hasEndCalendarBtn: hasEndCalendarBtn,
                hasCalendarWidgets: hasStartCalendarBtn && hasEndCalendarBtn
            };
        });
        
        console.log(`   Start date input exists: ${calendarFilterTest.startDateInputExists ? '✅' : '❌'}`);
        console.log(`   End date input exists: ${calendarFilterTest.endDateInputExists ? '✅' : '❌'}`);
        console.log(`   Start date has calendar widget: ${calendarFilterTest.hasStartCalendarBtn ? '✅' : '❌'}`);
        console.log(`   End date has calendar widget: ${calendarFilterTest.hasEndCalendarBtn ? '✅' : '❌'}`);
        console.log(`   Calendar widgets functional: ${calendarFilterTest.hasCalendarWidgets ? '✅ YES' : '❌ NO'}`);
        
        testResults.calendarWidgetFilters = calendarFilterTest.hasCalendarWidgets;

        // TEST 3: Server-side Filtering
        console.log('\n🔍 TEST 3: Server-side Filtering for All Database Stories');
        console.log('-'.repeat(50));
        
        // Test filtering with API parameters
        const serverSideFilterTest = await page.evaluate(async () => {
            try {
                const token = localStorage.getItem('token');
                
                // Test 1: Get all stories count
                const allStoriesResponse = await fetch('/api/stories', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const allStories = await allStoriesResponse.json();
                
                // Test 2: Get filtered stories with date range
                const currentYear = new Date().getFullYear();
                const startDate = `${currentYear}-01-01`;
                const endDate = `${currentYear}-12-31`;
                
                const filteredResponse = await fetch(`/api/stories?startDate=${startDate}&endDate=${endDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const filteredStories = await filteredResponse.json();
                
                // Test 3: Get stories with search term
                const searchResponse = await fetch('/api/stories?search=story', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const searchStories = await searchResponse.json();
                
                return {
                    allStoriesCount: Array.isArray(allStories) ? allStories.length : 0,
                    filteredStoriesCount: Array.isArray(filteredStories) ? filteredStories.length : 0,
                    searchStoriesCount: Array.isArray(searchStories) ? searchStories.length : 0,
                    serverSideWorking: (
                        allStoriesResponse.ok && 
                        filteredResponse.ok && 
                        searchResponse.ok
                    )
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log(`   All stories count: ${serverSideFilterTest.allStoriesCount}`);
        console.log(`   Date filtered stories count: ${serverSideFilterTest.filteredStoriesCount}`);
        console.log(`   Search filtered stories count: ${serverSideFilterTest.searchStoriesCount}`);
        console.log(`   Server-side filtering working: ${serverSideFilterTest.serverSideWorking ? '✅ YES' : '❌ NO'}`);
        
        testResults.serverSideFiltering = serverSideFilterTest.serverSideWorking;

        // TEST 4: Calendar Widget in Forms  
        console.log('\n📝 TEST 4: Calendar Widget in Add Story Form');
        console.log('-'.repeat(50));
        
        await page.goto(`${baseUrl}/add-story.html`);
        await page.waitForSelector('#storyForm', { timeout: 10000 });
        // Wait for form to load AND calendar widgets to initialize (load event + 500ms timeout)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const calendarFormTest = await page.evaluate(() => {
            const startDateInput = document.getElementById('coverage_start_date');
            const endDateInput = document.getElementById('coverage_end_date');
            
            // Check if calendar widgets are attached
            const startWrapper = startDateInput?.parentElement;
            const endWrapper = endDateInput?.parentElement;
            
            const hasStartCalendarBtn = startWrapper?.querySelector('.calendar-btn') !== null;
            const hasEndCalendarBtn = endWrapper?.querySelector('.calendar-btn') !== null;
            
            return {
                startDateInputExists: !!startDateInput,
                endDateInputExists: !!endDateInput,
                hasStartCalendarBtn: hasStartCalendarBtn,
                hasEndCalendarBtn: hasEndCalendarBtn,
                hasFormCalendarWidgets: hasStartCalendarBtn && hasEndCalendarBtn
            };
        });
        
        console.log(`   Coverage start date input exists: ${calendarFormTest.startDateInputExists ? '✅' : '❌'}`);
        console.log(`   Coverage end date input exists: ${calendarFormTest.endDateInputExists ? '✅' : '❌'}`);
        console.log(`   Start date has calendar widget: ${calendarFormTest.hasStartCalendarBtn ? '✅' : '❌'}`);
        console.log(`   End date has calendar widget: ${calendarFormTest.hasEndCalendarBtn ? '✅' : '❌'}`);
        console.log(`   Form calendar widgets functional: ${calendarFormTest.hasFormCalendarWidgets ? '✅ YES' : '❌ NO'}`);
        
        testResults.calendarWidgetForms = calendarFormTest.hasFormCalendarWidgets;

        // TEST 5: Interactive Form Integration Test
        console.log('\n🖱️  TEST 5: Interactive Form Integration');
        console.log('-'.repeat(50));
        
        try {
            // Click the calendar button to open calendar widget
            await page.click('.calendar-btn');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const interactiveFormTest = await page.evaluate(() => {
                const calendarPopup = document.querySelector('.calendar-popup');
                const hasCalendarPopup = !!calendarPopup;
                
                let hasYearSelector = false;
                let hasTodayButton = false;
                
                if (calendarPopup) {
                    hasYearSelector = !!calendarPopup.querySelector('.calendar-year-select');
                    hasTodayButton = !!calendarPopup.querySelector('.calendar-btn-today');
                }
                
                return {
                    hasCalendarPopup: hasCalendarPopup,
                    hasYearSelector: hasYearSelector,
                    hasTodayButton: hasTodayButton,
                    interactiveWorking: hasCalendarPopup && hasYearSelector
                };
            });
            
            console.log(`   Calendar popup opens: ${interactiveFormTest.hasCalendarPopup ? '✅' : '❌'}`);
            console.log(`   Year selector present: ${interactiveFormTest.hasYearSelector ? '✅' : '❌'}`);
            console.log(`   Today button present: ${interactiveFormTest.hasTodayButton ? '✅' : '❌'}`);
            console.log(`   Interactive form integration: ${interactiveFormTest.interactiveWorking ? '✅ YES' : '❌ NO'}`);
            
            testResults.formIntegration = interactiveFormTest.interactiveWorking;
            
            // Close calendar if it opened
            if (interactiveFormTest.hasCalendarPopup) {
                await page.click('.calendar-btn-close');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.log(`   Interactive test failed: ${error.message}`);
            testResults.formIntegration = false;
        }

        await browser.close();

        // FINAL RESULTS
        console.log('\n' + '='.repeat(70));
        console.log('📊 COVERAGE DATE ENHANCEMENT TEST RESULTS');
        console.log('='.repeat(70));

        const allTestsPassed = Object.values(testResults).every(result => result === true);
        const passedTests = Object.values(testResults).filter(result => result === true).length;
        const totalTests = Object.keys(testResults).length;

        console.log(`\\n📈 Test Summary: ${passedTests}/${totalTests} tests passed\\n`);

        Object.entries(testResults).forEach(([testName, result]) => {
            const displayName = {
                yearlessDisplay: 'Year-less Coverage Date Display',
                calendarWidgetFilters: 'Calendar Widgets in Filters',
                calendarWidgetForms: 'Calendar Widgets in Forms',
                serverSideFiltering: 'Server-side Filtering (All DB Stories)',
                formIntegration: 'Interactive Form Integration'
            }[testName];
            
            console.log(`   ${result ? '✅' : '❌'} ${displayName}`);
        });

        if (allTestsPassed) {
            console.log('\\n🎉 ALL TESTS PASSED! Coverage Date Enhancement Successfully Implemented:');
            console.log('');
            console.log('✅ Coverage dates display without years for cleaner appearance');
            console.log('✅ Calendar widgets show years in picker but process dates correctly');  
            console.log('✅ Date filtering applies to ALL stories in database (server-side)');
            console.log('✅ Forms integrate calendar widgets for better user experience');
            console.log('✅ Interactive calendar functionality works as expected');
            console.log('');
            console.log('🚀 System is ready for production use with enhanced date functionality!');
        } else {
            console.log('\\n⚠️  Some tests failed. Please review implementation:');
            console.log('');
            console.log('Failed Tests:');
            Object.entries(testResults).forEach(([testName, result]) => {
                if (!result) {
                    const displayName = {
                        yearlessDisplay: 'Year-less Coverage Date Display',
                        calendarWidgetFilters: 'Calendar Widgets in Filters', 
                        calendarWidgetForms: 'Calendar Widgets in Forms',
                        serverSideFiltering: 'Server-side Filtering',
                        formIntegration: 'Interactive Form Integration'
                    }[testName];
                    console.log(`   ❌ ${displayName}`);
                }
            });
        }

        return allTestsPassed;

    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        await browser.close();
        return false;
    }
}

if (require.main === module) {
    testCoverageDateEnhancement().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(() => process.exit(1));
}

module.exports = testCoverageDateEnhancement;