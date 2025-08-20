const puppeteer = require('puppeteer');

async function testNavigationV2() {
    console.log('🔧 TESTING NAVIGATION V2 FILES');
    console.log('===============================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.text().includes('V2') || msg.text().includes('🔧')) {
                console.log(`📄 V2 PAGE: ${msg.text()}`);
            }
        });
        
        console.log('1️⃣ Testing V2 File Availability...\n');
        
        // Check if V2 files are deployed
        const v2FileCheck = await page.evaluate(async () => {
            const results = {};
            
            try {
                const navJsResponse = await fetch('https://podcast-stories-production.up.railway.app/js/navigation-v2.js');
                results.navJs = {
                    status: navJsResponse.status,
                    ok: navJsResponse.ok,
                    content: navJsResponse.ok ? await navJsResponse.text() : null
                };
            } catch (error) {
                results.navJs = { error: error.message };
            }
            
            try {
                const navHtmlResponse = await fetch('https://podcast-stories-production.up.railway.app/includes/navigation-v2.html');
                results.navHtml = {
                    status: navHtmlResponse.status,
                    ok: navHtmlResponse.ok,
                    content: navHtmlResponse.ok ? await navHtmlResponse.text() : null
                };
            } catch (error) {
                results.navHtml = { error: error.message };
            }
            
            try {
                const testPageResponse = await fetch('https://podcast-stories-production.up.railway.app/test-navigation-v2.html');
                results.testPage = {
                    status: testPageResponse.status,
                    ok: testPageResponse.ok
                };
            } catch (error) {
                results.testPage = { error: error.message };
            }
            
            return results;
        });
        
        console.log('V2 File Availability:');
        console.log(`  navigation-v2.js: ${v2FileCheck.navJs.ok ? '✅ Available' : '❌ Missing'} (Status: ${v2FileCheck.navJs.status})`);
        console.log(`  navigation-v2.html: ${v2FileCheck.navHtml.ok ? '✅ Available' : '❌ Missing'} (Status: ${v2FileCheck.navHtml.status})`);
        console.log(`  test-navigation-v2.html: ${v2FileCheck.testPage.ok ? '✅ Available' : '❌ Missing'} (Status: ${v2FileCheck.testPage.status})\n`);
        
        if (v2FileCheck.navJs.ok && v2FileCheck.navHtml.ok) {
            // Check V2 file content
            const v2ContentCheck = {
                jsHasAmitraceFix: v2FileCheck.navJs.content.includes("['admin', 'amitrace_admin'].includes(userRole)"),
                jsHasValidationFix: v2FileCheck.navJs.content.includes("'amitrace_admin': {"),
                jsHasV2Marker: v2FileCheck.navJs.content.includes('V2 DEPLOYMENT MARKER'),
                htmlHasAmitraceFix: v2FileCheck.navHtml.content.includes('data-role="admin,amitrace_admin"'),
                htmlHasV2Marker: v2FileCheck.navHtml.content.includes('V2 - FIXED')
            };
            
            console.log('V2 Content Verification:');
            console.log(`  JS amitrace_admin fix: ${v2ContentCheck.jsHasAmitraceFix ? '✅' : '❌'}`);
            console.log(`  JS validation fix: ${v2ContentCheck.jsHasValidationFix ? '✅' : '❌'}`);
            console.log(`  JS V2 marker: ${v2ContentCheck.jsHasV2Marker ? '✅' : '❌'}`);
            console.log(`  HTML amitrace_admin fix: ${v2ContentCheck.htmlHasAmitraceFix ? '✅' : '❌'}`);
            console.log(`  HTML V2 marker: ${v2ContentCheck.htmlHasV2Marker ? '✅' : '❌'}\n`);
            
            if (v2FileCheck.testPage.ok) {
                console.log('2️⃣ Testing V2 Navigation Test Page...\n');
                
                // Navigate to V2 test page
                await page.goto('https://podcast-stories-production.up.railway.app/test-navigation-v2.html', {
                    waitUntil: 'networkidle2'
                });
                
                // Wait for V2 test to complete
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const v2TestResults = await page.evaluate(() => {
                    const testStatus = document.getElementById('testStatus');
                    const debugOutput = document.querySelector('.debug-output');
                    
                    return {
                        testStatusText: testStatus ? testStatus.textContent : 'No test status found',
                        debugOutputText: debugOutput ? debugOutput.textContent : 'No debug output found',
                        hasSuccessClass: testStatus ? testStatus.innerHTML.includes('success') : false,
                        hasNavbar: !!document.getElementById('vidpodNavbar'),
                        adminElementsVisible: {
                            adminBrowse: document.querySelector('[href="/admin-browse-stories.html"]') ? 
                                window.getComputedStyle(document.querySelector('[href="/admin-browse-stories.html"]')).display !== 'none' : false,
                            adminPanel: document.querySelector('[href="/admin.html"]') ? 
                                window.getComputedStyle(document.querySelector('[href="/admin.html"]')).display !== 'none' : false
                        }
                    };
                });
                
                console.log('V2 Test Page Results:');
                console.log(`  Test successful: ${v2TestResults.hasSuccessClass ? '✅' : '❌'}`);
                console.log(`  Navbar present: ${v2TestResults.hasNavbar ? '✅' : '❌'}`);
                console.log(`  Admin Browse visible: ${v2TestResults.adminElementsVisible.adminBrowse ? '✅' : '❌'}`);
                console.log(`  Admin Panel visible: ${v2TestResults.adminElementsVisible.adminPanel ? '✅' : '❌'}`);
                
                console.log('\nDetailed Test Output:');
                console.log(v2TestResults.testStatusText.substring(0, 500) + '...');
                
                console.log('\nDebug Output:');
                console.log(v2TestResults.debugOutputText.substring(0, 500) + '...');
                
                // Take screenshot
                await page.screenshot({ path: 'v2-navigation-test.png', fullPage: true });
                console.log('\n📸 Screenshot saved: v2-navigation-test.png');
                
                if (v2TestResults.hasSuccessClass && v2TestResults.adminElementsVisible.adminBrowse && v2TestResults.adminElementsVisible.adminPanel) {
                    console.log('\n3️⃣ Testing V2 Integration with Main Site...\n');
                    
                    // Test if we can now replace the original files
                    console.log('V2 navigation is working! Next step: Replace original files with V2 versions');
                } else {
                    console.log('\n❌ V2 test page showing issues. Check debug output above.');
                }
            } else {
                console.log('❌ V2 test page not available, cannot run functional tests');
            }
        } else {
            console.log('❌ V2 files not properly deployed, cannot proceed with testing');
        }
        
        console.log('\n🎯 V2 TESTING SUMMARY:');
        console.log('======================');
        
        const allV2FilesDeployed = v2FileCheck.navJs.ok && v2FileCheck.navHtml.ok && v2FileCheck.testPage.ok;
        
        if (allV2FilesDeployed) {
            console.log('✅ SUCCESS: V2 files are deployed and accessible');
            console.log('✅ NEXT STEP: If V2 test page shows success, replace original files');
            console.log('   - Copy navigation-v2.js over navigation.js');
            console.log('   - Copy navigation-v2.html over navigation.html');
            console.log('   - This will fix the navigation for all pages');
        } else {
            console.log('❌ ISSUE: V2 files not fully deployed');
            console.log('   - Check Railway deployment logs');
            console.log('   - Verify build process completed successfully');
        }
        
    } catch (error) {
        console.error('🚨 V2 test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testNavigationV2().catch(console.error);