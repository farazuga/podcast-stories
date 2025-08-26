/**
 * Puppeteer Test Suite: VidPOD Unified Navigation Role-Based Visibility
 * Tests the new navigation visibility rules across all user roles
 */

const puppeteer = require('puppeteer');

const CONFIG = {
    baseUrl: 'https://podcast-stories-production.up.railway.app',
    testAccounts: {
        admin: { email: 'admin@vidpod.com', password: 'vidpod', role: 'amitrace_admin' },
        teacher: { email: 'teacher@vidpod.com', password: 'vidpod', role: 'teacher' },
        student: { email: 'student@vidpod.com', password: 'vidpod', role: 'student' }
    },
    expectedNavigation: {
        amitrace_admin: {
            visible: ['Dashboard', 'Browse Stories', 'Add Story', 'Admin Browse Stories', 'Admin Panel'],
            hidden: ['My Classes']
        },
        teacher: {
            visible: ['Dashboard', 'Browse Stories', 'Add Story', 'My Classes', 'Settings'],
            hidden: ['Admin Browse Stories']
        },
        student: {
            visible: ['Dashboard', 'Browse Stories', 'Add Story'],
            hidden: ['My Classes', 'Admin Browse Stories', 'Admin Panel']
        }
    },
    timeout: 30000
};

class NavigationTester {
    constructor() {
        this.browser = null;
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async init() {
        console.log('🚀 Initializing Puppeteer for VidPOD Unified Navigation Tests...');
        this.browser = await puppeteer.launch({
            headless: false, // Set to true for CI/CD
            defaultViewport: { width: 1280, height: 720 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('✅ Browser launched');
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔄 Browser closed');
        }
    }

    async login(page, email, password) {
        console.log(`🔑 Logging in as ${email}...`);
        
        // Navigate to login page
        await page.goto(`${CONFIG.baseUrl}/index.html`, { waitUntil: 'networkidle2' });
        
        // Try different selectors for the login form
        let emailSelector, passwordSelector;
        
        try {
            // Try with ID first
            await page.waitForSelector('#email', { timeout: 5000 });
            emailSelector = '#email';
            passwordSelector = '#password';
        } catch (e) {
            try {
                // Try with input[type="email"]
                await page.waitForSelector('input[type="email"]', { timeout: 5000 });
                emailSelector = 'input[type="email"]';
                passwordSelector = 'input[type="password"]';
            } catch (e) {
                // Try with name attributes
                await page.waitForSelector('input[name="email"]', { timeout: 5000 });
                emailSelector = 'input[name="email"]';
                passwordSelector = 'input[name="password"]';
            }
        }
        
        // Fill login form
        await page.type(emailSelector, email);
        await page.type(passwordSelector, password);
        
        // Submit login
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.timeout }),
            page.click('button[type="submit"], .login-btn, #loginBtn')
        ]);
        
        // Wait for dashboard to load
        await page.waitForSelector('.vidpod-navbar, .navbar', { timeout: CONFIG.timeout });
        console.log(`✅ Successfully logged in as ${email}`);
        
        return true;
    }

    async getNavigationItems(page) {
        // Get all navigation items from both desktop and mobile menus
        const navItems = await page.evaluate(() => {
            const items = [];
            
            // Desktop navigation
            document.querySelectorAll('.navbar-nav .nav-item').forEach(item => {
                const text = item.textContent.trim();
                const href = item.getAttribute('href');
                const dataRole = item.getAttribute('data-role');
                const isVisible = window.getComputedStyle(item).display !== 'none';
                
                if (text && href) {
                    items.push({
                        text: text,
                        href: href,
                        dataRole: dataRole,
                        isVisible: isVisible,
                        location: 'desktop'
                    });
                }
            });
            
            // Mobile navigation
            document.querySelectorAll('.mobile-nav .nav-item').forEach(item => {
                const text = item.textContent.trim();
                const href = item.getAttribute('href');
                const dataRole = item.getAttribute('data-role');
                const isVisible = window.getComputedStyle(item).display !== 'none';
                
                if (text && href) {
                    items.push({
                        text: text,
                        href: href,
                        dataRole: dataRole,
                        isVisible: isVisible,
                        location: 'mobile'
                    });
                }
            });
            
            return items;
        });
        
        return navItems;
    }

    async testRole(roleName, account) {
        console.log(`\n🎭 Testing ${roleName} role (${account.email})...`);
        
        const page = await this.browser.newPage();
        let testResult = {
            role: roleName,
            email: account.email,
            passed: false,
            issues: [],
            navItems: [],
            expectations: CONFIG.expectedNavigation[account.role]
        };
        
        try {
            // Login
            await this.login(page, account.email, account.password);
            
            // Wait for navigation to fully initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Get navigation items
            testResult.navItems = await this.getNavigationItems(page);
            
            // Filter to desktop navigation only for main test
            const desktopItems = testResult.navItems.filter(item => item.location === 'desktop');
            console.log(`📋 Found ${desktopItems.length} desktop navigation items`);
            
            // Test visibility expectations
            const expected = CONFIG.expectedNavigation[account.role];
            
            // Check visible items
            for (const expectedVisible of expected.visible) {
                const found = desktopItems.find(item => 
                    item.text.includes(expectedVisible) || 
                    (expectedVisible === 'Settings' && item.text.includes('Admin Panel'))
                );
                
                if (found && found.isVisible) {
                    console.log(`✅ ${expectedVisible}: visible as expected`);
                } else if (found && !found.isVisible) {
                    testResult.issues.push(`❌ ${expectedVisible} should be visible but is hidden`);
                } else {
                    testResult.issues.push(`❌ ${expectedVisible} not found in navigation`);
                }
            }
            
            // Check hidden items
            for (const expectedHidden of expected.hidden) {
                const found = desktopItems.find(item => item.text.includes(expectedHidden));
                
                if (found && !found.isVisible) {
                    console.log(`✅ ${expectedHidden}: hidden as expected`);
                } else if (found && found.isVisible) {
                    testResult.issues.push(`❌ ${expectedHidden} should be hidden but is visible`);
                }
                // If not found, that's also correct (it's hidden)
            }
            
            // Special check for teacher role - Admin Panel should be renamed to Settings
            if (account.role === 'teacher') {
                const adminPanel = desktopItems.find(item => item.href && item.href.includes('admin.html'));
                if (adminPanel && adminPanel.isVisible) {
                    if (adminPanel.text.includes('Settings')) {
                        console.log('✅ Admin Panel correctly renamed to Settings for teacher');
                    } else {
                        testResult.issues.push('❌ Admin Panel should be renamed to Settings for teacher');
                    }
                }
            }
            
            testResult.passed = testResult.issues.length === 0;
            
            if (testResult.passed) {
                console.log(`✅ ${roleName} navigation test PASSED`);
                this.results.passed++;
            } else {
                console.log(`❌ ${roleName} navigation test FAILED:`);
                testResult.issues.forEach(issue => console.log(`  ${issue}`));
                this.results.failed++;
            }
            
        } catch (error) {
            console.error(`❌ Error testing ${roleName}:`, error.message);
            testResult.issues.push(`Fatal error: ${error.message}`);
            this.results.failed++;
        } finally {
            await page.close();
        }
        
        this.results.tests.push(testResult);
        return testResult;
    }

    async runAllTests() {
        console.log('🎯 Starting VidPOD Unified Navigation Role-Based Visibility Tests\n');
        console.log('Testing against:', CONFIG.baseUrl);
        console.log('New visibility rules:');
        console.log('- My Classes: teacher only (removed from admin)');
        console.log('- Admin Browse Stories: admin/amitrace_admin only');
        console.log('- Admin Panel: admin/amitrace_admin only (renamed to Settings for teachers)');
        console.log('=====================================\n');
        
        // Test each role
        for (const [roleName, account] of Object.entries(CONFIG.testAccounts)) {
            await this.testRole(roleName, account);
        }
        
        // Print final results
        console.log('\n=====================================');
        console.log('🎯 FINAL TEST RESULTS');
        console.log('=====================================');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Total: ${this.results.tests.length}`);
        
        // Detailed results
        for (const test of this.results.tests) {
            console.log(`\n${test.passed ? '✅' : '❌'} ${test.role.toUpperCase()} (${test.email})`);
            if (test.issues.length > 0) {
                test.issues.forEach(issue => console.log(`  ${issue}`));
            }
            
            // Show navigation items found
            console.log('  Navigation items found:');
            const desktopItems = test.navItems.filter(item => item.location === 'desktop');
            desktopItems.forEach(item => {
                console.log(`    ${item.isVisible ? '👁️' : '🚫'} ${item.text} (${item.href})`);
            });
        }
        
        console.log('\n=====================================');
        
        if (this.results.failed === 0) {
            console.log('🎉 ALL UNIFIED NAVIGATION TESTS PASSED!');
            console.log('The new role-based visibility rules are working correctly.');
        } else {
            console.log('⚠️  SOME TESTS FAILED - Please check the issues above.');
        }
        
        return this.results;
    }
}

// Main execution
async function main() {
    const tester = new NavigationTester();
    
    try {
        await tester.init();
        await tester.runAllTests();
    } catch (error) {
        console.error('💥 Test suite failed:', error);
    } finally {
        await tester.cleanup();
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = NavigationTester;