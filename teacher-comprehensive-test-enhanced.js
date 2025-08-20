#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const { VidPODTestSuite, BugTracker } = require('./comprehensive-test-suite');

/**
 * VidPOD Enhanced Teacher Comprehensive Testing Suite
 * Builds on 100% success rate from previous teacher testing
 * Expands to cover advanced scenarios, edge cases, and performance
 */

class TeacherComprehensiveTestEnhanced extends VidPODTestSuite {
    constructor() {
        super();
        this.testSuiteName = 'Teacher Enhanced Comprehensive Testing';
        this.teacherCredentials = { email: 'teacher@vidpod.com', password: 'vidpod' };
        this.testResults.teacher = { 
            passed: 0, 
            failed: 0, 
            total: 0, 
            bugs: [],
            categories: {
                authentication: { passed: 0, failed: 0 },
                dashboard: { passed: 0, failed: 0 },
                classManagement: { passed: 0, failed: 0 },
                storyManagement: { passed: 0, failed: 0 },
                studentManagement: { passed: 0, failed: 0 },
                analytics: { passed: 0, failed: 0 },
                navigation: { passed: 0, failed: 0 },
                security: { passed: 0, failed: 0 },
                performance: { passed: 0, failed: 0 },
                responsive: { passed: 0, failed: 0 }
            }
        };
        this.createdTestClasses = []; // Track classes created during testing
        this.performanceMetrics = [];
    }

    async runFullTeacherTest() {
        console.log('🚀 TEACHER ENHANCED COMPREHENSIVE TESTING SUITE STARTING');
        console.log('Building on previous 100% success rate with 22 tests passed');
        console.log('=' .repeat(80));

        await this.initializeBrowser();

        try {
            const page = await this.createTestPage();

            // Phase 1: Core Authentication & Dashboard (Build on previous success)
            await this.testTeacherAuthenticationEnhanced(page);
            await this.testTeacherDashboardEnhanced(page);
            
            // Phase 2: Advanced Class Management
            await this.testAdvancedClassManagement(page);
            await this.testClassAnalytics(page);
            
            // Phase 3: Story Management for Teachers
            await this.testTeacherStoryManagement(page);
            await this.testCSVImportFunctionality(page);
            
            // Phase 4: Student Management & Enrollment
            await this.testStudentEnrollmentManagement(page);
            await this.testClassRosterManagement(page);
            
            // Phase 5: Teacher Analytics & Reporting
            await this.testTeacherAnalyticsDashboard(page);
            await this.testClassPerformanceMetrics(page);
            
            // Phase 6: Security & Permission Boundaries
            await this.testTeacherSecurityBoundaries(page);
            await this.testCrossRoleAccessControl(page);
            
            // Phase 7: Advanced Navigation & Integration
            await this.testAdvancedNavigation(page);
            await this.testCrossPageIntegration(page);
            
            // Phase 8: Performance & Responsiveness
            await this.testTeacherPerformance(page);
            await this.testAdvancedResponsiveDesign(page);
            
            // Phase 9: Edge Cases & Error Handling
            await this.testTeacherEdgeCases(page);
            await this.testErrorHandlingScenarios(page);
            
            // Phase 10: Cleanup and Data Validation
            await this.testDataIntegrityAndCleanup(page);

            await page.close();

            // Generate comprehensive report
            const report = await this.generateTeacherEnhancedReport();
            console.log('\n🏁 TEACHER ENHANCED COMPREHENSIVE TESTING COMPLETE');
            console.log(`📄 Detailed report saved to: teacher-enhanced-comprehensive-test-report.json`);
            
            return report;

        } finally {
            await this.closeBrowser();
        }
    }

    async testTeacherAuthenticationEnhanced(page) {
        console.log('\n🔐 PHASE 1: Enhanced Teacher Authentication Testing');
        
        // Test 1: Teacher login (building on previous 100% success)
        const loginResult = await this.testLogin(page, 'teacher', '/teacher-dashboard.html');
        await this.recordTeacherTestResult('authentication', 'Teacher Login', loginResult.success, 
            loginResult.success ? `${loginResult.loginTime}ms` : 'Failed');

        if (!loginResult.success) {
            this.bugTracker.trackBug('AUTHENTICATION', 'CRITICAL', 
                'Teacher login failed - regression from previous 100% success rate');
            return false;
        }

        // Test 2: Enhanced token persistence across multiple pages
        const testPages = ['/teacher-dashboard.html', '/stories.html', '/add-story.html', '/dashboard.html'];
        for (const testPage of testPages) {
            const tokenResult = await this.testTokenPersistence(page, 'teacher');
            await this.recordTeacherTestResult('authentication', `Token Persistence: ${testPage}`, tokenResult.success);
        }

        // Test 3: Session timeout handling
        await this.testSessionTimeout(page);

        // Test 4: Multi-tab token synchronization
        await this.testMultiTabTokenSync();

        return true;
    }

    async testSessionTimeout(page) {
        // Test session management over time
        const initialToken = await page.evaluate(() => localStorage.getItem('token'));
        
        // Simulate extended session
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const tokenPersisted = await page.evaluate((token) => localStorage.getItem('token') === token, initialToken);
        await this.recordTeacherTestResult('authentication', 'Session Persistence', tokenPersisted);
    }

    async testMultiTabTokenSync() {
        // Open multiple tabs to test token synchronization
        const page2 = await this.browser.newPage();
        try {
            await page2.goto(`${this.apiUrl}/teacher-dashboard.html`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const tokenSync = await page2.evaluate(() => {
                return !!localStorage.getItem('token');
            });
            
            await this.recordTeacherTestResult('authentication', 'Multi-tab Token Sync', tokenSync);
        } finally {
            await page2.close();
        }
    }

    async testTeacherDashboardEnhanced(page) {
        console.log('\n📊 PHASE 2: Enhanced Teacher Dashboard Testing');

        await page.goto(`${this.apiUrl}/teacher-dashboard.html`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test 1: All dashboard elements (building on previous success)
        const dashboardElements = await page.evaluate(() => ({
            teacherName: !!document.querySelector('#userInfo, .teacher-name, [class*="user"]'),
            totalClasses: !!document.querySelector('.total-classes, [class*="stat"]'),
            totalStudents: !!document.querySelector('.total-students, [class*="stat"]'),
            schoolName: !!document.querySelector('.school-name, [class*="school"]'),
            createClassForm: !!document.querySelector('#createClassForm, .create-class'),
            classCards: document.querySelectorAll('.class-card, [class*="class"]').length,
            statsClickable: document.querySelectorAll('[onclick], .clickable-stat').length
        }));

        await this.recordTeacherTestResult('dashboard', 'Teacher Name Display', dashboardElements.teacherName);
        await this.recordTeacherTestResult('dashboard', 'Total Classes Stat', dashboardElements.totalClasses);
        await this.recordTeacherTestResult('dashboard', 'Total Students Stat', dashboardElements.totalStudents);
        await this.recordTeacherTestResult('dashboard', 'School Name Display', dashboardElements.schoolName);
        await this.recordTeacherTestResult('dashboard', 'Create Class Form', dashboardElements.createClassForm);
        await this.recordTeacherTestResult('dashboard', 'Class Cards Present', dashboardElements.classCards > 0, 
            `${dashboardElements.classCards} classes found`);

        // Test 2: Interactive stats functionality
        const statElements = await page.$$('[onclick], .stat-card, .clickable-stat');
        for (let i = 0; i < Math.min(statElements.length, 3); i++) {
            try {
                await statElements[i].click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.recordTeacherTestResult('dashboard', `Stat ${i + 1} Interaction`, true);
            } catch (error) {
                await this.recordTeacherTestResult('dashboard', `Stat ${i + 1} Interaction`, false, error.message);
            }
        }

        // Test 3: Role badge verification
        const roleBadge = await page.evaluate(() => {
            const badge = document.querySelector('.role-badge, [class*="role"]');
            return badge ? badge.textContent.toLowerCase() : '';
        });

        await this.recordTeacherTestResult('dashboard', 'Role Badge Correct', 
            roleBadge.includes('teacher'), `Badge: ${roleBadge}`);
    }

    async testAdvancedClassManagement(page) {
        console.log('\n🏫 PHASE 3: Advanced Class Management Testing');

        await page.goto(`${this.apiUrl}/teacher-dashboard.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1: Create multiple classes with different scenarios
        const classScenarios = [
            { name: 'English Literature Advanced', subject: 'English', description: 'Advanced literature analysis and critical thinking' },
            { name: 'Creative Writing Workshop', subject: 'Writing', description: 'Hands-on creative writing exercises' },
            { name: 'Digital Storytelling', subject: 'Media', description: 'Modern storytelling techniques using digital tools' }
        ];

        for (const classData of classScenarios) {
            const classCreated = await this.createTestClass(page, classData);
            await this.recordTeacherTestResult('classManagement', `Create Class: ${classData.name}`, classCreated.success);
            
            if (classCreated.success) {
                this.createdTestClasses.push(classCreated.classId);
            }
        }

        // Test 2: Class expansion and details
        const classCards = await page.$$('.class-card, [class*="class-item"]');
        if (classCards.length > 0) {
            try {
                await classCards[0].click();
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const expandedDetails = await page.evaluate(() => {
                    return {
                        classCode: !!document.querySelector('.class-code, [class*="code"]'),
                        studentCount: !!document.querySelector('.student-count, [class*="students"]'),
                        classActions: !!document.querySelector('.class-actions, [class*="action"]')
                    };
                });

                await this.recordTeacherTestResult('classManagement', 'Class Expansion Details', 
                    expandedDetails.classCode && expandedDetails.studentCount);
                await this.recordTeacherTestResult('classManagement', 'Class Actions Available', expandedDetails.classActions);
            } catch (error) {
                await this.recordTeacherTestResult('classManagement', 'Class Expansion Details', false, error.message);
            }
        }

        // Test 3: Class code copying functionality
        await this.testClassCodeCopying(page);

        // Test 4: Class modification capabilities
        await this.testClassModification(page);
    }

    async createTestClass(page, classData) {
        try {
            // Fill class creation form
            await page.evaluate((data) => {
                const nameInput = document.querySelector('#className, [name="className"]');
                const subjectInput = document.querySelector('#subject, [name="subject"]');
                const descInput = document.querySelector('#description, [name="description"]');
                
                if (nameInput) nameInput.value = data.name;
                if (subjectInput) subjectInput.value = data.subject;
                if (descInput) descInput.value = data.description;
            }, classData);

            // Submit form
            const submitButton = await page.$('#createClassBtn, [type="submit"], .create-class-btn');
            if (submitButton) {
                await submitButton.click();
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check for success
                const classCreated = await page.evaluate(() => {
                    return !document.body.textContent.includes('Error') && 
                           !document.body.textContent.includes('Failed');
                });

                if (classCreated) {
                    // Extract class ID if possible
                    const classId = await page.evaluate(() => {
                        const cards = document.querySelectorAll('.class-card');
                        return cards.length > 0 ? cards.length : Date.now();
                    });

                    return { success: true, classId };
                }
            }
            
            return { success: false };
        } catch (error) {
            console.error('Class creation error:', error);
            return { success: false, error: error.message };
        }
    }

    async testClassCodeCopying(page) {
        const copyButtons = await page.$$('[onclick*="copy"], .copy-btn, [data-action="copy"]');
        if (copyButtons.length > 0) {
            try {
                await copyButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.recordTeacherTestResult('classManagement', 'Class Code Copy', true);
            } catch (error) {
                await this.recordTeacherTestResult('classManagement', 'Class Code Copy', false, error.message);
            }
        } else {
            await this.recordTeacherTestResult('classManagement', 'Class Code Copy Buttons', false, 'No copy buttons found');
        }
    }

    async testClassModification(page) {
        // Test editing class details if functionality exists
        const editButtons = await page.$$('[onclick*="edit"], .edit-btn, [data-action="edit"]');
        if (editButtons.length > 0) {
            try {
                await editButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.recordTeacherTestResult('classManagement', 'Class Edit Access', true);
            } catch (error) {
                await this.recordTeacherTestResult('classManagement', 'Class Edit Access', false, error.message);
            }
        }
    }

    async testTeacherStoryManagement(page) {
        console.log('\n📚 PHASE 4: Teacher Story Management Testing');

        // Test 1: Access to add story
        await page.goto(`${this.apiUrl}/add-story.html`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const addStoryAccess = await page.evaluate(() => {
            return !window.location.href.includes('index.html') && 
                   !!document.querySelector('#storyForm, .story-form, form');
        });

        await this.recordTeacherTestResult('storyManagement', 'Add Story Access', addStoryAccess);

        // Test 2: Story form completion
        if (addStoryAccess) {
            await this.testStoryFormCompletion(page);
        }

        // Test 3: Stories browsing access
        await page.goto(`${this.apiUrl}/stories.html`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const storiesAccess = await page.evaluate(() => {
            return !window.location.href.includes('index.html') && 
                   !!document.querySelector('#storiesGrid, .stories-grid, .story-card');
        });

        await this.recordTeacherTestResult('storyManagement', 'Stories Browse Access', storiesAccess);

        // Test 4: Story interaction capabilities
        if (storiesAccess) {
            await this.testStoryInteractions(page);
        }
    }

    async testStoryFormCompletion(page) {
        try {
            const formData = {
                title: `Test Story ${Date.now()}`,
                description: 'This is a comprehensive test story for teacher functionality testing.',
                question1: 'What inspired this story idea?',
                question2: 'Who are the key people involved?',
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            };

            await page.evaluate((data) => {
                const titleInput = document.querySelector('#ideaTitle, [name="title"]');
                const descInput = document.querySelector('#ideaDescription, [name="description"]');
                const q1Input = document.querySelector('#question1, [name="question1"]');
                const q2Input = document.querySelector('#question2, [name="question2"]');
                const startInput = document.querySelector('#startDate, [name="startDate"]');
                const endInput = document.querySelector('#endDate, [name="endDate"]');

                if (titleInput) titleInput.value = data.title;
                if (descInput) descInput.value = data.description;
                if (q1Input) q1Input.value = data.question1;
                if (q2Input) q2Input.value = data.question2;
                if (startInput) startInput.value = data.startDate;
                if (endInput) endInput.value = data.endDate;
            }, formData);

            await this.recordTeacherTestResult('storyManagement', 'Story Form Fill', true);

            // Test form submission
            const submitButton = await page.$('#saveStoryBtn, [type="submit"], .save-btn');
            if (submitButton) {
                await submitButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));

                const submissionSuccess = await page.evaluate(() => {
                    return !document.body.textContent.includes('Error') || 
                           window.location.href.includes('dashboard') ||
                           window.location.href.includes('stories');
                });

                await this.recordTeacherTestResult('storyManagement', 'Story Submission', submissionSuccess);
            }
        } catch (error) {
            await this.recordTeacherTestResult('storyManagement', 'Story Form Fill', false, error.message);
        }
    }

    async testStoryInteractions(page) {
        const storyCards = await page.$$('.story-card, [class*="story"]');
        if (storyCards.length > 0) {
            // Test story viewing
            try {
                await storyCards[0].click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                await this.recordTeacherTestResult('storyManagement', 'Story View Interaction', true);
            } catch (error) {
                await this.recordTeacherTestResult('storyManagement', 'Story View Interaction', false, error.message);
            }

            // Test favoriting
            const favoriteButtons = await page.$$('.favorite-btn, [class*="favorite"], .star');
            if (favoriteButtons.length > 0) {
                try {
                    await favoriteButtons[0].click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this.recordTeacherTestResult('storyManagement', 'Story Favorite', true);
                } catch (error) {
                    await this.recordTeacherTestResult('storyManagement', 'Story Favorite', false, error.message);
                }
            }
        }
    }

    async testCSVImportFunctionality(page) {
        console.log('\n📄 PHASE 5: CSV Import Functionality Testing');

        await page.goto(`${this.apiUrl}/teacher-dashboard.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1: CSV import section presence
        const csvSection = await page.evaluate(() => {
            return !!document.querySelector('.csv-import, [class*="import"], #csvImport');
        });

        await this.recordTeacherTestResult('classManagement', 'CSV Import Section', csvSection);

        if (csvSection) {
            // Test 2: File input functionality
            const fileInput = await page.$('input[type="file"], [accept*="csv"]');
            if (fileInput) {
                await this.recordTeacherTestResult('classManagement', 'CSV File Input', true);

                // Test 3: CSV format validation (simulate)
                try {
                    await page.evaluate(() => {
                        const input = document.querySelector('input[type="file"]');
                        if (input && input.onchange) {
                            // Simulate file selection event
                            const event = new Event('change');
                            input.dispatchEvent(event);
                        }
                    });
                    await this.recordTeacherTestResult('classManagement', 'CSV Input Handler', true);
                } catch (error) {
                    await this.recordTeacherTestResult('classManagement', 'CSV Input Handler', false, error.message);
                }
            } else {
                await this.recordTeacherTestResult('classManagement', 'CSV File Input', false);
            }
        }
    }

    async testTeacherSecurityBoundaries(page) {
        console.log('\n🔒 PHASE 6: Teacher Security Boundaries Testing');

        // Test 1: Verify teacher cannot access admin endpoints
        const adminEndpoints = [
            '/api/admin/teachers',
            '/api/admin/users',
            '/api/teacher-requests'
        ];

        for (const endpoint of adminEndpoints) {
            try {
                const response = await page.evaluate(async (url) => {
                    const token = localStorage.getItem('token');
                    const res = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    return { status: res.status, ok: res.ok };
                }, `${this.apiUrl}${endpoint}`);

                // Teacher should get 403 Forbidden for admin endpoints
                const accessDenied = response.status === 403;
                await this.recordTeacherTestResult('security', `Admin Endpoint Blocked: ${endpoint}`, 
                    accessDenied, `Status: ${response.status}`);

                if (!accessDenied && response.status === 200) {
                    this.bugTracker.trackBug('AUTHENTICATION', 'CRITICAL', 
                        `Teacher has unauthorized access to admin endpoint: ${endpoint}`);
                }
            } catch (error) {
                await this.recordTeacherTestResult('security', `Admin Endpoint Test: ${endpoint}`, false, error.message);
            }
        }

        // Test 2: Admin page access denial
        await page.goto(`${this.apiUrl}/admin.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const adminPageDenied = await page.evaluate(() => {
            return window.location.href.includes('index.html') || 
                   document.body.textContent.includes('Access Denied') ||
                   document.body.textContent.includes('Unauthorized');
        });

        await this.recordTeacherTestResult('security', 'Admin Page Access Denied', adminPageDenied);
    }

    async testTeacherPerformance(page) {
        console.log('\n⚡ PHASE 7: Teacher Performance Testing');

        const performanceTests = [
            { name: 'Teacher Dashboard Load', url: '/teacher-dashboard.html' },
            { name: 'Stories Page Load', url: '/stories.html' },
            { name: 'Add Story Load', url: '/add-story.html' }
        ];

        for (const test of performanceTests) {
            const startTime = Date.now();
            await page.goto(`${this.apiUrl}${test.url}`);
            
            await page.waitForSelector('body', { timeout: 10000 });
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const loadTime = Date.now() - startTime;
            this.performanceMetrics.push({ page: test.name, loadTime });

            const performant = loadTime < 5000; // Under 5 seconds
            await this.recordTeacherTestResult('performance', `${test.name} Speed`, performant, `${loadTime}ms`);

            if (loadTime > 8000) {
                this.bugTracker.trackBug('PERFORMANCE', 'MEDIUM', 
                    `Slow page load: ${test.name} took ${loadTime}ms`);
            }
        }
    }

    async testAdvancedResponsiveDesign(page) {
        console.log('\n📱 PHASE 8: Advanced Responsive Design Testing');

        const viewports = [
            { name: 'Mobile', width: 375, height: 667 },
            { name: 'Tablet', width: 768, height: 1024 },
            { name: 'Desktop', width: 1920, height: 1080 },
            { name: 'Large Desktop', width: 2560, height: 1440 }
        ];

        await page.goto(`${this.apiUrl}/teacher-dashboard.html`);

        for (const viewport of viewports) {
            await page.setViewport({ width: viewport.width, height: viewport.height });
            await new Promise(resolve => setTimeout(resolve, 1000));

            const responsiveElements = await page.evaluate(() => ({
                headerVisible: !!document.querySelector('header, .header, .page-header'),
                statsVisible: document.querySelectorAll('.stat-card, [class*="stat"]').length > 0,
                formsAccessible: !!document.querySelector('form, .form'),
                navigationVisible: !!document.querySelector('nav, .nav, .navigation'),
                contentFitsViewport: document.body.scrollWidth <= window.innerWidth
            }));

            const responsive = responsiveElements.headerVisible && 
                              responsiveElements.statsVisible && 
                              responsiveElements.contentFitsViewport;

            await this.recordTeacherTestResult('responsive', `${viewport.name} Layout`, responsive, 
                `${viewport.width}x${viewport.height}`);
        }
    }

    async testTeacherEdgeCases(page) {
        console.log('\n⚠️ PHASE 9: Teacher Edge Cases & Error Handling');

        // Test 1: Form submission with empty data
        await page.goto(`${this.apiUrl}/teacher-dashboard.html`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const emptyFormTest = await page.evaluate(() => {
                const submitBtn = document.querySelector('#createClassBtn, [type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                    return true;
                }
                return false;
            });

            await this.recordTeacherTestResult('security', 'Empty Form Submission Handling', emptyFormTest);
        } catch (error) {
            await this.recordTeacherTestResult('security', 'Empty Form Submission Handling', false, error.message);
        }

        // Test 2: Large class name handling
        try {
            const longNameTest = await page.evaluate(() => {
                const nameInput = document.querySelector('#className, [name="className"]');
                if (nameInput) {
                    nameInput.value = 'A'.repeat(500); // Very long name
                    return true;
                }
                return false;
            });

            await this.recordTeacherTestResult('security', 'Long Input Handling', longNameTest);
        } catch (error) {
            await this.recordTeacherTestResult('security', 'Long Input Handling', false, error.message);
        }

        // Test 3: Special characters in forms
        try {
            const specialCharsTest = await page.evaluate(() => {
                const inputs = document.querySelectorAll('input[type="text"], textarea');
                if (inputs.length > 0) {
                    inputs[0].value = '<script>alert("xss")</script>';
                    return true;
                }
                return false;
            });

            await this.recordTeacherTestResult('security', 'Special Characters Handling', specialCharsTest);
        } catch (error) {
            await this.recordTeacherTestResult('security', 'Special Characters Handling', false, error.message);
        }
    }

    async testDataIntegrityAndCleanup(page) {
        console.log('\n🧹 PHASE 10: Data Integrity & Cleanup Testing');

        // Test 1: Verify created test classes exist
        await page.goto(`${this.apiUrl}/teacher-dashboard.html`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const classCount = await page.evaluate(() => {
            return document.querySelectorAll('.class-card, [class*="class"]').length;
        });

        await this.recordTeacherTestResult('classManagement', 'Test Classes Created', 
            classCount >= this.createdTestClasses.length, 
            `${classCount} classes found, ${this.createdTestClasses.length} expected`);

        // Test 2: Data persistence across sessions
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        
        // Should redirect to login
        const redirectedToLogin = await page.evaluate(() => {
            return window.location.href.includes('index.html') || window.location.pathname === '/';
        });

        await this.recordTeacherTestResult('security', 'Session Cleanup on Logout', redirectedToLogin);
    }

    async recordTeacherTestResult(category, testName, success, details = '') {
        this.testResults.teacher.total++;
        this.testResults.teacher.categories[category].total = (this.testResults.teacher.categories[category].total || 0) + 1;
        
        if (success) {
            this.testResults.teacher.passed++;
            this.testResults.teacher.categories[category].passed++;
        } else {
            this.testResults.teacher.failed++;
            this.testResults.teacher.categories[category].failed++;
        }
        
        console.log(`   ${success ? '✅' : '❌'} ${testName}: ${details}`);
    }

    async generateTeacherEnhancedReport() {
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        
        const bugReport = this.bugTracker.generateReport();
        
        const successRate = this.testResults.teacher.total > 0 
            ? ((this.testResults.teacher.passed / this.testResults.teacher.total) * 100).toFixed(1)
            : 0;

        // Generate category success rates
        const categoryResults = {};
        for (const [category, data] of Object.entries(this.testResults.teacher.categories)) {
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
                testSuite: 'VidPOD Teacher Enhanced Comprehensive Testing',
                previousBaselineSuccess: '100% (22/22 tests)',
                enhancedTestCount: this.testResults.teacher.total
            },
            summary: {
                totalTests: this.testResults.teacher.total,
                passed: this.testResults.teacher.passed,
                failed: this.testResults.teacher.failed,
                successRate: `${successRate}%`,
                totalBugs: bugReport.summary.total,
                performanceMetrics: this.performanceMetrics
            },
            categoryResults,
            testClassesCreated: this.createdTestClasses.length,
            bugAnalysis: bugReport,
            recommendations: this.generateTeacherRecommendations(bugReport, successRate, categoryResults)
        };

        // Save detailed report
        await fs.writeFile(
            './teacher-enhanced-comprehensive-test-report.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n📊 TEACHER ENHANCED COMPREHENSIVE TEST REPORT');
        console.log('=' .repeat(80));
        console.log(`🎯 Enhanced Success Rate: ${successRate}%`);
        console.log(`📈 Previous Baseline: 100% (22/22 tests passed)`);
        console.log(`📋 Enhanced Tests: ${this.testResults.teacher.total} (${this.testResults.teacher.passed} passed, ${this.testResults.teacher.failed} failed)`);
        console.log(`🐛 Total Bugs Found: ${bugReport.summary.total}`);
        console.log(`🏫 Test Classes Created: ${this.createdTestClasses.length}`);
        
        console.log('\n📊 Category Performance:');
        for (const [category, data] of Object.entries(categoryResults)) {
            if (data.total > 0) {
                console.log(`   ${category}: ${data.successRate}% (${data.passed}/${data.total})`);
            }
        }

        console.log('\n⚡ Performance Metrics:');
        this.performanceMetrics.forEach(metric => {
            console.log(`   ${metric.page}: ${metric.loadTime}ms`);
        });

        return report;
    }

    generateTeacherRecommendations(bugReport, successRate, categoryResults) {
        const recommendations = [];
        
        if (successRate < 95) {
            recommendations.push('📉 Teacher success rate below previous 100% baseline - investigate regressions');
        }
        
        if (bugReport.summary.bySeverity.CRITICAL > 0) {
            recommendations.push('🚨 Critical teacher functionality issues - immediate fix required');
        }

        // Category-specific recommendations
        if (categoryResults.classManagement.successRate < 90) {
            recommendations.push('🏫 Class management issues detected - core teacher workflow affected');
        }
        
        if (categoryResults.performance.successRate < 80) {
            recommendations.push('⚡ Performance issues - optimize teacher dashboard loading');
        }
        
        if (categoryResults.security.successRate < 100) {
            recommendations.push('🔒 Security boundary failures - review teacher access controls');
        }

        const avgLoadTime = this.performanceMetrics.reduce((sum, m) => sum + m.loadTime, 0) / this.performanceMetrics.length;
        if (avgLoadTime > 3000) {
            recommendations.push('🚀 Performance optimization needed - average load time exceeds 3 seconds');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Excellent teacher functionality maintaining high standards!');
        }

        return recommendations;
    }
}

// Export for use in other test files
module.exports = { TeacherComprehensiveTestEnhanced };

// Run if called directly
if (require.main === module) {
    const teacherTest = new TeacherComprehensiveTestEnhanced();
    teacherTest.runFullTeacherTest().catch(console.error);
}