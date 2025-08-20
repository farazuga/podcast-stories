const puppeteer = require('puppeteer');

async function debugNavigationIssue() {
    console.log('🔍 Debugging Navigation System Issue');
    console.log('=====================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable detailed console logging
        page.on('console', msg => console.log(`📄 PAGE: ${msg.text()}`));
        page.on('error', err => console.log(`❌ ERROR: ${err.message}`));
        page.on('pageerror', err => console.log(`🚨 PAGE ERROR: ${err.message}`));
        
        // Track network requests for navigation files
        page.on('response', response => {
            const url = response.url();
            if (url.includes('navigation') || url.includes('includes')) {
                console.log(`📡 Network: ${response.status()} - ${url}`);
            }
        });
        
        console.log('1️⃣ Testing Login and Initial Navigation Load...\n');
        
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
        
        console.log('\n2️⃣ Checking Navigation Elements...\n');
        
        // Check navigation presence and structure
        const navCheck = await page.evaluate(() => {
            const results = {
                url: window.location.href,
                hasToken: !!localStorage.getItem('token'),
                userRole: JSON.parse(localStorage.getItem('user') || '{}').role || 'none',
                
                // Check for navigation elements
                hasStaticNav: !!document.querySelector('nav.navbar'),
                hasNavComment: document.documentElement.innerHTML.includes('Navigation will auto-load here'),
                navScriptsLoaded: {
                    navigation: !!document.querySelector('script[src*="navigation.js"]'),
                    includeNav: !!document.querySelector('script[src*="include-navigation.js"]')
                },
                
                // Check actual navigation presence
                navElements: {
                    anyNav: !!document.querySelector('nav'),
                    navWithClass: document.querySelector('nav')?.className || 'none',
                    navbarDiv: !!document.querySelector('.navbar'),
                    navMenuDiv: !!document.querySelector('.nav-menu'),
                    navLinksCount: document.querySelectorAll('nav a').length
                },
                
                // Check for includes
                includesAttempted: window.includeNavigationAttempted || false,
                navigationLoadError: window.navigationLoadError || null
            };
            
            // Try to find any navigation-like elements
            const possibleNavs = document.querySelectorAll('[class*="nav"], [id*="nav"], nav');
            results.possibleNavElements = Array.from(possibleNavs).map(el => ({
                tag: el.tagName,
                class: el.className,
                id: el.id,
                childCount: el.children.length
            }));
            
            return results;
        });
        
        console.log('📊 Navigation Check Results:');
        console.log('----------------------------');
        console.log(`URL: ${navCheck.url}`);
        console.log(`Authenticated: ${navCheck.hasToken ? '✅' : '❌'} (Role: ${navCheck.userRole})`);
        console.log(`\nNavigation Status:`);
        console.log(`  Static Nav: ${navCheck.hasStaticNav ? '✅ Found' : '❌ Missing'}`);
        console.log(`  Nav Comment: ${navCheck.hasNavComment ? '✅ Found' : '❌ Missing'}`);
        console.log(`  Scripts Loaded:`);
        console.log(`    - navigation.js: ${navCheck.navScriptsLoaded.navigation ? '✅' : '❌'}`);
        console.log(`    - include-navigation.js: ${navCheck.navScriptsLoaded.includeNav ? '✅' : '❌'}`);
        console.log(`\nActual Navigation:`);
        console.log(`  Any <nav>: ${navCheck.navElements.anyNav ? '✅' : '❌'}`);
        console.log(`  Nav class: ${navCheck.navElements.navWithClass}`);
        console.log(`  .navbar div: ${navCheck.navElements.navbarDiv ? '✅' : '❌'}`);
        console.log(`  .nav-menu: ${navCheck.navElements.navMenuDiv ? '✅' : '❌'}`);
        console.log(`  Link count: ${navCheck.navElements.navLinksCount}`);
        
        if (navCheck.possibleNavElements.length > 0) {
            console.log(`\nPossible Navigation Elements Found:`);
            navCheck.possibleNavElements.forEach(el => {
                console.log(`  - <${el.tag}> class="${el.class}" id="${el.id}" (${el.childCount} children)`);
            });
        }
        
        console.log('\n3️⃣ Testing Navigation File Loading...\n');
        
        // Check if navigation HTML can be loaded
        const navFileCheck = await page.evaluate(async () => {
            try {
                const response = await fetch('/includes/navigation.html');
                return {
                    status: response.status,
                    ok: response.ok,
                    contentLength: (await response.text()).length
                };
            } catch (error) {
                return {
                    error: error.message
                };
            }
        });
        
        console.log('Navigation HTML File:');
        if (navFileCheck.error) {
            console.log(`  ❌ Error: ${navFileCheck.error}`);
        } else {
            console.log(`  Status: ${navFileCheck.status} ${navFileCheck.ok ? '✅' : '❌'}`);
            console.log(`  Content Length: ${navFileCheck.contentLength} bytes`);
        }
        
        console.log('\n4️⃣ Checking JavaScript Errors...\n');
        
        // Execute navigation loading manually
        const manualNavLoad = await page.evaluate(async () => {
            const results = {
                errors: [],
                success: false
            };
            
            try {
                // Check if functions exist
                results.hasIncludeFunction = typeof includeHTML !== 'undefined';
                results.hasNavigationFunction = typeof initializeNavigation !== 'undefined';
                
                // Try to load navigation manually
                if (typeof includeHTML === 'function') {
                    await includeHTML();
                    results.includeHTMLCalled = true;
                }
                
                // Check result
                results.navAfterInclude = !!document.querySelector('nav');
                results.success = true;
                
            } catch (error) {
                results.errors.push(error.message);
            }
            
            return results;
        });
        
        console.log('Manual Navigation Load Attempt:');
        console.log(`  Has includeHTML function: ${manualNavLoad.hasIncludeFunction ? '✅' : '❌'}`);
        console.log(`  Has initializeNavigation: ${manualNavLoad.hasNavigationFunction ? '✅' : '❌'}`);
        console.log(`  Include called: ${manualNavLoad.includeHTMLCalled || false}`);
        console.log(`  Nav after include: ${manualNavLoad.navAfterInclude ? '✅' : '❌'}`);
        if (manualNavLoad.errors.length > 0) {
            console.log(`  Errors: ${manualNavLoad.errors.join(', ')}`);
        }
        
        console.log('\n5️⃣ Testing Different Pages...\n');
        
        // Test navigation on different pages
        const pagesToTest = [
            '/dashboard.html',
            '/stories.html',
            '/teacher-dashboard.html'
        ];
        
        for (const pagePath of pagesToTest) {
            await page.goto(`https://podcast-stories-production.up.railway.app${pagePath}`, {
                waitUntil: 'networkidle2'
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const pageNav = await page.evaluate(() => ({
                url: window.location.pathname,
                hasNav: !!document.querySelector('nav'),
                navLinks: document.querySelectorAll('nav a').length,
                hasNavComment: document.documentElement.innerHTML.includes('Navigation will auto-load')
            }));
            
            console.log(`${pagePath}:`);
            console.log(`  Navigation: ${pageNav.hasNav ? `✅ (${pageNav.navLinks} links)` : '❌ Missing'}`);
            console.log(`  Has comment: ${pageNav.hasNavComment ? '✅' : '❌'}`);
        }
        
        // Take screenshot
        await page.screenshot({ path: 'navigation-debug.png', fullPage: true });
        console.log('\n📸 Screenshot saved: navigation-debug.png');
        
        console.log('\n🎯 DIAGNOSIS SUMMARY:');
        console.log('====================');
        
        if (!navCheck.navElements.anyNav) {
            console.log('❌ CRITICAL: No navigation elements found on page');
            console.log('\nPossible causes:');
            console.log('1. include-navigation.js not loading properly');
            console.log('2. includes/navigation.html file missing or inaccessible');
            console.log('3. JavaScript errors preventing navigation injection');
            console.log('4. Scripts loading in wrong order');
        } else if (navCheck.navElements.navLinksCount === 0) {
            console.log('⚠️ WARNING: Navigation exists but has no links');
            console.log('\nPossible causes:');
            console.log('1. Navigation HTML loaded but not populated');
            console.log('2. Role-based visibility hiding all links');
            console.log('3. JavaScript errors in navigation.js');
        } else {
            console.log('✅ Navigation appears to be working');
        }
        
    } catch (error) {
        console.error('🚨 Debug failed:', error.message);
    } finally {
        await browser.close();
    }
}

debugNavigationIssue().catch(console.error);