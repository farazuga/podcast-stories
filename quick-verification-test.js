#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function quickVerificationTest() {
    console.log('🔧 QUICK VERIFICATION TEST - Testing Fixed Issues');
    console.log('=' .repeat(50));
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    try {
        // Test 1: Loading Utils Available
        console.log('\n📝 Test 1: Loading Utilities');
        await page.goto('https://podcast-stories-production.up.railway.app/admin.html');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const loadingUtilsExists = await page.evaluate(() => {
            return typeof window.loadingManager !== 'undefined';
        });
        
        if (loadingUtilsExists) {
            console.log('✅ Loading utilities now available');
        } else {
            console.log('❌ Loading utilities still missing');
        }

        // Test 2: 404 Page
        console.log('\n📝 Test 2: Custom 404 Page');
        await page.goto('https://podcast-stories-production.up.railway.app/nonexistent-page-test');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const has404Content = await page.$('.error-code');
        const pageTitle = await page.title();
        
        if (has404Content && pageTitle.includes('Page Not Found')) {
            console.log('✅ Custom 404 page working');
        } else {
            console.log('❌ Custom 404 page still not working');
        }

        // Test 3: Registration Forms
        console.log('\n📝 Test 3: Registration Form Elements');
        await page.goto('https://podcast-stories-production.up.railway.app/register-teacher.html');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const schoolSelect = await page.$('#school');
        const schoolOptions = await page.$$('#school option');
        
        if (schoolSelect && schoolOptions.length > 1) {
            console.log('✅ Registration form elements working');
        } else {
            console.log('❌ Registration form issues persist');
        }

        // Test 4: API Connectivity
        console.log('\n📝 Test 4: Quick API Test');
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('#email', 'admin@vidpod.com');
        await page.type('#password', 'vidpod');
        await page.click('button[type="submit"]');
        
        await page.waitForNavigation({ timeout: 10000 });
        
        if (page.url().includes('admin.html')) {
            console.log('✅ Authentication and navigation working');
            
            // Quick API test
            await new Promise(resolve => setTimeout(resolve, 2000));
            const hasData = await page.evaluate(() => {
                const stats = document.querySelectorAll('.stat-value');
                return stats.length > 0;
            });
            
            if (hasData) {
                console.log('✅ Admin panel loading data');
            } else {
                console.log('⚠️  Admin panel data loading slow');
            }
        } else {
            console.log('❌ Authentication issues persist');
        }

        console.log('\n🎯 QUICK VERIFICATION COMPLETE');
        console.log('Issues should now be resolved. Running full test recommended.');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }

    console.log('\n🔍 Browser staying open for manual verification...');
    console.log('Press Ctrl+C to close.');
    
    // Keep browser open
    await new Promise(() => {});

    await browser.close();
}

quickVerificationTest().catch(console.error);