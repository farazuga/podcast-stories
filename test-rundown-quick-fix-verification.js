#!/usr/bin/env node

/**
 * Quick verification test for the rundown system fix
 * Tests if the JavaScript error has been resolved
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'https://podcast-stories-production.up.railway.app';
const TEST_ACCOUNT = { email: 'teacher@vidpod.com', password: 'vidpod' };

async function runQuickFixTest() {
    console.log('🔧 VidPOD Rundown Fix Verification Test');
    console.log('🎯 Testing if JavaScript errors are resolved');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Track JavaScript errors
        const jsErrors = [];
        const consoleLogs = [];
        
        page.on('pageerror', error => {
            jsErrors.push(error.message);
        });
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleLogs.push(msg.text());
            }
        });
        
        console.log('🔐 Step 1: Login as teacher');
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
        await page.type('#email', TEST_ACCOUNT.email);
        await page.type('#password', TEST_ACCOUNT.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log('✅ Login completed');
        
        console.log('📄 Step 2: Navigate to rundowns page');
        await page.goto(`${BASE_URL}/rundowns.html`, { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for all scripts to load
        
        const title = await page.title();
        console.log(`📋 Page title: ${title}`);
        
        console.log('🔍 Step 3: Check for key elements');
        const elements = {
            navigation: await page.$('.nav-container') !== null,
            createButton: await page.$('#createRundownBtn') !== null,
            rundownGrid: await page.$('#rundownsGrid') !== null
        };
        
        for (const [element, found] of Object.entries(elements)) {
            console.log(`${found ? '✅' : '❌'} ${element}: ${found}`);
        }
        
        console.log('🔘 Step 4: Test create rundown modal');
        if (elements.createButton) {
            await page.click('#createRundownBtn');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const modalVisible = await page.$('#createRundownModal[style*="block"]') !== null;
            const hasForm = await page.$('#createRundownForm') !== null;
            const hasSubmitButton = await page.$('button[onclick="createRundown()"]') !== null;
            
            console.log(`${modalVisible ? '✅' : '❌'} Modal opens: ${modalVisible}`);
            console.log(`${hasForm ? '✅' : '❌'} Form present: ${hasForm}`);
            console.log(`${hasSubmitButton ? '✅' : '❌'} Submit button present: ${hasSubmitButton}`);
        }
        
        console.log('\n📊 Final Results:');
        console.log(`🚨 JavaScript Errors: ${jsErrors.length}`);
        console.log(`📝 Console Errors: ${consoleLogs.length}`);
        
        if (jsErrors.length > 0) {
            console.log('\n🚨 JavaScript Errors Found:');
            jsErrors.forEach((error, i) => console.log(`   ${i+1}. ${error}`));
        }
        
        if (consoleLogs.length > 0) {
            console.log('\n📝 Console Errors:');
            consoleLogs.forEach((log, i) => console.log(`   ${i+1}. ${log}`));
        }
        
        const success = jsErrors.length === 0 && elements.createButton;
        console.log(`\n🎯 Fix Status: ${success ? '✅ SUCCESS - No errors detected' : '⚠️ Still has issues'}`);
        
        return { success, jsErrors: jsErrors.length, elements };
        
    } finally {
        await browser.close();
    }
}

// Run the test
runQuickFixTest().catch(error => {
    console.error('🚨 Test failed:', error);
    process.exit(1);
});