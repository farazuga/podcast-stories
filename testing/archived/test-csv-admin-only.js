const puppeteer = require('puppeteer');

/**
 * Test to verify CSV Import is ONLY available to Admin users
 * Should be HIDDEN from Students and Teachers
 */

async function testCSVAdminOnly() {
    console.log('🔐 Testing CSV Import - Admin Only Access...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Test users for each role
    const testUsers = {
        student: {
            id: 1,
            name: 'Test Student',
            email: 'student@vidpod.com',
            role: 'student'
        },
        teacher: {
            id: 2,
            name: 'Test Teacher',
            email: 'teacher@vidpod.com',
            role: 'teacher'
        },
        admin: {
            id: 3,
            name: 'Test Admin',
            email: 'admin@vidpod.com',
            role: 'admin'
        }
    };

    let allTestsPassed = true;
    const results = {};

    try {
        // Load the dashboard page
        console.log('📄 Loading dashboard page...');
        await page.goto('https://frontend-production-b75b.up.railway.app/dashboard.html', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        await page.waitForSelector('#vidpodNavbar', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test each role
        for (const [roleName, userData] of Object.entries(testUsers)) {
            console.log(`\n🧪 Testing ${roleName.toUpperCase()} role for CSV Import access...`);
            
            // Set user data
            await page.evaluate((user) => {
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('token', 'test-token-' + user.role);
            }, userData);

            // Update navigation
            await page.evaluate(() => {
                if (window.VidPODNav) {
                    const user = JSON.parse(localStorage.getItem('user'));
                    window.VidPODNav.updateUser(user);
                }
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check CSV Import button visibility
            const csvButtonStatus = await page.evaluate(() => {
                const csvButtons = Array.from(document.querySelectorAll('[data-role*="admin"]'))
                    .filter(btn => btn.textContent.includes('Import CSV'));
                
                return csvButtons.map(btn => ({
                    text: btn.textContent.trim(),
                    tag: btn.tagName,
                    dataRole: btn.getAttribute('data-role'),
                    visible: window.getComputedStyle(btn).display !== 'none',
                    present: true
                }));
            });

            // Determine expected result
            const shouldHaveAccess = roleName === 'admin';
            const hasAccess = csvButtonStatus.length > 0 && csvButtonStatus.some(btn => btn.visible);
            const testPassed = shouldHaveAccess === hasAccess;

            results[roleName] = {
                role: roleName,
                shouldHaveAccess: shouldHaveAccess,
                actualAccess: hasAccess,
                testPassed: testPassed,
                csvButtons: csvButtonStatus
            };

            // Log results
            const accessStatus = hasAccess ? '✅ HAS ACCESS' : '❌ NO ACCESS';
            const expectedStatus = shouldHaveAccess ? '(Expected)' : '(Expected)';
            const testResult = testPassed ? '✅ PASSED' : '❌ FAILED';
            
            console.log(`  CSV Import Access: ${accessStatus} ${expectedStatus}`);
            console.log(`  Test Result: ${testResult}`);
            
            if (!testPassed) {
                allTestsPassed = false;
                console.log(`  ⚠️ ISSUE: ${roleName} ${hasAccess ? 'has' : 'does not have'} CSV access, but ${shouldHaveAccess ? 'should' : 'should not'}`);
            }

            // Show button details
            if (csvButtonStatus.length > 0) {
                csvButtonStatus.forEach((btn, index) => {
                    console.log(`    Button ${index + 1}: ${btn.visible ? 'VISIBLE' : 'HIDDEN'} - "${btn.text}"`);
                });
            } else {
                console.log(`    No CSV Import buttons found for ${roleName}`);
            }
        }

        // Take final screenshot
        await page.screenshot({ 
            path: 'csv-admin-only-test.png', 
            fullPage: true 
        });

        // Generate summary report
        console.log('\n' + '='.repeat(80));
        console.log('📊 CSV IMPORT ACCESS TEST SUMMARY');
        console.log('='.repeat(80));
        
        Object.values(results).forEach(result => {
            const icon = result.testPassed ? '✅' : '❌';
            const access = result.actualAccess ? 'HAS ACCESS' : 'NO ACCESS';
            console.log(`${icon} ${result.role.toUpperCase()}: ${access} ${result.testPassed ? '(Correct)' : '(Wrong!)'}`);
        });

        console.log('\n📋 EXPECTED BEHAVIOR:');
        console.log('✅ ADMIN: Should have CSV Import access');
        console.log('❌ TEACHER: Should NOT have CSV Import access');  
        console.log('❌ STUDENT: Should NOT have CSV Import access');

        console.log('\n🎯 OVERALL RESULT:');
        if (allTestsPassed) {
            console.log('🎉 ALL TESTS PASSED! CSV Import is correctly restricted to Admins only.');
        } else {
            console.log('⚠️ SOME TESTS FAILED! CSV Import access permissions need fixing.');
        }
        console.log('='.repeat(80));

        // Keep browser open for manual verification
        console.log('\n🔍 Browser kept open for manual verification...');
        console.log('Current user is set to ADMIN - you should see the CSV Import button.');
        console.log('Press Enter to close...');
        
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        allTestsPassed = false;
    } finally {
        await browser.close();
    }

    return allTestsPassed;
}

testCSVAdminOnly().catch(console.error);