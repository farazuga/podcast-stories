const puppeteer = require('puppeteer');

async function testNavigationDisplayFix() {
    console.log('🔧 TESTING NAVIGATION DISPLAY FIX');
    console.log('=================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set desktop viewport
        await page.setViewport({ width: 1200, height: 800 });
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.text().includes('V2 NAVIGATION') || msg.text().includes('Mobile menu')) {
                console.log(`📄 PAGE: ${msg.text()}`);
            }
        });
        
        console.log('1️⃣ Testing Admin Page Navigation Display...\n');
        
        // Login
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const adminPageCheck = await page.evaluate(() => {
            return {
                url: window.location.href,
                viewport: { width: window.innerWidth, height: window.innerHeight },
                mobileMenu: {
                    exists: !!document.getElementById('mobileMenu'),
                    display: document.getElementById('mobileMenu') ? 
                        window.getComputedStyle(document.getElementById('mobileMenu')).display : 'N/A',
                    hasActiveClass: document.getElementById('mobileMenu')?.classList.contains('active') || false
                },
                mobileToggle: {
                    exists: !!document.getElementById('mobileToggle'),
                    display: document.getElementById('mobileToggle') ? 
                        window.getComputedStyle(document.getElementById('mobileToggle')).display : 'N/A'
                },
                mainNav: {
                    exists: !!document.getElementById('mainNav'),
                    display: document.getElementById('mainNav') ? 
                        window.getComputedStyle(document.getElementById('mainNav')).display : 'N/A'
                }
            };
        });
        
        console.log('Admin Page Navigation Check:');
        console.log(`  URL: ${adminPageCheck.url}`);
        console.log(`  Viewport: ${adminPageCheck.viewport.width}x${adminPageCheck.viewport.height}`);
        console.log(`  Main nav display: ${adminPageCheck.mainNav.display} ${adminPageCheck.mainNav.display === 'flex' ? '✅' : '❌'}`);
        console.log(`  Mobile menu display: ${adminPageCheck.mobileMenu.display} ${adminPageCheck.mobileMenu.display === 'none' ? '✅' : '❌'}`);
        console.log(`  Mobile toggle display: ${adminPageCheck.mobileToggle.display} ${adminPageCheck.mobileToggle.display === 'none' ? '✅' : '❌'}`);
        console.log(`  Mobile menu active: ${adminPageCheck.mobileMenu.hasActiveClass ? '❌' : '✅'}\n`);
        
        // Take screenshot
        await page.screenshot({ path: 'admin-navigation-fixed.png', fullPage: true });
        console.log('📸 Admin page screenshot: admin-navigation-fixed.png\n');
        
        console.log('2️⃣ Testing Dashboard Navigation Display...\n');
        
        // Navigate to dashboard
        await page.goto('https://podcast-stories-production.up.railway.app/dashboard.html', {
            waitUntil: 'networkidle2'
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const dashboardCheck = await page.evaluate(() => {
            return {
                url: window.location.href,
                mobileMenu: {
                    display: document.getElementById('mobileMenu') ? 
                        window.getComputedStyle(document.getElementById('mobileMenu')).display : 'N/A',
                    hasActiveClass: document.getElementById('mobileMenu')?.classList.contains('active') || false
                },
                mobileToggle: {
                    display: document.getElementById('mobileToggle') ? 
                        window.getComputedStyle(document.getElementById('mobileToggle')).display : 'N/A'
                },
                mainNav: {
                    display: document.getElementById('mainNav') ? 
                        window.getComputedStyle(document.getElementById('mainNav')).display : 'N/A'
                }
            };
        });
        
        console.log('Dashboard Navigation Check:');
        console.log(`  URL: ${dashboardCheck.url}`);
        console.log(`  Main nav display: ${dashboardCheck.mainNav.display} ${dashboardCheck.mainNav.display === 'flex' ? '✅' : '❌'}`);
        console.log(`  Mobile menu display: ${dashboardCheck.mobileMenu.display} ${dashboardCheck.mobileMenu.display === 'none' ? '✅' : '❌'}`);
        console.log(`  Mobile toggle display: ${dashboardCheck.mobileToggle.display} ${dashboardCheck.mobileToggle.display === 'none' ? '✅' : '❌'}`);
        
        // Take screenshot
        await page.screenshot({ path: 'dashboard-navigation-fixed.png', fullPage: true });
        console.log('📸 Dashboard screenshot: dashboard-navigation-fixed.png\n');
        
        console.log('3️⃣ Testing Mobile Viewport (Responsive)...\n');
        
        // Switch to mobile viewport
        await page.setViewport({ width: 375, height: 667 });
        await page.reload({ waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const mobileCheck = await page.evaluate(() => {
            return {
                viewport: { width: window.innerWidth, height: window.innerHeight },
                mobileMenu: {
                    display: document.getElementById('mobileMenu') ? 
                        window.getComputedStyle(document.getElementById('mobileMenu')).display : 'N/A',
                    hasActiveClass: document.getElementById('mobileMenu')?.classList.contains('active') || false
                },
                mobileToggle: {
                    display: document.getElementById('mobileToggle') ? 
                        window.getComputedStyle(document.getElementById('mobileToggle')).display : 'N/A'
                },
                mainNav: {
                    display: document.getElementById('mainNav') ? 
                        window.getComputedStyle(document.getElementById('mainNav')).display : 'N/A'
                }
            };
        });
        
        console.log('Mobile Viewport Check:');
        console.log(`  Viewport: ${mobileCheck.viewport.width}x${mobileCheck.viewport.height}`);
        console.log(`  Main nav display: ${mobileCheck.mainNav.display} ${mobileCheck.mainNav.display === 'none' ? '✅' : '❌'}`);
        console.log(`  Mobile toggle display: ${mobileCheck.mobileToggle.display} ${['flex', 'inline-flex', 'block'].includes(mobileCheck.mobileToggle.display) ? '✅' : '❌'}`);
        console.log(`  Mobile menu display: ${mobileCheck.mobileMenu.display} ${mobileCheck.mobileMenu.display === 'none' ? '✅' : '❌'} (should be none until toggled)`);
        
        // Test mobile menu toggle
        await page.click('#mobileToggle');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mobileMenuToggled = await page.evaluate(() => {
            return {
                mobileMenuActive: document.getElementById('mobileMenu')?.classList.contains('active') || false,
                mobileMenuDisplay: document.getElementById('mobileMenu') ? 
                    window.getComputedStyle(document.getElementById('mobileMenu')).display : 'N/A'
            };
        });
        
        console.log(`  Mobile menu after toggle: ${mobileMenuToggled.mobileMenuDisplay} ${mobileMenuToggled.mobileMenuActive ? '✅' : '❌'}`);
        
        // Take mobile screenshot
        await page.screenshot({ path: 'mobile-navigation-test.png', fullPage: true });
        console.log('📸 Mobile screenshot: mobile-navigation-test.png\n');
        
        console.log('🎯 NAVIGATION DISPLAY FIX RESULTS:');
        console.log('==================================');
        
        const desktopFixed = adminPageCheck.mobileMenu.display === 'none' && 
                            adminPageCheck.mobileToggle.display === 'none' &&
                            dashboardCheck.mobileMenu.display === 'none';
        
        const mobileWorking = mobileCheck.mainNav.display === 'none' &&
                             ['flex', 'inline-flex', 'block'].includes(mobileCheck.mobileToggle.display) &&
                             mobileMenuToggled.mobileMenuActive;
        
        if (desktopFixed && mobileWorking) {
            console.log('✅ SUCCESS: Navigation display is now working correctly!');
            console.log('   - Desktop: Mobile menu properly hidden');
            console.log('   - Desktop: Mobile toggle properly hidden');  
            console.log('   - Mobile: Main nav properly hidden');
            console.log('   - Mobile: Mobile toggle visible and functional');
            console.log('   - Mobile: Menu toggles correctly');
        } else {
            console.log('❌ PARTIAL SUCCESS: Some issues remain');
            if (!desktopFixed) {
                console.log('   - Desktop mobile elements still visible');
            }
            if (!mobileWorking) {
                console.log('   - Mobile responsive behavior not working');
            }
        }
        
    } catch (error) {
        console.error('🚨 Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testNavigationDisplayFix().catch(console.error);