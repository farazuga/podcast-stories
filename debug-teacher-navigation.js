/**
 * Debug Teacher Navigation Hiding Issue
 * Specifically targets why Admin Browse Stories is still visible
 */

const puppeteer = require('puppeteer');

async function debugTeacherNavigation() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1400, height: 900 }
    });
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    console.log('🔍 Debugging Teacher Navigation Hiding\n');
    
    try {
        const page = await browser.newPage();
        
        // Login as teacher
        await page.goto(`${baseUrl}/index.html`);
        await page.waitForSelector('#email', { timeout: 10000 });
        
        await page.type('#email', 'teacher@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        await page.waitForNavigation({ timeout: 10000 });
        console.log('✅ Teacher logged in successfully');
        
        // Wait for navigation to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Debug navigation elements in detail
        const debugInfo = await page.evaluate(() => {
            console.log('🔍 Navigation Debug Info:');
            
            const allNavItems = document.querySelectorAll('.nav-item');
            const results = [];
            
            allNavItems.forEach((item, index) => {
                const text = item.textContent.trim();
                const href = item.getAttribute('href');
                const dataPage = item.getAttribute('data-page');
                const dataRole = item.getAttribute('data-role');
                const computedStyle = window.getComputedStyle(item);
                const isVisible = item.offsetParent !== null;
                
                const info = {
                    index,
                    text,
                    href,
                    dataPage,
                    dataRole,
                    cssDisplay: computedStyle.display,
                    cssVisibility: computedStyle.visibility,
                    cssOpacity: computedStyle.opacity,
                    styleAttribute: item.getAttribute('style'),
                    isVisible,
                    classes: item.className,
                    ariaHidden: item.getAttribute('aria-hidden')
                };
                
                results.push(info);
                
                console.log(`Item ${index}: ${text}`);
                console.log(`  href: ${href}`);
                console.log(`  data-page: ${dataPage}`);
                console.log(`  data-role: ${dataRole}`);
                console.log(`  computed display: ${computedStyle.display}`);
                console.log(`  computed visibility: ${computedStyle.visibility}`);
                console.log(`  style attribute: ${item.getAttribute('style')}`);
                console.log(`  isVisible (offsetParent): ${isVisible}`);
                console.log(`  classes: ${item.className}`);
                console.log('---');
            });
            
            return results;
        });
        
        console.log('\n📊 Navigation Items Analysis:');
        debugInfo.forEach(item => {
            const status = item.isVisible ? '🟢 VISIBLE' : '🔴 HIDDEN';
            console.log(`${status} ${item.text}`);
            console.log(`   href: ${item.href}`);
            console.log(`   data-role: ${item.dataRole}`);
            console.log(`   computed display: ${item.cssDisplay}`);
            console.log(`   style attr: ${item.styleAttribute}`);
            console.log('');
        });
        
        // Check user role
        const userRole = await page.evaluate(() => {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.role;
        });
        
        console.log(`👤 User role: ${userRole}`);
        
        // Check if VidPODNav is loaded
        const navLoaded = await page.evaluate(() => {
            return {
                VidPODNavExists: typeof window.VidPODNav !== 'undefined',
                currentUser: window.VidPODNav?.currentUser?.role,
                initCalled: document.getElementById('vidpodNavbar')?.hasAttribute('data-initialized')
            };
        });
        
        console.log('\n🔧 Navigation System Status:');
        console.log(`   VidPODNav exists: ${navLoaded.VidPODNavExists}`);
        console.log(`   Current user: ${navLoaded.currentUser}`);
        console.log(`   Initialized: ${navLoaded.initCalled}`);
        
        // Manual test of hiding function
        console.log('\n🧪 Testing customizeTeacherNavigation manually...');
        await page.evaluate(() => {
            if (window.VidPODNav && typeof window.VidPODNav.customizeTeacherNavigation === 'function') {
                console.log('Calling customizeTeacherNavigation...');
                window.VidPODNav.customizeTeacherNavigation();
            } else {
                console.log('customizeTeacherNavigation not available');
            }
        });
        
        // Wait and check again
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterManualHiding = await page.evaluate(() => {
            const adminBrowseItems = document.querySelectorAll('[href*="admin-browse-stories.html"]');
            return Array.from(adminBrowseItems).map(item => ({
                text: item.textContent.trim(),
                isVisible: item.offsetParent !== null,
                cssDisplay: window.getComputedStyle(item).display,
                style: item.getAttribute('style')
            }));
        });
        
        console.log('\n🎯 Admin Browse Stories Elements After Manual Hiding:');
        afterManualHiding.forEach(item => {
            const status = item.isVisible ? '🟢 STILL VISIBLE' : '🔴 HIDDEN';
            console.log(`${status} ${item.text}`);
            console.log(`   computed display: ${item.cssDisplay}`);
            console.log(`   style: ${item.style}`);
        });
        
        console.log('\n🏁 Debug completed - keeping browser open for manual inspection');
        console.log('Press Ctrl+C when done');
        
        // Keep browser open
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    } finally {
        // Don't close browser automatically
    }
}

// Handle cleanup on Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n👋 Closing...');
    process.exit();
});

debugTeacherNavigation().catch(console.error);