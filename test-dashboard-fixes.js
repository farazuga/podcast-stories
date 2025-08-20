#!/usr/bin/env node

/**
 * TEST DASHBOARD FIXES
 * 
 * Test dashboard JavaScript to ensure no null reference errors
 */

const puppeteer = require('puppeteer');

async function testDashboardFixes() {
    console.log('🚀 Testing Dashboard JavaScript Fixes...\n');
    
    let browser;
    let page;
    let jsErrors = [];
    
    try {
        browser = await puppeteer.launch({ 
            headless: false, 
            slowMo: 200,
            defaultViewport: { width: 1280, height: 800 }
        });
        
        page = await browser.newPage();
        
        // Capture JavaScript errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                jsErrors.push(`Console Error: ${msg.text()}`);
                console.log(`❌ JS Error: ${msg.text()}`);
            } else if (msg.type() === 'warn') {
                console.log(`⚠️  JS Warning: ${msg.text()}`);
            }
        });
        
        page.on('pageerror', error => {
            jsErrors.push(`Page Error: ${error.message}`);
            console.log(`💥 Page Error: ${error.message}`);
        });
        
        // Login as admin
        console.log('🔐 Logging in as admin...');
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle0' 
        });
        
        await page.type('input[type="email"]', 'admin@vidpod.com');
        await page.type('input[type="password"]', 'vidpod');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        console.log('✅ Admin login successful');
        
        // Test admin dashboard
        console.log('📊 Testing admin dashboard...');
        const adminUrl = page.url();
        if (adminUrl.includes('admin.html')) {
            console.log('✅ Redirected to admin page correctly');
        } else {
            console.log('⚠️  Admin not redirected to admin page');
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test dashboard loading
        console.log('📱 Testing dashboard page...');
        await page.goto('https://podcast-stories-production.up.railway.app/dashboard.html', { 
            waitUntil: 'networkidle0' 
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if stories loaded without errors
        const storyCards = await page.$$('.story-card');
        console.log(`📚 Found ${storyCards.length} story cards`);
        
        // Test login as student
        console.log('\n👨‍🎓 Testing student login...');
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle0' 
        });
        
        await page.evaluate(() => {
            localStorage.clear();
        });
        
        await page.reload({ waitUntil: 'networkidle0' });
        
        await page.type('input[type="email"]', 'student@vidpod.com');
        await page.type('input[type="password"]', 'vidpod');
        await page.click('button[type="submit"]');
        
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
            console.log('✅ Student login successful');
            
            const studentUrl = page.url();
            if (studentUrl.includes('dashboard.html')) {
                console.log('✅ Student redirected to dashboard correctly');
                
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Check for student-specific UI elements
                const joinForm = await page.$('#joinClassForm');
                if (joinForm) {
                    console.log('✅ Student join class form found');
                } else {
                    console.log('⚠️  Student join class form not found');
                }
            }
        } catch (e) {
            console.log('⚠️  Student login failed or student account does not exist');
        }
        
        // Test teacher login
        console.log('\n👩‍🏫 Testing teacher login...');
        await page.goto('https://podcast-stories-production.up.railway.app/', { 
            waitUntil: 'networkidle0' 
        });
        
        await page.evaluate(() => {
            localStorage.clear();
        });
        
        await page.reload({ waitUntil: 'networkidle0' });
        
        await page.type('input[type="email"]', 'teacher@vidpod.com');
        await page.type('input[type="password"]', 'vidpod');
        await page.click('button[type="submit"]');
        
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
            console.log('✅ Teacher login successful');
            
            const teacherUrl = page.url();
            if (teacherUrl.includes('teacher-dashboard.html')) {
                console.log('✅ Teacher redirected to teacher dashboard correctly');
            } else if (teacherUrl.includes('dashboard.html')) {
                console.log('⚠️  Teacher redirected to regular dashboard instead of teacher dashboard');
            }
        } catch (e) {
            console.log('⚠️  Teacher login failed or teacher account does not exist');
        }
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 DASHBOARD TEST SUMMARY');
        console.log('='.repeat(50));
        
        if (jsErrors.length === 0) {
            console.log('🎉 NO JAVASCRIPT ERRORS FOUND!');
            console.log('✅ Dashboard null reference errors have been fixed');
            return true;
        } else {
            console.log(`🚨 Found ${jsErrors.length} JavaScript errors:`);
            jsErrors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testDashboardFixes()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(console.error);