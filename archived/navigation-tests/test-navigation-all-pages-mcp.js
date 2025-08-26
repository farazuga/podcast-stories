const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * VidPOD Navigation Consistency Test Suite - MCP Testing
 * Tests all pages for all user roles to ensure consistent navigation
 */

class VidPODNavigationTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            admin: {},
            teacher: {},
            student: {}
        };
        this.issues = [];
        this.screenshots = [];
    }

    // Test configuration
    static CONFIG = {
        baseUrl: 'https://frontend-production-b75b.up.railway.app',
        testUsers: {
            admin: {
                id: 1,
                name: 'Admin User',
                username: 'admin@vidpod.com',
                email: 'admin@vidpod.com',
                role: 'admin'
            },
            teacher: {
                id: 2, 
                name: 'Teacher User',
                username: 'teacher@vidpod.com',
                email: 'teacher@vidpod.com',
                role: 'teacher'
            },
            student: {
                id: 3,
                name: 'Student User', 
                username: 'student@vidpod.com',
                email: 'student@vidpod.com',
                role: 'student'
            }
        },
        pagesToTest: [
            { path: '/dashboard.html', name: 'dashboard', title: 'Dashboard' },
            { path: '/stories.html', name: 'stories', title: 'Browse Stories' },
            { path: '/add-story.html', name: 'add-story', title: 'Add Story' },
            { path: '/teacher-dashboard.html', name: 'teacher-dashboard', title: 'Teacher Dashboard' },
            { path: '/admin.html', name: 'admin', title: 'Admin Panel' },
            { path: '/story-detail.html', name: 'story-detail', title: 'Story Detail' }
        ],
        expectedElements: {
            admin: {
                visible: [
                    '[data-page="dashboard"]',
                    '[data-page="stories"]', 
                    '[data-page="add-story"]',
                    '[data-page="teacher-dashboard"]',
                    '[data-page="admin"]',
                    '#csvImportBtn',
                    '.action-btn.primary', // Quick Add
                    '.navbar-user',
                    '.logout-btn'
                ],
                hidden: []
            },
            teacher: {
                visible: [
                    '[data-page="dashboard"]',
                    '[data-page="stories"]',
                    '[data-page="add-story"]', 
                    '[data-page="teacher-dashboard"]',
                    '.action-btn.primary',
                    '.navbar-user',
                    '.logout-btn'
                ],
                hidden: [
                    '[data-page="admin"]',
                    '#csvImportBtn'
                ]
            },
            student: {
                visible: [
                    '[data-page="dashboard"]',
                    '[data-page="stories"]',
                    '[data-page="add-story"]',
                    '.action-btn.primary',
                    '.navbar-user', 
                    '.logout-btn'
                ],
                hidden: [
                    '[data-page="teacher-dashboard"]',
                    '[data-page="admin"]',
                    '#csvImportBtn'
                ]
            }
        }
    };

    /**
     * Initialize the test suite
     */
    async initialize() {
        console.log('🚀 Initializing VidPOD Navigation Test Suite...\n');
        
        this.browser = await puppeteer.launch({
            headless: false,
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1200, height: 800 });

        // Listen for console errors
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Console Error:', msg.text());
            }
        });
    }

    /**
     * Set user role in localStorage
     */
    async setUserRole(role) {
        const user = VidPODNavigationTester.CONFIG.testUsers[role];
        
        try {
            await this.page.evaluate((userData) => {
                // Wait for localStorage to be available
                if (typeof(Storage) !== "undefined" && localStorage) {
                    localStorage.setItem('user', JSON.stringify(userData));
                    localStorage.setItem('token', `test-token-${userData.role}`);
                } else {
                    console.warn('localStorage not available');
                }
            }, user);

            console.log(`👤 Set user role: ${role.toUpperCase()}`);
        } catch (error) {
            console.warn(`⚠️ Could not set user role in localStorage: ${error.message}`);
        }
    }

    /**
     * Test a specific page for a specific role
     */
    async testPage(role, pageConfig) {
        const url = VidPODNavigationTester.CONFIG.baseUrl + pageConfig.path;
        const testName = `${role}-${pageConfig.name}`;
        
        console.log(`\n🧪 Testing ${pageConfig.title} for ${role.toUpperCase()}...`);
        console.log(`   URL: ${url}`);

        try {
            // Navigate to page first
            await this.page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Set user role AFTER page loads to ensure localStorage is available
            await this.setUserRole(role);

            // Check if we were redirected to login (authentication failed)
            const currentUrl = this.page.url();
            if (currentUrl.includes('/index.html') || currentUrl.includes('/login') || 
                (await this.page.$('#loginForm'))) {
                // If redirected to login, navigate back to the intended page with credentials
                console.log('   Detected redirect to login, re-navigating with credentials...');
                await this.page.goto(url, { waitUntil: 'networkidle0' });
            }

            // Wait for navigation to load with extended timeout
            await this.page.waitForSelector('#vidpodNavbar', { timeout: 15000 });
            await this.delay(3000); // Give more time for scripts to initialize
            await this.page.evaluate(() => {
                if (window.VidPODNav) {
                    const user = JSON.parse(localStorage.getItem('user'));
                    window.VidPODNav.updateUser(user);
                }
            });

            await this.delay(1000);

            // Test results for this page
            const pageResults = {
                url: url,
                role: role,
                page: pageConfig.name,
                tests: {
                    navigationPresent: false,
                    userInfoCorrect: false,
                    visibleElementsCorrect: false,
                    hiddenElementsCorrect: false,
                    activeStateCorrect: false,
                    mobileMenuWorks: false
                },
                issues: [],
                screenshot: `${testName}-screenshot.png`
            };

            // Test 1: Navigation present
            const navExists = await this.page.$('#vidpodNavbar');
            pageResults.tests.navigationPresent = !!navExists;
            if (!navExists) {
                pageResults.issues.push('Navigation component not found');
                this.issues.push({
                    page: pageConfig.name,
                    role: role,
                    issue: 'Navigation component missing',
                    severity: 'critical'
                });
            }

            // Test 2: User info correct
            const userInfo = await this.page.evaluate(() => {
                const userName = document.getElementById('userName');
                const userRole = document.getElementById('userRole');
                return {
                    name: userName ? userName.textContent : null,
                    role: userRole ? userRole.textContent : null
                };
            });

            const expectedUser = VidPODNavigationTester.CONFIG.testUsers[role];
            pageResults.tests.userInfoCorrect = userInfo.name?.includes(expectedUser.name) && 
                                                userInfo.role?.toLowerCase().includes(role);
            
            if (!pageResults.tests.userInfoCorrect) {
                pageResults.issues.push(`User info incorrect: got ${userInfo.name}/${userInfo.role}, expected ${expectedUser.name}/${role}`);
                this.issues.push({
                    page: pageConfig.name,
                    role: role,
                    issue: 'User info display incorrect',
                    severity: 'medium'
                });
            }

            // Test 3: Visible elements correct
            const expectedVisible = VidPODNavigationTester.CONFIG.expectedElements[role].visible;
            const visibilityResults = [];

            for (const selector of expectedVisible) {
                const element = await this.page.$(selector);
                if (element) {
                    const isVisible = await this.page.evaluate((el) => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    }, element);

                    visibilityResults.push({ selector, found: true, visible: isVisible });

                    if (!isVisible) {
                        pageResults.issues.push(`Element should be visible but is hidden: ${selector}`);
                        this.issues.push({
                            page: pageConfig.name,
                            role: role,
                            issue: `Required element hidden: ${selector}`,
                            severity: 'high'
                        });
                    }
                } else {
                    visibilityResults.push({ selector, found: false, visible: false });
                    pageResults.issues.push(`Required element not found: ${selector}`);
                    this.issues.push({
                        page: pageConfig.name,
                        role: role,
                        issue: `Required element missing: ${selector}`,
                        severity: 'high'
                    });
                }
            }

            pageResults.tests.visibleElementsCorrect = visibilityResults.every(r => r.found && r.visible);

            // Test 4: Hidden elements correct
            const expectedHidden = VidPODNavigationTester.CONFIG.expectedElements[role].hidden;
            const hiddenResults = [];

            for (const selector of expectedHidden) {
                const element = await this.page.$(selector);
                if (element) {
                    const isVisible = await this.page.evaluate((el) => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    }, element);

                    hiddenResults.push({ selector, found: true, visible: isVisible });

                    if (isVisible) {
                        pageResults.issues.push(`Element should be hidden but is visible: ${selector}`);
                        this.issues.push({
                            page: pageConfig.name,
                            role: role,
                            issue: `Element should be hidden: ${selector}`,
                            severity: 'high'
                        });
                    }
                } else {
                    hiddenResults.push({ selector, found: false, visible: false });
                    // Not finding a hidden element is OK - it might not exist
                }
            }

            pageResults.tests.hiddenElementsCorrect = hiddenResults.every(r => !r.visible);

            // Test 5: Active state correct
            const currentPageActive = await this.page.evaluate((pageName) => {
                const activeElements = Array.from(document.querySelectorAll('.nav-item.active, [data-page].active'));
                return activeElements.some(el => 
                    el.getAttribute('data-page') === pageName || 
                    el.getAttribute('href')?.includes(pageName)
                );
            }, pageConfig.name);

            pageResults.tests.activeStateCorrect = currentPageActive;
            if (!currentPageActive && pageConfig.name !== 'story-detail') { // story-detail might not have active state
                pageResults.issues.push('Current page not marked as active in navigation');
                this.issues.push({
                    page: pageConfig.name,
                    role: role,
                    issue: 'Active state not set for current page',
                    severity: 'medium'
                });
            }

            // Test 6: Mobile menu functionality
            const mobileMenuWorks = await this.page.evaluate(() => {
                const mobileToggle = document.getElementById('mobileToggle');
                const mobileMenu = document.getElementById('mobileMenu');
                
                if (mobileToggle && mobileMenu) {
                    // Simulate click
                    mobileToggle.click();
                    const isActive = mobileMenu.classList.contains('active');
                    
                    // Click again to close
                    mobileToggle.click();
                    const isClosed = !mobileMenu.classList.contains('active');
                    
                    return isActive && isClosed;
                }
                return false;
            });

            pageResults.tests.mobileMenuWorks = mobileMenuWorks;
            if (!mobileMenuWorks) {
                pageResults.issues.push('Mobile menu toggle not working');
                this.issues.push({
                    page: pageConfig.name,
                    role: role,
                    issue: 'Mobile menu functionality broken',
                    severity: 'medium'
                });
            }

            // Take screenshot
            await this.page.screenshot({ 
                path: pageResults.screenshot, 
                fullPage: true 
            });
            this.screenshots.push(pageResults.screenshot);

            // Calculate overall page score
            const totalTests = Object.keys(pageResults.tests).length;
            const passedTests = Object.values(pageResults.tests).filter(Boolean).length;
            pageResults.score = Math.round((passedTests / totalTests) * 100);

            console.log(`   Score: ${pageResults.score}% (${passedTests}/${totalTests} tests passed)`);
            if (pageResults.issues.length > 0) {
                console.log(`   Issues: ${pageResults.issues.length}`);
            }

            return pageResults;

        } catch (error) {
            console.error(`❌ Error testing ${testName}:`, error.message);
            
            this.issues.push({
                page: pageConfig.name,
                role: role,
                issue: `Test execution error: ${error.message}`,
                severity: 'critical'
            });

            // Handle authentication errors differently
            if (error.message.includes('authentication') || error.message.includes('login')) {
                return {
                    url: url,
                    role: role,
                    page: pageConfig.name,
                    error: `Authentication required: ${error.message}`,
                    authenticationIssue: true,
                    score: 0,
                    tests: {
                        navigationPresent: false,
                        userInfoCorrect: false,
                        visibleElementsCorrect: false,
                        hiddenElementsCorrect: false,
                        activeStateCorrect: false,
                        mobileMenuWorks: false
                    },
                    issues: ['Page requires authentication but user not properly logged in']
                };
            }

            return {
                url: url,
                role: role,
                page: pageConfig.name,
                error: error.message,
                score: 0,
                tests: {
                    navigationPresent: false,
                    userInfoCorrect: false,
                    visibleElementsCorrect: false,
                    hiddenElementsCorrect: false,
                    activeStateCorrect: false,
                    mobileMenuWorks: false
                },
                issues: [`Test execution error: ${error.message}`]
            };
        }
    }

    /**
     * Run all tests for all roles and pages
     */
    async runAllTests() {
        console.log('🎯 Running comprehensive navigation tests...\n');

        for (const role of ['student', 'teacher', 'admin']) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🧪 Testing ${role.toUpperCase()} Role`);
            console.log(`${'='.repeat(60)}`);

            this.results[role] = {};

            for (const pageConfig of VidPODNavigationTester.CONFIG.pagesToTest) {
                const pageResult = await this.testPage(role, pageConfig);
                this.results[role][pageConfig.name] = pageResult;
                
                await this.delay(1000); // Pause between tests
            }

            // Calculate role score
            const pageResults = Object.values(this.results[role]);
            const roleScore = Math.round(
                pageResults.reduce((sum, result) => sum + (result.score || 0), 0) / pageResults.length
            );
            
            console.log(`\n🎯 ${role.toUpperCase()} Role Overall Score: ${roleScore}%`);
        }
    }

    /**
     * Generate comprehensive HTML report
     */
    generateHtmlReport() {
        const timestamp = new Date().toISOString();
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VidPOD Navigation Test Report</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #f5f7fa;
        }
        .header { 
            background: #f79b5b; 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 30px;
        }
        .summary { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px;
        }
        .summary-card { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .role-section { 
            background: white; 
            margin-bottom: 30px; 
            border-radius: 8px; 
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .role-header { 
            padding: 20px; 
            font-weight: bold; 
            font-size: 1.2em;
        }
        .admin { background: #dc3545; color: white; }
        .teacher { background: #28a745; color: white; }
        .student { background: #007bff; color: white; }
        .page-result { 
            padding: 15px 20px; 
            border-bottom: 1px solid #eee;
        }
        .page-result:last-child { border-bottom: none; }
        .score { 
            font-weight: bold; 
            padding: 4px 8px; 
            border-radius: 4px; 
            color: white;
        }
        .score.high { background: #28a745; }
        .score.medium { background: #ffc107; color: #333; }
        .score.low { background: #dc3545; }
        .issues { 
            background: #f8f9fa; 
            padding: 10px; 
            margin-top: 10px; 
            border-radius: 4px;
        }
        .issue { 
            padding: 5px 0; 
            border-bottom: 1px solid #dee2e6;
        }
        .issue:last-child { border-bottom: none; }
        .critical { color: #dc3545; font-weight: bold; }
        .high { color: #fd7e14; font-weight: bold; }
        .medium { color: #ffc107; }
        .screenshot { 
            max-width: 100%; 
            height: auto; 
            border: 1px solid #ddd; 
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📻 VidPOD Navigation Test Report</h1>
        <p><strong>Test Date:</strong> ${timestamp}</p>
        <p><strong>Total Tests:</strong> ${Object.keys(this.results).length * VidPODNavigationTester.CONFIG.pagesToTest.length}</p>
        <p><strong>Issues Found:</strong> ${this.issues.length}</p>
    </div>

    <div class="summary">`;

        // Summary cards for each role
        for (const role of ['admin', 'teacher', 'student']) {
            const pageResults = Object.values(this.results[role]);
            const roleScore = Math.round(
                pageResults.reduce((sum, result) => sum + (result.score || 0), 0) / pageResults.length
            );
            const roleIssues = this.issues.filter(i => i.role === role).length;
            
            html += `
        <div class="summary-card">
            <h3>${role.charAt(0).toUpperCase() + role.slice(1)} Role</h3>
            <p><strong>Score:</strong> <span class="score ${roleScore >= 80 ? 'high' : roleScore >= 60 ? 'medium' : 'low'}">${roleScore}%</span></p>
            <p><strong>Issues:</strong> ${roleIssues}</p>
            <p><strong>Pages Tested:</strong> ${pageResults.length}</p>
        </div>`;
        }

        html += `</div>`;

        // Detailed results for each role
        for (const role of ['admin', 'teacher', 'student']) {
            html += `
    <div class="role-section">
        <div class="role-header ${role}">
            ${role.charAt(0).toUpperCase() + role.slice(1)} Role - Detailed Results
        </div>`;

            for (const [pageName, result] of Object.entries(this.results[role])) {
                const scoreClass = result.score >= 80 ? 'high' : result.score >= 60 ? 'medium' : 'low';
                
                html += `
        <div class="page-result">
            <h4>${VidPODNavigationTester.CONFIG.pagesToTest.find(p => p.name === pageName)?.title} 
                <span class="score ${scoreClass}">${result.score}%</span>
            </h4>
            <p><strong>URL:</strong> ${result.url}</p>`;

                if (result.tests) {
                    html += `<p><strong>Tests:</strong> `;
                    for (const [testName, passed] of Object.entries(result.tests)) {
                        html += `<span style="color: ${passed ? '#28a745' : '#dc3545'};">${passed ? '✅' : '❌'} ${testName}</span> `;
                    }
                    html += `</p>`;
                }

                if (result.issues && result.issues.length > 0) {
                    html += `
            <div class="issues">
                <strong>Issues:</strong>`;
                    result.issues.forEach(issue => {
                        html += `<div class="issue">• ${issue}</div>`;
                    });
                    html += `</div>`;
                }

                if (result.screenshot) {
                    html += `<p><strong>Screenshot:</strong> ${result.screenshot}</p>`;
                }

                html += `</div>`;
            }

            html += `</div>`;
        }

        // Issues summary
        if (this.issues.length > 0) {
            html += `
    <div class="role-section">
        <div class="role-header" style="background: #dc3545; color: white;">
            All Issues Summary (${this.issues.length} total)
        </div>`;

            const groupedIssues = {};
            this.issues.forEach(issue => {
                const key = `${issue.page}-${issue.role}`;
                if (!groupedIssues[key]) {
                    groupedIssues[key] = [];
                }
                groupedIssues[key].push(issue);
            });

            for (const [key, issues] of Object.entries(groupedIssues)) {
                const [page, role] = key.split('-');
                html += `
        <div class="page-result">
            <h4>${page} - ${role}</h4>`;
                issues.forEach(issue => {
                    html += `<div class="issue ${issue.severity}">🚨 ${issue.issue}</div>`;
                });
                html += `</div>`;
            }

            html += `</div>`;
        }

        html += `
</body>
</html>`;

        fs.writeFileSync('navigation-test-report.html', html);
        console.log('\n📄 HTML report saved as navigation-test-report.html');
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    /**
     * Helper method to add delay
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Main execution method
     */
    async run() {
        try {
            await this.initialize();
            await this.runAllTests();
            
            // Generate summary
            const totalTests = Object.keys(this.results).length * VidPODNavigationTester.CONFIG.pagesToTest.length;
            const totalIssues = this.issues.length;
            const criticalIssues = this.issues.filter(i => i.severity === 'critical').length;
            
            console.log('\n' + '='.repeat(80));
            console.log('🎯 FINAL TEST SUMMARY');
            console.log('='.repeat(80));
            console.log(`Total Tests Run: ${totalTests}`);
            console.log(`Total Issues Found: ${totalIssues}`);
            console.log(`Critical Issues: ${criticalIssues}`);
            console.log(`Screenshots Captured: ${this.screenshots.length}`);
            
            if (totalIssues === 0) {
                console.log('🎉 ALL TESTS PASSED! Navigation is consistent across all pages and roles.');
            } else {
                console.log('⚠️ ISSUES FOUND! Navigation inconsistencies need to be addressed.');
                console.log('\n📋 Issues by Severity:');
                const severityGroups = {};
                this.issues.forEach(issue => {
                    if (!severityGroups[issue.severity]) {
                        severityGroups[issue.severity] = [];
                    }
                    severityGroups[issue.severity].push(issue);
                });
                
                for (const [severity, issues] of Object.entries(severityGroups)) {
                    console.log(`  ${severity.toUpperCase()}: ${issues.length} issues`);
                }
            }

            this.generateHtmlReport();
            console.log('='.repeat(80));

            return {
                totalTests,
                totalIssues,
                criticalIssues,
                results: this.results,
                issues: this.issues
            };

        } catch (error) {
            console.error('❌ Test suite failed:', error);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Execute if run directly
if (require.main === module) {
    (async () => {
        const tester = new VidPODNavigationTester();
        try {
            await tester.run();
        } catch (error) {
            console.error('Test execution failed:', error);
            process.exit(1);
        }
    })();
}

module.exports = VidPODNavigationTester;