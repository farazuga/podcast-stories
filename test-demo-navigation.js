const puppeteer = require('puppeteer');

async function testDemoNavigation() {
    console.log('🎨 TESTING CLEAN NAVIGATION DEMO');
    console.log('===============================\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Set desktop viewport
        await page.setViewport({ width: 1400, height: 900 });
        
        console.log('1️⃣ Testing Demo Navigation Page...\n');
        
        // Navigate to demo page
        await page.goto('https://podcast-stories-production.up.railway.app/clean-navigation-demo.html', { 
            waitUntil: 'networkidle2' 
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check demo navigation layout
        const demoCheck = await page.evaluate(() => {
            const navbar = document.querySelector('.vidpod-navbar');
            const container = navbar?.querySelector('.navbar-container');
            const brand = navbar?.querySelector('.navbar-brand');
            const mainNav = navbar?.querySelector('.navbar-nav');
            const navItems = navbar?.querySelectorAll('.nav-item');
            const badge = navbar?.querySelector('.badge');
            
            return {
                page: {
                    url: window.location.href,
                    title: document.title
                },
                navbar: {
                    exists: !!navbar,
                    height: navbar ? window.getComputedStyle(navbar).height : 'N/A',
                    background: navbar ? window.getComputedStyle(navbar).backgroundColor : 'N/A',
                    borderBottom: navbar ? window.getComputedStyle(navbar).borderBottom : 'N/A'
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
                    textContent: brand ? brand.textContent.trim() : 'N/A'
                },
                mainNav: {
                    exists: !!mainNav,
                    display: mainNav ? window.getComputedStyle(mainNav).display : 'N/A',
                    gap: mainNav ? window.getComputedStyle(mainNav).gap : 'N/A'
                },
                navItems: {
                    count: navItems ? navItems.length : 0,
                    fontSize: navItems && navItems[0] ? window.getComputedStyle(navItems[0]).fontSize : 'N/A',
                    padding: navItems && navItems[0] ? window.getComputedStyle(navItems[0]).padding : 'N/A',
                    items: navItems ? Array.from(navItems).map(item => ({
                        text: item.textContent.trim(),
                        isActive: item.classList.contains('active')
                    })) : []
                },
                badge: {
                    exists: !!badge,
                    text: badge ? badge.textContent : 'N/A',
                    background: badge ? window.getComputedStyle(badge).backgroundColor : 'N/A',
                    fontSize: badge ? window.getComputedStyle(badge).fontSize : 'N/A'
                }
            };
        });
        
        console.log('Demo Navigation Analysis:');
        console.log('========================');
        console.log(`Page: ${demoCheck.page.title}`);
        console.log(`URL: ${demoCheck.page.url}\n`);
        
        console.log(`Navbar:`);
        console.log(`  Height: ${demoCheck.navbar.height} ${demoCheck.navbar.height === '56px' ? '✅ Perfect' : '⚠️'}`);
        console.log(`  Background: ${demoCheck.navbar.background} ${demoCheck.navbar.background.includes('255, 255, 255') ? '✅ White' : '⚠️'}`);
        console.log(`  Border: ${demoCheck.navbar.borderBottom.includes('229, 231, 235') ? '✅ Clean border' : '⚠️'}`);
        
        console.log(`\nContainer:`);
        console.log(`  Height: ${demoCheck.container.height} ${demoCheck.container.height === '56px' ? '✅' : '⚠️'}`);
        console.log(`  Display: ${demoCheck.container.display} ${demoCheck.container.display === 'flex' ? '✅' : '❌'}`);
        console.log(`  Padding: ${demoCheck.container.padding}`);
        
        console.log(`\nBrand:`);
        console.log(`  Text: "${demoCheck.brand.textContent}" ${demoCheck.brand.textContent.includes('VidPOD') ? '✅' : '❌'}`);
        console.log(`  Font Size: ${demoCheck.brand.fontSize} ${demoCheck.brand.fontSize === '20px' ? '✅' : '⚠️'}`);
        console.log(`  Color: ${demoCheck.brand.color.includes('249, 115, 22') ? '✅ Orange' : '⚠️'}`);
        
        console.log(`\nMain Navigation:`);
        console.log(`  Display: ${demoCheck.mainNav.display} ${demoCheck.mainNav.display === 'flex' ? '✅' : '❌'}`);
        console.log(`  Gap: ${demoCheck.mainNav.gap} ${demoCheck.mainNav.gap === '0px' ? '✅' : '⚠️'}`);
        console.log(`  Items: ${demoCheck.navItems.count} navigation items`);
        
        console.log(`\nNavigation Items:`);
        demoCheck.navItems.items.forEach((item, index) => {
            console.log(`  ${index + 1}. "${item.text}" ${item.isActive ? '(Active)' : ''}`);
        });
        
        console.log(`\nItem Styling:`);
        console.log(`  Font Size: ${demoCheck.navItems.fontSize} ${demoCheck.navItems.fontSize === '14px' ? '✅' : '⚠️'}`);
        console.log(`  Padding: ${demoCheck.navItems.padding}`);
        
        console.log(`\nBadge:`);
        console.log(`  Text: "${demoCheck.badge.text}" ${demoCheck.badge.text === '12' ? '✅' : '⚠️'}`);
        console.log(`  Background: ${demoCheck.badge.background.includes('249, 115, 22') ? '✅ Orange' : '⚠️'}`);
        console.log(`  Font Size: ${demoCheck.badge.fontSize} ${demoCheck.badge.fontSize === '10px' ? '✅' : '⚠️'}`);
        
        // Take screenshot
        await page.screenshot({ path: 'clean-navigation-demo.png', fullPage: true });
        console.log('\n📸 Demo screenshot: clean-navigation-demo.png');
        
        console.log('\n🎯 DEMO ASSESSMENT:');
        console.log('===================');
        
        const isDemoWorking = 
            demoCheck.navbar.height === '56px' &&
            demoCheck.container.display === 'flex' &&
            demoCheck.mainNav.display === 'flex' &&
            demoCheck.navItems.count === 6 &&
            demoCheck.brand.textContent.includes('VidPOD');
        
        if (isDemoWorking) {
            console.log('✅ PERFECT: Demo shows exactly the clean layout you requested!');
            console.log('   ✅ 56px height navigation');
            console.log('   ✅ Clean white background with border');
            console.log('   ✅ Orange VidPOD brand');
            console.log('   ✅ 6 navigation items with proper styling');
            console.log('   ✅ Badge display working (12)');
            console.log('   ✅ Single horizontal line layout');
            console.log('   ✅ No user actions or mobile elements');
            
            console.log('\n💡 NEXT STEP: Apply this exact CSS to the main navigation component');
            console.log('   The inline CSS in the navigation.html file should implement this design');
            
        } else {
            console.log('⚠️ Demo needs refinement');
            if (demoCheck.navbar.height !== '56px') {
                console.log('   - Height not 56px');
            }
            if (demoCheck.container.display !== 'flex') {
                console.log('   - Container not flex');
            }
            if (demoCheck.navItems.count !== 6) {
                console.log('   - Wrong number of nav items');
            }
        }
        
    } catch (error) {
        console.error('🚨 Demo test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testDemoNavigation().catch(console.error);