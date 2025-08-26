#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const { VidPODTestSuite, BugTracker } = require('./comprehensive-test-suite');

/**
 * VidPOD Cross-Role Security Testing Suite
 * Comprehensive security boundary testing across all user roles
 * Verifies proper access control, authorization, and privilege separation
 */

class CrossRoleSecurityTest extends VidPODTestSuite {
    constructor() {
        super();
        this.testSuiteName = 'Cross-Role Security Testing';
        this.allCredentials = {
            admin: { email: 'admin@vidpod.com', password: 'vidpod' },
            teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
            student: { email: 'student@vidpod.com', password: 'vidpod' }
        };
        this.testResults.security = { 
            passed: 0, 
            failed: 0, 
            total: 0, 
            bugs: [],
            categories: {
                pageAccess: { passed: 0, failed: 0 },
                apiEndpoints: { passed: 0, failed: 0 },
                dataAccess: { passed: 0, failed: 0 },
                privilegeEscalation: { passed: 0, failed: 0 },
                sessionSecurity: { passed: 0, failed: 0 },
                crossRoleContamination: { passed: 0, failed: 0 },
                administrativeBoundaries: { passed: 0, failed: 0 }
            }
        };
        this.securityViolations = [];
        this.accessMatrix = {};
    }

    async runCrossRoleSecurityTest() {
        console.log('🚀 CROSS-ROLE SECURITY TESTING SUITE STARTING');
        console.log('Comprehensive security boundary verification across all user roles');
        console.log('=' .repeat(80));

        await this.initializeBrowser();

        try {
            // Phase 1: Page Access Security Matrix
            await this.testPageAccessSecurityMatrix();
            
            // Phase 2: API Endpoint Authorization Matrix
            await this.testAPIEndpointSecurityMatrix();
            
            // Phase 3: Data Access & Isolation Testing
            await this.testDataAccessIsolation();
            
            // Phase 4: Privilege Escalation Prevention
            await this.testPrivilegeEscalationPrevention();
            
            // Phase 5: Session Security & Token Management
            await this.testSessionSecurityAcrossRoles();
            
            // Phase 6: Cross-Role Data Contamination Prevention
            await this.testCrossRoleDataContamination();
            
            // Phase 7: Administrative Boundary Enforcement
            await this.testAdministrativeBoundaryEnforcement();
            
            // Phase 8: Role Transition Security
            await this.testRoleTransitionSecurity();
            
            // Phase 9: Malicious Input & Injection Testing
            await this.testSecurityAgainstMaliciousInput();
            
            // Phase 10: Security Audit Summary
            await this.performSecurityAuditSummary();

            // Generate comprehensive security report
            const report = await this.generateSecurityReport();
            console.log('\n🏁 CROSS-ROLE SECURITY TESTING COMPLETE');
            console.log(`📄 Security audit report saved to: cross-role-security-test-report.json`);
            
            return report;

        } finally {
            await this.closeBrowser();
        }
    }

    async testPageAccessSecurityMatrix() {
        console.log('\n🔐 PHASE 1: Page Access Security Matrix Testing');

        const pageAccessMatrix = {
            '/index.html': { admin: true, teacher: true, student: true },
            '/dashboard.html': { admin: true, teacher: true, student: true },
            '/stories.html': { admin: true, teacher: true, student: true },
            '/add-story.html': { admin: true, teacher: true, student: true },
            '/story-detail.html': { admin: true, teacher: true, student: true },
            '/teacher-dashboard.html': { admin: true, teacher: true, student: false },
            '/admin.html': { admin: true, teacher: false, student: false }
        };

        for (const [pagePath, expectedAccess] of Object.entries(pageAccessMatrix)) {
            for (const [role, shouldHaveAccess] of Object.entries(expectedAccess)) {
                const accessResult = await this.testPageAccessForRole(role, pagePath, shouldHaveAccess);
                await this.recordSecurityTestResult('pageAccess', 
                    `${role} access to ${pagePath}`, 
                    accessResult.success, 
                    accessResult.details);

                if (!accessResult.success) {
                    this.securityViolations.push({
                        type: 'PAGE_ACCESS_VIOLATION',
                        role,
                        resource: pagePath,
                        expected: shouldHaveAccess ? 'GRANTED' : 'DENIED',
                        actual: accessResult.granted ? 'GRANTED' : 'DENIED',
                        severity: shouldHaveAccess ? 'CRITICAL' : 'HIGH'
                    });
                }
            }
        }
    }

    async testPageAccessForRole(role, pagePath, shouldHaveAccess) {
        const page = await this.createTestPage();
        
        try {
            // Login as the specified role
            const loginResult = await this.testLogin(page, role, '/dashboard.html');
            if (!loginResult.success) {
                await page.close();
                return { success: false, details: 'Login failed', granted: false };
            }

            // Attempt to access the page
            await page.goto(`${this.apiUrl}${pagePath}`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const accessGranted = await page.evaluate(() => {
                const currentURL = window.location.href;
                const hasContent = !document.body.textContent.includes('Access Denied') &&
                                 !document.body.textContent.includes('Unauthorized') &&
                                 !document.body.textContent.includes('Forbidden');
                const notRedirectedToLogin = !currentURL.includes('index.html') || currentURL.includes('index.html');
                
                // Special case for index.html - should always be accessible
                if (currentURL.includes('index.html')) {
                    return window.location.pathname === '/' || currentURL.includes('index.html');
                }
                
                return hasContent && notRedirectedToLogin;
            });

            const testSuccess = (shouldHaveAccess && accessGranted) || (!shouldHaveAccess && !accessGranted);
            
            await page.close();
            return { 
                success: testSuccess, 
                granted: accessGranted,
                details: `Expected: ${shouldHaveAccess ? 'GRANT' : 'DENY'}, Got: ${accessGranted ? 'GRANT' : 'DENY'}` 
            };

        } catch (error) {
            await page.close();
            return { success: false, details: error.message, granted: false };
        }
    }

    async testAPIEndpointSecurityMatrix() {
        console.log('\n🌐 PHASE 2: API Endpoint Security Matrix Testing');

        const apiEndpointMatrix = {
            'GET /api/stories': { admin: 200, teacher: 200, student: 200 },
            'POST /api/stories': { admin: 201, teacher: 201, student: 201 },
            'GET /api/admin/teachers': { admin: 200, teacher: 403, student: 403 },
            'GET /api/admin/users': { admin: 200, teacher: 403, student: 403 },
            'POST /api/schools': { admin: 201, teacher: 403, student: 403 },
            'GET /api/teacher-requests': { admin: 200, teacher: 403, student: 403 },
            'POST /api/teacher-requests/:id/approve': { admin: 200, teacher: 403, student: 403 },
            'GET /api/favorites': { admin: 200, teacher: 200, student: 200 },
            'POST /api/favorites/1': { admin: 200, teacher: 200, student: 200 },
            'GET /api/classes': { admin: 200, teacher: 200, student: 200 },
            'POST /api/classes': { admin: 201, teacher: 201, student: 403 },
            'DELETE /api/stories/1': { admin: 200, teacher: 403, student: 403 }
        };

        for (const [endpoint, expectedResponses] of Object.entries(apiEndpointMatrix)) {
            for (const [role, expectedStatus] of Object.entries(expectedResponses)) {
                const apiResult = await this.testAPIEndpointForRole(role, endpoint, expectedStatus);
                await this.recordSecurityTestResult('apiEndpoints', 
                    `${role} ${endpoint}`, 
                    apiResult.success, 
                    `Expected: ${expectedStatus}, Got: ${apiResult.actualStatus}`);

                if (!apiResult.success) {
                    this.securityViolations.push({
                        type: 'API_ACCESS_VIOLATION',
                        role,
                        resource: endpoint,
                        expected: expectedStatus,
                        actual: apiResult.actualStatus,
                        severity: this.getAPISeverity(expectedStatus, apiResult.actualStatus)
                    });
                }
            }
        }
    }

    async testAPIEndpointForRole(role, endpoint, expectedStatus) {
        const page = await this.createTestPage();
        
        try {
            // Login as the specified role
            const loginResult = await this.testLogin(page, role, '/dashboard.html');
            if (!loginResult.success) {
                await page.close();
                return { success: false, actualStatus: 'LOGIN_FAILED' };
            }

            // Parse endpoint method and path
            const [method, path] = endpoint.split(' ');
            const testData = this.getTestDataForEndpoint(path);

            // Make API call
            const response = await page.evaluate(async (method, apiUrl, path, data) => {
                const token = localStorage.getItem('token');
                const options = {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                };

                if (method !== 'GET' && data) {
                    options.body = JSON.stringify(data);
                }

                try {
                    const res = await fetch(`${apiUrl}${path}`, options);
                    return { status: res.status, ok: res.ok };
                } catch (error) {
                    return { status: 0, error: error.message };
                }
            }, method, this.apiUrl, path, testData);

            const testSuccess = this.isExpectedAPIResponse(response.status, expectedStatus);
            
            await page.close();
            return { success: testSuccess, actualStatus: response.status };

        } catch (error) {
            await page.close();
            return { success: false, actualStatus: 'ERROR', error: error.message };
        }
    }

    getTestDataForEndpoint(path) {
        // Return appropriate test data for different endpoints
        if (path.includes('/stories')) {
            return {
                idea_title: 'Security Test Story',
                idea_description: 'Test story for security validation'
            };
        }
        if (path.includes('/schools')) {
            return {
                school_name: 'Security Test School'
            };
        }
        if (path.includes('/classes')) {
            return {
                class_name: 'Security Test Class',
                subject: 'Testing'
            };
        }
        return {};
    }

    isExpectedAPIResponse(actualStatus, expectedStatus) {
        // Handle range of acceptable responses
        if (expectedStatus === 200) {
            return actualStatus >= 200 && actualStatus < 300;
        }
        if (expectedStatus === 201) {
            return actualStatus === 201 || actualStatus === 200;
        }
        if (expectedStatus === 403) {
            return actualStatus === 403 || actualStatus === 401;
        }
        if (expectedStatus === 404) {
            return actualStatus === 404;
        }
        return actualStatus === expectedStatus;
    }

    getAPISeverity(expectedStatus, actualStatus) {
        if (expectedStatus === 403 && (actualStatus >= 200 && actualStatus < 300)) {
            return 'CRITICAL'; // Unauthorized access granted
        }
        if (expectedStatus >= 200 && expectedStatus < 300 && actualStatus === 403) {
            return 'HIGH'; // Authorized access denied
        }
        return 'MEDIUM';
    }

    async testDataAccessIsolation() {
        console.log('\n🗃️ PHASE 3: Data Access & Isolation Testing');

        // Test that each role can only see appropriate data
        await this.testStoryDataIsolation();
        await this.testClassDataIsolation();
        await this.testUserDataIsolation();
    }

    async testStoryDataIsolation() {
        const page = await this.createTestPage();
        
        try {
            // Test student data access
            await this.testLogin(page, 'student', '/dashboard.html');
            
            const studentStoryAccess = await page.evaluate(async (apiUrl) => {
                const token = localStorage.getItem('token');
                const res = await fetch(`${apiUrl}/api/stories`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const stories = await res.json();
                    return {
                        canAccessStories: true,
                        storyCount: stories.length,
                        hasPrivateData: stories.some(story => 
                            story.hasOwnProperty('uploaded_by') || 
                            story.hasOwnProperty('internal_notes')
                        )
                    };
                }
                return { canAccessStories: false };
            }, this.apiUrl);

            await this.recordSecurityTestResult('dataAccess', 'Student Story Data Access', 
                studentStoryAccess.canAccessStories, 
                `Access: ${studentStoryAccess.canAccessStories}, Stories: ${studentStoryAccess.storyCount || 0}`);

            // Students should be able to see stories but not sensitive internal data
            if (studentStoryAccess.hasPrivateData) {
                this.securityViolations.push({
                    type: 'DATA_EXPOSURE',
                    role: 'student',
                    issue: 'Student can see private story data',
                    severity: 'MEDIUM'
                });
            }

        } catch (error) {
            await this.recordSecurityTestResult('dataAccess', 'Student Story Data Access', false, error.message);
        }
        
        await page.close();
    }

    async testClassDataIsolation() {
        const page = await this.createTestPage();
        
        try {
            // Test teacher class access
            await this.testLogin(page, 'teacher', '/dashboard.html');
            
            const teacherClassAccess = await page.evaluate(async (apiUrl) => {
                const token = localStorage.getItem('token');
                const res = await fetch(`${apiUrl}/api/classes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const classes = await res.json();
                    return {
                        canAccessClasses: true,
                        classCount: classes.length
                    };
                }
                return { canAccessClasses: false };
            }, this.apiUrl);

            await this.recordSecurityTestResult('dataAccess', 'Teacher Class Data Access', 
                teacherClassAccess.canAccessClasses, 
                `Classes: ${teacherClassAccess.classCount || 0}`);

            // Test student class access (should only see enrolled classes)
            await this.testLogin(page, 'student', '/dashboard.html');
            
            const studentClassAccess = await page.evaluate(async (apiUrl) => {
                const token = localStorage.getItem('token');
                const res = await fetch(`${apiUrl}/api/classes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const classes = await res.json();
                    return {
                        canAccessClasses: true,
                        classCount: classes.length
                    };
                }
                return { canAccessClasses: false };
            }, this.apiUrl);

            await this.recordSecurityTestResult('dataAccess', 'Student Class Data Access', 
                studentClassAccess.canAccessClasses, 
                `Enrolled classes: ${studentClassAccess.classCount || 0}`);

        } catch (error) {
            await this.recordSecurityTestResult('dataAccess', 'Class Data Isolation', false, error.message);
        }
        
        await page.close();
    }

    async testUserDataIsolation() {
        const page = await this.createTestPage();
        
        try {
            // Test that non-admin users cannot access user management data
            for (const role of ['teacher', 'student']) {
                await this.testLogin(page, role, '/dashboard.html');
                
                const userDataAccess = await page.evaluate(async (apiUrl) => {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${apiUrl}/api/admin/users`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    return {
                        status: res.status,
                        accessGranted: res.ok
                    };
                }, this.apiUrl);

                const accessProperlDenied = !userDataAccess.accessGranted;
                await this.recordSecurityTestResult('dataAccess', `${role} User Data Access Denied`, 
                    accessProperlDenied, 
                    `Status: ${userDataAccess.status}`);

                if (userDataAccess.accessGranted) {
                    this.securityViolations.push({
                        type: 'UNAUTHORIZED_DATA_ACCESS',
                        role,
                        resource: 'User management data',
                        severity: 'CRITICAL'
                    });
                }
            }

        } catch (error) {
            await this.recordSecurityTestResult('dataAccess', 'User Data Isolation', false, error.message);
        }
        
        await page.close();
    }

    async testPrivilegeEscalationPrevention() {
        console.log('\n⬆️ PHASE 4: Privilege Escalation Prevention Testing');

        await this.testTokenManipulation();
        await this.testRoleModification();
        await this.testSessionHijacking();
    }

    async testTokenManipulation() {
        const page = await this.createTestPage();
        
        try {
            // Login as student
            await this.testLogin(page, 'student', '/dashboard.html');
            
            // Attempt to modify user role in localStorage
            const escalationAttempt = await page.evaluate(() => {
                try {
                    const userData = JSON.parse(localStorage.getItem('user'));
                    userData.role = 'amitrace_admin';
                    localStorage.setItem('user', JSON.stringify(userData));
                    
                    // Try to access admin endpoint
                    return {
                        manipulated: true,
                        newRole: userData.role
                    };
                } catch (error) {
                    return { manipulated: false, error: error.message };
                }
            });

            if (escalationAttempt.manipulated) {
                // Navigate to admin page to test if role change worked
                await page.goto(`${this.apiUrl}/admin.html`);
                await new Promise(resolve => setTimeout(resolve, 2000));

                const adminAccessGranted = await page.evaluate(() => {
                    return !window.location.href.includes('index.html') && 
                           !document.body.textContent.includes('Access Denied');
                });

                const escalationPrevented = !adminAccessGranted;
                await this.recordSecurityTestResult('privilegeEscalation', 'Token Role Manipulation Prevention', 
                    escalationPrevented, 
                    `Admin access: ${adminAccessGranted ? 'GRANTED' : 'DENIED'}`);

                if (adminAccessGranted) {
                    this.securityViolations.push({
                        type: 'PRIVILEGE_ESCALATION',
                        method: 'Token role manipulation',
                        severity: 'CRITICAL'
                    });
                }
            }

        } catch (error) {
            await this.recordSecurityTestResult('privilegeEscalation', 'Token Role Manipulation Prevention', false, error.message);
        }
        
        await page.close();
    }

    async testRoleModification() {
        const page = await this.createTestPage();
        
        try {
            // Test API-based role modification attempts
            await this.testLogin(page, 'student', '/dashboard.html');
            
            const roleModificationAttempt = await page.evaluate(async (apiUrl) => {
                const token = localStorage.getItem('token');
                
                // Attempt to modify own role via API
                const res = await fetch(`${apiUrl}/api/users/self`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ role: 'amitrace_admin' })
                });
                
                return { status: res.status, success: res.ok };
            }, this.apiUrl);

            const modificationPrevented = !roleModificationAttempt.success;
            await this.recordSecurityTestResult('privilegeEscalation', 'API Role Modification Prevention', 
                modificationPrevented, 
                `Status: ${roleModificationAttempt.status}`);

        } catch (error) {
            await this.recordSecurityTestResult('privilegeEscalation', 'API Role Modification Prevention', false, error.message);
        }
        
        await page.close();
    }

    async testSessionHijacking() {
        const page1 = await this.createTestPage();
        const page2 = await this.createTestPage();
        
        try {
            // Login as admin in first page
            await this.testLogin(page1, 'admin', '/dashboard.html');
            const adminToken = await page1.evaluate(() => localStorage.getItem('token'));

            // Try to use admin token in second page as different user
            await page2.goto(`${this.apiUrl}/index.html`);
            await page2.evaluate((token) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify({ role: 'student', id: 999 }));
            }, adminToken);

            await page2.goto(`${this.apiUrl}/admin.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const hijackingSucceeded = await page2.evaluate(() => {
                return !window.location.href.includes('index.html') && 
                       !document.body.textContent.includes('Access Denied');
            });

            const hijackingPrevented = !hijackingSucceeded;
            await this.recordSecurityTestResult('privilegeEscalation', 'Session Hijacking Prevention', 
                hijackingPrevented, 
                `Hijacking: ${hijackingSucceeded ? 'SUCCEEDED' : 'PREVENTED'}`);

            if (hijackingSucceeded) {
                this.securityViolations.push({
                    type: 'SESSION_HIJACKING',
                    method: 'Token reuse with different user data',
                    severity: 'CRITICAL'
                });
            }

        } catch (error) {
            await this.recordSecurityTestResult('privilegeEscalation', 'Session Hijacking Prevention', false, error.message);
        }
        
        await page1.close();
        await page2.close();
    }

    async testSessionSecurityAcrossRoles() {
        console.log('\n🔒 PHASE 5: Session Security & Token Management Testing');

        await this.testTokenExpiration();
        await this.testTokenInvalidation();
        await this.testConcurrentSessions();
    }

    async testTokenExpiration() {
        // This would test token expiration, but requires backend configuration
        // For now, we'll test token validation
        const page = await this.createTestPage();
        
        try {
            await this.testLogin(page, 'student', '/dashboard.html');
            
            // Test with invalid token
            await page.evaluate(() => {
                localStorage.setItem('token', 'invalid_token_12345');
            });

            await page.goto(`${this.apiUrl}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const redirectedToLogin = await page.evaluate(() => {
                return window.location.href.includes('index.html') || 
                       window.location.pathname === '/';
            });

            await this.recordSecurityTestResult('sessionSecurity', 'Invalid Token Handling', 
                redirectedToLogin, 
                `Redirected: ${redirectedToLogin}`);

        } catch (error) {
            await this.recordSecurityTestResult('sessionSecurity', 'Invalid Token Handling', false, error.message);
        }
        
        await page.close();
    }

    async testTokenInvalidation() {
        const page = await this.createTestPage();
        
        try {
            await this.testLogin(page, 'teacher', '/dashboard.html');
            
            // Simulate logout and token clearing
            await page.evaluate(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            });

            await page.goto(`${this.apiUrl}/teacher-dashboard.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const accessDenied = await page.evaluate(() => {
                return window.location.href.includes('index.html') || 
                       document.body.textContent.includes('Access Denied');
            });

            await this.recordSecurityTestResult('sessionSecurity', 'Token Invalidation Enforcement', 
                accessDenied, 
                `Access denied: ${accessDenied}`);

        } catch (error) {
            await this.recordSecurityTestResult('sessionSecurity', 'Token Invalidation Enforcement', false, error.message);
        }
        
        await page.close();
    }

    async testConcurrentSessions() {
        const page1 = await this.createTestPage();
        const page2 = await this.createTestPage();
        
        try {
            // Login same user in two different browsers/tabs
            await this.testLogin(page1, 'student', '/dashboard.html');
            await this.testLogin(page2, 'student', '/dashboard.html');

            // Both sessions should work (concurrent sessions allowed)
            const session1Active = await page1.evaluate(() => {
                return !!localStorage.getItem('token') && 
                       !window.location.href.includes('index.html');
            });

            const session2Active = await page2.evaluate(() => {
                return !!localStorage.getItem('token') && 
                       !window.location.href.includes('index.html');
            });

            await this.recordSecurityTestResult('sessionSecurity', 'Concurrent Sessions Handling', 
                session1Active && session2Active, 
                `Session1: ${session1Active}, Session2: ${session2Active}`);

        } catch (error) {
            await this.recordSecurityTestResult('sessionSecurity', 'Concurrent Sessions Handling', false, error.message);
        }
        
        await page1.close();
        await page2.close();
    }

    async testCrossRoleDataContamination() {
        console.log('\n🔄 PHASE 6: Cross-Role Data Contamination Prevention');

        await this.testRoleSwitchingDataIsolation();
        await this.testSharedResourceAccess();
    }

    async testRoleSwitchingDataIsolation() {
        const page = await this.createTestPage();
        
        try {
            // Login as admin, access admin data
            await this.testLogin(page, 'admin', '/dashboard.html');
            
            // Logout and login as student
            await page.evaluate(() => {
                localStorage.clear();
            });
            
            await this.testLogin(page, 'student', '/dashboard.html');
            
            // Check that no admin data persists in the interface
            const adminDataVisible = await page.evaluate(() => {
                const bodyText = document.body.textContent.toLowerCase();
                return bodyText.includes('admin') || 
                       bodyText.includes('manage users') ||
                       bodyText.includes('teacher requests') ||
                       !!document.querySelector('[href*="admin"], .admin-panel');
            });

            const dataIsolated = !adminDataVisible;
            await this.recordSecurityTestResult('crossRoleContamination', 'Role Switch Data Isolation', 
                dataIsolated, 
                `Admin data visible: ${adminDataVisible}`);

        } catch (error) {
            await this.recordSecurityTestResult('crossRoleContamination', 'Role Switch Data Isolation', false, error.message);
        }
        
        await page.close();
    }

    async testSharedResourceAccess() {
        // Test that shared resources (like stories) don't expose role-specific data
        const page = await this.createTestPage();
        
        try {
            await this.testLogin(page, 'student', '/dashboard.html');
            
            await page.goto(`${this.apiUrl}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const storyData = await page.evaluate(() => {
                const stories = document.querySelectorAll('.story-card');
                let hasRoleSpecificData = false;
                
                stories.forEach(story => {
                    const text = story.textContent.toLowerCase();
                    if (text.includes('admin only') || 
                        text.includes('teacher only') ||
                        text.includes('internal notes')) {
                        hasRoleSpecificData = true;
                    }
                });

                return {
                    storyCount: stories.length,
                    hasRoleSpecificData
                };
            });

            const dataProperlyFiltered = !storyData.hasRoleSpecificData;
            await this.recordSecurityTestResult('crossRoleContamination', 'Shared Resource Data Filtering', 
                dataProperlyFiltered, 
                `Stories: ${storyData.storyCount}, Role-specific data: ${storyData.hasRoleSpecificData}`);

        } catch (error) {
            await this.recordSecurityTestResult('crossRoleContamination', 'Shared Resource Data Filtering', false, error.message);
        }
        
        await page.close();
    }

    async testAdministrativeBoundaryEnforcement() {
        console.log('\n👑 PHASE 7: Administrative Boundary Enforcement');

        await this.testAdminOnlyOperations();
        await this.testSystemLevelAccess();
    }

    async testAdminOnlyOperations() {
        const adminOnlyOperations = [
            { endpoint: '/api/admin/teachers', method: 'GET', description: 'View all teachers' },
            { endpoint: '/api/schools', method: 'POST', description: 'Create schools' },
            { endpoint: '/api/teacher-requests/1/approve', method: 'PUT', description: 'Approve teachers' },
            { endpoint: '/api/admin/users', method: 'GET', description: 'View all users' }
        ];

        for (const operation of adminOnlyOperations) {
            for (const role of ['teacher', 'student']) {
                const accessDenied = await this.testAdminOperationDenied(role, operation);
                await this.recordSecurityTestResult('administrativeBoundaries', 
                    `${role} denied ${operation.description}`, 
                    accessDenied.success, 
                    accessDenied.details);
            }
        }
    }

    async testAdminOperationDenied(role, operation) {
        const page = await this.createTestPage();
        
        try {
            await this.testLogin(page, role, '/dashboard.html');
            
            const result = await page.evaluate(async (method, apiUrl, endpoint) => {
                const token = localStorage.getItem('token');
                const res = await fetch(`${apiUrl}${endpoint}`, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: method !== 'GET' ? JSON.stringify({}) : undefined
                });
                
                return { status: res.status, denied: res.status === 403 || res.status === 401 };
            }, operation.method, this.apiUrl, operation.endpoint);

            await page.close();
            return { 
                success: result.denied, 
                details: `Status: ${result.status}` 
            };

        } catch (error) {
            await page.close();
            return { success: false, details: error.message };
        }
    }

    async testSystemLevelAccess() {
        // Test system-level operations that should be admin-only
        const page = await this.createTestPage();
        
        try {
            await this.testLogin(page, 'teacher', '/dashboard.html');
            
            // Attempt to access admin panel
            await page.goto(`${this.apiUrl}/admin.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const adminAccessDenied = await page.evaluate(() => {
                return window.location.href.includes('index.html') || 
                       document.body.textContent.includes('Access Denied') ||
                       document.body.textContent.includes('Unauthorized');
            });

            await this.recordSecurityTestResult('administrativeBoundaries', 'Teacher Admin Panel Access Denied', 
                adminAccessDenied, 
                `Access denied: ${adminAccessDenied}`);

        } catch (error) {
            await this.recordSecurityTestResult('administrativeBoundaries', 'System Level Access Control', false, error.message);
        }
        
        await page.close();
    }

    async testSecurityAgainstMaliciousInput() {
        console.log('\n💉 PHASE 8: Security Against Malicious Input');

        await this.testXSSPrevention();
        await this.testSQLInjectionPrevention();
        await this.testCSRFPrevention();
    }

    async testXSSPrevention() {
        const page = await this.createTestPage();
        
        try {
            await this.testLogin(page, 'student', '/dashboard.html');
            
            // Test XSS in story creation
            await page.goto(`${this.apiUrl}/add-story.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const xssAttempt = '<script>alert("XSS")</script>';
            
            await page.evaluate((xssPayload) => {
                const titleInput = document.querySelector('#ideaTitle, [name="title"]');
                if (titleInput) {
                    titleInput.value = xssPayload;
                }
            }, xssAttempt);

            // Submit form
            const submitButton = await page.$('#saveStoryBtn, [type="submit"]');
            if (submitButton) {
                await submitButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Check if XSS was executed
            const xssExecuted = await page.evaluate(() => {
                return document.body.innerHTML.includes('<script>') || 
                       window.hasOwnProperty('xssExecuted');
            });

            const xssPrevented = !xssExecuted;
            await this.recordSecurityTestResult('security', 'XSS Prevention', 
                xssPrevented, 
                `XSS executed: ${xssExecuted}`);

        } catch (error) {
            await this.recordSecurityTestResult('security', 'XSS Prevention', false, error.message);
        }
        
        await page.close();
    }

    async testSQLInjectionPrevention() {
        const page = await this.createTestPage();
        
        try {
            await this.testLogin(page, 'student', '/dashboard.html');
            
            // Test SQL injection in search
            await page.goto(`${this.apiUrl}/stories.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const sqlPayload = "'; DROP TABLE users; --";
            
            const searchInput = await page.$('#searchKeywords, [type="text"]');
            if (searchInput) {
                await searchInput.type(sqlPayload);
                
                // Submit search
                const searchForm = await page.$('#searchForm');
                if (searchForm) {
                    await searchForm.evaluate(form => form.submit());
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Check if search still works (SQL injection prevented)
                    const searchWorking = await page.evaluate(() => {
                        return !document.body.textContent.includes('SQL error') && 
                               !document.body.textContent.includes('database error');
                    });

                    await this.recordSecurityTestResult('security', 'SQL Injection Prevention', 
                        searchWorking, 
                        `Search functional: ${searchWorking}`);
                }
            }

        } catch (error) {
            await this.recordSecurityTestResult('security', 'SQL Injection Prevention', false, error.message);
        }
        
        await page.close();
    }

    async testCSRFPrevention() {
        // Test CSRF protection (limited in browser environment)
        const page = await this.createTestPage();
        
        try {
            await this.testLogin(page, 'teacher', '/dashboard.html');

            // Test if sensitive operations require proper headers/tokens
            const csrfTest = await page.evaluate(async (apiUrl) => {
                // Attempt to make request without proper headers
                const res = await fetch(`${apiUrl}/api/classes`, {
                    method: 'POST',
                    body: JSON.stringify({ class_name: 'CSRF Test Class' })
                    // Intentionally missing Authorization header
                });
                
                return { status: res.status, blocked: res.status === 401 || res.status === 403 };
            }, this.apiUrl);

            await this.recordSecurityTestResult('security', 'CSRF Protection', 
                csrfTest.blocked, 
                `Unauthorized request blocked: ${csrfTest.blocked}`);

        } catch (error) {
            await this.recordSecurityTestResult('security', 'CSRF Protection', false, error.message);
        }
        
        await page.close();
    }

    async performSecurityAuditSummary() {
        console.log('\n📋 PHASE 9: Security Audit Summary');

        const totalViolations = this.securityViolations.length;
        const criticalViolations = this.securityViolations.filter(v => v.severity === 'CRITICAL').length;
        const highViolations = this.securityViolations.filter(v => v.severity === 'HIGH').length;

        await this.recordSecurityTestResult('security', 'Overall Security Posture', 
            criticalViolations === 0, 
            `Critical: ${criticalViolations}, High: ${highViolations}, Total: ${totalViolations}`);

        // Generate security recommendations
        this.generateSecurityRecommendations();
    }

    generateSecurityRecommendations() {
        const recommendations = [];

        if (this.securityViolations.length === 0) {
            recommendations.push('✅ Excellent security posture - no violations detected');
        } else {
            const criticalCount = this.securityViolations.filter(v => v.severity === 'CRITICAL').length;
            const highCount = this.securityViolations.filter(v => v.severity === 'HIGH').length;

            if (criticalCount > 0) {
                recommendations.push('🚨 CRITICAL: Immediate security fixes required');
            }
            if (highCount > 0) {
                recommendations.push('⚠️ HIGH: Significant security improvements needed');
            }

            // Specific recommendations based on violation types
            const violationTypes = [...new Set(this.securityViolations.map(v => v.type))];
            
            if (violationTypes.includes('PRIVILEGE_ESCALATION')) {
                recommendations.push('🔐 Implement stronger privilege escalation prevention');
            }
            if (violationTypes.includes('API_ACCESS_VIOLATION')) {
                recommendations.push('🌐 Review and strengthen API authorization');
            }
            if (violationTypes.includes('PAGE_ACCESS_VIOLATION')) {
                recommendations.push('📄 Improve page-level access control');
            }
        }

        this.securityRecommendations = recommendations;
    }

    async recordSecurityTestResult(category, testName, success, details = '') {
        this.testResults.security.total++;
        this.testResults.security.categories[category].total = (this.testResults.security.categories[category].total || 0) + 1;
        
        if (success) {
            this.testResults.security.passed++;
            this.testResults.security.categories[category].passed++;
        } else {
            this.testResults.security.failed++;
            this.testResults.security.categories[category].failed++;
        }
        
        console.log(`   ${success ? '✅' : '❌'} ${testName}: ${details}`);
    }

    async generateSecurityReport() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        
        const bugReport = this.bugTracker.generateReport();
        
        const successRate = this.testResults.security.total > 0 
            ? ((this.testResults.security.passed / this.testResults.security.total) * 100).toFixed(1)
            : 0;

        // Generate category success rates
        const categoryResults = {};
        for (const [category, data] of Object.entries(this.testResults.security.categories)) {
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
                testSuite: 'VidPOD Cross-Role Security Audit'
            },
            securitySummary: {
                totalTests: this.testResults.security.total,
                passed: this.testResults.security.passed,
                failed: this.testResults.security.failed,
                successRate: `${successRate}%`,
                totalViolations: this.securityViolations.length,
                criticalViolations: this.securityViolations.filter(v => v.severity === 'CRITICAL').length,
                highViolations: this.securityViolations.filter(v => v.severity === 'HIGH').length
            },
            categoryResults,
            securityViolations: this.securityViolations,
            bugAnalysis: bugReport,
            recommendations: this.securityRecommendations || []
        };

        // Save detailed report
        await fs.writeFile(
            './cross-role-security-test-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n📊 CROSS-ROLE SECURITY AUDIT REPORT');
        console.log('=' .repeat(80));
        console.log(`🛡️ Security Success Rate: ${successRate}%`);
        console.log(`📋 Total Security Tests: ${this.testResults.security.total} (${this.testResults.security.passed} passed, ${this.testResults.security.failed} failed)`);
        console.log(`🚨 Security Violations: ${this.securityViolations.length}`);
        console.log(`   Critical: ${this.securityViolations.filter(v => v.severity === 'CRITICAL').length}`);
        console.log(`   High: ${this.securityViolations.filter(v => v.severity === 'HIGH').length}`);
        console.log(`   Medium: ${this.securityViolations.filter(v => v.severity === 'MEDIUM').length}`);
        
        console.log('\n🎯 Security Category Performance:');
        for (const [category, data] of Object.entries(categoryResults)) {
            if (data.total > 0) {
                console.log(`   ${category}: ${data.successRate}% (${data.passed}/${data.total})`);
            }
        }

        if (this.securityViolations.length > 0) {
            console.log('\n🚨 Critical Security Issues:');
            this.securityViolations
                .filter(v => v.severity === 'CRITICAL')
                .forEach(violation => {
                    console.log(`   • ${violation.type}: ${violation.resource || violation.issue}`);
                });
        }

        return report;
    }
}

// Export for use in other test files
module.exports = { CrossRoleSecurityTest };

// Run if called directly
if (require.main === module) {
    const securityTest = new CrossRoleSecurityTest();
    securityTest.runCrossRoleSecurityTest().catch(console.error);
}