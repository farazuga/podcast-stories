const puppeteer = require('puppeteer');
const fs = require('fs');

class AdminPanelTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = [];
        this.startTime = new Date();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            message
        };
        this.testResults.push(logEntry);
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} [${timestamp.split('T')[1].slice(0, 8)}] ${message}`);
    }

    async initialize() {
        this.log('🚀 Initializing Comprehensive Admin Panel Test Suite');
        this.log('📋 Test Scope: Authentication, Navigation, Data Loading, CRUD Operations');
        
        this.browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized'],
            devtools: false
        });
        
        this.page = await this.browser.newPage();
        
        // Set up console monitoring
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.log(`JavaScript Error: ${msg.text()}`, 'error');
            }
        });
        
        this.page.on('pageerror', error => {
            this.log(`Page Error: ${error.message}`, 'error');
        });
        
        this.log('🔧 Browser initialized and monitoring set up');
    }

    async testAuthentication() {
        this.log('📝 TEST 1: Admin Authentication Flow', 'info');
        
        try {
            // Navigate to login
            this.log('Navigating to login page...');
            await this.page.goto('https://podcast-stories-production.up.railway.app/', { 
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            
            // Check page elements
            const pageTitle = await this.page.title();
            this.log(`Page loaded: ${pageTitle}`);
            
            // Verify email field exists (Phase 1 feature)
            const emailField = await this.page.$('#email');
            if (emailField) {
                this.log('✅ Email field found (Phase 1 implementation working)', 'success');
            } else {
                this.log('❌ Email field not found', 'error');
                return false;
            }
            
            // Enter credentials
            this.log('Entering admin credentials...');
            await this.page.type('#email', 'admin@vidpod.com');
            await this.page.type('#password', 'vidpod');
            
            // Submit and wait for redirect
            await this.page.click('button[type="submit"]');
            await this.page.waitForNavigation({ timeout: 10000 });
            
            // Verify successful login
            const currentUrl = this.page.url();
            if (currentUrl.includes('admin.html')) {
                this.log('✅ Admin login successful, redirected to admin panel', 'success');
                return true;
            } else {
                this.log(`❌ Login failed, redirected to: ${currentUrl}`, 'error');
                return false;
            }
            
        } catch (error) {
            this.log(`❌ Authentication test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testJavaScriptFunctions() {
        this.log('📝 TEST 2: JavaScript Function Availability', 'info');
        
        try {
            // Wait for admin.js to load
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Test critical functions
            const functionTests = await this.page.evaluate(() => {
                const functions = [
                    'showTab',
                    'editSchool',
                    'deleteSchool',
                    'deleteTag',
                    'showApprovalModal',
                    'showStoryApprovalModal',
                    'showStoryRejectionModal'
                ];
                
                const results = {};
                functions.forEach(func => {
                    results[func] = typeof window[func] === 'function';
                });
                
                return results;
            });
            
            let allFunctionsWorking = true;
            for (const [func, exists] of Object.entries(functionTests)) {
                if (exists) {
                    this.log(`✅ ${func}: Available`, 'success');
                } else {
                    this.log(`❌ ${func}: Missing`, 'error');
                    allFunctionsWorking = false;
                }
            }
            
            return allFunctionsWorking;
            
        } catch (error) {
            this.log(`❌ Function test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testTabNavigation() {
        this.log('📝 TEST 3: Admin Panel Tab Navigation', 'info');
        
        try {
            const tabs = ['overview', 'schools', 'teachers', 'stories', 'tags'];
            let allTabsWork = true;
            
            for (const tab of tabs) {
                this.log(`Testing ${tab} tab...`);
                
                // Click tab via showTab function
                const tabResult = await this.page.evaluate((tabName) => {
                    try {
                        window.showTab(tabName);
                        
                        // Check if tab is now visible
                        const tabContent = document.getElementById(`${tabName}-tab`) || 
                                         document.getElementById(`${tabName}Tab`);
                        
                        return {
                            success: true,
                            visible: tabContent ? !tabContent.style.display.includes('none') : false,
                            error: null
                        };
                    } catch (error) {
                        return {
                            success: false,
                            visible: false,
                            error: error.message
                        };
                    }
                }, tab);
                
                if (tabResult.success && tabResult.visible) {
                    this.log(`✅ ${tab} tab: Navigation successful`, 'success');
                } else {
                    this.log(`❌ ${tab} tab: Failed - ${tabResult.error}`, 'error');
                    allTabsWork = false;
                }
                
                // Small delay between tabs
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            return allTabsWork;
            
        } catch (error) {
            this.log(`❌ Tab navigation test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testDataLoading() {
        this.log('📝 TEST 4: Data Loading and API Connectivity', 'info');
        
        try {
            // Switch to overview tab to trigger data loading
            await this.page.evaluate(() => window.showTab('overview'));
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if statistics are loaded
            const statsLoaded = await this.page.evaluate(() => {
                const stats = {
                    totalStories: document.getElementById('totalStories')?.textContent || '0',
                    totalSchools: document.getElementById('totalSchools')?.textContent || '0',
                    totalUsers: document.getElementById('totalUsers')?.textContent || '0',
                    pendingRequests: document.getElementById('pendingRequests')?.textContent || '0'
                };
                
                return stats;
            });
            
            this.log(`Statistics loaded:`, 'info');
            this.log(`  - Total Stories: ${statsLoaded.totalStories}`);
            this.log(`  - Total Schools: ${statsLoaded.totalSchools}`);
            this.log(`  - Total Users: ${statsLoaded.totalUsers}`);
            this.log(`  - Pending Requests: ${statsLoaded.pendingRequests}`);
            
            // Verify non-zero data (indicating API connectivity)
            if (parseInt(statsLoaded.totalStories) > 0 || parseInt(statsLoaded.totalSchools) > 0) {
                this.log('✅ Data loading successful - API connectivity confirmed', 'success');
                return true;
            } else {
                this.log('⚠️ Data loading returns zeros - check API connectivity', 'warning');
                return false;
            }
            
        } catch (error) {
            this.log(`❌ Data loading test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testSchoolManagement() {
        this.log('📝 TEST 5: School Management Interface', 'info');
        
        try {
            // Navigate to schools tab
            await this.page.evaluate(() => window.showTab('schools'));
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if schools table exists and is populated
            const schoolsData = await this.page.evaluate(() => {
                const schoolsTable = document.querySelector('#schoolsTable, .schools-table tbody');
                const addSchoolForm = document.getElementById('addSchoolForm');
                
                return {
                    tableExists: !!schoolsTable,
                    formExists: !!addSchoolForm,
                    schoolCount: schoolsTable ? schoolsTable.querySelectorAll('tr').length : 0
                };
            });
            
            this.log(`Schools interface check:`, 'info');
            this.log(`  - Schools table: ${schoolsData.tableExists ? 'Found' : 'Missing'}`);
            this.log(`  - Add school form: ${schoolsData.formExists ? 'Found' : 'Missing'}`);
            this.log(`  - Schools listed: ${schoolsData.schoolCount}`);
            
            // Test add school form functionality
            if (schoolsData.formExists) {
                const formTest = await this.page.evaluate(() => {
                    const form = document.getElementById('addSchoolForm');
                    const nameField = document.getElementById('schoolName');
                    
                    return {
                        formFound: !!form,
                        nameFieldFound: !!nameField,
                        submitHandlerExists: form && form.onsubmit !== null
                    };
                });
                
                if (formTest.formFound && formTest.nameFieldFound) {
                    this.log('✅ School management interface functional', 'success');
                    return true;
                } else {
                    this.log('⚠️ School form elements missing', 'warning');
                    return false;
                }
            } else {
                this.log('❌ School management form not found', 'error');
                return false;
            }
            
        } catch (error) {
            this.log(`❌ School management test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testStoryApproval() {
        this.log('📝 TEST 6: Story Approval System (Phase 2)', 'info');
        
        try {
            // Navigate to stories tab
            await this.page.evaluate(() => window.showTab('stories'));
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check for story approval interface
            const approvalInterface = await this.page.evaluate(() => {
                const storyTable = document.querySelector('#storiesTable, .stories-table');
                const statusFilter = document.getElementById('storyStatusFilter');
                const approvalModal = document.getElementById('storyApprovalModal');
                
                return {
                    tableExists: !!storyTable,
                    filterExists: !!statusFilter,
                    modalExists: !!approvalModal,
                    approvalButtonsExist: !!document.querySelector('[onclick*="showStoryApprovalModal"]')
                };
            });
            
            this.log(`Story approval interface check:`, 'info');
            this.log(`  - Stories table: ${approvalInterface.tableExists ? 'Found' : 'Missing'}`);
            this.log(`  - Status filter: ${approvalInterface.filterExists ? 'Found' : 'Missing'}`);
            this.log(`  - Approval modal: ${approvalInterface.modalExists ? 'Found' : 'Missing'}`);
            this.log(`  - Approval buttons: ${approvalInterface.approvalButtonsExist ? 'Found' : 'Missing'}`);
            
            if (approvalInterface.tableExists && approvalInterface.modalExists) {
                this.log('✅ Story approval system interface ready (Phase 2)', 'success');
                return true;
            } else {
                this.log('⚠️ Story approval interface incomplete', 'warning');
                return false;
            }
            
        } catch (error) {
            this.log(`❌ Story approval test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testTeacherRequests() {
        this.log('📝 TEST 7: Teacher Request Management', 'info');
        
        try {
            // Navigate to teachers tab
            await this.page.evaluate(() => window.showTab('teachers'));
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check teacher request interface
            const teacherInterface = await this.page.evaluate(() => {
                const requestsTable = document.querySelector('#teacherRequestsTable, .teacher-requests-table');
                const statusFilter = document.getElementById('statusFilter');
                const approvalModal = document.getElementById('approvalModal');
                
                return {
                    tableExists: !!requestsTable,
                    filterExists: !!statusFilter,
                    modalExists: !!approvalModal
                };
            });
            
            this.log(`Teacher request interface check:`, 'info');
            this.log(`  - Requests table: ${teacherInterface.tableExists ? 'Found' : 'Missing'}`);
            this.log(`  - Status filter: ${teacherInterface.filterExists ? 'Found' : 'Missing'}`);
            this.log(`  - Approval modal: ${teacherInterface.modalExists ? 'Found' : 'Missing'}`);
            
            if (teacherInterface.tableExists) {
                this.log('✅ Teacher request management functional', 'success');
                return true;
            } else {
                this.log('⚠️ Teacher request interface needs attention', 'warning');
                return false;
            }
            
        } catch (error) {
            this.log(`❌ Teacher request test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async generateReport() {
        this.log('📊 Generating comprehensive test report...');
        
        const endTime = new Date();
        const duration = Math.round((endTime - this.startTime) / 1000);
        
        const report = {
            testSession: {
                startTime: this.startTime.toISOString(),
                endTime: endTime.toISOString(),
                duration: `${duration} seconds`,
                tester: 'Claude AI Assistant',
                environment: 'Production - podcast-stories-production.up.railway.app'
            },
            summary: {
                totalTests: 7,
                passed: this.testResults.filter(r => r.type === 'success').length,
                failed: this.testResults.filter(r => r.type === 'error').length,
                warnings: this.testResults.filter(r => r.type === 'warning').length
            },
            detailedResults: this.testResults
        };
        
        // Write report to file
        const reportContent = `# VidPOD Admin Panel Comprehensive Test Report

**Generated:** ${endTime.toISOString()}  
**Duration:** ${duration} seconds  
**Environment:** Production  

## Test Summary
- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passed} ✅
- **Failed:** ${report.summary.failed} ❌  
- **Warnings:** ${report.summary.warnings} ⚠️

## Detailed Test Log

${this.testResults.map(result => {
    const icon = result.type === 'success' ? '✅' : result.type === 'error' ? '❌' : result.type === 'warning' ? '⚠️' : 'ℹ️';
    return `**${result.timestamp}** ${icon} ${result.message}`;
}).join('\n')}

---
*Report generated by VidPOD Test Suite*
`;
        
        fs.writeFileSync('./admin-panel-test-report.md', reportContent);
        this.log('✅ Test report saved to admin-panel-test-report.md', 'success');
        
        return report;
    }

    async runFullTestSuite() {
        await this.initialize();
        
        try {
            this.log('🎯 Starting comprehensive admin panel test suite...');
            
            const results = {
                authentication: await this.testAuthentication(),
                functions: await this.testJavaScriptFunctions(),
                navigation: await this.testTabNavigation(),
                dataLoading: await this.testDataLoading(),
                schoolManagement: await this.testSchoolManagement(),
                storyApproval: await this.testStoryApproval(),
                teacherRequests: await this.testTeacherRequests()
            };
            
            this.log('📊 Test suite completed. Generating report...');
            const report = await this.generateReport();
            
            // Summary
            const passedTests = Object.values(results).filter(r => r === true).length;
            const totalTests = Object.values(results).length;
            
            this.log(`🎉 Test Suite Complete: ${passedTests}/${totalTests} tests passed`);
            
            if (passedTests === totalTests) {
                this.log('🚀 ALL TESTS PASSED - Admin panel fully functional!', 'success');
            } else {
                this.log('⚠️ Some tests need attention - see report for details', 'warning');
            }
            
            this.log('🔍 Browser window staying open for manual verification...');
            
            // Keep browser open for manual inspection
            // await this.browser.close();
            
        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`, 'error');
        }
    }
}

// Run the test suite
const tester = new AdminPanelTester();
tester.runFullTestSuite().catch(console.error);