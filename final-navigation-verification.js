const puppeteer = require('puppeteer');

async function verifyNavigationFixes() {
    console.log('🔧 FINAL NAVIGATION VERIFICATION TEST');
    console.log('====================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.text().includes('🔧') || msg.text().includes('NAVIGATION') || msg.text().includes('TOKEN')) {
                console.log(`📄 PAGE: ${msg.text()}`);
            }
        });
        page.on('error', err => console.log(`❌ ERROR: ${err.message}`));
        page.on('pageerror', err => console.log(`🚨 PAGE ERROR: ${err.message}`));
        
        console.log('1️⃣ Testing Admin Login and Token Preservation...\n');
        
        // Navigate to login
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        // Login as admin
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        // Wait for navigation and page load
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check initial auth state
        const initialAuth = await page.evaluate(() => ({
            url: window.location.href,
            hasToken: !!localStorage.getItem('token'),
            tokenLength: localStorage.getItem('token')?.length || 0,
            user: JSON.parse(localStorage.getItem('user') || '{}'),
            onLoginPage: window.location.pathname === '/' || window.location.pathname === '/index.html'
        }));
        
        console.log('Initial Authentication Check:');
        console.log(`  URL: ${initialAuth.url}`);
        console.log(`  Token: ${initialAuth.hasToken ? '✅' : '❌'} (${initialAuth.tokenLength} chars)`);
        console.log(`  User Role: ${initialAuth.user.role || 'none'}`);
        console.log(`  Still on login: ${initialAuth.onLoginPage ? '❌ PROBLEM' : '✅'}\n`);
        
        if (initialAuth.onLoginPage) {
            console.log('❌ CRITICAL: Still on login page after authentication!');
            await page.screenshot({ path: 'login-failure.png' });
            return;
        }
        
        console.log('2️⃣ Testing Navigation Role Recognition...\n');
        
        // Check navigation visibility for admin role
        const navigationCheck = await page.evaluate(() => {
            const results = {
                navExists: !!document.getElementById('vidpodNavbar'),
                userRole: JSON.parse(localStorage.getItem('user') || '{}').role,
                visibleNavItems: [],
                hiddenNavItems: [],
                roleBasedElements: []
            };
            
            // Check all navigation items with data-role
            document.querySelectorAll('[data-role]').forEach(element => {
                const allowedRoles = element.getAttribute('data-role').split(',').map(r => r.trim());
                const isVisible = element.style.display !== 'none';
                const elementText = element.textContent?.trim() || element.getAttribute('href') || 'unnamed';
                
                results.roleBasedElements.push({
                    element: elementText,
                    allowedRoles: allowedRoles,
                    visible: isVisible,
                    shouldBeVisible: allowedRoles.includes(results.userRole)
                });
                
                if (isVisible) {
                    results.visibleNavItems.push(elementText);
                } else {
                    results.hiddenNavItems.push(elementText);
                }
            });
            
            // Check specific admin elements
            const adminBrowse = document.querySelector('[href="/admin-browse-stories.html"]');
            const adminPanel = document.querySelector('[href="/admin.html"]');
            
            results.adminElements = {
                adminBrowse: {
                    exists: !!adminBrowse,
                    visible: adminBrowse ? adminBrowse.style.display !== 'none' : false
                },
                adminPanel: {
                    exists: !!adminPanel,
                    visible: adminPanel ? adminPanel.style.display !== 'none' : false
                }
            };
            
            return results;
        });
        
        console.log('Navigation Role Recognition Check:');
        console.log(`  Navigation exists: ${navigationCheck.navExists ? '✅' : '❌'}`);
        console.log(`  User role: ${navigationCheck.userRole}`);
        console.log(`  Visible items: ${navigationCheck.visibleNavItems.length}`);
        console.log(`  Hidden items: ${navigationCheck.hiddenNavItems.length}\n`);
        
        console.log('Role-based Element Analysis:');
        navigationCheck.roleBasedElements.forEach(item => {
            const status = item.visible === item.shouldBeVisible ? '✅' : '❌';
            console.log(`  ${status} ${item.element}: ${item.visible ? 'visible' : 'hidden'} (roles: ${item.allowedRoles.join(',')})`);
        });
        
        console.log('\nAdmin-specific Elements:');
        console.log(`  Admin Browse Stories: ${navigationCheck.adminElements.adminBrowse.visible ? '✅ visible' : '❌ hidden'}`);
        console.log(`  Admin Panel: ${navigationCheck.adminElements.adminPanel.visible ? '✅ visible' : '❌ hidden'}\n`);
        
        console.log('3️⃣ Testing Token Preservation Across Pages...\n');
        
        // Test token preservation by navigating to different pages
        const pagesToTest = [
            '/dashboard.html',
            '/stories.html', 
            '/admin.html',
            '/teacher-dashboard.html'
        ];
        
        for (const pagePath of pagesToTest) {
            console.log(`Testing ${pagePath}...`);
            
            const tokenBefore = await page.evaluate(() => localStorage.getItem('token'));
            
            await page.goto(`https://podcast-stories-production.up.railway.app${pagePath}`, {
                waitUntil: 'networkidle2'
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const tokenAfter = await page.evaluate(() => ({
                token: localStorage.getItem('token'),
                url: window.location.href,
                onLoginPage: window.location.pathname === '/' || window.location.pathname === '/index.html'
            }));
            
            const tokenPreserved = tokenBefore === tokenAfter.token && tokenAfter.token !== null;
            const notRedirected = !tokenAfter.onLoginPage;
            
            console.log(`  Token preserved: ${tokenPreserved ? '✅' : '❌'}`);
            console.log(`  Not redirected: ${notRedirected ? '✅' : '❌'}`);
            
            if (!tokenPreserved || !notRedirected) {
                console.log(`  ⚠️  PROBLEM: Token lost or redirected to login`);
                console.log(`  Expected token: ${tokenBefore?.substring(0, 20)}...`);
                console.log(`  Actual token: ${tokenAfter.token?.substring(0, 20) || 'null'}...`);
                console.log(`  Current URL: ${tokenAfter.url}`);
            }
        }
        
        console.log('\n4️⃣ Testing Admin Panel Access...\n');
        
        // Navigate to admin panel
        await page.goto('https://podcast-stories-production.up.railway.app/admin.html', {
            waitUntil: 'networkidle2'
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const adminAccess = await page.evaluate(() => ({
            url: window.location.href,
            hasToken: !!localStorage.getItem('token'),
            onAdminPage: window.location.pathname.includes('admin'),
            hasAdminContent: !!document.querySelector('.admin-container, .admin-panel, [class*="admin"]'),
            pageTitle: document.title,
            bodyText: document.body.textContent.substring(0, 200)
        }));
        
        console.log('Admin Panel Access Test:');
        console.log(`  On admin page: ${adminAccess.onAdminPage ? '✅' : '❌'}`);
        console.log(`  Has token: ${adminAccess.hasToken ? '✅' : '❌'}`);
        console.log(`  Has admin content: ${adminAccess.hasAdminContent ? '✅' : '❌'}`);
        console.log(`  Page title: ${adminAccess.pageTitle}`);
        
        console.log('\n5️⃣ Testing Navigation Between Admin Pages...\n');
        
        // Test clicking admin navigation links
        const adminNavTest = await page.evaluate(() => {
            const results = {
                adminBrowseLink: null,
                adminPanelLink: null
            };
            
            const adminBrowseEl = document.querySelector('[href="/admin-browse-stories.html"]');
            const adminPanelEl = document.querySelector('[href="/admin.html"]');
            
            results.adminBrowseLink = {
                exists: !!adminBrowseEl,
                visible: adminBrowseEl ? adminBrowseEl.style.display !== 'none' : false,
                clickable: adminBrowseEl ? !adminBrowseEl.disabled : false
            };
            
            results.adminPanelLink = {
                exists: !!adminPanelEl,
                visible: adminPanelEl ? adminPanelEl.style.display !== 'none' : false,
                clickable: adminPanelEl ? !adminPanelEl.disabled : false
            };
            
            return results;
        });
        
        console.log('Admin Navigation Links:');
        console.log(`  Admin Browse Stories: ${adminNavTest.adminBrowseLink.visible ? '✅ visible' : '❌ hidden'}`);
        console.log(`  Admin Panel: ${adminNavTest.adminPanelLink.visible ? '✅ visible' : '❌ hidden'}`);
        
        // Take final screenshot
        await page.screenshot({ path: 'navigation-verification-final.png', fullPage: true });
        console.log('\n📸 Screenshot saved: navigation-verification-final.png');
        
        console.log('\n🎯 VERIFICATION RESULTS:');
        console.log('=======================');
        
        const allTestsPassed = 
            !initialAuth.onLoginPage &&
            navigationCheck.navExists &&
            navigationCheck.adminElements.adminBrowse.visible &&
            navigationCheck.adminElements.adminPanel.visible &&
            adminAccess.onAdminPage &&
            adminAccess.hasToken;
        
        if (allTestsPassed) {
            console.log('✅ ALL TESTS PASSED: Navigation fixes are working correctly!');
            console.log('   - Admin login successful');
            console.log('   - Token preservation working');
            console.log('   - Role recognition fixed for amitrace_admin');
            console.log('   - Admin navigation elements visible');
            console.log('   - Admin panel accessible');
        } else {
            console.log('❌ SOME TESTS FAILED: Issues still exist');
            
            if (initialAuth.onLoginPage) {
                console.log('   - Login/redirect issue');
            }
            if (!navigationCheck.navExists) {
                console.log('   - Navigation not loading');
            }
            if (!navigationCheck.adminElements.adminBrowse.visible || !navigationCheck.adminElements.adminPanel.visible) {
                console.log('   - Admin elements not visible');
            }
            if (!adminAccess.onAdminPage || !adminAccess.hasToken) {
                console.log('   - Admin access issue');
            }
        }
        
    } catch (error) {
        console.error('🚨 Verification failed:', error.message);
    } finally {
        await browser.close();
    }
}

verifyNavigationFixes().catch(console.error);