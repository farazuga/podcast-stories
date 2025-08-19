const puppeteer = require('puppeteer');

/**
 * Quick test to verify CSV import is available for admin users
 */

async function testAdminCSVAccess() {
    console.log('🔍 Testing CSV Import access for Admin users...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    try {
        // Load the dashboard page
        console.log('📄 Loading dashboard page...');
        await page.goto('https://frontend-production-b75b.up.railway.app/dashboard.html', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        // Wait for navigation to load
        await page.waitForSelector('#vidpodNavbar', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Set admin user
        console.log('👨‍💼 Setting admin user...');
        await page.evaluate(() => {
            const adminUser = {
                id: 3,
                name: 'Admin User',
                username: 'admin@vidpod.com',
                email: 'admin@vidpod.com',
                role: 'admin'
            };
            localStorage.setItem('user', JSON.stringify(adminUser));
            localStorage.setItem('token', 'admin-test-token');
            
            // Trigger navigation update
            if (window.VidPODNav) {
                window.VidPODNav.updateUser(adminUser);
            }
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check CSV Import button visibility for admin
        console.log('🔍 Checking CSV Import button for admin...');
        const csvButtonStatus = await page.evaluate(() => {
            const csvButtons = Array.from(document.querySelectorAll('button[data-role*="admin"], button[data-role*="teacher"]'))
                .filter(btn => btn.textContent.includes('Import CSV'));
            
            return csvButtons.map(btn => ({
                text: btn.textContent.trim(),
                dataRole: btn.getAttribute('data-role'),
                visible: window.getComputedStyle(btn).display !== 'none',
                clickable: !btn.disabled
            }));
        });

        console.log('CSV Import button status for admin:', JSON.stringify(csvButtonStatus, null, 2));

        // Check all admin-accessible elements
        console.log('\n🔍 Checking all admin-accessible elements...');
        const adminElements = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('[data-role*="admin"]'));
            return elements.map(el => ({
                tag: el.tagName,
                text: el.textContent?.trim(),
                dataRole: el.getAttribute('data-role'),
                href: el.href || null,
                visible: window.getComputedStyle(el).display !== 'none'
            }));
        });

        console.log('All admin-accessible elements:');
        adminElements.forEach((el, index) => {
            const status = el.visible ? '✅ VISIBLE' : '❌ HIDDEN';
            console.log(`  ${index + 1}. ${status} - ${el.text} (${el.tag.toLowerCase()})`);
        });

        // Test clicking the CSV Import button
        console.log('\n🖱️ Testing CSV Import button click...');
        const clickResult = await page.evaluate(() => {
            const csvButton = document.querySelector('button[data-role*="teacher"][data-role*="admin"]');
            if (csvButton && window.getComputedStyle(csvButton).display !== 'none') {
                // Simulate click without actually executing the handler
                return {
                    found: true,
                    clickable: true,
                    text: csvButton.textContent.trim(),
                    onclick: csvButton.getAttribute('onclick')
                };
            } else {
                return { found: false, clickable: false };
            }
        });

        console.log('CSV Import button click test:', JSON.stringify(clickResult, null, 2));

        // Take screenshot
        await page.screenshot({ 
            path: 'admin-csv-access-test.png', 
            fullPage: true 
        });
        console.log('\n📸 Screenshot saved as admin-csv-access-test.png');

        // Generate test result
        const csvAccessible = csvButtonStatus.length > 0 && csvButtonStatus[0]?.visible;
        const allAdminElementsVisible = adminElements.filter(el => el.visible).length;

        console.log('\n' + '='.repeat(60));
        console.log('🎯 ADMIN CSV ACCESS TEST RESULTS:');
        console.log('='.repeat(60));
        console.log(`CSV Import Button: ${csvAccessible ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE'}`);
        console.log(`Admin Elements Visible: ${allAdminElementsVisible}`);
        console.log(`CSV Button Clickable: ${clickResult.clickable ? '✅ YES' : '❌ NO'}`);
        
        if (csvAccessible && clickResult.clickable) {
            console.log('🎉 SUCCESS: Admin users can access CSV Import functionality!');
        } else {
            console.log('⚠️ ISSUE: Admin users may not have proper CSV Import access');
        }
        console.log('='.repeat(60));

        // Keep browser open for manual verification
        console.log('\n🔍 Browser kept open for manual verification...');
        console.log('You can now manually test the CSV Import button as an admin user.');
        console.log('Press Enter to close browser...');
        
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

testAdminCSVAccess().catch(console.error);