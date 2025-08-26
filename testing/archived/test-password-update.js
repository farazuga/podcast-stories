const puppeteer = require('puppeteer');

async function testPasswordUpdate() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    console.log('🔐 Testing Password Update to "vidpod"...\n');
    
    const testUsers = [
        { email: 'admin@vidpod.com', role: 'admin' },
        { email: 'teacher@vidpod.com', role: 'teacher' },
        { email: 'student@vidpod.com', role: 'student' }
    ];
    
    for (const user of testUsers) {
        try {
            console.log(`🧪 Testing ${user.role}: ${user.email}`);
            
            // Navigate to login page
            await page.goto('https://podcast-stories-production.up.railway.app/');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Clear any existing values
            await page.evaluate(() => {
                document.getElementById('email').value = '';
                document.getElementById('password').value = '';
            });
            
            // Try login with "vidpod" password
            await page.type('#email', user.email);
            await page.type('#password', 'vidpod');
            await page.click('button[type="submit"]');
            
            try {
                // Wait for navigation (successful login)
                await page.waitForNavigation({ timeout: 5000 });
                console.log(`✅ ${user.role} login with "vidpod": SUCCESS`);
                
                // Check which page we landed on
                const currentUrl = page.url();
                console.log(`   Redirected to: ${currentUrl}`);
                
                // Logout for next test
                await page.evaluate(() => {
                    localStorage.clear();
                });
                
            } catch (navError) {
                // Login failed - check for error message
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const errorVisible = await page.evaluate(() => {
                    const errorEl = document.querySelector('.error-message, .error');
                    return errorEl ? errorEl.textContent : null;
                });
                
                if (errorVisible) {
                    console.log(`❌ ${user.role} login with "vidpod": FAILED - ${errorVisible}`);
                } else {
                    console.log(`❌ ${user.role} login with "vidpod": FAILED - No navigation`);
                }
                
                // Try the old password to see if update didn't work
                console.log(`🔄 Trying old password "rumi&amaml" for ${user.role}...`);
                
                await page.evaluate(() => {
                    document.getElementById('email').value = '';
                    document.getElementById('password').value = '';
                });
                
                await page.type('#email', user.email);
                await page.type('#password', 'rumi&amaml');
                await page.click('button[type="submit"]');
                
                try {
                    await page.waitForNavigation({ timeout: 5000 });
                    console.log(`⚠️  ${user.role} still uses old password "rumi&amaml"`);
                } catch {
                    console.log(`❌ ${user.role} failed with both passwords - may need database update`);
                }
            }
            
            console.log('');
            
        } catch (error) {
            console.error(`❌ Error testing ${user.role}:`, error.message);
        }
    }
    
    console.log('🔐 Password Testing Complete!');
    console.log('\n📋 Summary:');
    console.log('If passwords were successfully updated, all users should login with "vidpod"');
    console.log('If passwords were not updated, they will still use "rumi&amaml"');
    
    await browser.close();
}

testPasswordUpdate().catch(console.error);