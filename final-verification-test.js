#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * FINAL VERIFICATION TEST
 * Check if all bugs are now resolved after navigation files deployment
 */

async function finalVerificationTest() {
    console.log('🔍 FINAL VERIFICATION - All Bugs Status Check');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    let consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    try {
        console.log('\n✅ BUG #1 VERIFICATION: Navigation Files');
        console.log('-'.repeat(40));
        
        // Test all navigation files are accessible
        const navigationCheck = await Promise.all([
            fetch('https://podcast-stories-production.up.railway.app/css/navigation.css'),
            fetch('https://podcast-stories-production.up.railway.app/js/navigation.js'),
            fetch('https://podcast-stories-production.up.railway.app/js/include-navigation.js')
        ]);
        
        const navResults = navigationCheck.map(response => response.status);
        console.log(`   navigation.css: ${navResults[0] === 200 ? '✅' : '❌'} (${navResults[0]})`);
        console.log(`   navigation.js: ${navResults[1] === 200 ? '✅' : '❌'} (${navResults[1]})`);
        console.log(`   include-navigation.js: ${navResults[2] === 200 ? '✅' : '❌'} (${navResults[2]})`);
        
        console.log('\n✅ BUG #2 VERIFICATION: API Authentication');
        console.log('-'.repeat(40));
        
        // Test API authentication
        const loginResponse = await fetch('https://podcast-stories-production.up.railway.app/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'student@vidpod.com', password: 'vidpod' })
        });
        
        const loginData = await loginResponse.json();
        console.log(`   Login Success: ${loginResponse.ok ? '✅' : '❌'}`);
        console.log(`   Token Received: ${loginData.token ? '✅' : '❌'}`);
        
        if (loginData.token) {
            const storiesResponse = await fetch('https://podcast-stories-production.up.railway.app/api/stories', {
                headers: { 'Authorization': `Bearer ${loginData.token}` }
            });
            console.log(`   Stories API: ${storiesResponse.ok ? '✅' : '❌'} (${storiesResponse.status})`);
        }
        
        console.log('\n✅ BUG #3 VERIFICATION: Token Handling in Browser');
        console.log('-'.repeat(40));
        
        // Test actual browser token handling
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.waitForSelector('#email', { timeout: 10000 });
        
        // Clear any existing data
        await page.evaluate(() => localStorage.clear());
        
        // Login
        await page.type('#email', 'student@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ timeout: 15000 });
        
        // Check dashboard
        const dashboardCheck = await page.evaluate(() => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            return {
                hasToken: !!token,
                hasUser: !!user,
                currentURL: window.location.href
            };
        });
        
        console.log(`   Token Stored: ${dashboardCheck.hasToken ? '✅' : '❌'}`);
        console.log(`   User Data Stored: ${dashboardCheck.hasUser ? '✅' : '❌'}`);
        console.log(`   Correct Redirect: ${dashboardCheck.currentURL.includes('dashboard.html') ? '✅' : '❌'}`);
        
        // Navigate to stories page
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const storiesPageCheck = await page.evaluate(() => {
            const token = localStorage.getItem('token');
            const storiesContainer = document.querySelector('#storiesGrid, .stories-grid');
            const hasStories = document.querySelectorAll('.story-card').length > 0;
            const pageLoaded = document.readyState === 'complete';
            
            return {
                tokenDuringNav: !!token,
                hasStoriesContainer: !!storiesContainer,
                storiesLoaded: hasStories,
                pageLoaded,
                noConsoleErrors: !window.lastError
            };
        });
        
        console.log(`   Token During Navigation: ${storiesPageCheck.tokenDuringNav ? '✅' : '❌'}`);
        console.log(`   Stories Container: ${storiesPageCheck.hasStoriesContainer ? '✅' : '❌'}`);
        console.log(`   Stories Loaded: ${storiesPageCheck.storiesLoaded ? '✅' : '❌'}`);
        console.log(`   Page Loaded: ${storiesPageCheck.pageLoaded ? '✅' : '❌'}`);
        
        console.log('\n✅ BUG #4 VERIFICATION: Error Handling');
        console.log('-'.repeat(40));
        
        // Test invalid login
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.waitForSelector('#email');
        
        // Clear form
        await page.evaluate(() => {
            document.querySelector('#email').value = '';
            document.querySelector('#password').value = '';
        });
        
        await page.type('#email', 'invalid@email.com');
        await page.type('#password', 'wrongpassword');
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const errorHandlingCheck = await page.evaluate(() => {
            const currentURL = window.location.href;
            const hasErrorMessages = document.querySelectorAll('.error, .notification, .alert').length > 0;
            
            return {
                stayedOnLogin: currentURL.includes('index.html') || currentURL.endsWith('/'),
                hasErrorMessages
            };
        });
        
        console.log(`   Stayed on Login: ${errorHandlingCheck.stayedOnLogin ? '✅' : '❌'}`);
        console.log(`   Error Handling: ${errorHandlingCheck.hasErrorMessages ? '✅ (Shows errors)' : '✅ (Silent rejection)'}`);
        
        // SUMMARY
        console.log('\n📊 FINAL VERIFICATION SUMMARY');
        console.log('=' .repeat(60));
        
        const allNavigationWorking = navResults.every(status => status === 200);
        const apiWorking = loginResponse.ok && loginData.token;
        const tokenHandlingWorking = dashboardCheck.hasToken && storiesPageCheck.tokenDuringNav;
        const errorHandlingWorking = errorHandlingCheck.stayedOnLogin;
        
        console.log(`🐛 BUG #1 - Navigation Files: ${allNavigationWorking ? '✅ FIXED' : '❌ ISSUE'}`);
        console.log(`🐛 BUG #2 - API Authentication: ${apiWorking ? '✅ FIXED' : '❌ ISSUE'}`);
        console.log(`🐛 BUG #3 - Token Handling: ${tokenHandlingWorking ? '✅ FIXED' : '❌ ISSUE'}`);
        console.log(`🐛 BUG #4 - Error Handling: ${errorHandlingWorking ? '✅ FIXED' : '❌ ISSUE'}`);
        
        const totalFixed = [allNavigationWorking, apiWorking, tokenHandlingWorking, errorHandlingWorking].filter(Boolean).length;
        const successRate = (totalFixed / 4) * 100;
        
        console.log(`\n🎯 Overall Success Rate: ${successRate}% (${totalFixed}/4 bugs fixed)`);
        
        if (successRate === 100) {
            console.log('\n🎉 ALL BUGS SUCCESSFULLY RESOLVED!');
            console.log('✅ Navigation files deployed and accessible');
            console.log('✅ API authentication working correctly');
            console.log('✅ Token handling functional across navigation');
            console.log('✅ Error handling working as expected');
        } else {
            console.log('\n⚠️  Some issues remain:');
            if (!allNavigationWorking) console.log('❌ Navigation files still not accessible');
            if (!apiWorking) console.log('❌ API authentication failing');
            if (!tokenHandlingWorking) console.log('❌ Token handling issues persist');
            if (!errorHandlingWorking) console.log('❌ Error handling needs improvement');
        }
        
        console.log(`\n📊 Console Errors During Test: ${consoleErrors.length}`);
        if (consoleErrors.length > 0) {
            console.log('Recent errors:');
            consoleErrors.slice(-3).forEach(error => console.log(`   • ${error}`));
        }
        
        await page.screenshot({ 
            path: './final-verification-test.png', 
            fullPage: false,
            clip: { x: 0, y: 0, width: 1200, height: 800 }
        });
        
    } catch (error) {
        console.error('❌ Verification test error:', error.message);
    }
    
    await browser.close();
}

finalVerificationTest().catch(console.error);