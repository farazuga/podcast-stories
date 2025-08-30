/**
 * Test Live Navigation - Final Verification
 * Check if navigation is actually working in the live app
 */

const puppeteer = require('puppeteer');

async function testLiveNavigation() {
    console.log('🔍 Testing Live Navigation - Final Verification');
    console.log('Testing all three roles after August 30 fixes\n');

    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });

    const roles = [
        {
            role: 'student',
            email: 'student@vidpod.com',
            password: 'vidpod',
            expectedVisible: ['dashboard', 'stories', 'add-story', 'rundowns'],
            expectedHidden: ['teacher-dashboard', 'admin-browse-stories', 'admin']
        },
        {
            role: 'teacher',
            email: 'teacher@vidpod.com', 
            password: 'vidpod',
            expectedVisible: ['dashboard', 'stories', 'add-story', 'teacher-dashboard', 'rundowns'],
            expectedHidden: ['admin-browse-stories', 'admin']
        },
        {
            role: 'admin',
            email: 'admin@vidpod.com',
            password: 'vidpod', 
            expectedVisible: ['dashboard', 'admin-browse-stories', 'add-story', 'admin', 'rundowns'],
            expectedHidden: ['teacher-dashboard']
        }
    ];

    for (const roleTest of roles) {
        console.log(`\n🔍 TESTING ${roleTest.role.toUpperCase()} NAVIGATION`);
        console.log('-'.repeat(50));

        const page = await browser.newPage();

        try {
            // Login
            await page.goto('https://podcast-stories-production.up.railway.app/index.html');
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
            
            await page.type('#email', roleTest.email);
            await page.type('#password', roleTest.password);
            await page.click('button[type="submit"]');
            await page.waitForNavigation();
            
            // Wait for navigation to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Get live navigation state
            const navState = await page.evaluate(() => {
                const visibleItems = [];
                const hiddenItems = [];
                
                // Check all nav items with data-page
                document.querySelectorAll('[data-page]').forEach(item => {
                    const computedStyle = window.getComputedStyle(item);
                    const isVisible = computedStyle.display !== 'none' && item.offsetParent !== null;
                    const dataPage = item.getAttribute('data-page');
                    const dataRole = item.getAttribute('data-role');
                    const text = item.textContent.trim().replace(/\s+/g, ' ');
                    
                    if (isVisible) {
                        visibleItems.push({ dataPage, dataRole, text });
                    } else {
                        hiddenItems.push({ dataPage, dataRole, text });
                    }
                });
                
                // Remove duplicates by dataPage
                const uniqueVisible = visibleItems.filter((item, index, self) => 
                    index === self.findIndex(i => i.dataPage === item.dataPage)
                );
                const uniqueHidden = hiddenItems.filter((item, index, self) => 
                    index === self.findIndex(i => i.dataPage === item.dataPage)
                );
                
                return {
                    visible: uniqueVisible.map(item => item.dataPage),
                    hidden: uniqueHidden.map(item => item.dataPage),
                    details: { uniqueVisible, uniqueHidden }
                };
            });
            
            // Check against expectations
            const correctVisible = roleTest.expectedVisible.filter(page => navState.visible.includes(page));
            const correctHidden = roleTest.expectedHidden.filter(page => navState.hidden.includes(page));
            const incorrectVisible = navState.visible.filter(page => roleTest.expectedHidden.includes(page));
            const incorrectHidden = navState.hidden.filter(page => roleTest.expectedVisible.includes(page));
            
            console.log(`✅ VISIBLE (${navState.visible.length}): ${navState.visible.join(', ')}`);
            console.log(`❌ HIDDEN (${navState.hidden.length}): ${navState.hidden.join(', ')}`);
            
            console.log(`\n📊 EXPECTATIONS vs REALITY:`);
            console.log(`   Should see: [${roleTest.expectedVisible.join(', ')}]`);
            console.log(`   Actually see: [${navState.visible.join(', ')}]`);
            console.log(`   Should NOT see: [${roleTest.expectedHidden.join(', ')}]`);
            console.log(`   Actually hidden: [${navState.hidden.join(', ')}]`);
            
            if (correctVisible.length === roleTest.expectedVisible.length && correctHidden.length === roleTest.expectedHidden.length && incorrectVisible.length === 0) {
                console.log(`\n🎉 ${roleTest.role.toUpperCase()}: ✅ PERFECT - Navigation working correctly!`);
            } else {
                console.log(`\n⚠️  ${roleTest.role.toUpperCase()}: ❌ ISSUES FOUND`);
                if (incorrectVisible.length > 0) {
                    console.log(`   🔴 Incorrectly visible: ${incorrectVisible.join(', ')}`);
                }
                if (incorrectHidden.length > 0) {
                    console.log(`   🔴 Incorrectly hidden: ${incorrectHidden.join(', ')}`);
                }
            }

        } catch (error) {
            console.log(`❌ ${roleTest.role} test failed:`, error.message);
        }
        
        await page.close();
    }

    await browser.close();
    
    console.log('\n🏁 LIVE NAVIGATION TEST COMPLETE');
    console.log('If all roles show "PERFECT", navigation system is working correctly!');
}

testLiveNavigation().catch(console.error);