#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;

/**
 * VidPOD Comprehensive Multi-Role Testing Suite
 * Master controller for systematic testing of all user roles and workflows
 */

class BugTracker {
    constructor() {
        this.bugs = [];
        this.categories = {
            AUTHENTICATION: 'Authentication and security issues',
            UI_UX: 'User interface and experience problems',
            PERFORMANCE: 'Speed and resource optimization needs',
            FUNCTIONAL: 'Core feature functionality issues'
        };
        this.severities = {
            CRITICAL: 'Blocks core functionality - fix immediately',
            HIGH: 'Significant impact on user experience - fix within 24h',
            MEDIUM: 'Moderate impact, workaround available - fix within week',
            LOW: 'Minor cosmetic or edge case - fix when time permits'
        };
    }

    trackBug(category, severity, description, context) {
        const bug = {
            id: `BUG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            category,
            severity,
            description,
            context,
            timestamp: new Date().toISOString(),
            reproductionSteps: context.reproductionSteps || [],
            expectedBehavior: context.expected || '',
            actualBehavior: context.actual || '',
            fixPlan: this.generateFixPlan(category, severity, description),
            status: 'OPEN'
        };
        
        this.bugs.push(bug);
        console.log(`🐛 [${severity}] ${category}: ${description}`);
        return bug;
    }

    generateFixPlan(category, severity, description) {
        const plans = {
            AUTHENTICATION: {
                CRITICAL: 'Immediate security audit and token handling review',
                HIGH: 'Review authentication flow and add error handling',
                MEDIUM: 'Improve user feedback and session management',
                LOW: 'Code cleanup and documentation update'
            },
            UI_UX: {
                CRITICAL: 'Emergency UI fix and cross-browser testing',
                HIGH: 'Responsive design review and mobile optimization',
                MEDIUM: 'UX improvements and accessibility review',
                LOW: 'Design polish and minor adjustments'
            },
            PERFORMANCE: {
                CRITICAL: 'Performance optimization and caching review',
                HIGH: 'API optimization and loading improvements',
                MEDIUM: 'Resource optimization and lazy loading',
                LOW: 'Minor performance tweaks'
            },
            FUNCTIONAL: {
                CRITICAL: 'Feature restoration and data integrity check',
                HIGH: 'Functionality review and error handling',
                MEDIUM: 'Feature enhancement and edge case handling',
                LOW: 'Feature polish and minor improvements'
            }
        };

        return plans[category]?.[severity] || 'Review and determine appropriate fix approach';
    }

    getBugsByPriority() {
        const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        return this.bugs.sort((a, b) => 
            priorityOrder.indexOf(a.severity) - priorityOrder.indexOf(b.severity)
        );
    }

    generateReport() {
        const summary = {
            total: this.bugs.length,
            bySeverity: {},
            byCategory: {}
        };

        Object.keys(this.severities).forEach(severity => {
            summary.bySeverity[severity] = this.bugs.filter(bug => bug.severity === severity).length;
        });

        Object.keys(this.categories).forEach(category => {
            summary.byCategory[category] = this.bugs.filter(bug => bug.category === category).length;
        });

        return {
            summary,
            bugs: this.getBugsByPriority()
        };
    }
}

class VidPODTestSuite {
    constructor() {
        this.bugTracker = new BugTracker();
        this.testResults = {
            admin: { passed: 0, failed: 0, total: 0, bugs: [] },
            teacher: { passed: 0, failed: 0, total: 0, bugs: [] },
            student: { passed: 0, failed: 0, total: 0, bugs: [] },
            security: { passed: 0, failed: 0, total: 0, bugs: [] },
            performance: { passed: 0, failed: 0, total: 0, bugs: [] }
        };
        this.startTime = Date.now();
        this.credentials = {
            admin: { email: 'admin@vidpod.com', password: 'vidpod' },
            teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
            student: { email: 'student@vidpod.com', password: 'vidpod' }
        };
        this.apiUrl = 'https://podcast-stories-production.up.railway.app';
    }

    async initializeBrowser() {
        this.browser = await puppeteer.launch({ 
            headless: false, 
            defaultViewport: null,
            args: ['--disable-web-security', '--no-cache']
        });
        console.log('🚀 Browser initialized for comprehensive testing');
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }

    async createTestPage() {
        const page = await this.browser.newPage();
        await page.setCacheEnabled(false);
        
        // Track console messages and errors
        const messages = [];
        page.on('console', msg => {
            messages.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: Date.now()
            });
        });

        page.on('pageerror', error => {
            this.bugTracker.trackBug(
                'FUNCTIONAL',
                'HIGH',
                `Page JavaScript Error: ${error.message}`,
                {
                    actual: error.message,
                    expected: 'No JavaScript errors',
                    reproductionSteps: ['Navigate to page', 'Check console for errors']
                }
            );
        });

        page.on('response', response => {
            if (!response.ok() && !response.url().includes('favicon')) {
                this.bugTracker.trackBug(
                    'PERFORMANCE',
                    response.status() >= 500 ? 'HIGH' : 'MEDIUM',
                    `HTTP ${response.status()} Error: ${response.url()}`,
                    {
                        actual: `${response.status()} ${response.statusText()}`,
                        expected: '200 OK',
                        reproductionSteps: ['Navigate to page', 'Check network requests']
                    }
                );
            }
        });

        page.consoleMessages = messages;
        return page;
    }

    async testLogin(page, userType, expectedRedirect) {
        console.log(`🔐 Testing ${userType} login...`);
        
        const credentials = this.credentials[userType];
        
        try {
            // Navigate to login page
            await page.goto(`${this.apiUrl}/`);
            await page.evaluate(() => localStorage.clear());
            await page.reload();

            // Fill login form
            await page.waitForSelector('#email', { timeout: 10000 });
            await page.type('#email', credentials.email);
            await page.type('#password', credentials.password);

            // Submit and wait for navigation
            const loginStart = Date.now();
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ timeout: 15000 });
            const loginTime = Date.now() - loginStart;

            // Verify login success
            const loginResult = await page.evaluate(() => ({
                currentURL: window.location.href,
                hasToken: !!localStorage.getItem('token'),
                hasUser: !!localStorage.getItem('user'),
                userRole: JSON.parse(localStorage.getItem('user') || '{}').role
            }));

            // Check if redirected correctly
            const correctRedirect = loginResult.currentURL.includes(expectedRedirect);
            const correctRole = loginResult.userRole === userType;

            if (!loginResult.hasToken) {
                this.bugTracker.trackBug(
                    'AUTHENTICATION',
                    'CRITICAL',
                    `${userType} login - No token stored after successful login`,
                    {
                        actual: 'No token in localStorage',
                        expected: 'JWT token stored in localStorage',
                        reproductionSteps: [`Login as ${userType}`, 'Check localStorage for token']
                    }
                );
                return { success: false, loginTime, details: loginResult };
            }

            if (!correctRedirect) {
                this.bugTracker.trackBug(
                    'AUTHENTICATION',
                    'HIGH',
                    `${userType} login - Incorrect redirect after login`,
                    {
                        actual: `Redirected to ${loginResult.currentURL}`,
                        expected: `Should redirect to page containing ${expectedRedirect}`,
                        reproductionSteps: [`Login as ${userType}`, 'Check redirect URL']
                    }
                );
            }

            if (!correctRole) {
                this.bugTracker.trackBug(
                    'AUTHENTICATION',
                    'CRITICAL',
                    `${userType} login - Incorrect user role after login`,
                    {
                        actual: `User role: ${loginResult.userRole}`,
                        expected: `User role: ${userType}`,
                        reproductionSteps: [`Login as ${userType}`, 'Check user data in localStorage']
                    }
                );
            }

            console.log(`   ✅ ${userType} login successful (${loginTime}ms)`);
            return { 
                success: correctRedirect && correctRole && loginResult.hasToken, 
                loginTime, 
                details: loginResult 
            };

        } catch (error) {
            this.bugTracker.trackBug(
                'AUTHENTICATION',
                'CRITICAL',
                `${userType} login completely failed: ${error.message}`,
                {
                    actual: error.message,
                    expected: 'Successful login and redirect',
                    reproductionSteps: [`Navigate to login page`, `Enter ${userType} credentials`, 'Submit form']
                }
            );
            console.log(`   ❌ ${userType} login failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async testTokenPersistence(page, userType) {
        console.log(`🔒 Testing ${userType} token persistence...`);

        const tokenBefore = await page.evaluate(() => localStorage.getItem('token'));
        
        // Navigate to different pages and check token persistence
        const testPages = ['/stories.html', '/add-story.html'];
        
        for (const testPage of testPages) {
            try {
                await page.goto(`${this.apiUrl}${testPage}`);
                await new Promise(resolve => setTimeout(resolve, 2000));

                const tokenAfter = await page.evaluate(() => ({
                    hasToken: !!localStorage.getItem('token'),
                    currentURL: window.location.href,
                    redirectedToLogin: window.location.href.includes('index.html')
                }));

                if (!tokenAfter.hasToken || tokenAfter.redirectedToLogin) {
                    this.bugTracker.trackBug(
                        'AUTHENTICATION',
                        'CRITICAL',
                        `${userType} token lost during navigation to ${testPage}`,
                        {
                            actual: `Token lost, redirected to: ${tokenAfter.currentURL}`,
                            expected: `Token preserved, stayed on: ${this.apiUrl}${testPage}`,
                            reproductionSteps: [`Login as ${userType}`, `Navigate to ${testPage}`, 'Check token persistence']
                        }
                    );
                    return { success: false, lostOnPage: testPage };
                }
            } catch (error) {
                this.bugTracker.trackBug(
                    'AUTHENTICATION',
                    'HIGH',
                    `${userType} navigation to ${testPage} failed: ${error.message}`,
                    {
                        actual: error.message,
                        expected: 'Successful navigation with token preservation',
                        reproductionSteps: [`Login as ${userType}`, `Navigate to ${testPage}`]
                    }
                );
            }
        }

        console.log(`   ✅ ${userType} token persistence verified`);
        return { success: true };
    }

    async recordTestResult(role, testName, success, details = '') {
        this.testResults[role].total++;
        if (success) {
            this.testResults[role].passed++;
        } else {
            this.testResults[role].failed++;
        }
        
        console.log(`   ${success ? '✅' : '❌'} ${testName}: ${details}`);
    }

    async generateComprehensiveReport() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        
        const bugReport = this.bugTracker.generateReport();
        
        const overallStats = Object.values(this.testResults).reduce(
            (acc, role) => ({
                total: acc.total + role.total,
                passed: acc.passed + role.passed,
                failed: acc.failed + role.failed
            }),
            { total: 0, passed: 0, failed: 0 }
        );

        const successRate = overallStats.total > 0 
            ? ((overallStats.passed / overallStats.total) * 100).toFixed(1)
            : 0;

        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                duration: `${(totalTime / 1000).toFixed(1)}s`,
                testSuite: 'VidPOD Comprehensive Multi-Role Testing'
            },
            summary: {
                totalTests: overallStats.total,
                passed: overallStats.passed,
                failed: overallStats.failed,
                successRate: `${successRate}%`,
                totalBugs: bugReport.summary.total
            },
            roleResults: this.testResults,
            bugAnalysis: bugReport,
            recommendations: this.generateRecommendations(bugReport, successRate)
        };

        // Save detailed report
        await fs.writeFile(
            './comprehensive-test-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n📊 COMPREHENSIVE TEST REPORT');
        console.log('=' .repeat(80));
        console.log(`🎯 Overall Success Rate: ${successRate}%`);
        console.log(`📋 Total Tests: ${overallStats.total} (${overallStats.passed} passed, ${overallStats.failed} failed)`);
        console.log(`🐛 Total Bugs Found: ${bugReport.summary.total}`);
        
        console.log('\n🔥 Bug Breakdown by Severity:');
        Object.entries(bugReport.summary.bySeverity).forEach(([severity, count]) => {
            if (count > 0) {
                console.log(`   ${severity}: ${count} bugs`);
            }
        });

        console.log('\n📁 Bug Breakdown by Category:');
        Object.entries(bugReport.summary.byCategory).forEach(([category, count]) => {
            if (count > 0) {
                console.log(`   ${category}: ${count} bugs`);
            }
        });

        return report;
    }

    generateRecommendations(bugReport, successRate) {
        const recommendations = [];
        
        if (bugReport.summary.bySeverity.CRITICAL > 0) {
            recommendations.push('🚨 IMMEDIATE ACTION REQUIRED: Critical bugs found that block core functionality');
        }
        
        if (successRate < 90) {
            recommendations.push('📈 Focus on improving test pass rate - target 95%+ for production readiness');
        }

        if (bugReport.summary.byCategory.AUTHENTICATION > 0) {
            recommendations.push('🔒 Security review recommended - authentication issues detected');
        }

        if (bugReport.summary.byCategory.PERFORMANCE > 0) {
            recommendations.push('⚡ Performance optimization needed - speed issues detected');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Excellent results! Consider implementing additional edge case testing');
        }

        return recommendations;
    }

    async runBasicWorkflowTest(userType, dashboardPath) {
        console.log(`\n🔄 Running basic workflow test for ${userType}...`);
        
        const page = await this.createTestPage();
        
        try {
            // Test login
            const loginResult = await this.testLogin(page, userType, dashboardPath);
            await this.recordTestResult(userType, 'Login', loginResult.success, 
                loginResult.success ? `${loginResult.loginTime}ms` : 'Failed');

            if (!loginResult.success) {
                await page.close();
                return;
            }

            // Test token persistence
            const tokenResult = await this.testTokenPersistence(page, userType);
            await this.recordTestResult(userType, 'Token Persistence', tokenResult.success);

            // Test basic dashboard elements
            await page.goto(`${this.apiUrl}${dashboardPath}`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const dashboardTest = await page.evaluate(() => ({
                hasUserInfo: !!document.querySelector('#userInfo, [class*="user"], [class*="name"]'),
                hasMainContent: !!document.querySelector('main, .container, .content, .dashboard'),
                hasNavigation: !!document.querySelector('nav, .navigation, .nav-links'),
                pageLoaded: document.readyState === 'complete'
            }));

            await this.recordTestResult(userType, 'Dashboard Load', dashboardTest.pageLoaded);
            await this.recordTestResult(userType, 'Dashboard Elements', 
                dashboardTest.hasUserInfo && dashboardTest.hasMainContent);

            // Test logout
            const logoutSuccess = await page.evaluate(() => {
                const logoutBtn = document.querySelector('[onclick*="logout"], .logout, [href*="logout"]');
                if (logoutBtn) {
                    logoutBtn.click();
                    return true;
                }
                return false;
            });

            if (logoutSuccess) {
                await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
                const afterLogout = await page.evaluate(() => ({
                    hasToken: !!localStorage.getItem('token'),
                    onLoginPage: window.location.href.includes('index.html') || window.location.pathname === '/'
                }));

                await this.recordTestResult(userType, 'Logout', 
                    !afterLogout.hasToken && afterLogout.onLoginPage);
            } else {
                await this.recordTestResult(userType, 'Logout', false, 'Logout button not found');
            }

        } catch (error) {
            console.log(`❌ Workflow test failed for ${userType}: ${error.message}`);
            this.bugTracker.trackBug(
                'FUNCTIONAL',
                'HIGH',
                `${userType} workflow test failed: ${error.message}`,
                {
                    actual: error.message,
                    expected: 'Complete workflow execution',
                    reproductionSteps: [`Run ${userType} workflow test`]
                }
            );
        }

        await page.close();
    }

    async runComprehensiveTest() {
        console.log('🚀 STARTING COMPREHENSIVE MULTI-ROLE TESTING SUITE');
        console.log('=' .repeat(80));

        await this.initializeBrowser();

        try {
            // Test all user roles
            await this.runBasicWorkflowTest('admin', '/admin.html');
            await this.runBasicWorkflowTest('teacher', '/teacher-dashboard.html');
            await this.runBasicWorkflowTest('student', '/dashboard.html');

            // Generate comprehensive report
            const report = await this.generateComprehensiveReport();
            
            console.log('\n🏁 COMPREHENSIVE TESTING COMPLETE');
            console.log(`📄 Detailed report saved to: comprehensive-test-report.json`);
            
            return report;

        } finally {
            await this.closeBrowser();
        }
    }
}

// Export for use in other test files
module.exports = { VidPODTestSuite, BugTracker };

// Run if called directly
if (require.main === module) {
    const testSuite = new VidPODTestSuite();
    testSuite.runComprehensiveTest().catch(console.error);
}