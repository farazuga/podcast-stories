/**
 * VidPOD Testing Utilities
 * Reusable helper functions for testing
 */

const puppeteer = require('puppeteer');

// Test configuration
const TEST_CONFIG = {
    baseUrl: 'https://podcast-stories-production.up.railway.app',
    timeout: 30000,
    testAccounts: {
        admin: { email: 'admin@vidpod.com', password: 'vidpod', role: 'amitrace_admin' },
        teacher: { email: 'teacher@vidpod.com', password: 'vidpod', role: 'teacher' },
        student: { email: 'student@vidpod.com', password: 'vidpod', role: 'student' }
    }
};

class TestHelpers {
    /**
     * Initialize browser for testing
     * @param {Object} options - Puppeteer options
     * @returns {Promise<Browser>}
     */
    static async initBrowser(options = {}) {
        const defaultOptions = {
            headless: false,
            defaultViewport: { width: 1280, height: 720 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        };

        return await puppeteer.launch({ ...defaultOptions, ...options });
    }

    /**
     * Login to the application
     * @param {Page} page - Puppeteer page
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<boolean>}
     */
    static async login(page, email, password) {
        console.log(`🔑 Logging in as ${email}...`);

        await page.goto(`${TEST_CONFIG.baseUrl}/index.html`, { waitUntil: 'networkidle2' });
        
        // Wait for login form
        await page.waitForSelector('input[type="email"]', { timeout: TEST_CONFIG.timeout });
        await page.type('input[type="email"]', email);
        await page.type('input[type="password"]', password);
        
        // Submit login
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: TEST_CONFIG.timeout }),
            page.click('button[type="submit"]')
        ]);
        
        // Verify successful login
        await page.waitForSelector('.vidpod-navbar', { timeout: TEST_CONFIG.timeout });
        console.log(`✅ Successfully logged in as ${email}`);
        
        return true;
    }

    /**
     * Get navigation items from page
     * @param {Page} page - Puppeteer page
     * @returns {Promise<Array>}
     */
    static async getNavigationItems(page) {
        return await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.navbar-nav .nav-item').forEach(item => {
                const text = item.textContent.trim().replace(/\\s+/g, ' ');
                const href = item.getAttribute('href');
                const dataRole = item.getAttribute('data-role');
                const isVisible = window.getComputedStyle(item).display !== 'none';
                
                items.push({
                    text: text,
                    href: href,
                    dataRole: dataRole,
                    isVisible: isVisible
                });
            });
            return items;
        });
    }

    /**
     * Check if element exists and is visible
     * @param {Page} page - Puppeteer page
     * @param {string} selector - CSS selector
     * @returns {Promise<boolean>}
     */
    static async isElementVisible(page, selector) {
        try {
            const element = await page.$(selector);
            if (!element) return false;
            
            const isVisible = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            }, element);
            
            return isVisible;
        } catch (error) {
            return false;
        }
    }

    /**
     * Wait for API response
     * @param {Page} page - Puppeteer page
     * @param {string} urlPattern - URL pattern to match
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Response>}
     */
    static async waitForAPIResponse(page, urlPattern, timeout = TEST_CONFIG.timeout) {
        return await page.waitForResponse(
            response => response.url().includes(urlPattern) && response.status() === 200,
            { timeout }
        );
    }

    /**
     * Take screenshot for debugging
     * @param {Page} page - Puppeteer page
     * @param {string} filename - Screenshot filename
     */
    static async takeScreenshot(page, filename) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fullPath = `testing/debug/screenshots/${filename}-${timestamp}.png`;
        await page.screenshot({ path: fullPath, fullPage: true });
        console.log(`📸 Screenshot saved: ${fullPath}`);
    }

    /**
     * Test API endpoint
     * @param {string} endpoint - API endpoint path
     * @param {Object} options - Request options
     * @returns {Promise<Response>}
     */
    static async testAPIEndpoint(endpoint, options = {}) {
        const url = `${TEST_CONFIG.baseUrl}/api${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        return response;
    }

    /**
     * Create test data
     * @param {string} type - Data type (story, user, etc.)
     * @param {Object} data - Test data
     * @returns {Promise<Object>}
     */
    static async createTestData(type, data) {
        // Implementation would depend on specific test data needs
        console.log(`Creating test ${type} data:`, data);
        return data;
    }

    /**
     * Clean up test data
     * @param {string} type - Data type to clean
     * @returns {Promise<void>}
     */
    static async cleanupTestData(type) {
        console.log(`Cleaning up test ${type} data...`);
        // Implementation would depend on cleanup requirements
    }

    /**
     * Assert navigation visibility for role
     * @param {Array} navItems - Navigation items
     * @param {string} role - User role
     * @returns {Object} Test results
     */
    static assertNavigationVisibility(navItems, role) {
        const expectations = {
            'amitrace_admin': {
                visible: ['Dashboard', 'Browse Stories', 'Add Story', 'Admin Browse Stories', 'Admin Panel'],
                hidden: ['My Classes']
            },
            'teacher': {
                visible: ['Dashboard', 'Browse Stories', 'Add Story', 'My Classes'],
                hidden: ['Admin Browse Stories']
            },
            'student': {
                visible: ['Dashboard', 'Browse Stories', 'Add Story'],
                hidden: ['My Classes', 'Admin Browse Stories', 'Admin Panel']
            }
        };

        const expected = expectations[role];
        const visibleItems = navItems.filter(item => item.isVisible).map(item => item.text);
        const hiddenItems = navItems.filter(item => !item.isVisible).map(item => item.text);

        const results = {
            passed: true,
            issues: [],
            role: role,
            visibleItems: visibleItems,
            hiddenItems: hiddenItems
        };

        // Check expected visible items
        for (const expectedVisible of expected.visible) {
            const found = visibleItems.some(item => 
                item.includes(expectedVisible) || 
                (expectedVisible === 'Settings' && item.includes('Admin Panel'))
            );
            if (!found) {
                results.passed = false;
                results.issues.push(`${expectedVisible} should be visible but isn't`);
            }
        }

        // Check expected hidden items
        for (const expectedHidden of expected.hidden) {
            const found = hiddenItems.some(item => item.includes(expectedHidden));
            if (!found && visibleItems.some(item => item.includes(expectedHidden))) {
                results.passed = false;
                results.issues.push(`${expectedHidden} should be hidden but is visible`);
            }
        }

        return results;
    }

    /**
     * Generate test report
     * @param {Array} testResults - Array of test results
     * @returns {Object} Report summary
     */
    static generateTestReport(testResults) {
        const summary = {
            total: testResults.length,
            passed: testResults.filter(r => r.passed).length,
            failed: testResults.filter(r => r.passed === false).length,
            timestamp: new Date().toISOString(),
            results: testResults
        };

        console.log('\\n=================================');
        console.log('🎯 TEST SUMMARY');
        console.log('=================================');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`✅ Passed: ${summary.passed}`);
        console.log(`❌ Failed: ${summary.failed}`);
        console.log(`Success Rate: ${Math.round((summary.passed / summary.total) * 100)}%`);

        if (summary.failed > 0) {
            console.log('\\n❌ FAILED TESTS:');
            testResults.filter(r => !r.passed).forEach(result => {
                console.log(`  - ${result.name || result.role}: ${result.issues?.join(', ') || result.error}`);
            });
        }

        return summary;
    }

    /**
     * Sleep/delay utility
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export configuration and helpers
module.exports = {
    TestHelpers,
    TEST_CONFIG
};