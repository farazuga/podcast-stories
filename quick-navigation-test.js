/**
 * Quick Navigation Test - August 30, 2025
 * Fast test to check navigation after CSS fix
 */

const puppeteer = require('puppeteer');

async function quickNavigationTest() {
    console.log('🔍 QUICK NAVIGATION TEST AFTER CSS FIX');
    
    const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();

    try {
        // Login as student to test
        console.log('1. Testing student navigation...');
        await page.goto('https://podcast-stories-production.up.railway.app/index.html');
        
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        // Wait for navigation
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Quick analysis
        const result = await page.evaluate(() => {
            const visible = [];
            const hidden = [];
            
            // Get unique navigation pages by checking all nav elements
            const navElements = Array.from(document.querySelectorAll('[data-page]'));
            const pageSet = new Set();
            
            navElements.forEach(element => {
                const dataPage = element.getAttribute('data-page');
                const dataRole = element.getAttribute('data-role');
                const computedStyle = window.getComputedStyle(element);
                const isVisible = computedStyle.display !== 'none' && element.offsetParent !== null;
                
                if (!pageSet.has(dataPage)) {
                    pageSet.add(dataPage);
                    // Check if ANY element with this data-page is visible
                    const anyVisible = navElements.some(el => 
                        el.getAttribute('data-page') === dataPage && 
                        window.getComputedStyle(el).display !== 'none' && 
                        el.offsetParent !== null
                    );
                    
                    if (anyVisible) {
                        visible.push(dataPage);
                    } else {
                        hidden.push(dataPage);
                    }
                }
            });
            
            return {
                visible: visible.sort(),
                hidden: hidden.sort(),
                totalElements: navElements.length,
                user: JSON.parse(localStorage.getItem('user') || '{}'),
                bodyClass: document.body.className
            };
        });
        
        console.log(`\n📊 STUDENT NAVIGATION TEST RESULTS:`);
        console.log(`   User Role: ${result.user.role}`);
        console.log(`   Body Class: ${result.bodyClass}`);
        console.log(`   Total Nav Elements: ${result.totalElements}`);
        console.log(`   Visible Pages: ${result.visible.join(', ')}`);
        console.log(`   Hidden Pages: ${result.hidden.join(', ')}`);
        
        // Expected for student
        const shouldSee = ['dashboard', 'stories', 'add-story', 'rundowns'];
        const shouldNotSee = ['teacher-dashboard', 'admin-browse-stories', 'admin'];
        
        const correctVisible = shouldSee.filter(page => result.visible.includes(page));
        const correctHidden = shouldNotSee.filter(page => result.hidden.includes(page));
        const wrongVisible = result.visible.filter(page => shouldNotSee.includes(page));
        const wrongHidden = result.hidden.filter(page => shouldSee.includes(page));
        
        console.log(`\n🎯 VALIDATION:`);
        console.log(`   ✅ Should see: ${shouldSee.join(', ')}`);
        console.log(`   ✅ Actually see: ${correctVisible.join(', ')}`);
        console.log(`   ❌ Should NOT see: ${shouldNotSee.join(', ')}`);
        console.log(`   ❌ Incorrectly see: ${wrongVisible.join(', ')}`);
        
        if (wrongVisible.length > 0) {
            console.log(`   🚨 PROBLEM: Still seeing restricted items: ${wrongVisible.join(', ')}`);
        }
        if (wrongHidden.length > 0) {
            console.log(`   🚨 PROBLEM: Can't see allowed items: ${wrongHidden.join(', ')}`);
        }
        
        const success = wrongVisible.length === 0 && wrongHidden.length === 0;
        console.log(`\n🏁 RESULT: ${success ? '✅ PERFECT - Navigation fixed!' : '❌ Still has issues'}`);
        
        if (!success) {
            console.log('\n🔍 ADDITIONAL DEBUG INFO:');
            
            // Check if elements exist but are hidden by CSS
            const elementDetails = await page.evaluate(() => {
                const details = [];
                document.querySelectorAll('[data-page]').forEach((el, i) => {
                    const style = window.getComputedStyle(el);
                    details.push({
                        index: i,
                        page: el.getAttribute('data-page'),
                        role: el.getAttribute('data-role'),
                        display: style.display,
                        visibility: style.visibility,
                        opacity: style.opacity,
                        parent: el.closest('.navbar-nav') ? 'desktop' : 
                               el.closest('.mobile-nav') ? 'mobile' : 'other'
                    });
                });
                return details;
            });
            
            console.log('   Element details:');
            elementDetails.forEach(detail => {
                console.log(`   ${detail.index}: ${detail.page} (${detail.parent}) - ${detail.role} - display:${detail.display}`);
            });
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
    await browser.close();
}

quickNavigationTest().catch(console.error);