#!/usr/bin/env node

/**
 * VidPOD Rundown Detailed Error Detection
 * Captures console messages, JavaScript errors, and UI issues
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'https://podcast-stories-production.up.railway.app';
const TEST_ACCOUNT = { email: 'teacher@vidpod.com', password: 'vidpod' };

async function runDetailedErrorTest() {
    console.log('🔍 VidPOD Rundown System - Detailed Error Detection');
    console.log('=' .repeat(60));
    
    const browser = await puppeteer.launch({ 
        headless: false,  // Show browser for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        devtools: true   // Open DevTools
    });
    
    try {
        const page = await browser.newPage();
        
        // Capture all console messages and errors
        const consoleLogs = [];
        const jsErrors = [];
        const networkErrors = [];
        
        page.on('console', msg => {
            const logEntry = {
                type: msg.type(),
                text: msg.text(),
                location: msg.location()
            };
            consoleLogs.push(logEntry);
            console.log(`📝 ${msg.type().toUpperCase()}: ${msg.text()}`);
        });
        
        page.on('pageerror', error => {
            jsErrors.push(error.message);
            console.log(`🚨 JS ERROR: ${error.message}`);
        });
        
        page.on('requestfailed', request => {
            networkErrors.push(`${request.method()} ${request.url()} - ${request.failure().errorText}`);
            console.log(`🌐 NETWORK ERROR: ${request.url()} - ${request.failure().errorText}`);
        });
        
        // Set up response monitoring
        page.on('response', response => {
            if (!response.ok() && response.status() >= 400) {
                console.log(`⚠️ HTTP ${response.status()}: ${response.url()}`);
            }
        });
        
        console.log('\n🔐 Step 1: Login Process');
        console.log('-'.repeat(30));
        
        // Login first
        await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
        console.log('📍 Loaded login page');
        
        await page.type('#email', TEST_ACCOUNT.email);
        await page.type('#password', TEST_ACCOUNT.password);
        console.log('📝 Entered credentials');
        
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log('🔑 Login completed, navigated to:', page.url());
        
        console.log('\n📄 Step 2: Navigate to Rundowns Page');
        console.log('-'.repeat(40));
        
        // Navigate to rundowns page
        await page.goto(`${BASE_URL}/rundowns.html`, { waitUntil: 'networkidle0' });
        console.log('📍 Loaded rundowns page');
        
        // Check page title and content
        const title = await page.title();
        console.log(`📋 Page title: ${title}`);
        
        // Wait for page to fully load
        await page.waitForTimeout(2000);
        
        // Check for key elements
        const elements = {
            navigation: await page.$('.nav-container') !== null,
            container: await page.$('.container') !== null,
            createButton: await page.$('#createRundownBtn') !== null,
            rundownGrid: await page.$('#rundownsGrid') !== null,
            pageHeader: await page.$('.page-header') !== null
        };
        
        console.log('\n🔍 Step 3: Element Detection');
        console.log('-'.repeat(30));
        for (const [element, found] of Object.entries(elements)) {
            console.log(`${found ? '✅' : '❌'} ${element}: ${found}`);
        }
        
        console.log('\n🔘 Step 4: Test Create Rundown Modal');
        console.log('-'.repeat(40));
        
        if (elements.createButton) {
            console.log('🔍 Clicking create rundown button...');
            
            // Make sure button is visible and clickable
            await page.waitForSelector('#createRundownBtn', { visible: true });
            await page.click('#createRundownBtn');
            
            // Wait for modal to appear
            await page.waitForTimeout(1000);
            
            // Check for modal elements
            const modalElements = {
                modal: await page.$('#createRundownModal') !== null,
                modalVisible: await page.$('#createRundownModal[style*="block"]') !== null,
                titleField: await page.$('#rundownTitle') !== null,
                descriptionField: await page.$('#rundownDescription') !== null,
                createButton: await page.$('button[onclick="createRundown()"]') !== null,
                cancelButton: await page.$('button[onclick="hideCreateRundownModal()"]') !== null
            };
            
            console.log('\n🎭 Modal Elements:');
            for (const [element, found] of Object.entries(modalElements)) {
                console.log(`${found ? '✅' : '❌'} ${element}: ${found}`);
            }
            
            // Get modal HTML for debugging
            if (modalElements.modal) {
                const modalHTML = await page.$eval('#createRundownModal', el => el.outerHTML);
                console.log('\n📄 Modal HTML Preview:');
                console.log(modalHTML.substring(0, 500) + '...');
            }
        }
        
        console.log('\n📊 Step 5: Error Summary');
        console.log('-'.repeat(30));
        console.log(`🚨 JavaScript Errors: ${jsErrors.length}`);
        console.log(`🌐 Network Errors: ${networkErrors.length}`);
        console.log(`📝 Console Messages: ${consoleLogs.length}`);
        
        if (jsErrors.length > 0) {
            console.log('\n🚨 JavaScript Errors:');
            jsErrors.forEach((error, i) => console.log(`   ${i+1}. ${error}`));
        }
        
        if (networkErrors.length > 0) {
            console.log('\n🌐 Network Errors:');
            networkErrors.forEach((error, i) => console.log(`   ${i+1}. ${error}`));
        }
        
        // Show recent console messages
        if (consoleLogs.length > 0) {
            console.log('\n📝 Recent Console Messages:');
            consoleLogs.slice(-10).forEach((log, i) => {
                console.log(`   ${log.type}: ${log.text}`);
            });
        }
        
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser will stay open for manual inspection...');
        console.log('Press Ctrl+C to close when done.');
        
        // Wait indefinitely until user closes
        await new Promise(() => {});
        
    } catch (error) {
        console.error('🚨 Test failed:', error.message);
    } finally {
        // Don't close browser automatically - let user inspect
        // await browser.close();
    }
}

// Run the detailed test
runDetailedErrorTest().catch(error => {
    console.error('🚨 Test execution failed:', error);
    process.exit(1);
});