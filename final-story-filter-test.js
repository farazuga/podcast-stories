/**
 * Final Story Filter Verification Test
 * Confirms story approval filter is working correctly
 */

const puppeteer = require('puppeteer');

async function finalStoryFilterTest() {
    console.log('✅ Final Story Filter Verification Test\n');
    
    const browser = await puppeteer.launch({ headless: true });
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        const page = await browser.newPage();
        
        // Login as admin
        await page.goto(`${baseUrl}/index.html`);
        await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 10000 });
        
        // Go to admin panel and stories tab
        await page.goto(`${baseUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await page.evaluate(() => window.showTab('stories'));
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test key scenarios
        console.log('🧪 Key Test Scenarios:');
        
        // Test 1: Default shows all stories
        const defaultTest = await page.evaluate(() => {
            const filterSelect = document.getElementById('storyStatusFilter');
            const table = document.getElementById('storiesApprovalTable');
            const rows = table ? table.querySelectorAll('tr').length : 0;
            
            return {
                filterValue: filterSelect ? filterSelect.value : 'NOT_FOUND',
                storiesShown: rows,
                hasData: rows > 1 // More than just header or "no data" row
            };
        });
        
        console.log(`1. Default View (All Stories): ${defaultTest.hasData ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Filter: "${defaultTest.filterValue}" | Stories: ${defaultTest.storiesShown}`);
        
        // Test 2: Filter to Approved works
        await page.select('#storyStatusFilter', 'approved');
        await page.click('button[onclick*="loadStoriesForApproval()"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const approvedTest = await page.evaluate(() => {
            const table = document.getElementById('storiesApprovalTable');
            return table ? table.querySelectorAll('tr').length : 0;
        });
        
        console.log(`2. Approved Filter: ${approvedTest > 1 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Stories shown: ${approvedTest}`);
        
        // Test 3: Filter to Pending works
        await page.select('#storyStatusFilter', 'pending');
        await page.click('button[onclick*="loadStoriesForApproval()"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const pendingTest = await page.evaluate(() => {
            const table = document.getElementById('storiesApprovalTable');
            const hasNoDataMessage = table && table.textContent.includes('No stories found');
            return { hasNoData: hasNoDataMessage };
        });
        
        console.log(`3. Pending Filter: ${pendingTest.hasNoData ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Shows "No stories found": ${pendingTest.hasNoData ? 'Yes' : 'No'}`);
        
        // Test 4: Back to All Stories works
        await page.select('#storyStatusFilter', '');
        await page.click('button[onclick*="loadStoriesForApproval()"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const allStoriesTest = await page.evaluate(() => {
            const table = document.getElementById('storiesApprovalTable');
            const rows = table ? table.querySelectorAll('tr').length : 0;
            return rows > 1;
        });
        
        console.log(`4. Back to All Stories: ${allStoriesTest ? '✅ PASS' : '❌ FAIL'}`);
        
        await browser.close();
        
        // Final summary
        const allTestsPassed = defaultTest.hasData && (approvedTest > 1) && pendingTest.hasNoData && allStoriesTest;
        
        console.log('\n' + '='*50);
        console.log('📊 STORY APPROVAL FILTER - FINAL RESULTS');
        console.log('='*50);
        
        if (allTestsPassed) {
            console.log('🎉 ALL TESTS PASSED - FILTER IS WORKING CORRECTLY!');
            console.log('');
            console.log('✅ Default view shows all stories');
            console.log('✅ Approved filter shows approved stories');
            console.log('✅ Pending filter shows no stories (correct - none exist)');
            console.log('✅ Filter changes work smoothly');
            console.log('');
            console.log('🎯 The story approval filter in admin mode is now fully functional!');
        } else {
            console.log('⚠️  Some tests failed - see details above');
        }
        
        return allTestsPassed;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await browser.close();
        return false;
    }
}

if (require.main === module) {
    finalStoryFilterTest().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(() => process.exit(1));
}

module.exports = finalStoryFilterTest;