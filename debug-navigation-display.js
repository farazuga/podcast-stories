const puppeteer = require('puppeteer');

async function debugNavigationDisplay() {
    console.log('🔍 DEBUGGING NAVIGATION DISPLAY ISSUE');
    console.log('====================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set viewport to desktop size
        await page.setViewport({ width: 1200, height: 800 });
        
        console.log('1️⃣ Testing Navigation Display on Admin Page...\n');
        
        // Login and navigate to admin page
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check navigation display state
        const navDisplayCheck = await page.evaluate(() => {
            const results = {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                navigationElements: {},
                mobileMenuState: {},
                cssIssues: []
            };
            
            // Check main navigation elements
            const navbar = document.getElementById('vidpodNavbar');
            const mainNav = document.getElementById('mainNav');
            const mobileMenu = document.getElementById('mobileMenu');
            const mobileToggle = document.getElementById('mobileToggle');
            
            if (navbar) {
                const navbarStyle = window.getComputedStyle(navbar);
                results.navigationElements.navbar = {
                    exists: true,
                    display: navbarStyle.display,
                    visibility: navbarStyle.visibility,
                    position: navbarStyle.position,
                    zIndex: navbarStyle.zIndex
                };
            }
            
            if (mainNav) {
                const mainNavStyle = window.getComputedStyle(mainNav);
                results.navigationElements.mainNav = {
                    exists: true,
                    display: mainNavStyle.display,
                    visibility: mainNavStyle.visibility,
                    flexDirection: mainNavStyle.flexDirection
                };
            }
            
            if (mobileMenu) {
                const mobileMenuStyle = window.getComputedStyle(mobileMenu);
                results.mobileMenuState = {
                    exists: true,
                    display: mobileMenuStyle.display,
                    visibility: mobileMenuStyle.visibility,
                    position: mobileMenuStyle.position,
                    hasActiveClass: mobileMenu.classList.contains('active'),
                    classList: Array.from(mobileMenu.classList)
                };
                
                // Check if mobile menu should be hidden on desktop
                if (window.innerWidth > 768 && mobileMenuStyle.display !== 'none') {
                    results.cssIssues.push('Mobile menu visible on desktop viewport');
                }
            }
            
            if (mobileToggle) {
                const mobileToggleStyle = window.getComputedStyle(mobileToggle);
                results.navigationElements.mobileToggle = {
                    exists: true,
                    display: mobileToggleStyle.display,
                    visibility: mobileToggleStyle.visibility
                };
                
                // Check if mobile toggle should be hidden on desktop
                if (window.innerWidth > 768 && mobileToggleStyle.display !== 'none') {
                    results.cssIssues.push('Mobile toggle visible on desktop viewport');
                }
            }
            
            // Check for multiple navigation elements
            const allNavs = document.querySelectorAll('nav, .navbar, .navigation');
            results.navigationElements.totalNavElements = allNavs.length;
            
            if (allNavs.length > 1) {
                results.cssIssues.push('Multiple navigation elements detected');
                results.navigationElements.allNavs = Array.from(allNavs).map(nav => ({
                    tagName: nav.tagName,
                    className: nav.className,
                    id: nav.id,
                    display: window.getComputedStyle(nav).display
                }));
            }
            
            // Check CSS media queries
            const mediaQueryMatches = {
                mobile: window.matchMedia('(max-width: 768px)').matches,
                tablet: window.matchMedia('(max-width: 1024px)').matches,
                desktop: window.matchMedia('(min-width: 769px)').matches
            };
            results.mediaQueries = mediaQueryMatches;
            
            return results;
        });
        
        console.log('Navigation Display Analysis:');
        console.log('===========================');
        console.log(`Viewport: ${navDisplayCheck.viewport.width}x${navDisplayCheck.viewport.height}`);
        console.log(`Media Query Matches: Mobile=${navDisplayCheck.mediaQueries.mobile}, Desktop=${navDisplayCheck.mediaQueries.desktop}\n`);
        
        console.log('Navigation Elements:');
        console.log(`  Total nav elements: ${navDisplayCheck.navigationElements.totalNavElements}`);
        console.log(`  Main navbar exists: ${navDisplayCheck.navigationElements.navbar?.exists ? '✅' : '❌'}`);
        console.log(`  Main nav display: ${navDisplayCheck.navigationElements.mainNav?.display || 'N/A'}`);
        console.log(`  Mobile toggle display: ${navDisplayCheck.navigationElements.mobileToggle?.display || 'N/A'}\n`);
        
        console.log('Mobile Menu State:');
        console.log(`  Mobile menu exists: ${navDisplayCheck.mobileMenuState.exists ? '✅' : '❌'}`);
        console.log(`  Mobile menu display: ${navDisplayCheck.mobileMenuState.display || 'N/A'}`);
        console.log(`  Has active class: ${navDisplayCheck.mobileMenuState.hasActiveClass ? '✅' : '❌'}`);
        console.log(`  Classes: ${navDisplayCheck.mobileMenuState.classList?.join(', ') || 'N/A'}\n`);
        
        if (navDisplayCheck.cssIssues.length > 0) {
            console.log('🚨 CSS Issues Detected:');
            navDisplayCheck.cssIssues.forEach(issue => {
                console.log(`  ❌ ${issue}`);
            });
        } else {
            console.log('✅ No CSS display issues detected');
        }
        
        // Take screenshot
        await page.screenshot({ path: 'navigation-display-debug.png', fullPage: true });
        console.log('\n📸 Screenshot saved: navigation-display-debug.png');
        
        console.log('\n2️⃣ Testing CSS Fix...\n');
        
        // Apply CSS fix
        const fixResult = await page.evaluate(() => {
            const mobileMenu = document.getElementById('mobileMenu');
            
            if (mobileMenu) {
                // Force hide mobile menu on desktop
                if (window.innerWidth > 768) {
                    mobileMenu.style.display = 'none';
                    mobileMenu.classList.remove('active');
                    return {
                        applied: true,
                        newDisplay: window.getComputedStyle(mobileMenu).display
                    };
                }
            }
            
            return { applied: false, reason: 'Mobile menu not found' };
        });
        
        console.log('CSS Fix Applied:');
        console.log(`  Fix applied: ${fixResult.applied ? '✅' : '❌'}`);
        console.log(`  New display: ${fixResult.newDisplay || fixResult.reason}`);
        
        // Take after fix screenshot
        await page.screenshot({ path: 'navigation-display-fixed.png', fullPage: true });
        console.log('\n📸 After-fix screenshot saved: navigation-display-fixed.png');
        
        console.log('\n🎯 DIAGNOSIS SUMMARY:');
        console.log('====================');
        
        if (navDisplayCheck.cssIssues.length > 0) {
            console.log('❌ ISSUE CONFIRMED: Mobile menu incorrectly displayed on desktop');
            console.log('\nPossible causes:');
            console.log('1. CSS media query not working properly');
            console.log('2. Mobile menu has active class when it shouldn\'t');
            console.log('3. JavaScript accidentally showing mobile menu');
            console.log('4. CSS specificity issues overriding hide rules');
            
            console.log('\n🔧 RECOMMENDED FIXES:');
            console.log('1. Update CSS to force hide mobile menu on desktop');
            console.log('2. Add JavaScript to ensure mobile menu is hidden on desktop');
            console.log('3. Remove any active classes from mobile menu on page load');
        } else {
            console.log('✅ No display issues detected - mobile menu properly hidden');
        }
        
    } catch (error) {
        console.error('🚨 Debug failed:', error.message);
    } finally {
        await browser.close();
    }
}

debugNavigationDisplay().catch(console.error);