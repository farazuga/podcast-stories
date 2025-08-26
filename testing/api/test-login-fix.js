/**
 * Test Login Network Error Fix
 * 
 * This test verifies that the config.js loading fix resolves the network error
 */

const puppeteer = require('puppeteer');

async function testLoginFix() {
    console.log('🧪 Testing Login Network Error Fix...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    try {
        const page = await browser.newPage();
        
        // Capture console logs to see errors
        const logs = [];
        page.on('console', msg => {
            logs.push(`${msg.type()}: ${msg.text()}`);
            console.log('BROWSER:', msg.text());
        });
        
        page.on('pageerror', error => {
            logs.push(`ERROR: ${error.message}`);
            console.error('PAGE ERROR:', error.message);
        });
        
        console.log('📱 Loading login page...');
        await page.goto('https://podcast-stories-production.up.railway.app');
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        console.log('🔍 Checking if config.js loaded...');
        
        // Check if window.API_URL is defined
        const apiUrlDefined = await page.evaluate(() => {
            return typeof window.API_URL !== 'undefined';
        });
        
        console.log(`window.API_URL defined: ${apiUrlDefined ? '✅' : '❌'}`);
        
        if (apiUrlDefined) {
            const apiUrl = await page.evaluate(() => window.API_URL);
            console.log(`API URL value: ${apiUrl}`);
        }
        
        console.log('🔐 Testing login form submission...');
        
        // Fill in login form
        await page.type('#email', 'test@example.com');
        await page.type('#password', 'testpassword');
        
        // Submit form and capture any errors
        await page.click('button[type="submit"]');
        
        // Wait for login attempt
        await page.waitForTimeout(3000);
        
        // Check console logs for errors
        console.log('\n📋 Console Logs Analysis:');
        const hasNetworkError = logs.some(log => log.includes('Network error'));
        const hasApiUrlError = logs.some(log => log.includes('API URL:'));
        const hasUndefinedUrl = logs.some(log => log.includes('undefined'));
        
        console.log(`Network error found: ${hasNetworkError ? '❌' : '✅'}`);
        console.log(`API URL logged: ${hasApiUrlError ? '✅' : '❌'}`);
        console.log(`Undefined URL: ${hasUndefinedUrl ? '❌' : '✅'}`);
        
        // Display relevant logs
        logs.forEach(log => {
            if (log.includes('Login') || log.includes('API') || log.includes('Network') || log.includes('error')) {
                console.log(`   ${log}`);
            }
        });
        
        // Final assessment
        console.log('\n🎯 LOGIN FIX ASSESSMENT:');
        
        if (apiUrlDefined && !hasNetworkError && !hasUndefinedUrl) {
            console.log('✅ Login network error fix - SUCCESS');
            console.log('   - window.API_URL is properly defined');
            console.log('   - No network errors from undefined URLs');
            console.log('   - Login requests can be made to proper endpoints');
        } else {
            console.log('❌ Login network error fix - ISSUES FOUND');
            if (!apiUrlDefined) console.log('   - window.API_URL not defined (config.js not loaded)');
            if (hasNetworkError) console.log('   - Network errors still occurring');
            if (hasUndefinedUrl) console.log('   - Undefined URL references found');
        }
        
        // Take screenshot
        await page.screenshot({ 
            path: '/Users/faraz/Library/CloudStorage/OneDrive-Amitrace/Vibe/1_Test/podcast-stories/backend/login-fix-test.png',
            fullPage: true 
        });
        console.log('📸 Screenshot saved: login-fix-test.png');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testLoginFix().catch(console.error);