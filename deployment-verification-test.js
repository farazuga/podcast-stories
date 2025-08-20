const puppeteer = require('puppeteer');

async function verifyDeploymentStatus() {
    console.log('🔍 DEPLOYMENT VERIFICATION TEST');
    console.log('================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        console.log('1️⃣ Checking Deployed File Versions...\n');
        
        // Check navigation.js deployment status
        const navJsCheck = await page.evaluate(async () => {
            try {
                const response = await fetch('/js/navigation.js');
                const content = await response.text();
                
                return {
                    hasDeploymentMarker: content.includes('DEPLOYMENT VERSION: 2025-08-20'),
                    hasAmitraceFix: content.includes("['admin', 'amitrace_admin'].includes(userRole)"),
                    hasOldCode: content.includes("userRole === 'admin'"),
                    hasValidationFix: content.includes("'amitrace_admin': {"),
                    contentLength: content.length,
                    lastModified: response.headers.get('last-modified') || 'unknown'
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log('Navigation.js Deployment Status:');
        console.log(`  Has deployment marker: ${navJsCheck.hasDeploymentMarker ? '✅' : '❌'}`);
        console.log(`  Has amitrace_admin fix: ${navJsCheck.hasAmitraceFix ? '✅' : '❌'}`);
        console.log(`  Still has old code: ${navJsCheck.hasOldCode ? '❌ YES' : '✅ NO'}`);
        console.log(`  Has validation fix: ${navJsCheck.hasValidationFix ? '✅' : '❌'}`);
        console.log(`  Content length: ${navJsCheck.contentLength} bytes`);
        console.log(`  Last modified: ${navJsCheck.lastModified}\n`);
        
        // Check navigation.html deployment status
        const navHtmlCheck = await page.evaluate(async () => {
            try {
                const response = await fetch('/includes/navigation.html');
                const content = await response.text();
                
                return {
                    hasDeploymentMarker: content.includes('DEPLOYMENT VERSION: 2025-08-20'),
                    hasAmitraceFix: content.includes('data-role="admin,amitrace_admin"'),
                    hasOldCode: content.includes('data-role="admin"') && !content.includes('data-role="admin,amitrace_admin"'),
                    contentLength: content.length,
                    lastModified: response.headers.get('last-modified') || 'unknown'
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log('Navigation.html Deployment Status:');
        console.log(`  Has deployment marker: ${navHtmlCheck.hasDeploymentMarker ? '✅' : '❌'}`);
        console.log(`  Has amitrace_admin fix: ${navHtmlCheck.hasAmitraceFix ? '✅' : '❌'}`);
        console.log(`  Still has old code: ${navHtmlCheck.hasOldCode ? '❌ YES' : '✅ NO'}`);
        console.log(`  Content length: ${navHtmlCheck.contentLength} bytes`);
        console.log(`  Last modified: ${navHtmlCheck.lastModified}\n`);
        
        console.log('2️⃣ Testing Admin Login and Navigation Visibility...\n');
        
        // Navigate to login
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        // Login as admin
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Enable console monitoring for navigation debugging
        page.on('console', msg => {
            if (msg.text().includes('Element') || msg.text().includes('visible') || msg.text().includes('role')) {
                console.log(`📄 NAV DEBUG: ${msg.text()}`);
            }
        });
        
        // Check detailed navigation state
        const detailedNavCheck = await page.evaluate(() => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const results = {
                authStatus: {
                    hasToken: !!localStorage.getItem('token'),
                    userRole: user.role,
                    userName: user.name,
                    tokenLength: localStorage.getItem('token')?.length || 0,
                    currentUrl: window.location.href
                },
                navigationElements: [],
                consoleOutput: []
            };
            
            // Check all elements with data-role
            document.querySelectorAll('[data-role]').forEach(element => {
                const allowedRoles = element.getAttribute('data-role');
                const isVisible = element.style.display !== 'none';
                const computedStyle = window.getComputedStyle(element);
                const effectivelyVisible = computedStyle.display !== 'none';
                const elementText = element.textContent?.trim() || element.getAttribute('href') || 'unnamed';
                
                results.navigationElements.push({
                    element: elementText,
                    allowedRoles: allowedRoles,
                    styleDisplay: element.style.display,
                    computedDisplay: computedStyle.display,
                    isVisible: isVisible,
                    effectivelyVisible: effectivelyVisible,
                    href: element.getAttribute('href')
                });
            });
            
            // Check if VidPODNav is working
            results.vidpodNavStatus = {
                exists: typeof window.VidPODNav !== 'undefined',
                initialized: !!document.getElementById('vidpodNavbar')?.hasAttribute('data-initialized'),
                currentUser: window.VidPODNav?.currentUser || null
            };
            
            return results;
        });
        
        console.log('Detailed Navigation Analysis:');
        console.log('----------------------------');
        console.log(`Authentication:`);
        console.log(`  Token: ${detailedNavCheck.authStatus.hasToken ? '✅' : '❌'} (${detailedNavCheck.authStatus.tokenLength} chars)`);
        console.log(`  User: ${detailedNavCheck.authStatus.userName} (${detailedNavCheck.authStatus.userRole})`);
        console.log(`  URL: ${detailedNavCheck.authStatus.currentUrl}\n`);
        
        console.log(`VidPODNav Status:`);
        console.log(`  VidPODNav exists: ${detailedNavCheck.vidpodNavStatus.exists ? '✅' : '❌'}`);
        console.log(`  Initialized: ${detailedNavCheck.vidpodNavStatus.initialized ? '✅' : '❌'}`);
        console.log(`  Current user: ${JSON.stringify(detailedNavCheck.vidpodNavStatus.currentUser)}\n`);
        
        console.log(`Navigation Elements (${detailedNavCheck.navigationElements.length} found):`);
        detailedNavCheck.navigationElements.forEach(item => {
            const shouldBeVisible = item.allowedRoles.includes(detailedNavCheck.authStatus.userRole);
            const actuallyVisible = item.effectivelyVisible;
            const status = shouldBeVisible === actuallyVisible ? '✅' : '❌';
            
            console.log(`  ${status} ${item.element}:`);
            console.log(`    Roles: ${item.allowedRoles}`);
            console.log(`    Should show: ${shouldBeVisible}`);
            console.log(`    Actually visible: ${actuallyVisible}`);
            console.log(`    Style display: "${item.styleDisplay}"`);
            console.log(`    Computed display: "${item.computedDisplay}"`);
        });
        
        console.log('\n3️⃣ Testing Specific Admin Element Access...\n');
        
        // Test clicking on admin elements if they exist
        const adminClickTest = await page.evaluate(() => {
            const adminBrowse = document.querySelector('[href="/admin-browse-stories.html"]');
            const adminPanel = document.querySelector('[href="/admin.html"]');
            
            return {
                adminBrowse: {
                    exists: !!adminBrowse,
                    visible: adminBrowse ? window.getComputedStyle(adminBrowse).display !== 'none' : false,
                    clickable: adminBrowse ? !adminBrowse.disabled && adminBrowse.style.pointerEvents !== 'none' : false
                },
                adminPanel: {
                    exists: !!adminPanel,
                    visible: adminPanel ? window.getComputedStyle(adminPanel).display !== 'none' : false,
                    clickable: adminPanel ? !adminPanel.disabled && adminPanel.style.pointerEvents !== 'none' : false
                }
            };
        });
        
        console.log('Admin Element Access Test:');
        console.log(`  Admin Browse Stories:`);
        console.log(`    Exists: ${adminClickTest.adminBrowse.exists ? '✅' : '❌'}`);
        console.log(`    Visible: ${adminClickTest.adminBrowse.visible ? '✅' : '❌'}`);
        console.log(`    Clickable: ${adminClickTest.adminBrowse.clickable ? '✅' : '❌'}`);
        console.log(`  Admin Panel:`);
        console.log(`    Exists: ${adminClickTest.adminPanel.exists ? '✅' : '❌'}`);
        console.log(`    Visible: ${adminClickTest.adminPanel.visible ? '✅' : '❌'}`);
        console.log(`    Clickable: ${adminClickTest.adminPanel.clickable ? '✅' : '❌'}`);
        
        // Take screenshot
        await page.screenshot({ path: 'deployment-verification.png', fullPage: true });
        console.log('\n📸 Screenshot saved: deployment-verification.png');
        
        console.log('\n🎯 DEPLOYMENT DIAGNOSIS:');
        console.log('========================');
        
        const jsDeployed = navJsCheck.hasAmitraceFix && !navJsCheck.hasOldCode;
        const htmlDeployed = navHtmlCheck.hasAmitraceFix && !navHtmlCheck.hasOldCode;
        const authWorking = detailedNavCheck.authStatus.hasToken;
        const navWorking = adminClickTest.adminBrowse.visible && adminClickTest.adminPanel.visible;
        
        if (!jsDeployed) {
            console.log('❌ CRITICAL: navigation.js fixes NOT deployed');
            console.log('   - Still contains old role checking code');
            console.log('   - Missing amitrace_admin role support');
        }
        
        if (!htmlDeployed) {
            console.log('❌ CRITICAL: navigation.html fixes NOT deployed');
            console.log('   - data-role attributes missing amitrace_admin');
        }
        
        if (!authWorking) {
            console.log('❌ CRITICAL: Authentication not working');
            console.log('   - Token missing or being cleared');
        }
        
        if (!navWorking && authWorking) {
            console.log('❌ CRITICAL: Navigation visibility broken');
            console.log('   - User authenticated but admin elements hidden');
        }
        
        if (jsDeployed && htmlDeployed && authWorking && navWorking) {
            console.log('✅ SUCCESS: All fixes deployed and working!');
        } else {
            console.log('\n🔧 REQUIRED ACTIONS:');
            if (!jsDeployed || !htmlDeployed) {
                console.log('1. Force Railway deployment refresh');
                console.log('2. Check Railway build logs for frontend file updates');
                console.log('3. Verify CDN/cache invalidation');
            }
            if (!authWorking) {
                console.log('4. Check token preservation in admin.js/dashboard.js');
            }
        }
        
    } catch (error) {
        console.error('🚨 Verification failed:', error.message);
    } finally {
        await browser.close();
    }
}

verifyDeploymentStatus().catch(console.error);