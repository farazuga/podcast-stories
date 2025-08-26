/**
 * Quick Navigation Test - Check if the deployed changes are working
 */

const puppeteer = require('puppeteer');

async function quickTest() {
    console.log('🔍 Quick Navigation Test - Checking deployed changes...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 720 }
    });
    
    try {
        const page = await browser.newPage();
        
        // Test admin login
        console.log('🔑 Testing admin login...');
        await page.goto('https://podcast-stories-production.up.railway.app/index.html');
        
        // Wait for form and login
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        await page.type('input[type="email"]', 'admin@vidpod.com');
        await page.type('input[type="password"]', 'vidpod');
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);
        
        // Wait for dashboard
        await page.waitForSelector('.vidpod-navbar', { timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for JS to initialize
        
        // Check navigation items
        console.log('📋 Analyzing navigation items...');
        const navData = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.navbar-nav .nav-item').forEach(item => {
                const text = item.textContent.trim();
                const href = item.getAttribute('href');
                const dataRole = item.getAttribute('data-role');
                const computedDisplay = window.getComputedStyle(item).display;
                const isVisible = computedDisplay !== 'none';
                
                items.push({
                    text: text.replace(/\s+/g, ' '),
                    href,
                    dataRole,
                    computedDisplay,
                    isVisible
                });
            });
            return items;
        });
        
        console.log('\n📊 Navigation Analysis Results:');
        navData.forEach(item => {
            const status = item.isVisible ? '✅ VISIBLE' : '❌ HIDDEN';
            console.log(`${status} | ${item.text} | data-role="${item.dataRole}" | display: ${item.computedDisplay}`);
        });
        
        // Check specific items
        const myClasses = navData.find(item => item.text.includes('My Classes'));
        const adminBrowse = navData.find(item => item.text.includes('Admin Browse Stories'));
        const adminPanel = navData.find(item => item.text.includes('Admin Panel'));
        
        console.log('\n🎯 Key Tests for Admin Role:');
        console.log(`My Classes: ${myClasses ? (myClasses.isVisible ? '❌ VISIBLE (should be hidden)' : '✅ HIDDEN') : '? NOT FOUND'}`);
        console.log(`Admin Browse Stories: ${adminBrowse ? (adminBrowse.isVisible ? '✅ VISIBLE' : '❌ HIDDEN (should be visible)') : '? NOT FOUND'}`);
        console.log(`Admin Panel: ${adminPanel ? (adminPanel.isVisible ? '✅ VISIBLE' : '❌ HIDDEN (should be visible)') : '? NOT FOUND'}`);
        
        // Check if JavaScript customization is running
        const jsCheck = await page.evaluate(() => {
            return {
                navObject: typeof VidPODNav !== 'undefined',
                currentUser: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
            };
        });
        
        console.log('\n🔧 JavaScript Status:');
        console.log(`VidPODNav object: ${jsCheck.navObject ? '✅ Available' : '❌ Missing'}`);
        console.log(`Current user: ${jsCheck.currentUser ? `✅ ${jsCheck.currentUser.role} (${jsCheck.currentUser.email})` : '❌ Not found'}`);
        
        // Test the issue: Why is My Classes still visible for admin?
        if (myClasses && myClasses.isVisible) {
            console.log('\n🚨 ISSUE DETECTED: My Classes is visible for admin');
            console.log(`Data-role attribute: "${myClasses.dataRole}"`);
            console.log('Expected: data-role="teacher" (should hide for admin)');
            
            if (myClasses.dataRole === 'teacher') {
                console.log('✅ Data-role is correct, but JavaScript visibility logic may need to be checked');
            } else {
                console.log('❌ Data-role is incorrect - deployment issue');
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

quickTest();