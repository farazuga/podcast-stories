const puppeteer = require('puppeteer');

async function testCurrentPasswords() {
    const browser = await puppeteer.launch({ 
        headless: true,
        defaultViewport: null
    });
    
    const page = await browser.newPage();
    
    console.log('🔐 Testing current passwords for test users...\n');
    
    const testCases = [
        { email: 'admin@vidpod.com', password: 'vidpod', expected: 'NEW' },
        { email: 'admin@vidpod.com', password: 'rumi&amaml', expected: 'OLD' },
    ];
    
    for (const test of testCases) {
        try {
            console.log(`🧪 Testing ${test.email} with password "${test.password}" (${test.expected})...`);
            
            await page.goto('https://podcast-stories-production.up.railway.app/');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Clear form
            await page.evaluate(() => {
                document.getElementById('email').value = '';
                document.getElementById('password').value = '';
            });
            
            // Enter credentials
            await page.type('#email', test.email);
            await page.type('#password', test.password);
            await page.click('button[type="submit"]');
            
            try {
                // Wait for navigation (successful login)
                await page.waitForNavigation({ timeout: 5000 });
                console.log(`✅ Login SUCCESS with "${test.password}"`);
                
                // Clear session for next test
                await page.evaluate(() => localStorage.clear());
                
            } catch (navError) {
                console.log(`❌ Login FAILED with "${test.password}"`);
            }
            
        } catch (error) {
            console.error(`Error testing ${test.email}:`, error.message);
        }
    }
    
    await browser.close();
    
    console.log('\n📋 Current Status:');
    console.log('If login succeeded with "vidpod" -> passwords updated ✅');
    console.log('If login succeeded with "rumi&amaml" -> passwords still old ⏳');
}

testCurrentPasswords().catch(console.error);