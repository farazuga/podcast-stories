const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * VidPOD Role-Based Navigation Test with Puppeteer
 * Tests that the correct navigation items appear for each user role
 */

async function testRoleBasedNavigation() {
    console.log('🚀 Starting VidPOD Role-Based Navigation Test...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,  // Set to false to see the browser
        devtools: true,   // Open devtools
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Test data for each role
    const testUsers = {
        student: {
            id: 1,
            name: 'Test Student',
            username: 'student@vidpod.com',
            email: 'student@vidpod.com',
            role: 'student'
        },
        teacher: {
            id: 2,
            name: 'Test Teacher',
            username: 'teacher@vidpod.com',
            email: 'teacher@vidpod.com',
            role: 'teacher'
        },
        admin: {
            id: 3,
            name: 'Test Admin',
            username: 'admin@vidpod.com',
            email: 'admin@vidpod.com',
            role: 'admin'
        }
    };

    // Expected visibility for each role
    const expectations = {
        student: {
            visible: [
                '[data-page="dashboard"]',
                '[data-page="stories"]', 
                '[data-page="add-story"]',
                '.action-btn.primary' // Quick Add button
            ],
            hidden: [
                '[data-page="teacher-dashboard"]',
                '[data-page="admin"]',
                'button[data-role="teacher,admin"]' // CSV Import button should be hidden
            ]
        },
        teacher: {
            visible: [
                '[data-page="dashboard"]',
                '[data-page="stories"]',
                '[data-page="add-story"]', 
                '[data-page="teacher-dashboard"]',
                'button[data-role="teacher,admin"]', // CSV Import button
                '.action-btn.primary'
            ],
            hidden: [
                '[data-page="admin"]'
            ]
        },
        admin: {
            visible: [
                '[data-page="dashboard"]',
                '[data-page="stories"]',
                '[data-page="add-story"]',
                '[data-page="teacher-dashboard"]', 
                '[data-page="admin"]',
                'button[data-role="teacher,admin"]', // CSV Import button
                '.action-btn.primary'
            ],
            hidden: []
        }
    };

    let allTestsPassed = true;
    const results = [];

    try {
        // Load the dashboard page from production
        console.log('📄 Loading dashboard page from production...');
        await page.goto('https://frontend-production-b75b.up.railway.app/dashboard.html', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        // Wait for navigation to load
        console.log('⏳ Waiting for navigation to load...');
        await page.waitForSelector('#vidpodNavbar', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000)); // Give navigation time to initialize

        // Test each role
        for (const [roleName, userData] of Object.entries(testUsers)) {
            console.log(`\n🧪 Testing ${roleName.toUpperCase()} role...`);
            
            // Set user data in localStorage
            await page.evaluate((user) => {
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('token', 'test-token-' + user.role);
            }, userData);

            // Trigger navigation update
            await page.evaluate(() => {
                if (window.VidPODNav) {
                    const user = JSON.parse(localStorage.getItem('user'));
                    window.VidPODNav.updateUser(user);
                }
            });

            // Wait for UI to update
            await new Promise(resolve => setTimeout(resolve, 1000));

            const roleResults = {
                role: roleName,
                passed: true,
                details: []
            };

            // Check visible elements
            console.log(`  ✅ Checking elements that should be VISIBLE...`);
            for (const selector of expectations[roleName].visible) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const isVisible = await page.evaluate((el) => {
                            const style = window.getComputedStyle(el);
                            return style.display !== 'none' && style.visibility !== 'hidden';
                        }, element);
                        
                        const elementText = await page.evaluate((el) => {
                            return el.textContent?.trim() || el.getAttribute('href') || 'unknown';
                        }, element);

                        if (isVisible) {
                            console.log(`    ✅ "${elementText}" (${selector}) - VISIBLE ✓`);
                            roleResults.details.push({
                                element: elementText,
                                selector: selector,
                                expected: 'visible',
                                actual: 'visible',
                                passed: true
                            });
                        } else {
                            console.log(`    ❌ "${elementText}" (${selector}) - HIDDEN (should be visible)`);
                            roleResults.details.push({
                                element: elementText,
                                selector: selector,
                                expected: 'visible',
                                actual: 'hidden',
                                passed: false
                            });
                            roleResults.passed = false;
                            allTestsPassed = false;
                        }
                    } else {
                        console.log(`    ❌ Element not found: ${selector}`);
                        roleResults.details.push({
                            element: 'NOT FOUND',
                            selector: selector,
                            expected: 'visible',
                            actual: 'not found',
                            passed: false
                        });
                        roleResults.passed = false;
                        allTestsPassed = false;
                    }
                } catch (error) {
                    console.log(`    ❌ Error checking ${selector}: ${error.message}`);
                    roleResults.passed = false;
                    allTestsPassed = false;
                }
            }

            // Check hidden elements
            console.log(`  ❌ Checking elements that should be HIDDEN...`);
            for (const selector of expectations[roleName].hidden) {
                try {
                    const element = await page.$(selector);
                    if (element) {
                        const isVisible = await page.evaluate((el) => {
                            const style = window.getComputedStyle(el);
                            return style.display !== 'none' && style.visibility !== 'hidden';
                        }, element);
                        
                        const elementText = await page.evaluate((el) => {
                            return el.textContent?.trim() || el.getAttribute('href') || 'unknown';
                        }, element);

                        if (!isVisible) {
                            console.log(`    ✅ "${elementText}" (${selector}) - HIDDEN ✓`);
                            roleResults.details.push({
                                element: elementText,
                                selector: selector,
                                expected: 'hidden',
                                actual: 'hidden',
                                passed: true
                            });
                        } else {
                            console.log(`    ❌ "${elementText}" (${selector}) - VISIBLE (should be hidden)`);
                            roleResults.details.push({
                                element: elementText,
                                selector: selector,
                                expected: 'hidden',
                                actual: 'visible',
                                passed: false
                            });
                            roleResults.passed = false;
                            allTestsPassed = false;
                        }
                    } else {
                        // Element not found is OK for hidden elements
                        console.log(`    ✅ Element not found: ${selector} (OK - might not exist)`);
                        roleResults.details.push({
                            element: 'NOT FOUND',
                            selector: selector,
                            expected: 'hidden',
                            actual: 'not found',
                            passed: true
                        });
                    }
                } catch (error) {
                    console.log(`    ❌ Error checking ${selector}: ${error.message}`);
                }
            }

            results.push(roleResults);
            
            const status = roleResults.passed ? '✅ PASSED' : '❌ FAILED';
            console.log(`  ${status} - ${roleName.toUpperCase()} role test`);
        }

        // Take a screenshot of the final state
        console.log('\n📸 Taking screenshot...');
        await page.screenshot({ 
            path: 'navigation-test-results.png', 
            fullPage: true 
        });
        console.log('Screenshot saved as navigation-test-results.png');

        // Get console logs from the page
        console.log('\n📋 Checking browser console logs...');
        const consoleLogs = await page.evaluate(() => {
            return window.navigationTestLogs || 'No logs captured';
        });

        // Generate detailed report
        generateTestReport(results, allTestsPassed);

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        allTestsPassed = false;
    } finally {
        await browser.close();
    }

    console.log('\n' + '='.repeat(60));
    if (allTestsPassed) {
        console.log('🎉 ALL TESTS PASSED! Role-based navigation is working correctly.');
    } else {
        console.log('⚠️ SOME TESTS FAILED! Check the details above.');
    }
    console.log('='.repeat(60));

    return allTestsPassed;
}

function generateTestReport(results, allTestsPassed) {
    const timestamp = new Date().toISOString();
    
    let report = `# VidPOD Role-Based Navigation Test Report\n\n`;
    report += `**Test Date:** ${timestamp}\n`;
    report += `**Overall Status:** ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    
    results.forEach(result => {
        report += `## ${result.role.toUpperCase()} Role\n`;
        report += `**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
        
        report += `| Element | Selector | Expected | Actual | Status |\n`;
        report += `|---------|----------|----------|--------|--------|\n`;
        
        result.details.forEach(detail => {
            const status = detail.passed ? '✅' : '❌';
            report += `| ${detail.element} | \`${detail.selector}\` | ${detail.expected} | ${detail.actual} | ${status} |\n`;
        });
        
        report += '\n';
    });
    
    fs.writeFileSync('navigation-test-report.md', report);
    console.log('\n📄 Detailed test report saved as navigation-test-report.md');
}

// Run the test
testRoleBasedNavigation().catch(console.error);