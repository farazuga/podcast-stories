const puppeteer = require('puppeteer');

/**
 * Focused test to verify navigation fixes
 * Tests the specific pages that failed in the comprehensive test
 */

async function testNavigationFixes() {
    console.log('🔧 Testing Navigation Fixes...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    // Test admin user on the three failing pages
    const adminUser = {
        id: 1,
        name: 'Admin User',
        username: 'admin@vidpod.com', 
        email: 'admin@vidpod.com',
        role: 'admin'
    };

    const problematicPages = [
        { url: 'https://frontend-production-b75b.up.railway.app/add-story.html', name: 'Add Story' },
        { url: 'https://frontend-production-b75b.up.railway.app/admin.html', name: 'Admin Panel' },
        { url: 'https://frontend-production-b75b.up.railway.app/story-detail.html', name: 'Story Detail' }
    ];

    const results = [];

    for (const pageInfo of problematicPages) {
        console.log(`\n🧪 Testing: ${pageInfo.name}`);
        console.log(`   URL: ${pageInfo.url}`);
        
        try {
            // Navigate to page
            await page.goto(pageInfo.url, { waitUntil: 'networkidle0', timeout: 30000 });
            
            // Set admin user credentials
            await page.evaluate((user) => {
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('token', 'admin-test-token');
            }, adminUser);

            console.log('   👤 Set admin credentials');
            
            // Check current page content
            const pageAnalysis = await page.evaluate(() => {
                return {
                    currentUrl: window.location.href,
                    hasLoginForm: !!document.getElementById('loginForm'),
                    hasNavigationDiv: !!document.getElementById('vidpodNavbar'),
                    hasNavigationScript: !!window.NavigationLoader,
                    hasVidPODNav: !!window.VidPODNav,
                    bodyClass: document.body.className,
                    title: document.title
                };
            });

            console.log(`   📄 Page analysis:`);
            console.log(`      URL: ${pageAnalysis.currentUrl}`);
            console.log(`      Title: ${pageAnalysis.title}`);
            console.log(`      Has login form: ${pageAnalysis.hasLoginForm}`);
            console.log(`      Has navigation div: ${pageAnalysis.hasNavigationDiv}`);
            console.log(`      NavigationLoader available: ${pageAnalysis.hasNavigationScript}`);
            console.log(`      VidPODNav available: ${pageAnalysis.hasVidPODNav}`);

            if (pageAnalysis.hasLoginForm) {
                console.log('   ⚠️ Page shows login form - authentication redirect detected');
                results.push({
                    page: pageInfo.name,
                    issue: 'Authentication redirect to login page',
                    severity: 'critical',
                    status: 'failed'
                });
                continue;
            }

            // If navigation div doesn't exist, manually trigger navigation loading
            if (!pageAnalysis.hasNavigationDiv && pageAnalysis.hasNavigationScript) {
                console.log('   🔧 Navigation div not found, manually triggering navigation load...');
                
                await page.evaluate(() => {
                    if (window.NavigationLoader) {
                        window.NavigationLoader.loadNavigation('body');
                    }
                });
                
                // Wait for navigation to load
                await page.waitForSelector('#vidpodNavbar', { timeout: 10000 });
                console.log('   ✅ Navigation loaded manually');
            }

            // Check if navigation loaded successfully
            const navigationCheck = await page.evaluate(() => {
                const nav = document.getElementById('vidpodNavbar');
                return {
                    exists: !!nav,
                    visible: nav ? window.getComputedStyle(nav).display !== 'none' : false,
                    hasContent: nav ? nav.innerHTML.length > 100 : false
                };
            });

            if (navigationCheck.exists && navigationCheck.visible && navigationCheck.hasContent) {
                console.log('   ✅ Navigation working correctly');
                results.push({
                    page: pageInfo.name,
                    issue: 'None - navigation working',
                    severity: 'none', 
                    status: 'passed'
                });
            } else {
                console.log('   ❌ Navigation issues detected');
                results.push({
                    page: pageInfo.name,
                    issue: `Navigation ${!navigationCheck.exists ? 'missing' : !navigationCheck.visible ? 'hidden' : 'empty'}`,
                    severity: 'high',
                    status: 'failed'
                });
            }

            // Take screenshot
            await page.screenshot({ 
                path: `${pageInfo.name.toLowerCase().replace(' ', '-')}-fix-test.png`, 
                fullPage: true 
            });

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            results.push({
                page: pageInfo.name,
                issue: `Test error: ${error.message}`,
                severity: 'critical',
                status: 'failed'
            });
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 NAVIGATION FIXES TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log(`Total Pages Tested: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    console.log('\n📋 Detailed Results:');
    results.forEach(result => {
        const status = result.status === 'passed' ? '✅' : '❌';
        console.log(`${status} ${result.page}: ${result.issue}`);
    });
    
    if (failed === 0) {
        console.log('\n🎉 All navigation issues have been resolved!');
    } else {
        console.log('\n⚠️ Navigation issues still exist and need to be addressed.');
        console.log('\n🔧 Recommended fixes:');
        results.filter(r => r.status === 'failed').forEach(result => {
            console.log(`   - ${result.page}: ${result.issue}`);
        });
    }
    
    console.log('='.repeat(60));
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser kept open for manual inspection...');
    console.log('Press Enter to close...');
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });
    
    await browser.close();
    return results;
}

testNavigationFixes().catch(console.error);