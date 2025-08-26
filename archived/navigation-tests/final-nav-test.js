/**
 * Final Navigation Test - Complete test without hanging
 */

const puppeteer = require('puppeteer');

async function finalNavTest() {
    console.log('🎯 Final Navigation Test - All Roles\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    const accounts = {
        admin: { email: 'admin@vidpod.com', password: 'vidpod', expectedRole: 'amitrace_admin' },
        teacher: { email: 'teacher@vidpod.com', password: 'vidpod', expectedRole: 'teacher' },
        student: { email: 'student@vidpod.com', password: 'vidpod', expectedRole: 'student' }
    };
    
    const expectations = {
        amitrace_admin: {
            visible: ['Dashboard', 'Browse Stories', 'Add Story', 'Admin Browse Stories', 'Admin Panel'],
            hidden: ['My Classes']
        },
        teacher: {
            visible: ['Dashboard', 'Browse Stories', 'Add Story', 'My Classes'],
            hidden: ['Admin Browse Stories']
        },
        student: {
            visible: ['Dashboard', 'Browse Stories', 'Add Story'],
            hidden: ['My Classes', 'Admin Browse Stories', 'Admin Panel']
        }
    };
    
    let allTestsPassed = true;
    
    try {
        for (const [roleName, account] of Object.entries(accounts)) {
            console.log(`\n🎭 Testing ${roleName.toUpperCase()} role (${account.email})`);
            console.log('='.repeat(50));
            
            const page = await browser.newPage();
            
            try {
                // Login
                await page.goto('https://podcast-stories-production.up.railway.app/index.html');
                await page.waitForSelector('input[type="email"]', { timeout: 10000 });
                await page.type('input[type="email"]', account.email);
                await page.type('input[type="password"]', account.password);
                
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
                    page.click('button[type="submit"]')
                ]);
                
                // Wait for navigation to initialize
                await page.waitForSelector('.vidpod-navbar', { timeout: 15000 });
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for JS
                
                // Get navigation state
                const navState = await page.evaluate(() => {
                    const items = [];
                    const navElements = document.querySelectorAll('.navbar-nav .nav-item');
                    
                    navElements.forEach(element => {
                        const text = element.textContent.trim().replace(/\s+/g, ' ');
                        const href = element.getAttribute('href');
                        const dataRole = element.getAttribute('data-role');
                        const isVisible = window.getComputedStyle(element).display !== 'none';
                        
                        // Get meaningful name
                        let name = 'Unknown';
                        if (text.includes('Dashboard')) name = 'Dashboard';
                        else if (text.includes('Browse Stories') && text.includes('Admin')) name = 'Admin Browse Stories';
                        else if (text.includes('Browse Stories')) name = 'Browse Stories';
                        else if (text.includes('Add Story')) name = 'Add Story';
                        else if (text.includes('My Classes')) name = 'My Classes';
                        else if (text.includes('Admin Panel')) name = 'Admin Panel';
                        else if (text.includes('Settings')) name = 'Settings';
                        
                        items.push({ name, text, href, dataRole, isVisible });
                    });
                    
                    return {
                        items: items,
                        userInfo: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
                    };
                });
                
                // Verify role
                const userRole = navState.userInfo?.role;
                const roleMatch = userRole === account.expectedRole;
                console.log(`👤 User Role: ${userRole} ${roleMatch ? '✅' : '❌'}`);
                
                if (!roleMatch) {
                    console.log(`   Expected: ${account.expectedRole}, Got: ${userRole}`);
                    allTestsPassed = false;
                }
                
                // Test expectations
                const expected = expectations[account.expectedRole];
                console.log(`\n📋 Navigation Items:`);
                
                const visibleItems = [];
                const hiddenItems = [];
                
                navState.items.forEach(item => {
                    if (item.isVisible) {
                        visibleItems.push(item.name);
                        console.log(`   ✅ ${item.name} (visible) - data-role="${item.dataRole}"`);
                    } else {
                        hiddenItems.push(item.name);
                        console.log(`   ❌ ${item.name} (hidden) - data-role="${item.dataRole}"`);
                    }
                });
                
                // Check expectations
                console.log(`\n🎯 Expectation Check:`);
                let roleTestPassed = true;
                
                for (const expectedVisible of expected.visible) {
                    const found = visibleItems.includes(expectedVisible) || 
                                (expectedVisible === 'Settings' && visibleItems.includes('Admin Panel'));
                    if (found) {
                        console.log(`   ✅ ${expectedVisible} is visible (correct)`);
                    } else {
                        console.log(`   ❌ ${expectedVisible} should be visible but isn't`);
                        roleTestPassed = false;
                    }
                }
                
                for (const expectedHidden of expected.hidden) {
                    const found = hiddenItems.includes(expectedHidden);
                    if (found) {
                        console.log(`   ✅ ${expectedHidden} is hidden (correct)`);
                    } else if (visibleItems.includes(expectedHidden)) {
                        console.log(`   ❌ ${expectedHidden} should be hidden but is visible`);
                        roleTestPassed = false;
                    }
                }
                
                if (roleTestPassed) {
                    console.log(`\n🎉 ${roleName.toUpperCase()} TEST PASSED`);
                } else {
                    console.log(`\n💥 ${roleName.toUpperCase()} TEST FAILED`);
                    allTestsPassed = false;
                }
                
            } catch (error) {
                console.error(`❌ Error testing ${roleName}:`, error.message);
                allTestsPassed = false;
            } finally {
                await page.close();
            }
        }
        
        // Final results
        console.log('\n' + '='.repeat(60));
        console.log('🏁 FINAL RESULTS');
        console.log('='.repeat(60));
        
        if (allTestsPassed) {
            console.log('🎉 ALL NAVIGATION TESTS PASSED!');
            console.log('✅ The VidPOD Unified Navigation role-based visibility is working correctly.');
        } else {
            console.log('⚠️  SOME TESTS FAILED');
            console.log('❌ There are issues with the navigation visibility rules.');
        }
        
    } catch (error) {
        console.error('💥 Test suite failed:', error);
    } finally {
        await browser.close();
        console.log('\n🔄 Test complete, browser closed.');
    }
}

finalNavTest();