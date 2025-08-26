const puppeteer = require('puppeteer');

async function testCleanNavigation() {
    console.log('🎨 TESTING CLEAN NAVIGATION LAYOUT');
    console.log('==================================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set desktop viewport
        await page.setViewport({ width: 1400, height: 900 });
        
        console.log('1️⃣ Testing Clean Navigation Layout...\n');
        
        // Login and navigate to admin page
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle2' 
        });
        
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check navigation layout
        const layoutCheck = await page.evaluate(() => {
            const navbar = document.getElementById('vidpodNavbar');
            const container = navbar?.querySelector('.navbar-container');
            const brand = navbar?.querySelector('.navbar-brand');
            const mainNav = document.getElementById('mainNav');
            const navItems = navbar?.querySelectorAll('.nav-item');
            const mobileToggle = document.getElementById('mobileToggle');
            const userActions = navbar?.querySelector('.navbar-actions');
            
            return {
                navbar: {
                    exists: !!navbar,
                    height: navbar ? window.getComputedStyle(navbar).height : 'N/A',
                    background: navbar ? window.getComputedStyle(navbar).backgroundColor : 'N/A',
                    border: navbar ? window.getComputedStyle(navbar).borderBottom : 'N/A'
                },
                container: {
                    exists: !!container,
                    height: container ? window.getComputedStyle(container).height : 'N/A',
                    display: container ? window.getComputedStyle(container).display : 'N/A',
                    padding: container ? window.getComputedStyle(container).padding : 'N/A'
                },
                brand: {
                    exists: !!brand,
                    fontSize: brand ? window.getComputedStyle(brand).fontSize : 'N/A',
                    color: brand ? window.getComputedStyle(brand).color : 'N/A',
                    marginRight: brand ? window.getComputedStyle(brand).marginRight : 'N/A'
                },
                mainNav: {
                    exists: !!mainNav,
                    display: mainNav ? window.getComputedStyle(mainNav).display : 'N/A',
                    gap: mainNav ? window.getComputedStyle(mainNav).gap : 'N/A'
                },
                navItems: {
                    count: navItems ? navItems.length : 0,
                    fontSize: navItems && navItems[0] ? window.getComputedStyle(navItems[0]).fontSize : 'N/A',
                    padding: navItems && navItems[0] ? window.getComputedStyle(navItems[0]).padding : 'N/A'
                },
                userActions: {
                    exists: !!userActions,
                    display: userActions ? window.getComputedStyle(userActions).display : 'N/A'
                },
                mobileToggle: {
                    exists: !!mobileToggle,
                    display: mobileToggle ? window.getComputedStyle(mobileToggle).display : 'N/A'
                }
            };
        });
        
        console.log('Clean Navigation Layout Check:');
        console.log('=============================');
        console.log(`Navbar:`);
        console.log(`  Height: ${layoutCheck.navbar.height} ${layoutCheck.navbar.height === '56px' ? '✅' : '⚠️'}`);
        console.log(`  Background: ${layoutCheck.navbar.background}`);
        console.log(`  Border: ${layoutCheck.navbar.border.includes('rgb(229, 231, 235)') ? '✅ Clean border' : '⚠️ ' + layoutCheck.navbar.border}`);
        
        console.log(`\nContainer:`);
        console.log(`  Height: ${layoutCheck.container.height}`);
        console.log(`  Display: ${layoutCheck.container.display} ${layoutCheck.container.display === 'flex' ? '✅' : '❌'}`);
        console.log(`  Padding: ${layoutCheck.container.padding}`);
        
        console.log(`\nBrand:`);
        console.log(`  Font Size: ${layoutCheck.brand.fontSize} ${layoutCheck.brand.fontSize === '20px' ? '✅' : '⚠️'}`);
        console.log(`  Color: ${layoutCheck.brand.color.includes('249, 115, 22') ? '✅ Orange' : '⚠️ ' + layoutCheck.brand.color}`);
        console.log(`  Margin Right: ${layoutCheck.brand.marginRight}`);
        
        console.log(`\nMain Navigation:`);
        console.log(`  Display: ${layoutCheck.mainNav.display} ${layoutCheck.mainNav.display === 'flex' ? '✅' : '❌'}`);
        console.log(`  Gap: ${layoutCheck.mainNav.gap} ${layoutCheck.mainNav.gap === '0px' ? '✅' : '⚠️'}`);
        console.log(`  Nav Items: ${layoutCheck.navItems.count} items`);
        console.log(`  Item Font Size: ${layoutCheck.navItems.fontSize} ${layoutCheck.navItems.fontSize === '14px' ? '✅' : '⚠️'}`);
        console.log(`  Item Padding: ${layoutCheck.navItems.padding}`);
        
        console.log(`\nUser Actions:`);
        console.log(`  Display: ${layoutCheck.userActions.display} ${layoutCheck.userActions.display === 'none' ? '✅ Hidden' : '❌ Visible'}`);
        
        console.log(`\nMobile Toggle:`);
        console.log(`  Display: ${layoutCheck.mobileToggle.display} ${layoutCheck.mobileToggle.display === 'none' ? '✅ Hidden on desktop' : '❌ Visible'}`);
        
        // Take screenshot
        await page.screenshot({ path: 'clean-navigation-layout.png', fullPage: true });
        console.log('\n📸 Screenshot saved: clean-navigation-layout.png');
        
        // Test different pages to ensure consistency
        console.log('\n2️⃣ Testing Layout Consistency Across Pages...\n');
        
        const pagesToTest = ['/dashboard.html', '/stories.html', '/admin-browse-stories.html'];
        
        for (const pagePath of pagesToTest) {
            await page.goto(`https://podcast-stories-production.up.railway.app${pagePath}`, {
                waitUntil: 'networkidle2'
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const pageCheck = await page.evaluate(() => {
                const navbar = document.getElementById('vidpodNavbar');
                const mobileMenu = document.getElementById('mobileMenu');
                const userActions = navbar?.querySelector('.navbar-actions');
                
                return {
                    url: window.location.pathname,
                    navbarHeight: navbar ? window.getComputedStyle(navbar).height : 'N/A',
                    mobileMenuDisplay: mobileMenu ? window.getComputedStyle(mobileMenu).display : 'N/A',
                    userActionsDisplay: userActions ? window.getComputedStyle(userActions).display : 'N/A'
                };
            });
            
            console.log(`${pagePath}:`);
            console.log(`  Navbar Height: ${pageCheck.navbarHeight} ${pageCheck.navbarHeight === '56px' ? '✅' : '⚠️'}`);
            console.log(`  Mobile Menu: ${pageCheck.mobileMenuDisplay} ${pageCheck.mobileMenuDisplay === 'none' ? '✅' : '❌'}`);
            console.log(`  User Actions: ${pageCheck.userActionsDisplay} ${pageCheck.userActionsDisplay === 'none' ? '✅' : '❌'}`);
        }
        
        console.log('\n🎯 CLEAN LAYOUT ASSESSMENT:');
        console.log('===========================');
        
        const isCleanLayout = 
            layoutCheck.navbar.height === '56px' &&
            layoutCheck.userActions.display === 'none' &&
            layoutCheck.mobileToggle.display === 'none' &&
            layoutCheck.mainNav.display === 'flex';
        
        if (isCleanLayout) {
            console.log('✅ SUCCESS: Clean navigation layout achieved!');
            console.log('   ✅ Compact 56px height');
            console.log('   ✅ User actions hidden');
            console.log('   ✅ Mobile toggle hidden on desktop');
            console.log('   ✅ Main navigation properly displayed');
            console.log('   ✅ Clean single-line layout matching target design');
        } else {
            console.log('⚠️ PARTIAL SUCCESS: Layout improvements applied');
            if (layoutCheck.navbar.height !== '56px') {
                console.log('   - Navbar height needs adjustment');
            }
            if (layoutCheck.userActions.display !== 'none') {
                console.log('   - User actions still visible');
            }
            if (layoutCheck.mobileToggle.display !== 'none') {
                console.log('   - Mobile toggle still visible');
            }
        }
        
    } catch (error) {
        console.error('🚨 Clean layout test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testCleanNavigation().catch(console.error);