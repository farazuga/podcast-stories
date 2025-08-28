/**
 * Simple Calendar Widget Loading Test
 * Tests if the calendar widget JavaScript loads correctly
 */

const puppeteer = require('puppeteer');

async function testCalendarWidgetLoading() {
    console.log('🔧 Testing Calendar Widget JavaScript Loading\n');
    
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Enable all console logging
        page.on('console', msg => {
            console.log(`[BROWSER]: ${msg.text()}`);
        });
        
        // Enable error logging
        page.on('pageerror', error => {
            console.log(`[PAGE ERROR]: ${error.message}`);
        });
        
        // Login as admin
        console.log('🔐 Logging in...');
        await page.goto(`${baseUrl}/index.html`);
        await page.waitForSelector('#email', { timeout: 10000 });
        
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 10000 });
        
        // Go to stories page and check for calendar widget
        console.log('📄 Loading stories page...');
        await page.goto(`${baseUrl}/stories.html`);
        await page.waitForSelector('#storiesContainer', { timeout: 10000 });
        
        // Wait extra long for any initialization
        console.log('⏳ Waiting for initialization...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Check what's available
        const debugInfo = await page.evaluate(() => {
            return {
                hasCalendarWidget: typeof window.CalendarWidget !== 'undefined',
                calendarWidgetType: typeof window.CalendarWidget,
                calendarWidgetInitialized: window.CalendarWidget?.initialized,
                hasInitMethod: typeof window.CalendarWidget?.init,
                formatDateSafeWithoutYear: typeof window.formatDateSafeWithoutYear,
                formatDateForCalendar: typeof window.formatDateForCalendar,
                searchStartDateExists: !!document.getElementById('searchStartDate'),
                searchEndDateExists: !!document.getElementById('searchEndDate'),
                windowLoadFired: document.readyState,
                scriptsInHead: Array.from(document.head.querySelectorAll('script')).map(s => s.src).filter(src => src.includes('calendar'))
            };
        });
        
        console.log('\n🔍 Debug Information:');
        console.log(`   CalendarWidget exists: ${debugInfo.hasCalendarWidget ? '✅' : '❌'}`);
        console.log(`   CalendarWidget type: ${debugInfo.calendarWidgetType}`);
        console.log(`   CalendarWidget initialized: ${debugInfo.calendarWidgetInitialized}`);
        console.log(`   CalendarWidget.init method: ${debugInfo.hasInitMethod}`);
        console.log(`   formatDateSafeWithoutYear: ${debugInfo.formatDateSafeWithoutYear}`);
        console.log(`   formatDateForCalendar: ${debugInfo.formatDateForCalendar}`);
        console.log(`   Search start date input: ${debugInfo.searchStartDateExists ? '✅' : '❌'}`);
        console.log(`   Search end date input: ${debugInfo.searchEndDateExists ? '✅' : '❌'}`);
        console.log(`   Document ready state: ${debugInfo.windowLoadFired}`);
        console.log(`   Calendar scripts found: ${debugInfo.scriptsInHead}`);
        
        // Try manual initialization
        console.log('\n🔧 Attempting manual calendar widget initialization...');
        const manualInitResult = await page.evaluate(() => {
            if (window.CalendarWidget && typeof window.CalendarWidget.init === 'function') {
                try {
                    window.CalendarWidget.init('searchStartDate', {
                        stripYearFromValue: false,
                        showYearInForm: true,
                        currentYearDefault: true
                    });
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }
            return { success: false, error: 'CalendarWidget not available' };
        });
        
        console.log(`   Manual initialization: ${manualInitResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (!manualInitResult.success) {
            console.log(`   Error: ${manualInitResult.error}`);
        }
        
        // Check if manual initialization created calendar buttons
        if (manualInitResult.success) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const hasButtons = await page.evaluate(() => {
                return document.querySelectorAll('.calendar-btn').length > 0;
            });
            console.log(`   Calendar buttons created: ${hasButtons ? '✅' : '❌'}`);
        }
        
        await browser.close();
        return debugInfo.hasCalendarWidget;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await browser.close();
        return false;
    }
}

testCalendarWidgetLoading().catch(console.error);