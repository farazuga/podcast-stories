/**
 * Comprehensive Teacher User Flow Testing with Puppeteer
 * Tests all teacher functionality including new compact dashboard features
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'https://podcast-stories-production.up.railway.app';
const TEST_TEACHER = {
    email: 'teacher@vidpod.com',
    password: 'vidpod'
};

class TeacherFlowTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.bugs = [];
        this.testResults = [];
    }

    async setup() {
        console.log('🚀 Setting up Puppeteer for teacher flow testing...');
        this.browser = await puppeteer.launch({
            headless: false,
            slowMo: 100,
            args: ['--start-maximized'],
            defaultViewport: null
        });
        this.page = await this.browser.newPage();
        
        // Set up error tracking
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.bugs.push({
                    type: 'Console Error',
                    message: msg.text(),
                    url: this.page.url(),
                    timestamp: new Date().toISOString()
                });
            }
        });

        this.page.on('pageerror', error => {
            this.bugs.push({
                type: 'Page Error',
                message: error.message,
                stack: error.stack,
                url: this.page.url(),
                timestamp: new Date().toISOString()
            });
        });
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async logResult(testName, success, details = '') {
        const result = {
            test: testName,
            success,
            details,
            timestamp: new Date().toISOString(),
            url: this.page.url()
        };
        this.testResults.push(result);
        
        const status = success ? '✅' : '❌';
        console.log(`${status} ${testName}: ${details}`);
    }

    async addBug(title, description, severity = 'medium') {
        this.bugs.push({
            type: 'Bug',
            title,
            description,
            severity,
            url: this.page.url(),
            timestamp: new Date().toISOString()
        });
    }

    async waitForElement(selector, timeout = 5000) {
        try {
            await this.page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            await this.addBug(
                `Element not found: ${selector}`,
                `Element ${selector} did not appear within ${timeout}ms`,
                'high'
            );
            return false;
        }
    }

    async testLogin() {
        console.log('\n📝 Testing Teacher Login...');
        
        try {
            await this.page.goto(`${BASE_URL}/index.html`);
            await this.page.waitForSelector('#email');
            
            await this.page.type('#email', TEST_TEACHER.email);
            await this.page.type('#password', TEST_TEACHER.password);
            await this.page.click('#loginForm button[type="submit"]');
            
            // Wait for dashboard redirect
            await this.page.waitForNavigation({ timeout: 10000 });
            
            const currentUrl = this.page.url();
            if (currentUrl.includes('teacher-dashboard.html')) {
                await this.logResult('Teacher Login', true, 'Successfully logged in and redirected to teacher dashboard');
            } else {
                await this.logResult('Teacher Login', false, `Unexpected redirect to: ${currentUrl}`);
                await this.addBug('Login Redirect Issue', `Expected teacher-dashboard.html, got ${currentUrl}`, 'high');
            }
            
        } catch (error) {
            await this.logResult('Teacher Login', false, `Login failed: ${error.message}`);
            await this.addBug('Login Failure', error.message, 'critical');
        }
    }

    async testDashboardLoad() {
        console.log('\n🏠 Testing Dashboard Load...');
        
        try {
            // Check if essential elements are present
            const checks = [
                { selector: '#teacherName', name: 'Teacher Name' },
                { selector: '#totalClasses', name: 'Total Classes Stat' },
                { selector: '#totalStudents', name: 'Total Students Stat' },
                { selector: '#schoolName', name: 'School Name Stat' },
                { selector: '#createClassForm', name: 'Create Class Form' }
            ];
            
            for (const check of checks) {
                const exists = await this.waitForElement(check.selector, 3000);
                await this.logResult(`Dashboard Element: ${check.name}`, exists, exists ? 'Element found' : 'Element missing');
            }
            
            // Check for role badge
            const roleBadge = await this.page.$('.role-badge');
            if (roleBadge) {
                const roleText = await this.page.evaluate(el => el.textContent, roleBadge);
                await this.logResult('Role Badge', true, `Role displayed: ${roleText}`);
            } else {
                await this.logResult('Role Badge', false, 'Role badge not found');
                await this.addBug('Missing Role Badge', 'Teacher role badge not displayed on dashboard', 'medium');
            }
            
        } catch (error) {
            await this.logResult('Dashboard Load', false, `Dashboard load failed: ${error.message}`);
        }
    }

    async testClickableStats() {
        console.log('\n📊 Testing New Clickable Stats...');
        
        try {
            // Test Active Classes stat click
            const activeClassesStat = await this.page.$('.stat-card:first-child');
            if (activeClassesStat) {
                await activeClassesStat.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.logResult('Active Classes Stat Click', true, 'Stat clicked successfully');
            } else {
                await this.logResult('Active Classes Stat Click', false, 'Active classes stat not found');
                await this.addBug('Missing Clickable Stat', 'Active classes stat card not found', 'medium');
            }
            
            // Test Total Students stat click
            const totalStudentsStat = await this.page.$('.stat-card:nth-child(2)');
            if (totalStudentsStat) {
                await totalStudentsStat.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.logResult('Total Students Stat Click', true, 'Stat clicked successfully');
            } else {
                await this.logResult('Total Students Stat Click', false, 'Total students stat not found');
            }
            
            // Test School stat click
            const schoolStat = await this.page.$('.stat-card:nth-child(3)');
            if (schoolStat) {
                await schoolStat.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.logResult('School Stat Click', true, 'Stat clicked successfully');
            } else {
                await this.logResult('School Stat Click', false, 'School stat not found');
            }
            
        } catch (error) {
            await this.logResult('Clickable Stats', false, `Stats testing failed: ${error.message}`);
        }
    }

    async testClassCreation() {
        console.log('\n🎓 Testing Class Creation...');
        
        try {
            const testClassName = `Test Class ${Date.now()}`;
            const testSubject = 'Puppeteer Testing';
            
            // Fill out class creation form
            await this.page.type('#className', testClassName);
            await this.page.type('#subject', testSubject);
            await this.page.type('#description', 'This is a test class created by Puppeteer');
            
            // Submit form
            await this.page.click('#createClassForm button[type="submit"]');
            
            // Wait for response
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check if success alert appears
            const successAlert = await this.page.$('.new-class-alert');
            if (successAlert) {
                const isVisible = await this.page.evaluate(el => 
                    window.getComputedStyle(el).display !== 'none', successAlert
                );
                
                if (isVisible) {
                    await this.logResult('Class Creation', true, `Successfully created class: ${testClassName}`);
                    
                    // Test class code copying
                    const copyBtn = await this.page.$('#copyNewClassCode');
                    if (copyBtn) {
                        await copyBtn.click();
                        await this.logResult('Class Code Copy', true, 'Copy button clicked');
                    }
                } else {
                    await this.logResult('Class Creation', false, 'Success alert not visible');
                }
            } else {
                await this.logResult('Class Creation', false, 'No success alert found');
                await this.addBug('Class Creation Issue', 'Class creation may have failed - no success alert', 'high');
            }
            
        } catch (error) {
            await this.logResult('Class Creation', false, `Class creation failed: ${error.message}`);
        }
    }

    async testClassManagement() {
        console.log('\n📚 Testing Class Management...');
        
        try {
            // Scroll to classes section
            await this.page.evaluate(() => {
                const classesSection = document.querySelector('.classes-grid') || 
                                     document.querySelector('.classes-list') ||
                                     document.querySelector('#classesSection');
                if (classesSection) {
                    classesSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Look for class cards
            const classCards = await this.page.$$('.class-card');
            await this.logResult('Class Cards Present', classCards.length > 0, `Found ${classCards.length} class cards`);
            
            if (classCards.length > 0) {
                // Test expanding first class
                const firstCard = classCards[0];
                const expandBtn = await firstCard.$('.expand-btn');
                
                if (expandBtn) {
                    await expandBtn.click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this.logResult('Class Expansion', true, 'Class details expanded');
                } else {
                    await this.logResult('Class Expansion', false, 'No expand button found');
                }
                
                // Test class code copying
                const copyCodeBtn = await firstCard.$('.copy-code-btn, [onclick*="copyCode"]');
                if (copyCodeBtn) {
                    await copyCodeBtn.click();
                    await this.logResult('Class Code Copy', true, 'Class code copy attempted');
                } else {
                    await this.logResult('Class Code Copy', false, 'No copy code button found');
                }
            }
            
        } catch (error) {
            await this.logResult('Class Management', false, `Class management testing failed: ${error.message}`);
        }
    }

    async testNavigation() {
        console.log('\n🧭 Testing Navigation...');
        
        try {
            // Test navigation menu items
            const navItems = [
                { selector: 'a[href="/dashboard.html"]', name: 'Dashboard Link' },
                { selector: 'a[href="/add-story.html"]', name: 'Add Story Link' },
                { selector: 'a[href="/admin.html"]', name: 'Admin Link' }
            ];
            
            for (const item of navItems) {
                const element = await this.page.$(item.selector);
                if (element) {
                    const isVisible = await this.page.evaluate(el => 
                        window.getComputedStyle(el).display !== 'none', element
                    );
                    await this.logResult(`Navigation: ${item.name}`, isVisible, 
                        isVisible ? 'Link visible' : 'Link hidden');
                } else {
                    await this.logResult(`Navigation: ${item.name}`, false, 'Link not found');
                }
            }
            
            // Test Add Story navigation
            const addStoryLink = await this.page.$('a[href="/add-story.html"]');
            if (addStoryLink) {
                await addStoryLink.click();
                await this.page.waitForNavigation({ timeout: 5000 });
                
                const currentUrl = this.page.url();
                if (currentUrl.includes('add-story.html')) {
                    await this.logResult('Add Story Navigation', true, 'Successfully navigated to add story');
                    
                    // Go back to teacher dashboard
                    await this.page.goto(`${BASE_URL}/teacher-dashboard.html`);
                    await this.page.waitForSelector('#teacherName', { timeout: 5000 });
                } else {
                    await this.logResult('Add Story Navigation', false, `Unexpected URL: ${currentUrl}`);
                }
            }
            
        } catch (error) {
            await this.logResult('Navigation', false, `Navigation testing failed: ${error.message}`);
        }
    }

    async testResponsiveDesign() {
        console.log('\n📱 Testing Responsive Design...');
        
        try {
            // Test different viewport sizes
            const viewports = [
                { width: 1200, height: 800, name: 'Desktop' },
                { width: 768, height: 1024, name: 'Tablet' },
                { width: 375, height: 667, name: 'Mobile' }
            ];
            
            for (const viewport of viewports) {
                await this.page.setViewport(viewport);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if stats cards are visible
                const statsCards = await this.page.$$('.stat-card');
                const headerVisible = await this.page.$('.dashboard-header');
                
                await this.logResult(`${viewport.name} Layout`, 
                    statsCards.length > 0 && headerVisible, 
                    `Stats cards: ${statsCards.length}, Header: ${headerVisible ? 'visible' : 'hidden'}`
                );
            }
            
            // Reset to desktop
            await this.page.setViewport({ width: 1200, height: 800 });
            
        } catch (error) {
            await this.logResult('Responsive Design', false, `Responsive testing failed: ${error.message}`);
        }
    }

    async testLogout() {
        console.log('\n🚪 Testing Logout...');
        
        try {
            const logoutBtn = await this.page.$('.btn-logout');
            if (logoutBtn) {
                await logoutBtn.click();
                await this.page.waitForNavigation({ timeout: 5000 });
                
                const currentUrl = this.page.url();
                if (currentUrl.includes('index.html') || currentUrl === `${BASE_URL}/`) {
                    await this.logResult('Logout', true, 'Successfully logged out and redirected');
                } else {
                    await this.logResult('Logout', false, `Unexpected logout redirect: ${currentUrl}`);
                }
            } else {
                await this.logResult('Logout', false, 'Logout button not found');
                await this.addBug('Missing Logout Button', 'Logout button not found on page', 'medium');
            }
            
        } catch (error) {
            await this.logResult('Logout', false, `Logout failed: ${error.message}`);
        }
    }

    async generateReport() {
        console.log('\n📊 Generating Test Report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: this.testResults.length,
                passed: this.testResults.filter(t => t.success).length,
                failed: this.testResults.filter(t => !t.success).length,
                totalBugs: this.bugs.length
            },
            bugs: this.bugs,
            testResults: this.testResults
        };
        
        console.log('\n🔍 BUG SUMMARY:');
        console.log('================');
        this.bugs.forEach((bug, index) => {
            console.log(`${index + 1}. [${bug.severity?.toUpperCase()}] ${bug.title || bug.type}`);
            console.log(`   ${bug.description || bug.message}`);
            console.log(`   URL: ${bug.url}`);
            console.log('');
        });
        
        console.log('\n📈 TEST SUMMARY:');
        console.log('================');
        console.log(`Total Tests: ${report.summary.totalTests}`);
        console.log(`Passed: ${report.summary.passed}`);
        console.log(`Failed: ${report.summary.failed}`);
        console.log(`Bugs Found: ${report.summary.totalBugs}`);
        console.log(`Success Rate: ${((report.summary.passed / report.summary.totalTests) * 100).toFixed(1)}%`);
        
        return report;
    }

    async runFullTestSuite() {
        console.log('🎯 Starting Comprehensive Teacher Flow Testing...');
        
        await this.setup();
        
        try {
            await this.testLogin();
            await this.testDashboardLoad();
            await this.testClickableStats();
            await this.testClassCreation();
            await this.testClassManagement();
            await this.testNavigation();
            await this.testResponsiveDesign();
            await this.testLogout();
            
            return await this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            await this.addBug('Test Suite Failure', error.message, 'critical');
            return await this.generateReport();
        } finally {
            await this.teardown();
        }
    }
}

// Export for use in other scripts
module.exports = TeacherFlowTester;

// Run if called directly
if (require.main === module) {
    (async () => {
        const tester = new TeacherFlowTester();
        const report = await tester.runFullTestSuite();
        
        // Save report to file
        const fs = require('fs');
        fs.writeFileSync('teacher-flow-test-report.json', JSON.stringify(report, null, 2));
        console.log('📄 Report saved to teacher-flow-test-report.json');
    })();
}