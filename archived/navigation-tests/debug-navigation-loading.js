const puppeteer = require('puppeteer');

/**
 * Debug navigation loading on problematic pages
 */

async function debugNavigationLoading() {
    console.log('🔍 Debugging navigation loading on problematic pages...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true 
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    const pagesToTest = [
        'https://frontend-production-b75b.up.railway.app/add-story.html',
        'https://frontend-production-b75b.up.railway.app/admin.html',
        'https://frontend-production-b75b.up.railway.app/story-detail.html'
    ];

    for (const url of pagesToTest) {
        console.log(`\n🧪 Testing navigation loading on: ${url}`);
        
        try {
            // Navigate to page
            await page.goto(url, { waitUntil: 'networkidle0' });
            
            // Wait for navigation with extended timeout
            console.log('⏳ Waiting for navigation component...');
            
            try {
                await page.waitForSelector('#vidpodNavbar', { timeout: 15000 });
                console.log('✅ Navigation component found');
                
                // Check if navigation is actually visible
                const isVisible = await page.evaluate(() => {
                    const nav = document.getElementById('vidpodNavbar');
                    if (!nav) return false;
                    const style = window.getComputedStyle(nav);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                });
                
                console.log(`   Visibility: ${isVisible ? 'VISIBLE' : 'HIDDEN'}`);
                
                // Check navigation content
                const navContent = await page.evaluate(() => {
                    const nav = document.getElementById('vidpodNavbar');
                    return {
                        hasContent: nav && nav.innerHTML.length > 100,
                        hasLinks: nav && nav.querySelectorAll('.nav-item').length > 0,
                        hasActions: nav && nav.querySelectorAll('.action-btn').length > 0
                    };
                });
                
                console.log(`   Content loaded: ${navContent.hasContent}`);
                console.log(`   Navigation links: ${navContent.hasLinks}`);
                console.log(`   Action buttons: ${navContent.hasActions}`);
                
            } catch (error) {
                console.log('❌ Navigation component not found within 15 seconds');
                
                // Check what's actually in the page
                const pageContent = await page.evaluate(() => {
                    return {
                        hasNavigationScript: !!window.NavigationLoader,
                        hasVidPODNav: !!window.VidPODNav,
                        bodyContent: document.body.innerHTML.substring(0, 500) + '...'
                    };
                });
                
                console.log('   Page analysis:');
                console.log(`   - NavigationLoader available: ${pageContent.hasNavigationScript}`);
                console.log(`   - VidPODNav available: ${pageContent.hasVidPODNav}`);
                console.log(`   - Body content preview: ${pageContent.bodyContent}`);
                
                // Check for any errors in console
                const consoleMessages = await page.evaluate(() => {
                    return window.console.errors || [];
                });
                
                if (consoleMessages.length > 0) {
                    console.log('   Console errors:', consoleMessages);
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`❌ Failed to test ${url}:`, error.message);
        }
    }
    
    console.log('\n🔍 Debug complete. Press Enter to close browser...');
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });
    
    await browser.close();
}

debugNavigationLoading().catch(console.error);