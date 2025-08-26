/**
 * Debug Navigation Timing - Check if it's a timing issue with JS initialization
 */

const puppeteer = require('puppeteer');

async function debugNavTiming() {
    console.log('🐛 Debug Navigation Timing...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => {
            if (msg.text().includes('V2 NAVIGATION') || msg.text().includes('V2 ADMIN')) {
                console.log('🌐 PAGE LOG:', msg.text());
            }
        });
        
        // Login as admin
        await page.goto('https://podcast-stories-production.up.railway.app/index.html');
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', 'admin@vidpod.com');
        await page.type('input[type="password"]', 'vidpod');
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);
        
        console.log('✅ Logged in, checking navigation at different intervals...\n');
        
        // Check navigation at different time intervals
        const intervals = [500, 1000, 2000, 5000];
        
        for (const interval of intervals) {
            await new Promise(resolve => setTimeout(resolve, interval));
            
            console.log(`⏱️  Checking navigation after ${interval}ms:`);
            
            const navCheck = await page.evaluate(() => {
                const myClassesElement = document.querySelector('[href*="teacher-dashboard"]');
                if (!myClassesElement) return { found: false };
                
                return {
                    found: true,
                    dataRole: myClassesElement.getAttribute('data-role'),
                    computedDisplay: window.getComputedStyle(myClassesElement).display,
                    inlineStyle: myClassesElement.style.display,
                    isVisible: window.getComputedStyle(myClassesElement).display !== 'none',
                    textContent: myClassesElement.textContent.trim()
                };
            });
            
            if (navCheck.found) {
                console.log(`   My Classes element:`);
                console.log(`   - data-role: "${navCheck.dataRole}"`);
                console.log(`   - computed display: "${navCheck.computedDisplay}"`);
                console.log(`   - inline style.display: "${navCheck.inlineStyle}"`);
                console.log(`   - is visible: ${navCheck.isVisible ? '❌ YES' : '✅ NO'}`);
                console.log(`   - text: "${navCheck.textContent}"`);
            } else {
                console.log('   ❓ My Classes element not found');
            }
            console.log('');
        }
        
        // Final check: Force call the admin navigation customization
        console.log('🔧 Manually triggering admin navigation customization...');
        await page.evaluate(() => {
            if (window.VidPODNav && typeof window.VidPODNav.customizeAdminNavigation === 'function') {
                window.VidPODNav.customizeAdminNavigation();
                return 'executed';
            }
            return 'not available';
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const finalCheck = await page.evaluate(() => {
            const myClassesElement = document.querySelector('[href*="teacher-dashboard"]');
            return myClassesElement ? {
                computedDisplay: window.getComputedStyle(myClassesElement).display,
                inlineStyle: myClassesElement.style.display,
                isVisible: window.getComputedStyle(myClassesElement).display !== 'none'
            } : null;
        });
        
        console.log('📊 Final check after manual trigger:');
        if (finalCheck) {
            console.log(`   - computed display: "${finalCheck.computedDisplay}"`);
            console.log(`   - inline style.display: "${finalCheck.inlineStyle}"`);
            console.log(`   - is visible: ${finalCheck.isVisible ? '❌ YES (PROBLEM!)' : '✅ NO (CORRECT)'}`);
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    } finally {
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser staying open for manual inspection...');
        console.log('Press Ctrl+C to close when done.');
        
        // Wait indefinitely
        await new Promise(() => {});
    }
}

debugNavTiming();