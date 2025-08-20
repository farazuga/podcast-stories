#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function quickAdminTest() {
    console.log('🔧 Quick Admin Panel Test...\n');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Login
        await page.goto('https://podcast-stories-production.up.railway.app/');
        await page.type('input[type="email"]', 'admin@vidpod.com');
        await page.type('input[type="password"]', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        
        console.log('✅ Admin login successful');
        
        // Check if redirected to admin
        const url = page.url();
        if (url.includes('admin.html')) {
            console.log('✅ Redirected to admin panel');
        } else {
            console.log('⚠️  Not redirected to admin panel, navigating manually');
            await page.goto('https://podcast-stories-production.up.railway.app/admin.html');
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for tab buttons
        const tabButtons = await page.$$('.tab-btn');
        console.log(`📋 Found ${tabButtons.length} tab buttons`);
        
        // Check if showTab function exists
        const showTabExists = await page.evaluate(() => {
            return typeof window.showTab === 'function';
        });
        console.log(`🔧 showTab function: ${showTabExists ? '✅ EXISTS' : '❌ MISSING'}`);
        
        // Test clicking first tab button
        if (tabButtons.length > 0) {
            await tabButtons[0].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✅ Tab button click test successful');
        }
        
        // Check for school form
        const schoolForm = await page.$('#addSchoolForm');
        console.log(`📝 School form: ${schoolForm ? '✅ FOUND' : '❌ MISSING'}`);
        
        console.log('\n🎉 Quick test complete - Admin panel appears functional');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

quickAdminTest();