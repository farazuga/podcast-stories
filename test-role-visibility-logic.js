/**
 * Test Role Visibility Logic
 * Debug the specific role-checking logic from navigation.js
 */

const puppeteer = require('puppeteer');

async function testRoleVisibilityLogic() {
    console.log('🔍 Testing Role Visibility Logic');
    
    const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
    const page = await browser.newPage();

    try {
        // Login as student
        await page.goto('https://podcast-stories-production.up.railway.app/index.html');
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test the role visibility logic manually
        const testResult = await page.evaluate(() => {
            // Simulate the updateRoleVisibility function logic
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = user.role?.toLowerCase().trim();
            
            console.log('🔍 Testing with user role:', userRole);
            
            const testResults = [];
            
            // Get all elements with data-role
            document.querySelectorAll('[data-role]').forEach((element, index) => {
                const dataRole = element.getAttribute('data-role');
                const dataPage = element.getAttribute('data-page');
                const allowedRoles = dataRole.toLowerCase().split(',').map(role => role.trim());
                const shouldShow = allowedRoles.includes(userRole);
                const currentDisplay = element.style.display;
                const computedDisplay = window.getComputedStyle(element).display;
                
                console.log(`🔍 Element ${index}:`);
                console.log(`   Page: ${dataPage}`);
                console.log(`   Data-role: "${dataRole}"`);
                console.log(`   Allowed roles: [${allowedRoles.join(', ')}]`);
                console.log(`   User role: "${userRole}"`);
                console.log(`   Should show: ${shouldShow}`);
                console.log(`   Current style.display: "${currentDisplay}"`);
                console.log(`   Computed display: "${computedDisplay}"`);
                console.log('');
                
                testResults.push({
                    index,
                    dataPage,
                    dataRole,
                    allowedRoles,
                    shouldShow,
                    currentDisplay,
                    computedDisplay,
                    text: element.textContent.trim()
                });
                
                // Apply the logic manually
                element.style.display = shouldShow ? '' : 'none';
            });
            
            return {
                userRole,
                testResults,
                totalElements: testResults.length
            };
        });
        
        console.log(`\n📊 ROLE VISIBILITY TEST RESULTS:`);
        console.log(`   User role: "${testResult.userRole}"`);
        console.log(`   Total elements with data-role: ${testResult.totalElements}`);
        
        console.log(`\n📋 ELEMENT ANALYSIS:`);
        testResult.testResults.forEach(result => {
            const status = result.shouldShow ? '✅ SHOULD SHOW' : '❌ SHOULD HIDE';
            console.log(`${status}: ${result.text} (${result.dataPage})`);
            console.log(`   Data-role: "${result.dataRole}"`);
            console.log(`   Allowed: [${result.allowedRoles.join(', ')}]`);
            console.log('');
        });

        // Check if logic worked after manual application
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterTest = await page.evaluate(() => {
            const visible = [];
            const hidden = [];
            
            document.querySelectorAll('[data-role]').forEach(element => {
                const computedDisplay = window.getComputedStyle(element).display;
                const dataPage = element.getAttribute('data-page');
                const text = element.textContent.trim();
                
                if (computedDisplay === 'none') {
                    hidden.push({ dataPage, text });
                } else {
                    visible.push({ dataPage, text });
                }
            });
            
            return { visible, hidden };
        });
        
        console.log(`\n🎯 AFTER MANUAL LOGIC APPLICATION:`);
        console.log(`✅ VISIBLE (${afterTest.visible.length}):`);
        afterTest.visible.forEach(item => console.log(`   ${item.text} (${item.dataPage})`));
        
        console.log(`❌ HIDDEN (${afterTest.hidden.length}):`);
        afterTest.hidden.forEach(item => console.log(`   ${item.text} (${item.dataPage})`));

    } catch (error) {
        console.error('❌ Test failed:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
}

testRoleVisibilityLogic().catch(console.error);