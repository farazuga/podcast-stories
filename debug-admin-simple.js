const puppeteer = require('puppeteer');

async function debugAdmin() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Capture console logs and errors
    page.on('console', msg => {
        console.log(`🖥️  CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
        console.log(`🚨 PAGE ERROR: ${error.message}`);
    });
    
    try {
        console.log('🔍 Debugging Admin Panel JavaScript Loading...\n');
        
        // Login
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'rumi&amaml');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Logged in, now checking admin page...\n');
        
        // Wait a bit for all scripts to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check what's actually loaded
        const debugInfo = await page.evaluate(() => {
            const info = {
                url: window.location.href,
                title: document.title,
                scriptsLoaded: [],
                windowFunctions: [],
                errors: [],
                adminJsStatus: 'not found'
            };
            
            // Check loaded scripts
            const scripts = document.querySelectorAll('script[src]');
            scripts.forEach(script => {
                info.scriptsLoaded.push(script.src);
                if (script.src.includes('admin.js')) {
                    info.adminJsStatus = 'script tag found';
                }
            });
            
            // Check window functions
            for (let prop in window) {
                if (typeof window[prop] === 'function' && 
                    (prop.includes('show') || prop.includes('edit') || prop.includes('delete'))) {
                    info.windowFunctions.push(prop);
                }
            }
            
            // Check specific functions we need
            const requiredFunctions = ['showTab', 'editSchool', 'deleteSchool'];
            requiredFunctions.forEach(func => {
                info[func] = typeof window[func];
            });
            
            return info;
        });
        
        console.log('📊 Debug Information:');
        console.log('URL:', debugInfo.url);
        console.log('Title:', debugInfo.title);
        console.log('Admin.js status:', debugInfo.adminJsStatus);
        console.log('\n📜 Scripts loaded:');
        debugInfo.scriptsLoaded.forEach(script => {
            console.log(`  - ${script}`);
        });
        
        console.log('\n🔧 Window functions found:');
        if (debugInfo.windowFunctions.length > 0) {
            debugInfo.windowFunctions.forEach(func => {
                console.log(`  ✅ ${func}`);
            });
        } else {
            console.log('  ❌ No relevant functions found');
        }
        
        console.log('\n🎯 Required function status:');
        console.log(`  showTab: ${debugInfo.showTab}`);
        console.log(`  editSchool: ${debugInfo.editSchool}`);
        console.log(`  deleteSchool: ${debugInfo.deleteSchool}`);
        
        // Try to manually load and execute admin.js
        console.log('\n🔄 Trying to manually execute admin.js...');
        
        try {
            await page.addScriptTag({
                url: 'https://podcast-stories-production.up.railway.app/js/admin.js'
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const afterReload = await page.evaluate(() => {
                return {
                    showTab: typeof window.showTab,
                    editSchool: typeof window.editSchool
                };
            });
            
            console.log('After manual script load:');
            console.log(`  showTab: ${afterReload.showTab}`);
            console.log(`  editSchool: ${afterReload.editSchool}`);
            
        } catch (scriptError) {
            console.log(`❌ Script loading error: ${scriptError.message}`);
        }
        
        // Test a simple button click
        console.log('\n🖱️  Testing button click...');
        try {
            const buttonExists = await page.$('button[onclick*="showTab"]');
            if (buttonExists) {
                console.log('Button found, attempting click...');
                await page.click('button[onclick*="showTab(\'schools\')"]');
                console.log('Button clicked');
            } else {
                console.log('No tab button found');
            }
        } catch (clickError) {
            console.log(`❌ Click error: ${clickError.message}`);
        }
        
        console.log('\n✅ Debug complete. Browser staying open for inspection...');
        
        // Keep browser open
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugAdmin().catch(console.error);