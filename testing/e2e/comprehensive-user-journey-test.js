#!/usr/bin/env node

/**
 * COMPREHENSIVE USER JOURNEY TESTING
 * 
 * This script thoroughly tests all user workflows to identify:
 * - Non-functional buttons
 * - UI inconsistencies  
 * - Navigation issues
 * - Form validation problems
 * - Error handling gaps
 */

const puppeteer = require('puppeteer');

class BugTracker {
    constructor() {
        this.bugs = [];
        this.warnings = [];
        this.successes = [];
    }

    addBug(category, description, severity = 'medium', page = '') {
        this.bugs.push({
            category,
            description,
            severity,
            page,
            timestamp: new Date().toISOString()
        });
        console.log(`🐛 BUG [${severity.toUpperCase()}]: ${description} (${page})`);
    }

    addWarning(category, description, page = '') {
        this.warnings.push({
            category,
            description,
            page,
            timestamp: new Date().toISOString()
        });
        console.log(`⚠️  WARNING: ${description} (${page})`);
    }

    addSuccess(description, page = '') {
        this.successes.push({
            description,
            page,
            timestamp: new Date().toISOString()
        });
        console.log(`✅ SUCCESS: ${description} (${page})`);
    }

    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('🐛 COMPREHENSIVE BUG REPORT');
        console.log('='.repeat(80));
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`🐛 Critical Bugs: ${this.bugs.filter(b => b.severity === 'critical').length}`);
        console.log(`🐛 High Priority Bugs: ${this.bugs.filter(b => b.severity === 'high').length}`);
        console.log(`🐛 Medium Priority Bugs: ${this.bugs.filter(b => b.severity === 'medium').length}`);
        console.log(`🐛 Low Priority Bugs: ${this.bugs.filter(b => b.severity === 'low').length}`);
        console.log(`⚠️  Warnings: ${this.warnings.length}`);
        console.log(`✅ Successful Tests: ${this.successes.length}`);

        if (this.bugs.length > 0) {
            console.log('\n🔍 DETAILED BUG LIST:');
            console.log('-'.repeat(50));
            
            // Group bugs by category
            const bugsByCategory = {};
            this.bugs.forEach(bug => {
                if (!bugsByCategory[bug.category]) {
                    bugsByCategory[bug.category] = [];
                }
                bugsByCategory[bug.category].push(bug);
            });

            Object.keys(bugsByCategory).forEach(category => {
                console.log(`\n📂 ${category.toUpperCase()}:`);
                bugsByCategory[category].forEach((bug, index) => {
                    const severityIcon = {
                        'critical': '🚨',
                        'high': '🔴',
                        'medium': '🟠',
                        'low': '🟡'
                    }[bug.severity];
                    console.log(`   ${severityIcon} ${bug.description}`);
                    console.log(`      └─ Page: ${bug.page || 'Unknown'}`);
                });
            });
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            console.log('-'.repeat(30));
            this.warnings.forEach(warning => {
                console.log(`   • ${warning.description} (${warning.page})`);
            });
        }

        return {
            totalBugs: this.bugs.length,
            criticalBugs: this.bugs.filter(b => b.severity === 'critical').length,
            highBugs: this.bugs.filter(b => b.severity === 'high').length,
            bugs: this.bugs,
            warnings: this.warnings
        };
    }
}

async function comprehensiveUserJourneyTest() {
    console.log('🚀 Starting Comprehensive User Journey Testing...\n');
    
    const bugTracker = new BugTracker();
    let browser;
    let page;
    
    try {
        browser = await puppeteer.launch({ 
            headless: false, 
            slowMo: 100,
            defaultViewport: { width: 1280, height: 800 }
        });
        
        page = await browser.newPage();
        
        // Enable error tracking
        page.on('console', msg => {
            if (msg.type() === 'error') {
                bugTracker.addBug('javascript', `Console Error: ${msg.text()}`, 'medium', page.url());
            }
        });
        
        page.on('pageerror', error => {
            bugTracker.addBug('javascript', `Page Error: ${error.message}`, 'high', page.url());
        });
        
        page.on('requestfailed', request => {
            bugTracker.addBug('network', `Failed Request: ${request.url()} - ${request.failure().errorText}`, 'medium', page.url());
        });

        // ======================
        // TEST 1: ADMIN WORKFLOWS
        // ======================
        console.log('\n' + '='.repeat(50));
        console.log('🔐 TESTING ADMIN WORKFLOWS');
        console.log('='.repeat(50));
        
        await testAdminWorkflows(page, bugTracker);
        
        // ======================
        // TEST 2: TEACHER WORKFLOWS  
        // ======================
        console.log('\n' + '='.repeat(50));
        console.log('👩‍🏫 TESTING TEACHER WORKFLOWS');
        console.log('='.repeat(50));
        
        await testTeacherWorkflows(page, bugTracker);
        
        // ======================
        // TEST 3: STUDENT WORKFLOWS
        // ======================
        console.log('\n' + '='.repeat(50));
        console.log('👨‍🎓 TESTING STUDENT WORKFLOWS');
        console.log('='.repeat(50));
        
        await testStudentWorkflows(page, bugTracker);
        
        // ======================
        // TEST 4: GENERAL UI/UX
        // ======================
        console.log('\n' + '='.repeat(50));
        console.log('🎨 TESTING GENERAL UI/UX');
        console.log('='.repeat(50));
        
        await testGeneralUIUX(page, bugTracker);
        
    } catch (error) {
        bugTracker.addBug('critical', `Test suite crashed: ${error.message}`, 'critical');
    } finally {
        if (browser) {
            await browser.close();
        }
        
        const report = bugTracker.generateReport();
        return report;
    }
}

async function testAdminWorkflows(page, bugTracker) {
    try {
        // Login as admin
        console.log('🔐 Testing admin login...');
        await page.goto('https://podcast-stories-production.up.railway.app/', { waitUntil: 'networkidle0' });
        
        // Check if email field exists (Phase 1 login)
        const emailField = await page.$('input[type="email"]');
        const usernameField = await page.$('input[type="text"]');
        
        if (emailField) {
            await page.type('input[type="email"]', 'admin@vidpod.com');
            bugTracker.addSuccess('Email-based login field found', 'login');
        } else if (usernameField) {
            await page.type('input[type="text"]', 'admin');
            bugTracker.addWarning('login', 'Still using username login instead of email', 'login');
        } else {
            bugTracker.addBug('login', 'No login input field found', 'critical', 'login');
            return;
        }
        
        await page.type('input[type="password"]', 'vidpod');
        await page.click('button[type="submit"]');
        
        try {
            await page.waitForNavigation({ timeout: 10000 });
            bugTracker.addSuccess('Admin login successful', 'login');
        } catch (e) {
            bugTracker.addBug('login', 'Login navigation failed or too slow', 'high', 'login');
            return;
        }
        
        // Check if redirected to admin page
        const currentUrl = page.url();
        if (currentUrl.includes('admin.html')) {
            bugTracker.addSuccess('Correct admin redirect', 'admin-dashboard');
        } else {
            bugTracker.addWarning('navigation', `Admin not redirected to admin page, went to: ${currentUrl}`, 'admin-dashboard');
        }
        
        // Test admin dashboard
        console.log('📊 Testing admin dashboard...');
        await page.goto('https://podcast-stories-production.up.railway.app/admin.html', { waitUntil: 'networkidle0' });
        
        // Test tab functionality
        const tabs = await page.$$('.tab-button');
        if (tabs.length === 0) {
            bugTracker.addBug('admin-ui', 'No tab buttons found in admin panel', 'medium', 'admin-dashboard');
        } else {
            bugTracker.addSuccess(`Found ${tabs.length} admin tabs`, 'admin-dashboard');
            
            // Test each tab click
            for (let i = 0; i < Math.min(tabs.length, 4); i++) {
                try {
                    await tabs[i].click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    bugTracker.addSuccess(`Tab ${i + 1} clickable`, 'admin-dashboard');
                } catch (e) {
                    bugTracker.addBug('admin-ui', `Tab ${i + 1} not clickable: ${e.message}`, 'medium', 'admin-dashboard');
                }
            }
        }
        
        // Test teacher approval workflow
        console.log('👩‍🏫 Testing teacher approval...');
        
        // Check for pending teacher requests
        const pendingRequests = await page.$$('.teacher-request-card');
        if (pendingRequests.length === 0) {
            bugTracker.addWarning('admin-workflow', 'No pending teacher requests to test', 'admin-dashboard');
        } else {
            // Test approve button on first request
            const approveBtn = await page.$('.teacher-request-card .approve-btn');
            if (approveBtn) {
                try {
                    await approveBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    bugTracker.addSuccess('Teacher approve button functional', 'admin-dashboard');
                } catch (e) {
                    bugTracker.addBug('admin-workflow', `Teacher approve button error: ${e.message}`, 'high', 'admin-dashboard');
                }
            } else {
                bugTracker.addBug('admin-ui', 'Teacher approve button not found', 'medium', 'admin-dashboard');
            }
        }
        
        // Test school management
        console.log('🏫 Testing school management...');
        
        const addSchoolBtn = await page.$('#addSchoolBtn');
        if (addSchoolBtn) {
            try {
                await addSchoolBtn.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if modal appeared
                const modal = await page.$('.modal, .school-modal');
                if (modal) {
                    bugTracker.addSuccess('Add school modal opens', 'admin-dashboard');
                    
                    // Test modal form
                    const schoolNameInput = await page.$('#schoolName, input[name="schoolName"]');
                    if (schoolNameInput) {
                        await page.type('#schoolName, input[name="schoolName"]', 'Test School');
                        bugTracker.addSuccess('School name input functional', 'admin-dashboard');
                    } else {
                        bugTracker.addBug('admin-ui', 'School name input not found in modal', 'medium', 'admin-dashboard');
                    }
                } else {
                    bugTracker.addBug('admin-ui', 'Add school modal does not appear', 'medium', 'admin-dashboard');
                }
            } catch (e) {
                bugTracker.addBug('admin-ui', `Add school button error: ${e.message}`, 'medium', 'admin-dashboard');
            }
        } else {
            bugTracker.addBug('admin-ui', 'Add school button not found', 'medium', 'admin-dashboard');
        }
        
        // Test stories management
        console.log('📚 Testing story management...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { waitUntil: 'networkidle0' });
        
        // Wait for stories to load
        await page.waitForFunction(() => {
            const cards = document.querySelectorAll('.story-card');
            return cards.length > 0;
        }, { timeout: 10000 }).catch(() => {
            bugTracker.addBug('stories', 'Stories failed to load within 10 seconds', 'high', 'stories');
        });
        
        const storyCards = await page.$$('.story-card');
        if (storyCards.length === 0) {
            bugTracker.addBug('stories', 'No story cards found', 'high', 'stories');
        } else {
            bugTracker.addSuccess(`Found ${storyCards.length} story cards`, 'stories');
        }
        
    } catch (error) {
        bugTracker.addBug('admin-workflow', `Admin workflow test failed: ${error.message}`, 'high', 'admin');
    }
}

async function testTeacherWorkflows(page, bugTracker) {
    try {
        // Test teacher registration
        console.log('📝 Testing teacher registration...');
        await page.goto('https://podcast-stories-production.up.railway.app/register-teacher.html', { waitUntil: 'networkidle0' });
        
        // Check form fields
        const nameField = await page.$('#name, input[name="name"]');
        const emailField = await page.$('#email, input[name="email"]');
        const schoolSelect = await page.$('#school, select[name="school"]');
        
        if (!nameField) {
            bugTracker.addBug('teacher-registration', 'Teacher name field not found', 'high', 'teacher-registration');
        }
        if (!emailField) {
            bugTracker.addBug('teacher-registration', 'Teacher email field not found', 'high', 'teacher-registration');
        }
        if (!schoolSelect) {
            bugTracker.addBug('teacher-registration', 'School selection not found', 'high', 'teacher-registration');
        }
        
        if (nameField && emailField && schoolSelect) {
            bugTracker.addSuccess('Teacher registration form complete', 'teacher-registration');
            
            // Test form submission with invalid data
            await page.type('#name, input[name="name"]', 'Test Teacher');
            await page.type('#email, input[name="email"]', 'invalid-email');
            
            const submitBtn = await page.$('button[type="submit"]');
            if (submitBtn) {
                try {
                    await submitBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Check for validation message
                    const errorMsg = await page.$('.error, .error-message');
                    if (errorMsg) {
                        bugTracker.addSuccess('Email validation working', 'teacher-registration');
                    } else {
                        bugTracker.addWarning('teacher-registration', 'No email validation error shown', 'teacher-registration');
                    }
                } catch (e) {
                    bugTracker.addBug('teacher-registration', `Form submission error: ${e.message}`, 'medium', 'teacher-registration');
                }
            } else {
                bugTracker.addBug('teacher-registration', 'Submit button not found', 'high', 'teacher-registration');
            }
        }
        
        // Test teacher dashboard (need to login as teacher)
        console.log('👩‍🏫 Testing teacher dashboard...');
        
        // Login as teacher (if teacher@vidpod.com exists)
        await page.goto('https://podcast-stories-production.up.railway.app/', { waitUntil: 'networkidle0' });
        
        const emailField2 = await page.$('input[type="email"]');
        const usernameField2 = await page.$('input[type="text"]');
        
        if (emailField2) {
            await page.evaluate(() => document.querySelector('input[type="email"]').value = '');
            await page.type('input[type="email"]', 'teacher@vidpod.com');
        } else if (usernameField2) {
            await page.evaluate(() => document.querySelector('input[type="text"]').value = '');
            await page.type('input[type="text"]', 'teacher');
        } else {
            bugTracker.addBug('teacher-login', 'No login field found for teacher', 'high', 'login');
            return;
        }
        
        await page.evaluate(() => document.querySelector('input[type="password"]').value = '');
        await page.type('input[type="password"]', 'vidpod');
        await page.click('button[type="submit"]');
        
        try {
            await page.waitForNavigation({ timeout: 5000 });
            
            // Check if redirected to teacher dashboard
            const url = page.url();
            if (url.includes('teacher-dashboard.html')) {
                bugTracker.addSuccess('Teacher login and redirect successful', 'teacher-dashboard');
                
                // Test class creation
                console.log('📚 Testing class creation...');
                
                const createClassBtn = await page.$('#createClassBtn, .create-class-btn');
                if (createClassBtn) {
                    try {
                        await createClassBtn.click();
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Look for class creation form/modal
                        const classNameInput = await page.$('#className, input[name="className"]');
                        if (classNameInput) {
                            bugTracker.addSuccess('Class creation form accessible', 'teacher-dashboard');
                        } else {
                            bugTracker.addBug('teacher-ui', 'Class creation form not found', 'medium', 'teacher-dashboard');
                        }
                    } catch (e) {
                        bugTracker.addBug('teacher-ui', `Create class button error: ${e.message}`, 'medium', 'teacher-dashboard');
                    }
                } else {
                    bugTracker.addBug('teacher-ui', 'Create class button not found', 'medium', 'teacher-dashboard');
                }
                
            } else {
                bugTracker.addWarning('teacher-login', `Teacher not redirected to teacher dashboard: ${url}`, 'teacher-dashboard');
            }
        } catch (e) {
            bugTracker.addWarning('teacher-login', 'Teacher login failed or teacher account does not exist', 'login');
        }
        
    } catch (error) {
        bugTracker.addBug('teacher-workflow', `Teacher workflow test failed: ${error.message}`, 'high', 'teacher');
    }
}

async function testStudentWorkflows(page, bugTracker) {
    try {
        // Test student registration
        console.log('📝 Testing student registration...');
        await page.goto('https://podcast-stories-production.up.railway.app/register-student.html', { waitUntil: 'networkidle0' });
        
        // Check student registration form
        const studentFields = {
            name: await page.$('#name, input[name="name"]'),
            email: await page.$('#email, input[name="email"]'),
            studentId: await page.$('#studentId, input[name="studentId"]'),
            teacherUsername: await page.$('#teacherUsername, input[name="teacherUsername"]')
        };
        
        Object.keys(studentFields).forEach(field => {
            if (!studentFields[field]) {
                bugTracker.addBug('student-registration', `Student ${field} field not found`, 'high', 'student-registration');
            }
        });
        
        const foundFields = Object.values(studentFields).filter(field => field).length;
        if (foundFields === 4) {
            bugTracker.addSuccess('Student registration form complete', 'student-registration');
        } else {
            bugTracker.addBug('student-registration', `Student registration form incomplete: ${foundFields}/4 fields found`, 'high', 'student-registration');
        }
        
        // Test student dashboard
        console.log('👨‍🎓 Testing student dashboard...');
        
        // Login as student
        await page.goto('https://podcast-stories-production.up.railway.app/', { waitUntil: 'networkidle0' });
        
        const emailField3 = await page.$('input[type="email"]');
        const usernameField3 = await page.$('input[type="text"]');
        
        if (emailField3) {
            await page.evaluate(() => document.querySelector('input[type="email"]').value = '');
            await page.type('input[type="email"]', 'student@vidpod.com');
        } else if (usernameField3) {
            await page.evaluate(() => document.querySelector('input[type="text"]').value = '');
            await page.type('input[type="text"]', 'student');
        }
        
        await page.evaluate(() => document.querySelector('input[type="password"]').value = '');
        await page.type('input[type="password"]', 'vidpod');
        await page.click('button[type="submit"]');
        
        try {
            await page.waitForNavigation({ timeout: 5000 });
            
            const url = page.url();
            if (url.includes('dashboard.html')) {
                bugTracker.addSuccess('Student login and redirect successful', 'student-dashboard');
                
                // Test story favoriting
                await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { waitUntil: 'networkidle0' });
                
                await page.waitForSelector('.story-card', { timeout: 5000 }).catch(() => {
                    bugTracker.addBug('student-stories', 'Stories not loading for student', 'high', 'stories');
                });
                
                const favoriteBtn = await page.$('.favorite-btn, .heart-icon');
                if (favoriteBtn) {
                    try {
                        await favoriteBtn.click();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        bugTracker.addSuccess('Favorite button functional for student', 'stories');
                    } catch (e) {
                        bugTracker.addBug('student-stories', `Favorite button error: ${e.message}`, 'medium', 'stories');
                    }
                } else {
                    bugTracker.addBug('student-ui', 'Favorite button not found', 'medium', 'stories');
                }
                
            } else {
                bugTracker.addWarning('student-login', `Student not redirected to dashboard: ${url}`, 'student-dashboard');
            }
        } catch (e) {
            bugTracker.addWarning('student-login', 'Student login failed or student account does not exist', 'login');
        }
        
    } catch (error) {
        bugTracker.addBug('student-workflow', `Student workflow test failed: ${error.message}`, 'high', 'student');
    }
}

async function testGeneralUIUX(page, bugTracker) {
    try {
        console.log('🎨 Testing general UI/UX...');
        
        // Test navigation consistency
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { waitUntil: 'networkidle0' });
        
        // Check for navigation elements
        const navElements = {
            homeLink: await page.$('a[href*="dashboard"], a[href*="index"]'),
            storiesLink: await page.$('a[href*="stories"]'),
            logoutBtn: await page.$('.logout-btn, #logoutBtn')
        };
        
        Object.keys(navElements).forEach(element => {
            if (navElements[element]) {
                bugTracker.addSuccess(`${element} found in navigation`, 'navigation');
            } else {
                bugTracker.addWarning('navigation', `${element} not found in navigation`, 'navigation');
            }
        });
        
        // Test responsive design
        console.log('📱 Testing responsive design...');
        
        // Test mobile viewport
        await page.setViewport({ width: 375, height: 667 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mobileCards = await page.$$('.story-card');
        if (mobileCards.length > 0) {
            const cardWidth = await page.evaluate(() => {
                const card = document.querySelector('.story-card');
                return card ? card.getBoundingClientRect().width : 0;
            });
            
            if (cardWidth > 375) {
                bugTracker.addBug('responsive', 'Story cards overflow on mobile viewport', 'medium', 'stories');
            } else {
                bugTracker.addSuccess('Story cards responsive on mobile', 'stories');
            }
        }
        
        // Reset viewport
        await page.setViewport({ width: 1280, height: 800 });
        
        // Test form validation
        console.log('📝 Testing form validation...');
        await page.goto('https://podcast-stories-production.up.railway.app/add-story.html', { waitUntil: 'networkidle0' });
        
        const storyForm = await page.$('#storyForm, form');
        if (storyForm) {
            const submitBtn = await page.$('button[type="submit"]');
            if (submitBtn) {
                try {
                    await submitBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Check for validation messages
                    const validationMsg = await page.$('.error, .error-message, .invalid-feedback');
                    if (validationMsg) {
                        bugTracker.addSuccess('Form validation working', 'add-story');
                    } else {
                        bugTracker.addWarning('forms', 'No validation message for empty story form', 'add-story');
                    }
                } catch (e) {
                    bugTracker.addBug('forms', `Story form submission error: ${e.message}`, 'medium', 'add-story');
                }
            }
        } else {
            bugTracker.addBug('forms', 'Story form not found', 'high', 'add-story');
        }
        
        // Test loading states
        console.log('⏳ Testing loading states...');
        await page.goto('https://podcast-stories-production.up.railway.app/stories.html', { waitUntil: 'networkidle0' });
        
        // Check if loading indicator appears during navigation
        const loadingIndicator = await page.$('.loading, .spinner, .loader');
        if (loadingIndicator) {
            bugTracker.addSuccess('Loading indicator found', 'general');
        } else {
            bugTracker.addWarning('ux', 'No loading indicators found', 'general');
        }
        
        // Test error handling
        console.log('❌ Testing error handling...');
        
        // Try accessing a non-existent page
        const response = await page.goto('https://podcast-stories-production.up.railway.app/nonexistent.html', { waitUntil: 'networkidle0' });
        
        if (response.status() === 404) {
            const errorPage = await page.$('h1, .error-message');
            if (errorPage) {
                bugTracker.addSuccess('404 error page exists', 'error-handling');
            } else {
                bugTracker.addBug('error-handling', '404 page has no proper error message', 'low', 'error-handling');
            }
        } else {
            bugTracker.addWarning('error-handling', 'Non-existent page does not return 404', 'error-handling');
        }
        
    } catch (error) {
        bugTracker.addBug('general-ui', `General UI test failed: ${error.message}`, 'medium', 'general');
    }
}

// Run the comprehensive test
comprehensiveUserJourneyTest()
    .then(report => {
        console.log('\n' + '='.repeat(80));
        console.log('🎯 TESTING COMPLETE');
        console.log('='.repeat(80));
        
        if (report.totalBugs === 0) {
            console.log('🎉 AMAZING! No bugs found in user journeys!');
        } else if (report.criticalBugs === 0 && report.highBugs <= 2) {
            console.log('✅ GOOD! Minor issues found, mostly cosmetic');
        } else if (report.criticalBugs === 0) {
            console.log('⚠️  MODERATE! Several bugs found, but no critical issues');
        } else {
            console.log('🚨 ATTENTION NEEDED! Critical bugs found that affect functionality');
        }
        
        process.exit(report.criticalBugs > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('💥 Test suite failed:', error);
        process.exit(1);
    });