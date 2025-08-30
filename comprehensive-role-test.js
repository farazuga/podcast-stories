/**
 * Comprehensive Role Test - August 30, 2025
 * Test all three roles with detailed debugging
 */

const puppeteer = require('puppeteer');

async function testAllRoles() {
    console.log('🔍 COMPREHENSIVE ROLE NAVIGATION TEST');
    console.log('Testing Teachers, Admins, and debugging issues');
    console.log('='*60 + '\n');

    const browser = await puppeteer.launch({ 
        headless: false, 
        slowMo: 200,
        defaultViewport: { width: 1400, height: 900 }
    });

    const testRoles = [
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

    for (const roleConfig of testRoles) {
        console.log(`\n🎯 TESTING ${roleConfig.role.toUpperCase()} ROLE`);
        console.log('='.repeat(50));
        
        const page = await browser.newPage();
        
        try {
            // Step 1: Clean login
            console.log('1. 🔐 Logging in...');
            await page.goto('https://podcast-stories-production.up.railway.app/index.html');
            
            // Clear storage
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
            
            // Login
            await page.type('#email', roleConfig.email);
            await page.type('#password', roleConfig.password);
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ timeout: 10000 });
            
            console.log(`   ✅ Logged in successfully`);
            
            // Step 2: Wait for navigation initialization
            console.log('2. ⏳ Waiting for navigation initialization...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Step 3: Debug navigation state
            console.log('3. 🔍 Debugging navigation state...');
            
            const debugInfo = await page.evaluate(() => {
                // Get user info
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                
                // Check VidPODNav status
                const hasVidPODNav = typeof window.VidPODNav !== 'undefined';
                const navbarInitialized = document.getElementById('vidpodNavbar')?.hasAttribute('data-initialized');
                
                // Analyze all navigation elements
                const allNavElements = Array.from(document.querySelectorAll('[data-page]'));
                const elementAnalysis = allNavElements.map((element, index) => {
                    const dataPage = element.getAttribute('data-page');
                    const dataRole = element.getAttribute('data-role');
                    const computedStyle = window.getComputedStyle(element);
                    const isVisible = computedStyle.display !== 'none' && element.offsetParent !== null;
                    const parentElement = element.closest('.navbar-nav, .mobile-nav') ? 
                        (element.closest('.navbar-nav') ? 'desktop' : 'mobile') : 'unknown';
                    
                    return {
                        index,
                        dataPage,
                        dataRole,
                        isVisible,
                        displayStyle: computedStyle.display,
                        parentElement,
                        text: element.textContent.trim().replace(/\s+/g, ' ')
                    };
                });
                
                // Group by visibility
                const visibleElements = elementAnalysis.filter(el => el.isVisible);
                const hiddenElements = elementAnalysis.filter(el => !el.isVisible);
                
                // Get unique pages
                const visiblePages = [...new Set(visibleElements.map(el => el.dataPage))];
                const hiddenPages = [...new Set(hiddenElements.map(el => el.dataPage))];
                
                return {
                    user,
                    hasVidPODNav,
                    navbarInitialized,
                    totalElements: allNavElements.length,
                    visibleElements: visibleElements.length,
                    hiddenElements: hiddenElements.length,
                    visiblePages,
                    hiddenPages,
                    elementDetails: elementAnalysis,
                    bodyClasses: document.body.className
                };
            });
            
            console.log(`   📊 Navigation Debug Results:`);
            console.log(`      User role: ${debugInfo.user.role}`);
            console.log(`      VidPODNav available: ${debugInfo.hasVidPODNav}`);
            console.log(`      Navbar initialized: ${debugInfo.navbarInitialized}`);
            console.log(`      Total nav elements: ${debugInfo.totalElements}`);
            console.log(`      Visible elements: ${debugInfo.visibleElements}`);
            console.log(`      Hidden elements: ${debugInfo.hiddenElements}`);
            console.log(`      Body classes: ${debugInfo.bodyClasses}`);
            
            // Step 4: Analyze results vs expectations
            console.log('\n4. 📋 Navigation Analysis:');
            
            console.log(`   ✅ VISIBLE PAGES (${debugInfo.visiblePages.length}):`);
            debugInfo.visiblePages.forEach(page => {
                const isExpected = roleConfig.expectedVisible.includes(page);
                const status = isExpected ? '✓' : '✗';
                console.log(`      ${status} ${page} ${isExpected ? '' : '(UNEXPECTED)'}`);
            });
            
            console.log(`   ❌ HIDDEN PAGES (${debugInfo.hiddenPages.length}):`);
            debugInfo.hiddenPages.forEach(page => {
                const shouldBeHidden = roleConfig.expectedHidden.includes(page);
                const status = shouldBeHidden ? '✓' : '✗';
                console.log(`      ${status} ${page} ${shouldBeHidden ? '' : '(SHOULD BE VISIBLE)'}`);
            });
            
            // Step 5: Calculate success metrics
            const correctlyVisible = roleConfig.expectedVisible.filter(page => 
                debugInfo.visiblePages.includes(page)
            );
            const correctlyHidden = roleConfig.expectedHidden.filter(page => 
                debugInfo.hiddenPages.includes(page)
            );
            const incorrectlyVisible = debugInfo.visiblePages.filter(page => 
                roleConfig.expectedHidden.includes(page)
            );
            const incorrectlyHidden = debugInfo.hiddenPages.filter(page => 
                roleConfig.expectedVisible.includes(page)
            );
            
            const successRate = Math.round(
                ((correctlyVisible.length + correctlyHidden.length) / 
                (roleConfig.expectedVisible.length + roleConfig.expectedHidden.length)) * 100
            );
            
            console.log('\n5. 🎯 FINAL RESULTS:');
            console.log(`   Success Rate: ${successRate}%`);
            console.log(`   Correctly Visible: ${correctlyVisible.join(', ')}`);
            console.log(`   Correctly Hidden: ${correctlyHidden.join(', ')}`);
            
            if (incorrectlyVisible.length > 0) {
                console.log(`   🚨 INCORRECTLY VISIBLE: ${incorrectlyVisible.join(', ')}`);
            }
            if (incorrectlyHidden.length > 0) {
                console.log(`   🚨 INCORRECTLY HIDDEN: ${incorrectlyHidden.join(', ')}`);
            }
            
            if (successRate === 100) {
                console.log(`   🎉 ${roleConfig.role.toUpperCase()}: PERFECT! Navigation working correctly!`);
            } else {
                console.log(`   ⚠️ ${roleConfig.role.toUpperCase()}: ${successRate}% - Issues found`);
                
                // Additional debugging for failed cases
                console.log('\n   🔍 DETAILED ELEMENT ANALYSIS:');
                debugInfo.elementDetails.forEach(el => {
                    if (el.dataPage) {
                        const shouldShow = el.dataRole ? 
                            el.dataRole.toLowerCase().split(',').map(r => r.trim()).includes(debugInfo.user.role.toLowerCase()) : 
                            false;
                        const actualShow = el.isVisible;
                        const status = shouldShow === actualShow ? '✓' : '✗';
                        
                        console.log(`      ${status} ${el.parentElement} | ${el.dataPage} | role="${el.dataRole}" | should:${shouldShow} actual:${actualShow}`);
                    }
                });
            }
            
        } catch (error) {
            console.log(`❌ ${roleConfig.role} test failed:`, error.message);
            
            // Try to get any available debug info
            try {
                const errorDebug = await page.evaluate(() => {
                    return {
                        url: window.location.href,
                        title: document.title,
                        hasNavbar: !!document.getElementById('vidpodNavbar'),
                        user: localStorage.getItem('user'),
                        errors: window.console ? 'Console available' : 'No console'
                    };
                });
                console.log(`   Debug info:`, errorDebug);
            } catch (debugError) {
                console.log(`   Could not get debug info:`, debugError.message);
            }
        }
        
        await page.close();
        
        // Pause between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await browser.close();
    
    console.log('\n🏁 COMPREHENSIVE ROLE TEST COMPLETE');
    console.log('Check results above for each role\'s navigation behavior');
}

testAllRoles().catch(console.error);