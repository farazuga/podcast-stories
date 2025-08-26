#!/usr/bin/env node

/**
 * Phase 1: Verify Railway deployment success
 * Tests navigation.js version and content with cache busting
 */

const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function verifyDeployment() {
    console.log('🔍 Phase 1 Verification: Checking deployment status...');
    
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--disable-cache', '--disable-application-cache', '--disable-disk-cache']
    });

    const page = await browser.newPage();
    
    // Disable cache
    await page.setCacheEnabled(false);
    
    // Listen for navigation version log
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('NAVIGATION VERSION') || text.includes('PHASE1') || text.includes('BUILD')) {
            console.log(`✅ [BROWSER] ${text}`);
        } else if (text.includes('🔧 V2') || text.includes('AMITRACE_ADMIN')) {
            console.log(`🔧 [BROWSER] ${text}`);
        }
    });

    try {
        // Test with cache buster
        const cacheBuster = Date.now();
        const testUrl = `${PRODUCTION_URL}/admin.html?v=${cacheBuster}`;
        
        console.log('1. Testing with cache-busting URL:', testUrl);
        
        // Go directly to admin page to trigger navigation loading
        await page.goto(testUrl, { waitUntil: 'networkidle0' });
        
        console.log('2. Checking for navigation version in console...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if navigation.js was loaded with new version
        const navigationVersion = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script'));
            const navScript = scripts.find(script => script.src && script.src.includes('navigation.js'));
            return {
                navScriptFound: !!navScript,
                navScriptSrc: navScript?.src || null,
                windowVidPODNav: !!window.VidPODNav,
                bodyClasses: document.body.className
            };
        });
        
        console.log('3. Navigation script analysis:', navigationVersion);
        
        // Try to manually load navigation.js with cache buster
        console.log('4. Manually loading navigation.js with cache buster...');
        const navContent = await page.evaluate(async (cacheBuster) => {
            try {
                const response = await fetch(`/js/navigation.js?v=${cacheBuster}`);
                const content = await response.text();
                return content.substring(0, 500);
            } catch (error) {
                return `Error: ${error.message}`;
            }
        }, cacheBuster);
        
        console.log('5. Navigation.js content preview:');
        console.log(navContent);
        
        // Check for new version markers
        const hasNewVersion = navContent.includes('PHASE1') && navContent.includes('01:30 UTC');
        
        if (hasNewVersion) {
            console.log('✅ SUCCESS: New navigation version deployed!');
            console.log('6. Testing admin navigation behavior...');
            
            // Test admin login
            await page.goto(`${PRODUCTION_URL}/index.html?v=${cacheBuster}`);
            await page.type('#email', 'admin@vidpod.com');
            await page.type('#password', 'vidpod');
            await page.click('button[type="submit"]');
            await page.waitForNavigation();
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Check My Classes visibility
            const myClassesTest = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('[data-page="teacher-dashboard"]'));
                return elements.map(el => ({
                    text: el.textContent?.trim() || '',
                    visible: !!(el.offsetWidth || el.offsetHeight),
                    display: getComputedStyle(el).display,
                    bodyHasClass: document.body.classList.contains('user-role-amitrace_admin')
                }));
            });
            
            console.log('7. My Classes visibility test:', myClassesTest);
            
            return { success: true, newVersion: true, myClassesHidden: myClassesTest.every(el => !el.visible) };
        } else {
            console.log('❌ FAILED: Still showing old navigation version');
            console.log('6. Will retry deployment...');
            return { success: false, newVersion: false };
        }
        
    } catch (error) {
        console.error('❌ Verification error:', error);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

verifyDeployment()
    .then(result => {
        if (result.success && result.newVersion) {
            console.log('\n✅ Phase 1 COMPLETED: Deployment verification successful');
            if (result.myClassesHidden) {
                console.log('🎉 BONUS: Navigation fix is working correctly!');
            } else {
                console.log('⚠️ Navigation deployed but My Classes still visible - proceeding to Phase 2');
            }
        } else {
            console.log('\n❌ Phase 1 FAILED: Need to retry deployment');
        }
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.error('\n💥 Phase 1 CRASHED:', error);
        process.exit(1);
    });