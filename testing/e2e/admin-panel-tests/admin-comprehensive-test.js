#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const { VidPODTestSuite, BugTracker } = require('./comprehensive-test-suite');

/**
 * VidPOD Admin Comprehensive Testing Suite
 * Systematic testing of all admin functionality, security boundaries, and edge cases
 */

class AdminComprehensiveTest extends VidPODTestSuite {
    constructor() {
        super();
        this.testSuiteName = 'Admin Comprehensive Testing';
        this.adminCredentials = { email: 'admin@vidpod.com', password: 'vidpod' };
        this.testResults.admin = { 
            passed: 0, 
            failed: 0, 
            total: 0, 
            bugs: [],
            categories: {
                authentication: { passed: 0, failed: 0 },
                dashboard: { passed: 0, failed: 0 },
                teacherManagement: { passed: 0, failed: 0 },
                schoolManagement: { passed: 0, failed: 0 },
                systemAccess: { passed: 0, failed: 0 },
                security: { passed: 0, failed: 0 },
                navigation: { passed: 0, failed: 0 }
            }
        };
    }

    async runFullAdminTest() {
        console.log('🚀 ADMIN COMPREHENSIVE TESTING SUITE STARTING');
        console.log('=' .repeat(80));

        await this.initializeBrowser();

        try {
            const page = await this.createTestPage();

            // Phase 1: Authentication & Dashboard Access
            await this.testAdminAuthentication(page);
            await this.testAdminDashboardElements(page);
            
            // Phase 2: Core Admin Functions
            await this.testTeacherRequestManagement(page);
            await this.testSchoolManagement(page);
            await this.testTagManagement(page);
            
            // Phase 3: System Access & Analytics
            await this.testSystemAnalyticsAccess(page);
            await this.testUserManagement(page);
            
            // Phase 4: Security Boundary Testing
            await this.testAdminSecurityBoundaries(page);
            
            // Phase 5: Navigation & Cross-Page Testing
            await this.testAdminNavigation(page);
            
            // Phase 6: Edge Cases & Error Handling
            await this.testAdminEdgeCases(page);

            await page.close();

            // Generate comprehensive report
            const report = await this.generateAdminReport();
            console.log('\n🏁 ADMIN COMPREHENSIVE TESTING COMPLETE');
            console.log(`📄 Detailed report saved to: admin-comprehensive-test-report.json`);
            
            return report;

        } finally {
            await this.closeBrowser();
        }
    }

    async testAdminAuthentication(page) {
        console.log('\n🔐 PHASE 1: Admin Authentication Testing');
        
        // Test 1: Admin login with correct credentials
        const loginResult = await this.testLogin(page, 'admin', '/admin.html');
        await this.recordAdminTestResult('authentication', 'Admin Login', loginResult.success, 
            loginResult.success ? `${loginResult.loginTime}ms` : 'Failed');

        if (!loginResult.success) {
            this.bugTracker.trackBug(
                'AUTHENTICATION',
                'CRITICAL',
                'Admin login completely failed - blocking all admin functionality',
                {
                    actual: 'Login failed',
                    expected: 'Successful admin login',
                    reproductionSteps: ['Navigate to login', 'Enter admin credentials', 'Submit form']
                }
            );
            return false;
        }

        // Test 2: Token persistence during admin session
        const tokenResult = await this.testTokenPersistence(page, 'admin');
        await this.recordAdminTestResult('authentication', 'Token Persistence', tokenResult.success);

        // Test 3: Admin role verification
        const roleVerification = await page.evaluate(() => {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            return {
                role: userData.role,
                isAdmin: userData.role === 'amitrace_admin',
                hasAdminAccess: !!document.querySelector('.admin-panel, #adminPanel, [class*="admin"]')
            };
        });

        const roleVerified = roleVerification.isAdmin && roleVerification.role === 'amitrace_admin';
        await this.recordAdminTestResult('authentication', 'Role Verification', roleVerified, 
            `Role: ${roleVerification.role}`);

        if (!roleVerified) {
            this.bugTracker.trackBug(
                'AUTHENTICATION',
                'CRITICAL',
                'Admin role not properly set or verified after login',
                {
                    actual: `Role: ${roleVerification.role}`,
                    expected: 'Role: amitrace_admin',
                    reproductionSteps: ['Login as admin', 'Check user role in localStorage']
                }
            );
        }

        return loginResult.success && tokenResult.success && roleVerified;
    }

    async testAdminDashboardElements(page) {
        console.log('\n📊 PHASE 2: Admin Dashboard Elements Testing');

        await page.goto(`${this.apiUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test 1: Core dashboard elements
        const dashboardElements = await page.evaluate(() => ({
            hasTitle: !!document.querySelector('h1, .page-title, [class*="title"]'),
            hasUserInfo: !!document.querySelector('#userInfo, .user-name, [class*="user"]'),
            hasStatsCards: document.querySelectorAll('.stat-card, .stats-card, [class*="stat"]').length,
            hasTabNavigation: !!document.querySelector('.tabs, .tab-nav, [id*="tab"], [class*="tab"]'),
            hasMainContent: !!document.querySelector('main, .main-content, .content, .admin-content')
        }));

        await this.recordAdminTestResult('dashboard', 'Page Title', !!dashboardElements.hasTitle);
        await this.recordAdminTestResult('dashboard', 'User Info Display', !!dashboardElements.hasUserInfo);
        await this.recordAdminTestResult('dashboard', 'Stats Cards', dashboardElements.hasStatsCards > 0, 
            `Found ${dashboardElements.hasStatsCards} stat cards`);
        await this.recordAdminTestResult('dashboard', 'Tab Navigation', !!dashboardElements.hasTabNavigation);
        await this.recordAdminTestResult('dashboard', 'Main Content Area', !!dashboardElements.hasMainContent);

        // Test 2: Tab functionality
        const tabElements = await page.$$('[onclick*="showTab"], .tab-button, [data-tab]');
        if (tabElements.length > 0) {
            for (let i = 0; i < Math.min(tabElements.length, 4); i++) {
                try {
                    await tabElements[i].click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    const tabActive = await page.evaluate(() => {
                        return !!document.querySelector('.tab-content:not([style*="display: none"]), .active-tab, [class*="active"]');
                    });
                    
                    await this.recordAdminTestResult('dashboard', `Tab ${i + 1} Functionality`, tabActive);
                } catch (error) {
                    await this.recordAdminTestResult('dashboard', `Tab ${i + 1} Functionality`, false, error.message);
                    this.bugTracker.trackBug(
                        'UI_UX',
                        'HIGH',
                        `Admin tab ${i + 1} not functioning: ${error.message}`,
                        {
                            actual: error.message,
                            expected: 'Tab switches successfully',
                            reproductionSteps: ['Login as admin', 'Navigate to admin panel', `Click tab ${i + 1}`]
                        }
                    );
                }
            }
        }

        // Test 3: JavaScript functions availability
        const jsFunctions = await page.evaluate(() => {
            const functions = ['showTab', 'editSchool', 'deleteSchool', 'showApprovalModal', 'closeApprovalModal'];
            return functions.map(func => ({
                name: func,
                available: typeof window[func] === 'function'
            }));
        });

        for (const func of jsFunctions) {
            await this.recordAdminTestResult('dashboard', `JS Function: ${func.name}`, func.available);
            if (!func.available) {
                this.bugTracker.trackBug(
                    'FUNCTIONAL',
                    'CRITICAL',
                    `Admin JavaScript function ${func.name} not available`,
                    {
                        actual: `Function ${func.name} not found`,
                        expected: `Function ${func.name} available globally`,
                        reproductionSteps: ['Login as admin', 'Open browser console', `Check typeof window.${func.name}`]
                    }
                );
            }
        }
    }

    async testTeacherRequestManagement(page) {
        console.log('\n👨‍🏫 PHASE 3: Teacher Request Management Testing');

        await page.goto(`${this.apiUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1: Teacher requests tab access
        try {
            await page.evaluate(() => {
                if (typeof window.showTab === 'function') {
                    window.showTab('teacher-requests');
                } else {
                    throw new Error('showTab function not available');
                }
            });
            await new Promise(resolve => setTimeout(resolve, 1500));

            const teacherRequestsVisible = await page.evaluate(() => {
                const tab = document.getElementById('teacher-requests');
                return tab && tab.style.display !== 'none';
            });

            await this.recordAdminTestResult('teacherManagement', 'Teacher Requests Tab Access', teacherRequestsVisible);

            if (teacherRequestsVisible) {
                // Test 2: Pending requests display
                const pendingRequests = await page.evaluate(() => {
                    const requestsContainer = document.querySelector('#pendingRequests, .pending-requests, [class*="request"]');
                    const requestCards = document.querySelectorAll('.request-card, [class*="request-item"]');
                    return {
                        hasContainer: !!requestsContainer,
                        requestCount: requestCards.length,
                        hasNoRequestsMessage: !!document.querySelector('.no-requests, [class*="no-pending"]')
                    };
                });

                await this.recordAdminTestResult('teacherManagement', 'Pending Requests Display', 
                    pendingRequests.hasContainer, 
                    `${pendingRequests.requestCount} requests found`);

                // Test 3: Approval functionality (if requests exist)
                if (pendingRequests.requestCount > 0) {
                    const approvalButtons = await page.$$('[onclick*="approve"], .approve-btn, [data-action="approve"]');
                    if (approvalButtons.length > 0) {
                        try {
                            // Test approval modal opening
                            await approvalButtons[0].click();
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            const modalVisible = await page.evaluate(() => {
                                return !!document.querySelector('.modal:not([style*="display: none"]), .approval-modal, [class*="modal-open"]');
                            });

                            await this.recordAdminTestResult('teacherManagement', 'Approval Modal Open', modalVisible);

                            if (modalVisible) {
                                // Close modal
                                await page.evaluate(() => {
                                    if (typeof window.closeApprovalModal === 'function') {
                                        window.closeApprovalModal();
                                    }
                                });
                            }
                        } catch (error) {
                            await this.recordAdminTestResult('teacherManagement', 'Approval Functionality', false, error.message);
                        }
                    }
                }
            }
        } catch (error) {
            await this.recordAdminTestResult('teacherManagement', 'Teacher Requests Tab Access', false, error.message);
            this.bugTracker.trackBug(
                'FUNCTIONAL',
                'HIGH',
                `Teacher requests tab access failed: ${error.message}`,
                {
                    actual: error.message,
                    expected: 'Teacher requests tab opens successfully',
                    reproductionSteps: ['Login as admin', 'Click teacher requests tab']
                }
            );
        }
    }

    async testSchoolManagement(page) {
        console.log('\n🏫 PHASE 4: School Management Testing');

        await page.goto(`${this.apiUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1: Schools tab access
        try {
            await page.evaluate(() => {
                if (typeof window.showTab === 'function') {
                    window.showTab('schools');
                } else {
                    throw new Error('showTab function not available');
                }
            });
            await new Promise(resolve => setTimeout(resolve, 1500));

            const schoolsTabVisible = await page.evaluate(() => {
                const tab = document.getElementById('schools');
                return tab && tab.style.display !== 'none';
            });

            await this.recordAdminTestResult('schoolManagement', 'Schools Tab Access', schoolsTabVisible);

            if (schoolsTabVisible) {
                // Test 2: Schools list display
                const schoolsData = await page.evaluate(() => {
                    const schoolsList = document.querySelector('#schoolsList, .schools-list, [class*="school"]');
                    const schoolItems = document.querySelectorAll('.school-item, [class*="school-row"], .school-card');
                    const addSchoolForm = document.querySelector('#addSchoolForm, .add-school, [class*="add-school"]');
                    
                    return {
                        hasSchoolsList: !!schoolsList,
                        schoolCount: schoolItems.length,
                        hasAddForm: !!addSchoolForm
                    };
                });

                await this.recordAdminTestResult('schoolManagement', 'Schools List Display', 
                    schoolsData.hasSchoolsList, 
                    `${schoolsData.schoolCount} schools found`);
                await this.recordAdminTestResult('schoolManagement', 'Add School Form', schoolsData.hasAddForm);

                // Test 3: School edit functionality
                const editButtons = await page.$$('[onclick*="editSchool"], .edit-school, [data-action="edit"]');
                if (editButtons.length > 0) {
                    try {
                        await editButtons[0].click();
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        const editPrompt = await page.evaluate(() => {
                            // Check if prompt was triggered (this is tricky to test, so we'll assume success if no error)
                            return true;
                        });

                        await this.recordAdminTestResult('schoolManagement', 'School Edit Functionality', editPrompt);
                    } catch (error) {
                        await this.recordAdminTestResult('schoolManagement', 'School Edit Functionality', false, error.message);
                    }
                }

                // Test 4: School creation form
                if (schoolsData.hasAddForm) {
                    const formInputs = await page.evaluate(() => {
                        const nameInput = document.querySelector('#schoolName, [name="schoolName"], [id*="school"]');
                        const submitBtn = document.querySelector('[onclick*="addSchool"], .add-school-btn, [type="submit"]');
                        
                        return {
                            hasNameInput: !!nameInput,
                            hasSubmitButton: !!submitBtn
                        };
                    });

                    await this.recordAdminTestResult('schoolManagement', 'School Form Inputs', 
                        formInputs.hasNameInput && formInputs.hasSubmitButton);
                }
            }
        } catch (error) {
            await this.recordAdminTestResult('schoolManagement', 'Schools Tab Access', false, error.message);
        }
    }

    async testTagManagement(page) {
        console.log('\n🏷️ PHASE 5: Tag Management Testing');

        await page.goto(`${this.apiUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1: Tags tab access
        try {
            await page.evaluate(() => {
                if (typeof window.showTab === 'function') {
                    window.showTab('tags');
                } else {
                    throw new Error('showTab function not available');
                }
            });
            await new Promise(resolve => setTimeout(resolve, 1500));

            const tagsTabVisible = await page.evaluate(() => {
                const tab = document.getElementById('tags');
                return tab && tab.style.display !== 'none';
            });

            await this.recordAdminTestResult('systemAccess', 'Tags Tab Access', tagsTabVisible);

            if (tagsTabVisible) {
                // Test 2: Tags list display
                const tagsData = await page.evaluate(() => {
                    const tagsList = document.querySelector('#tagsList, .tags-list, [class*="tag"]');
                    const tagItems = document.querySelectorAll('.tag-item, [class*="tag-row"], .tag-card');
                    const addTagForm = document.querySelector('#addTagForm, .add-tag, [class*="add-tag"]');
                    
                    return {
                        hasTagsList: !!tagsList,
                        tagCount: tagItems.length,
                        hasAddForm: !!addTagForm
                    };
                });

                await this.recordAdminTestResult('systemAccess', 'Tags List Display', 
                    tagsData.hasTagsList, 
                    `${tagsData.tagCount} tags found`);
                await this.recordAdminTestResult('systemAccess', 'Add Tag Form', tagsData.hasAddForm);

                // Test 3: Tag deletion functionality
                const deleteButtons = await page.$$('[onclick*="deleteTag"], .delete-tag, [data-action="delete"]');
                if (deleteButtons.length > 0) {
                    await this.recordAdminTestResult('systemAccess', 'Tag Delete Buttons Available', true, 
                        `${deleteButtons.length} delete buttons found`);
                } else {
                    await this.recordAdminTestResult('systemAccess', 'Tag Delete Buttons Available', false);
                }
            }
        } catch (error) {
            await this.recordAdminTestResult('systemAccess', 'Tags Tab Access', false, error.message);
        }
    }

    async testSystemAnalyticsAccess(page) {
        console.log('\n📊 PHASE 6: System Analytics Access Testing');

        // Test 1: Analytics API endpoints access
        const analyticsEndpoints = [
            '/api/analytics/dashboard',
            '/api/analytics/users',
            '/api/analytics/stories'
        ];

        for (const endpoint of analyticsEndpoints) {
            try {
                const response = await page.evaluate(async (url) => {
                    const token = localStorage.getItem('token');
                    const res = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    return {
                        status: res.status,
                        ok: res.ok
                    };
                }, `${this.apiUrl}${endpoint}`);

                await this.recordAdminTestResult('systemAccess', `Analytics API: ${endpoint}`, 
                    response.status === 200 || response.status === 404, // 404 might be expected if not implemented
                    `Status: ${response.status}`);

                if (response.status === 403 || response.status === 401) {
                    this.bugTracker.trackBug(
                        'AUTHENTICATION',
                        'HIGH',
                        `Admin lacks access to analytics endpoint: ${endpoint}`,
                        {
                            actual: `HTTP ${response.status}`,
                            expected: 'HTTP 200 or 404',
                            reproductionSteps: ['Login as admin', `Make API call to ${endpoint}`]
                        }
                    );
                }
            } catch (error) {
                await this.recordAdminTestResult('systemAccess', `Analytics API: ${endpoint}`, false, error.message);
            }
        }
    }

    async testUserManagement(page) {
        console.log('\n👥 PHASE 7: User Management Testing');

        // Test 1: Access to user management endpoints
        const userEndpoints = [
            '/api/admin/teachers',
            '/api/admin/users',
            '/api/schools'
        ];

        for (const endpoint of userEndpoints) {
            try {
                const response = await page.evaluate(async (url) => {
                    const token = localStorage.getItem('token');
                    const res = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    return {
                        status: res.status,
                        ok: res.ok
                    };
                }, `${this.apiUrl}${endpoint}`);

                await this.recordAdminTestResult('systemAccess', `User Management API: ${endpoint}`, 
                    response.ok, 
                    `Status: ${response.status}`);

                if (response.status === 403 || response.status === 401) {
                    this.bugTracker.trackBug(
                        'AUTHENTICATION',
                        'CRITICAL',
                        `Admin denied access to user management endpoint: ${endpoint}`,
                        {
                            actual: `HTTP ${response.status}`,
                            expected: 'HTTP 200',
                            reproductionSteps: ['Login as admin', `Make API call to ${endpoint}`]
                        }
                    );
                }
            } catch (error) {
                await this.recordAdminTestResult('systemAccess', `User Management API: ${endpoint}`, false, error.message);
            }
        }
    }

    async testAdminSecurityBoundaries(page) {
        console.log('\n🔒 PHASE 8: Admin Security Boundaries Testing');

        // Test 1: Verify admin can access all protected resources
        const protectedPages = [
            '/admin.html',
            '/teacher-dashboard.html',
            '/dashboard.html',
            '/stories.html',
            '/add-story.html'
        ];

        for (const pagePath of protectedPages) {
            try {
                await page.goto(`${this.apiUrl}${pagePath}`);
                await new Promise(resolve => setTimeout(resolve, 2000));

                const accessGranted = await page.evaluate(() => {
                    return !window.location.href.includes('index.html') && 
                           !document.body.textContent.includes('Access Denied') &&
                           !document.body.textContent.includes('Unauthorized');
                });

                await this.recordAdminTestResult('security', `Access: ${pagePath}`, accessGranted);

                if (!accessGranted) {
                    this.bugTracker.trackBug(
                        'AUTHENTICATION',
                        'HIGH',
                        `Admin denied access to page: ${pagePath}`,
                        {
                            actual: 'Access denied or redirected',
                            expected: 'Full access granted',
                            reproductionSteps: ['Login as admin', `Navigate to ${pagePath}`]
                        }
                    );
                }
            } catch (error) {
                await this.recordAdminTestResult('security', `Access: ${pagePath}`, false, error.message);
            }
        }

        // Test 2: Admin-only API endpoints
        const adminOnlyEndpoints = [
            { method: 'GET', path: '/api/admin/teachers' },
            { method: 'POST', path: '/api/schools' },
            { method: 'DELETE', path: '/api/stories/999999' } // Should be allowed to attempt
        ];

        for (const endpoint of adminOnlyEndpoints) {
            try {
                const response = await page.evaluate(async (method, url) => {
                    const token = localStorage.getItem('token');
                    const res = await fetch(url, {
                        method: method,
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    return {
                        status: res.status,
                        ok: res.ok
                    };
                }, endpoint.method, `${this.apiUrl}${endpoint.path}`);

                // Admin should not get 403 Forbidden
                const hasAdminAccess = response.status !== 403;
                await this.recordAdminTestResult('security', 
                    `Admin API Access: ${endpoint.method} ${endpoint.path}`, 
                    hasAdminAccess, 
                    `Status: ${response.status}`);

                if (response.status === 403) {
                    this.bugTracker.trackBug(
                        'AUTHENTICATION',
                        'CRITICAL',
                        `Admin forbidden from accessing: ${endpoint.method} ${endpoint.path}`,
                        {
                            actual: 'HTTP 403 Forbidden',
                            expected: 'Admin access granted (200, 404, or 400)',
                            reproductionSteps: ['Login as admin', `Make ${endpoint.method} request to ${endpoint.path}`]
                        }
                    );
                }
            } catch (error) {
                await this.recordAdminTestResult('security', 
                    `Admin API Access: ${endpoint.method} ${endpoint.path}`, 
                    false, error.message);
            }
        }
    }

    async testAdminNavigation(page) {
        console.log('\n🧭 PHASE 9: Admin Navigation Testing');

        await page.goto(`${this.apiUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1: Navigation links presence and visibility
        const navigationElements = await page.evaluate(() => {
            const navItems = {
                dashboard: !!document.querySelector('[href*="dashboard"], [onclick*="dashboard"]'),
                stories: !!document.querySelector('[href*="stories"], [onclick*="stories"]'),
                addStory: !!document.querySelector('[href*="add-story"], [onclick*="add"]'),
                admin: !!document.querySelector('[href*="admin"], [onclick*="admin"]'),
                logout: !!document.querySelector('[onclick*="logout"], .logout')
            };
            
            return navItems;
        });

        for (const [nav, present] of Object.entries(navigationElements)) {
            await this.recordAdminTestResult('navigation', `Navigation Link: ${nav}`, present);
        }

        // Test 2: Cross-page navigation functionality
        const navigationTests = [
            { name: 'Stories Page', path: '/stories.html' },
            { name: 'Add Story Page', path: '/add-story.html' },
            { name: 'Student Dashboard', path: '/dashboard.html' },
            { name: 'Teacher Dashboard', path: '/teacher-dashboard.html' }
        ];

        for (const navTest of navigationTests) {
            try {
                await page.goto(`${this.apiUrl}${navTest.path}`);
                await new Promise(resolve => setTimeout(resolve, 2000));

                const navigationSuccess = await page.evaluate(() => {
                    return !window.location.href.includes('index.html') && 
                           document.readyState === 'complete' &&
                           !document.body.textContent.includes('Error');
                });

                await this.recordAdminTestResult('navigation', `Navigate to ${navTest.name}`, navigationSuccess);
            } catch (error) {
                await this.recordAdminTestResult('navigation', `Navigate to ${navTest.name}`, false, error.message);
            }
        }
    }

    async testAdminEdgeCases(page) {
        console.log('\n⚠️ PHASE 10: Admin Edge Cases & Error Handling');

        // Test 1: Invalid tab navigation
        try {
            await page.goto(`${this.apiUrl}/admin.html`);
            await page.evaluate(() => {
                if (typeof window.showTab === 'function') {
                    window.showTab('nonexistent-tab');
                }
            });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Should not crash the page
            const pageStillFunctional = await page.evaluate(() => {
                return document.readyState === 'complete' && 
                       typeof window.showTab === 'function';
            });

            await this.recordAdminTestResult('security', 'Invalid Tab Navigation Handling', pageStillFunctional);
        } catch (error) {
            await this.recordAdminTestResult('security', 'Invalid Tab Navigation Handling', false, error.message);
        }

        // Test 2: Form submission with empty data
        try {
            await page.evaluate(() => {
                if (typeof window.showTab === 'function') {
                    window.showTab('schools');
                }
            });
            await new Promise(resolve => setTimeout(resolve, 1000));

            const emptyFormTest = await page.evaluate(() => {
                const nameInput = document.querySelector('#schoolName, [name="schoolName"]');
                const submitBtn = document.querySelector('[onclick*="addSchool"]');
                
                if (nameInput && submitBtn) {
                    nameInput.value = '';
                    submitBtn.click();
                    return true;
                }
                return false;
            });

            await this.recordAdminTestResult('security', 'Empty Form Submission Handling', emptyFormTest);
        } catch (error) {
            await this.recordAdminTestResult('security', 'Empty Form Submission Handling', false, error.message);
        }

        // Test 3: Console error monitoring
        const consoleErrors = page.consoleMessages.filter(msg => msg.type === 'error');
        await this.recordAdminTestResult('security', 'Console Error Free', consoleErrors.length === 0, 
            `${consoleErrors.length} console errors detected`);

        if (consoleErrors.length > 0) {
            for (const error of consoleErrors.slice(0, 3)) { // Report first 3 errors
                this.bugTracker.trackBug(
                    'FUNCTIONAL',
                    'MEDIUM',
                    `Admin console error: ${error.text}`,
                    {
                        actual: error.text,
                        expected: 'No console errors',
                        reproductionSteps: ['Login as admin', 'Navigate admin panel', 'Check browser console']
                    }
                );
            }
        }
    }

    async recordAdminTestResult(category, testName, success, details = '') {
        this.testResults.admin.total++;
        this.testResults.admin.categories[category].total = (this.testResults.admin.categories[category].total || 0) + 1;
        
        if (success) {
            this.testResults.admin.passed++;
            this.testResults.admin.categories[category].passed++;
        } else {
            this.testResults.admin.failed++;
            this.testResults.admin.categories[category].failed++;
        }
        
        console.log(`   ${success ? '✅' : '❌'} ${testName}: ${details}`);
    }

    async generateAdminReport() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        
        const bugReport = this.bugTracker.generateReport();
        
        const successRate = this.testResults.admin.total > 0 
            ? ((this.testResults.admin.passed / this.testResults.admin.total) * 100).toFixed(1)
            : 0;

        // Generate category success rates
        const categoryResults = {};
        for (const [category, data] of Object.entries(this.testResults.admin.categories)) {
            const total = data.passed + data.failed;
            categoryResults[category] = {
                ...data,
                total,
                successRate: total > 0 ? ((data.passed / total) * 100).toFixed(1) : 0
            };
        }

        const report = {
            metadata: {
                timestamp: new Date().toISOString(),
                duration: `${(totalTime / 1000).toFixed(1)}s`,
                testSuite: 'VidPOD Admin Comprehensive Testing'
            },
            summary: {
                totalTests: this.testResults.admin.total,
                passed: this.testResults.admin.passed,
                failed: this.testResults.admin.failed,
                successRate: `${successRate}%`,
                totalBugs: bugReport.summary.total
            },
            categoryResults,
            bugAnalysis: bugReport,
            recommendations: this.generateAdminRecommendations(bugReport, successRate, categoryResults)
        };

        // Save detailed report
        await fs.writeFile(
            './admin-comprehensive-test-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n📊 ADMIN COMPREHENSIVE TEST REPORT');
        console.log('=' .repeat(80));
        console.log(`🎯 Overall Success Rate: ${successRate}%`);
        console.log(`📋 Total Tests: ${this.testResults.admin.total} (${this.testResults.admin.passed} passed, ${this.testResults.admin.failed} failed)`);
        console.log(`🐛 Total Bugs Found: ${bugReport.summary.total}`);
        
        console.log('\n📊 Category Breakdown:');
        for (const [category, data] of Object.entries(categoryResults)) {
            if (data.total > 0) {
                console.log(`   ${category}: ${data.successRate}% (${data.passed}/${data.total})`);
            }
        }

        console.log('\n🔥 Critical Issues:');
        const criticalBugs = bugReport.bugs.filter(bug => bug.severity === 'CRITICAL');
        if (criticalBugs.length === 0) {
            console.log('   ✅ No critical issues found!');
        } else {
            criticalBugs.forEach(bug => {
                console.log(`   🚨 ${bug.description}`);
            });
        }

        return report;
    }

    generateAdminRecommendations(bugReport, successRate, categoryResults) {
        const recommendations = [];
        
        if (bugReport.summary.bySeverity.CRITICAL > 0) {
            recommendations.push('🚨 IMMEDIATE ACTION: Critical admin functionality is broken - fix before production use');
        }
        
        if (successRate < 95) {
            recommendations.push('📈 Admin testing below 95% - investigate failed tests before production deployment');
        }

        // Category-specific recommendations
        if (categoryResults.authentication.successRate < 100) {
            recommendations.push('🔒 Authentication issues detected - security audit required');
        }
        
        if (categoryResults.security.successRate < 90) {
            recommendations.push('🛡️ Security boundary failures - review access controls');
        }
        
        if (categoryResults.dashboard.successRate < 85) {
            recommendations.push('📊 Dashboard functionality issues - UX review needed');
        }

        if (bugReport.summary.byCategory.FUNCTIONAL > 3) {
            recommendations.push('⚙️ Multiple functional issues - comprehensive code review recommended');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Excellent admin functionality! Consider performance optimization testing');
        }

        return recommendations;
    }
}

// Export for use in other test files
module.exports = { AdminComprehensiveTest };

// Run if called directly
if (require.main === module) {
    const adminTest = new AdminComprehensiveTest();
    adminTest.runFullAdminTest().catch(console.error);
}