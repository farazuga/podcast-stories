/**
 * Simple test to verify year-less date display
 */

const puppeteer = require('puppeteer');

async function testYearlessDisplay() {
    console.log('🧪 Testing Year-less Date Display\n');
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging for debugging
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('formatDateSafe') || text.includes('📅')) {
                console.log(`[BROWSER]: ${text}`);
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
        console.log('✅ Login successful\n');

        // Check if formatDateSafeWithoutYear exists
        console.log('📅 Checking date formatting functions...');
        const functionsExist = await page.evaluate(() => {
            return {
                formatDateSafe: typeof window.formatDateSafe === 'function',
                formatDateSafeWithoutYear: typeof window.formatDateSafeWithoutYear === 'function',
                formatDateForCalendar: typeof window.formatDateForCalendar === 'function'
            };
        });
        console.log('Function availability:', functionsExist);
        
        // Test the function directly in browser
        if (functionsExist.formatDateSafeWithoutYear) {
            const testResult = await page.evaluate(() => {
                return {
                    test1: window.formatDateSafeWithoutYear('2025-01-01'),
                    test2: window.formatDateSafeWithoutYear('2024-12-25'),
                    test3: window.formatDateSafeWithoutYear('2023-07-04')
                };
            });
            console.log('Direct function test results:', testResult);
        }

        // Check stories page
        console.log('\n📚 Checking stories page...');
        await page.goto(`${baseUrl}/stories.html`);
        await page.waitForSelector('#storiesContainer', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Extract actual HTML of coverage dates
        const coverageDatesHTML = await page.evaluate(() => {
            const elements = document.querySelectorAll('.story-coverage-compact');
            return Array.from(elements).slice(0, 5).map(el => ({
                text: el.textContent,
                html: el.innerHTML
            }));
        });
        
        console.log('Coverage dates found:');
        coverageDatesHTML.forEach((date, i) => {
            console.log(`  ${i + 1}. Text: "${date.text}" | HTML: "${date.html}"`);
            // Check if it contains a year (4 digits)
            const hasYear = /\b\d{4}\b/.test(date.text);
            console.log(`     Has year: ${hasYear ? '❌ YES' : '✅ NO'}`);
        });

        // Check admin browse stories
        console.log('\n👑 Checking admin browse stories...');
        await page.goto(`${baseUrl}/admin-browse-stories.html`);
        await page.waitForSelector('.admin-story-card', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const adminDatesHTML = await page.evaluate(() => {
            const elements = document.querySelectorAll('.story-coverage-compact');
            return Array.from(elements).slice(0, 5).map(el => ({
                text: el.textContent,
                html: el.innerHTML
            }));
        });
        
        console.log('Admin coverage dates found:');
        adminDatesHTML.forEach((date, i) => {
            console.log(`  ${i + 1}. Text: "${date.text}" | HTML: "${date.html}"`);
            const hasYear = /\b\d{4}\b/.test(date.text);
            console.log(`     Has year: ${hasYear ? '❌ YES' : '✅ NO'}`);
        });

        // Summary
        console.log('\n📊 SUMMARY');
        console.log('='.repeat(50));
        
        const storiesHaveYears = coverageDatesHTML.some(d => /\b\d{4}\b/.test(d.text));
        const adminHasYears = adminDatesHTML.some(d => /\b\d{4}\b/.test(d.text));
        
        console.log(`Stories page year-less display: ${!storiesHaveYears ? '✅ WORKING' : '❌ NOT WORKING'}`);
        console.log(`Admin page year-less display: ${!adminHasYears ? '✅ WORKING' : '❌ NOT WORKING'}`);
        console.log(`Date formatting functions loaded: ${functionsExist.formatDateSafeWithoutYear ? '✅ YES' : '❌ NO'}`);

        await browser.close();
        return !storiesHaveYears && !adminHasYears;

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await browser.close();
        return false;
    }
}

if (require.main === module) {
    testYearlessDisplay().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(() => process.exit(1));
}

module.exports = testYearlessDisplay;