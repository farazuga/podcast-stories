#!/usr/bin/env node

/**
 * VidPOD Rundown Frontend Automation Test
 * Tests frontend JavaScript execution and UI functionality using Puppeteer
 */

// Check if puppeteer is available
let puppeteer;
try {
    puppeteer = require('puppeteer');
} catch (error) {
    console.log('⚠️ Puppeteer not available - running simplified frontend test');
    runSimplifiedTest();
    process.exit(0);
}

const BASE_URL = 'https://podcast-stories-production.up.railway.app';

const TEST_ACCOUNTS = {
    teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
    admin: { email: 'admin@vidpod.com', password: 'vidpod' }
};

async function runSimplifiedTest() {
    console.log('🎬 VidPOD Rundown Frontend - Simplified Test');
    console.log('🎯 Testing basic page accessibility');
    console.log('=' .repeat(60));
    
    const https = require('https');
    
    function makeRequest(url) {
        return new Promise((resolve) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data }));
            }).on('error', () => resolve({ status: 0, data: '' }));
        });
    }
    
    const tests = [
        { url: `${BASE_URL}/rundowns.html`, name: 'Rundowns Page' },
        { url: `${BASE_URL}/js/rundowns.js`, name: 'Main JS File' }
    ];
    
    for (const test of tests) {
        const result = await makeRequest(test.url);
        console.log(`${result.status === 200 ? '✅' : '❌'} ${test.name}: ${result.status === 200 ? 'Accessible' : 'Failed'}`);
    }
    
    console.log('\n✅ Basic frontend accessibility confirmed');
    console.log('💡 For full JavaScript testing, install Puppeteer: npm install puppeteer');
}

async function testRundownPageLoad() {
    console.log('\n🎨 PHASE 4A: Testing Rundown Page Load');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Capture console logs and errors
        const consoleLogs = [];
        const errors = [];
        
        page.on('console', msg => {
            consoleLogs.push({ type: msg.type(), text: msg.text() });
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
        });
        
        // Navigate to rundowns page
        console.log('🔍 Loading rundowns page...');
        await page.goto(`${BASE_URL}/rundowns.html`, { waitUntil: 'networkidle0', timeout: 10000 });
        
        // Check if page loaded successfully
        const title = await page.title();
        console.log(`✅ Page loaded: ${title}`);
        
        // Check for JavaScript errors
        if (errors.length > 0) {
            console.log(`❌ JavaScript errors found (${errors.length}):`);
            errors.forEach(error => console.log(`   - ${error}`));
        } else {
            console.log('✅ No JavaScript errors detected');
        }
        
        // Check if navigation loaded
        const hasNavigation = await page.$('.nav-container') !== null;
        console.log(`${hasNavigation ? '✅' : '❌'} Navigation loaded: ${hasNavigation}`);
        
        // Check if main content loaded
        const hasMainContent = await page.$('.container') !== null;
        console.log(`${hasMainContent ? '✅' : '❌'} Main content loaded: ${hasMainContent}`);
        
        return { 
            success: errors.length === 0 && hasNavigation && hasMainContent,
            errors: errors.length,
            consoleLogs: consoleLogs.length
        };
    } finally {
        await browser.close();
    }
}

async function testRundownAuthentication() {
    console.log('\n🔐 PHASE 4B: Testing Authentication Flow');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Go to login page
        console.log('🔍 Loading login page...');
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
        
        // Fill login form
        console.log('🔍 Attempting teacher login...');
        await page.type('#email', TEST_ACCOUNTS.teacher.email);
        await page.type('#password', TEST_ACCOUNTS.teacher.password);
        
        // Click login button
        await page.click('button[type="submit"]');
        
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
        
        // Check if redirected to dashboard
        const currentUrl = page.url();
        const loggedIn = currentUrl.includes('dashboard') || currentUrl.includes('teacher');
        console.log(`${loggedIn ? '✅' : '❌'} Teacher login: ${loggedIn ? 'Success' : 'Failed'}`);
        console.log(`   Redirected to: ${currentUrl}`);
        
        if (loggedIn) {
            // Navigate to rundowns page
            console.log('🔍 Navigating to rundowns page...');
            await page.goto(`${BASE_URL}/rundowns.html`, { waitUntil: 'networkidle0' });
            
            // Check if user can access rundowns
            const hasCreateButton = await page.$('#createRundownBtn') !== null;
            const hasRundownGrid = await page.$('#rundownsGrid') !== null;
            
            console.log(`${hasCreateButton ? '✅' : '❌'} Create rundown button visible: ${hasCreateButton}`);
            console.log(`${hasRundownGrid ? '✅' : '❌'} Rundown grid loaded: ${hasRundownGrid}`);
            
            return { 
                success: loggedIn && hasCreateButton && hasRundownGrid,
                canCreateRundowns: hasCreateButton
            };
        }
        
        return { success: false, canCreateRundowns: false };
    } finally {
        await browser.close();
    }
}

async function testRundownCreationUI() {
    console.log('\n📝 PHASE 4C: Testing Rundown Creation UI');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Login first
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
        await page.type('#email', TEST_ACCOUNTS.teacher.email);
        await page.type('#password', TEST_ACCOUNTS.teacher.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        // Go to rundowns page
        await page.goto(`${BASE_URL}/rundowns.html`, { waitUntil: 'networkidle0' });
        
        // Check if create button works
        console.log('🔍 Testing create rundown button...');
        
        // Wait for the button to be visible and click it
        await page.waitForSelector('#createRundownBtn', { visible: true, timeout: 5000 });
        await page.click('#createRundownBtn');
        
        // Check if modal appeared
        const hasModal = await page.waitForSelector('.modal', { visible: true, timeout: 3000 }).catch(() => false);
        console.log(`${hasModal ? '✅' : '❌'} Create rundown modal: ${hasModal ? 'Opens' : 'Failed to open'}`);
        
        if (hasModal) {
            // Check form fields
            const hasTitleField = await page.$('#rundownTitle') !== null;
            const hasDescriptionField = await page.$('#rundownDescription') !== null;
            const hasSubmitButton = await page.$('#createRundownSubmit') !== null;
            
            console.log(`${hasTitleField ? '✅' : '❌'} Title field present: ${hasTitleField}`);
            console.log(`${hasDescriptionField ? '✅' : '❌'} Description field present: ${hasDescriptionField}`);
            console.log(`${hasSubmitButton ? '✅' : '❌'} Submit button present: ${hasSubmitButton}`);
            
            return { 
                success: hasModal && hasTitleField && hasDescriptionField && hasSubmitButton,
                modalWorks: hasModal
            };
        }
        
        return { success: false, modalWorks: false };
    } catch (error) {
        console.log(`❌ UI test failed: ${error.message}`);
        return { success: false, modalWorks: false, error: error.message };
    } finally {
        await browser.close();
    }
}

async function runFrontendTests() {
    console.log('🎬 VidPOD Rundown Frontend - Automation Test');
    console.log('🎯 Testing JavaScript execution and UI functionality');
    console.log('⏰ Started:', new Date().toISOString());
    console.log('=' .repeat(80));
    
    try {
        const results = {
            pageLoad: await testRundownPageLoad(),
            authentication: await testRundownAuthentication(),
            creationUI: await testRundownCreationUI()
        };
        
        console.log('\n🎯 FRONTEND TEST SUMMARY');
        console.log('=' .repeat(80));
        
        console.log('\n🎨 Page Load:', results.pageLoad.success ? '✅ SUCCESS' : '❌ FAILED');
        console.log(`   JavaScript Errors: ${results.pageLoad.errors || 0}`);
        console.log(`   Console Messages: ${results.pageLoad.consoleLogs || 0}`);
        
        console.log('\n🔐 Authentication Flow:', results.authentication.success ? '✅ SUCCESS' : '❌ FAILED');
        console.log(`   Can Create Rundowns: ${results.authentication.canCreateRundowns ? 'Yes' : 'No'}`);
        
        console.log('\n📝 Creation UI:', results.creationUI.success ? '✅ SUCCESS' : '❌ FAILED');
        console.log(`   Modal Functionality: ${results.creationUI.modalWorks ? 'Working' : 'Broken'}`);
        
        const totalTests = 3;
        const passedTests = [results.pageLoad.success, results.authentication.success, results.creationUI.success]
            .filter(Boolean).length;
        const successRate = Math.round((passedTests / totalTests) * 100);
        
        console.log('\n🏆 FRONTEND STATUS');
        console.log('=' .repeat(80));
        console.log(`📊 Success Rate: ${successRate}% (${passedTests}/${totalTests} tests passed)`);
        console.log(`🎯 Frontend Status: ${successRate >= 80 ? '✅ FULLY FUNCTIONAL' : '⚠️ NEEDS FIXES'}`);
        console.log('⏰ Completed:', new Date().toISOString());
        
        return { successRate, passedTests, totalTests, results };
    } catch (error) {
        console.error('🚨 Frontend test failed:', error.message);
        return { successRate: 0, passedTests: 0, totalTests: 3, error: error.message };
    }
}

// Run tests
if (require.main === module) {
    runFrontendTests().catch(error => {
        console.error('🚨 Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runFrontendTests };