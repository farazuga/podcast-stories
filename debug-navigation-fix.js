/**
 * Debug Navigation Fix
 * Test navigation role visibility after our August 30 fixes
 */

const puppeteer = require('puppeteer');

async function debugNavigationFix() {
    console.log('🔍 Debug Navigation Fix - August 30, 2025');
    console.log('Testing role visibility after contradiction fixes\n');

    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();

    try {
        // Login as student
        console.log('1. Logging in as student...');
        await page.goto('https://podcast-stories-production.up.railway.app/index.html');
        
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();

        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('2. Analyzing navigation state...');

        // Get detailed navigation analysis
        const analysis = await page.evaluate(() => {
            // Get user from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            console.log('🔍 User from localStorage:', user);
            
            // Check navigation initialization
            const navbar = document.getElementById('vidpodNavbar');
            const isInitialized = navbar?.hasAttribute('data-initialized');
            console.log('🔍 Navigation initialized:', isInitialized);
            
            // Check if VidPODNav is available
            const hasVidPODNav = typeof window.VidPODNav !== 'undefined';
            console.log('🔍 VidPODNav available:', hasVidPODNav);
            
            // Get all navigation items with data-role
            const navItems = Array.from(document.querySelectorAll('[data-role]'));
            console.log('🔍 Found', navItems.length, 'items with data-role');
            
            const itemAnalysis = navItems.map(item => {
                const dataRole = item.getAttribute('data-role');
                const dataPage = item.getAttribute('data-page');
                const computedStyle = window.getComputedStyle(item);
                const isVisible = computedStyle.display !== 'none' && item.offsetParent !== null;
                
                console.log(`🔍 Item: ${dataPage}, Role: ${dataRole}, Visible: ${isVisible}, Display: ${computedStyle.display}`);
                
                return {
                    dataPage,
                    dataRole,
                    isVisible,
                    displayStyle: computedStyle.display,
                    text: item.textContent.trim().replace(/\s+/g, ' ')
                };
            });
            
            // Check if role visibility function was called
            let roleVisibilityLog = '';
            if (hasVidPODNav && window.VidPODNav.currentUser) {
                console.log('🔍 Current user in VidPODNav:', window.VidPODNav.currentUser);
                roleVisibilityLog = `VidPODNav.currentUser.role: ${window.VidPODNav.currentUser.role}`;
            }
            
            return {
                user,
                isInitialized,
                hasVidPODNav,
                roleVisibilityLog,
                itemAnalysis,
                bodyClasses: document.body.className
            };
        });

        console.log('\n📊 NAVIGATION ANALYSIS:');
        console.log(`   User role: ${analysis.user.role}`);
        console.log(`   Navigation initialized: ${analysis.isInitialized}`);
        console.log(`   VidPODNav available: ${analysis.hasVidPODNav}`);
        console.log(`   Body classes: ${analysis.bodyClasses}`);
        console.log(`   ${analysis.roleVisibilityLog}`);

        console.log('\n📋 NAVIGATION ITEMS:');
        analysis.itemAnalysis.forEach(item => {
            const status = item.isVisible ? '✅ VISIBLE' : '❌ HIDDEN';
            console.log(`   ${status}: ${item.text} (${item.dataPage}) - role: ${item.dataRole}`);
        });

        // Expected for student: dashboard, stories, add-story, rundowns should be visible
        // teacher-dashboard, admin-browse-stories, admin should be hidden
        console.log('\n🎯 EXPECTED BEHAVIOR:');
        console.log('   Student should see: dashboard, stories, add-story, rundowns');
        console.log('   Student should NOT see: teacher-dashboard, admin-browse-stories, admin');

        const visibleItems = analysis.itemAnalysis.filter(item => item.isVisible);
        const shouldBeVisible = ['dashboard', 'stories', 'add-story', 'rundowns'];
        const shouldBeHidden = ['teacher-dashboard', 'admin-browse-stories', 'admin'];

        const correctlyVisible = shouldBeVisible.filter(page => 
            visibleItems.some(item => item.dataPage === page)
        );
        const correctlyHidden = shouldBeHidden.filter(page => 
            !visibleItems.some(item => item.dataPage === page)
        );
        const incorrectlyVisible = visibleItems.filter(item => 
            shouldBeHidden.includes(item.dataPage)
        );

        console.log('\n✅ CORRECTLY VISIBLE:');
        correctlyVisible.forEach(page => console.log(`   ✓ ${page}`));

        console.log('\n❌ INCORRECTLY VISIBLE:');
        incorrectlyVisible.forEach(item => console.log(`   ✗ ${item.dataPage} (${item.dataRole})`));

        console.log('\n✅ CORRECTLY HIDDEN:');
        correctlyHidden.forEach(page => console.log(`   ✓ ${page}`));

        if (incorrectlyVisible.length === 0) {
            console.log('\n🎉 SUCCESS: Navigation role visibility working correctly!');
        } else {
            console.log('\n⚠️  ISSUE: Some items are incorrectly visible');
            console.log('   This suggests the updateRoleVisibility() function is not running');
            console.log('   or there is a timing issue with initialization');
        }

    } catch (error) {
        console.error('❌ Debug failed:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Keep browser open
    await browser.close();
}

debugNavigationFix().catch(console.error);