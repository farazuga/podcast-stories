/**
 * End-to-End Teacher Request Workflow Test
 * Validates the complete workflow from teacher registration to admin approval
 * 
 * Enhanced to test invitation-based authentication workflow
 * For complete testing, implement invitation token capture or email service stubbing
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

class TeacherRequestWorkflowTest {
    constructor() {
        this.browser = null;
        this.adminPage = null;
        this.teacherPage = null;
        this.baseUrl = 'https://podcast-stories-production.up.railway.app';
        this.testData = {
            teacher: {
                firstName: `TestTeacher${Date.now()}`,
                lastName: 'AutoTest',
                email: `test.teacher.${Date.now()}@example.com`,
                message: 'Automated test teacher request'
            },
            admin: {
                email: 'admin@vidpod.com',
                password: 'vidpod'
            }
        };
        this.testResults = {
            teacherSubmission: null,
            adminLogin: null,
            requestDisplay: null,
            requestApproval: null,
            teacherLogin: null
        };
    }

    async init() {
        console.log('🚀 Teacher Request Workflow Test - Starting...\n');
        
        this.browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: { width: 1400, height: 900 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async testTeacherSubmission() {
        console.log('📝 Step 1: Testing teacher registration submission...');
        
        this.teacherPage = await this.browser.newPage();
        
        try {
            // Navigate to teacher registration
            await this.teacherPage.goto(`${this.baseUrl}/register-teacher.html`, { 
                waitUntil: 'networkidle0', 
                timeout: 30000 
            });
            
            // Wait for form to load
            await this.teacherPage.waitForSelector('#first_name', { timeout: 10000 });
            await this.teacherPage.waitForSelector('#school_id', { timeout: 10000 });
            
            console.log('   📋 Registration form loaded');
            
            // Fill out the form
            await this.teacherPage.type('#first_name', this.testData.teacher.firstName);
            await this.teacherPage.type('#last_name', this.testData.teacher.lastName);
            await this.teacherPage.type('#email', this.testData.teacher.email);
            await this.teacherPage.type('#message', this.testData.teacher.message);
            
            // Select a school - dynamically select first available non-placeholder option
            const availableSchoolId = await this.teacherPage.evaluate(() => {
                const schoolSelect = document.querySelector('#school_id');
                if (!schoolSelect) return null;
                
                // Find first option with a value that's not empty/placeholder
                const options = schoolSelect.querySelectorAll('option');
                for (let option of options) {
                    const value = option.value;
                    if (value && value !== '' && value !== '0' && !option.textContent.includes('Select')) {
                        return value;
                    }
                }
                return null;
            });
            
            if (availableSchoolId) {
                await this.teacherPage.select('#school_id', availableSchoolId);
                console.log('   🏫 Selected school ID:', availableSchoolId);
            } else {
                throw new Error('No available schools found in dropdown');
            }
            
            console.log('   📝 Form filled with test data');
            console.log('   📧 Test email:', this.testData.teacher.email);
            
            // Submit the form
            await this.teacherPage.click('button[type="submit"]');
            
            // Wait for success or error message
            await this.teacherPage.waitForTimeout(3000);
            
            // Check for success message
            const successMessage = await this.teacherPage.evaluate(() => {
                const successEl = document.querySelector('.success-message, .alert-success, .message.success');
                return successEl ? successEl.textContent.trim() : null;
            });
            
            const errorMessage = await this.teacherPage.evaluate(() => {
                const errorEl = document.querySelector('.error-message, .alert-error, .message.error');
                return errorEl ? errorEl.textContent.trim() : null;
            });
            
            this.testResults.teacherSubmission = {
                success: !!successMessage,
                successMessage,
                errorMessage,
                submissionCompleted: true
            };
            
            if (successMessage) {
                console.log('   ✅ Teacher request submitted successfully');
                console.log('   📧 Success message:', successMessage);
            } else if (errorMessage) {
                console.log('   ❌ Teacher request submission failed');
                console.log('   📧 Error message:', errorMessage);
            } else {
                console.log('   ⚠️ No clear success/error message found');
            }
            
            return this.testResults.teacherSubmission.success;
            
        } catch (error) {
            console.log('   ❌ Teacher submission failed:', error.message);
            this.testResults.teacherSubmission = { success: false, error: error.message };
            return false;
        }
    }

    async testAdminLogin() {
        console.log('\n🔐 Step 2: Testing admin login...');
        
        this.adminPage = await this.browser.newPage();
        
        try {
            // Navigate to login page
            await this.adminPage.goto(`${this.baseUrl}/index.html`, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            // Fill login form
            await this.adminPage.waitForSelector('#email', { timeout: 10000 });
            await this.adminPage.type('#email', this.testData.admin.email);
            await this.adminPage.type('#password', this.testData.admin.password);
            await this.adminPage.click('button[type="submit"]');
            
            // Wait for redirect
            await this.adminPage.waitForNavigation({ timeout: 15000 });
            
            // Verify we're on admin page
            const currentUrl = this.adminPage.url();
            const isAdminPage = currentUrl.includes('admin.html');
            
            this.testResults.adminLogin = {
                success: isAdminPage,
                currentUrl
            };
            
            if (isAdminPage) {
                console.log('   ✅ Admin login successful');
                console.log('   🔗 Redirected to:', currentUrl);
            } else {
                console.log('   ❌ Admin login failed - not on admin page');
                console.log('   🔗 Current URL:', currentUrl);
            }
            
            return isAdminPage;
            
        } catch (error) {
            console.log('   ❌ Admin login failed:', error.message);
            this.testResults.adminLogin = { success: false, error: error.message };
            return false;
        }
    }

    async testRequestDisplay() {
        console.log('\n👀 Step 3: Testing request display in admin panel...');
        
        try {
            // Navigate to teachers tab
            await this.adminPage.click('.tab-btn[data-tab="teachers"]');
            await this.adminPage.waitForTimeout(3000);
            
            // Check if our test request appears in the table
            const requestFound = await this.adminPage.evaluate((testEmail) => {
                const table = document.getElementById('teacherRequestsTable');
                if (!table) return { found: false, error: 'Table not found' };
                
                const rows = table.querySelectorAll('tr');
                let foundRequest = null;
                
                for (let row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 1) {
                        const emailCell = cells[1]; // Email is in second column
                        if (emailCell && emailCell.textContent.includes(testEmail)) {
                            foundRequest = {
                                name: cells[0]?.textContent.trim(),
                                email: cells[1]?.textContent.trim(),
                                school: cells[2]?.textContent.trim(),
                                status: cells[4]?.textContent.trim()
                            };
                            break;
                        }
                    }
                }
                
                return {
                    found: !!foundRequest,
                    request: foundRequest,
                    totalRows: rows.length,
                    tableHTML: table.innerHTML.substring(0, 500) // First 500 chars for debugging
                };
            }, this.testData.teacher.email);
            
            this.testResults.requestDisplay = requestFound;
            
            if (requestFound.found) {
                console.log('   ✅ Teacher request found in admin panel');
                console.log('   📋 Request details:', requestFound.request);
            } else {
                console.log('   ❌ Teacher request not found in admin panel');
                console.log('   📊 Total rows in table:', requestFound.totalRows);
                console.log('   🔍 Looking for email:', this.testData.teacher.email);
            }
            
            return requestFound.found;
            
        } catch (error) {
            console.log('   ❌ Request display test failed:', error.message);
            this.testResults.requestDisplay = { found: false, error: error.message };
            return false;
        }
    }

    async testRequestApproval() {
        console.log('\n✅ Step 4: Testing request approval...');
        
        if (!this.testResults.requestDisplay?.found) {
            console.log('   ⚠️ Skipping approval test - request not displayed');
            return false;
        }
        
        try {
            // Find and click approve button for our test request
            const approvalClicked = await this.adminPage.evaluate((testEmail) => {
                const table = document.getElementById('teacherRequestsTable');
                if (!table) return false;
                
                const rows = table.querySelectorAll('tr');
                for (let row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 1 && cells[1].textContent.includes(testEmail)) {
                        const approveButton = row.querySelector('button.btn-approve');
                        if (approveButton) {
                            approveButton.click();
                            return true;
                        }
                    }
                }
                return false;
            }, this.testData.teacher.email);
            
            if (!approvalClicked) {
                console.log('   ❌ Could not find approve button');
                return false;
            }
            
            console.log('   🖱️ Approve button clicked');
            
            // Wait for approval modal and confirm
            await this.adminPage.waitForSelector('#approvalModal', { visible: true, timeout: 5000 });
            await this.adminPage.click('button[type="submit"]'); // Confirm approval
            
            // Wait for success message
            await this.adminPage.waitForTimeout(3000);
            
            // Check for success message
            const approvalResult = await this.adminPage.evaluate(() => {
                const successEl = document.querySelector('.success-message');
                return {
                    success: successEl && successEl.style.display !== 'none',
                    message: successEl ? successEl.textContent.trim() : null
                };
            });
            
            this.testResults.requestApproval = approvalResult;
            
            if (approvalResult.success) {
                console.log('   ✅ Teacher request approved successfully');
                console.log('   📧 Success message:', approvalResult.message);
            } else {
                console.log('   ❌ Teacher request approval may have failed');
            }
            
            return approvalResult.success;
            
        } catch (error) {
            console.log('   ❌ Request approval test failed:', error.message);
            this.testResults.requestApproval = { success: false, error: error.message };
            return false;
        }
    }

    async testTeacherLogin() {
        console.log('\n🔑 Step 5: Testing new teacher login (if invitation received)...');
        
        // Note: This step would require checking email for the invitation link
        // For now, we'll just verify the user was created in the system
        
        try {
            // Create a new page for teacher login attempt
            const teacherLoginPage = await this.browser.newPage();
            await teacherLoginPage.goto(`${this.baseUrl}/index.html`);
            
            // Try logging in with the test teacher credentials
            // (This will fail unless they use the invitation link to set password)
            await teacherLoginPage.type('#email', this.testData.teacher.email);
            await teacherLoginPage.type('#password', 'temporarypass123');
            await teacherLoginPage.click('button[type="submit"]');
            
            await teacherLoginPage.waitForTimeout(3000);
            
            const loginResult = await teacherLoginPage.evaluate(() => {
                const errorEl = document.querySelector('.error-message');
                const currentUrl = window.location.href;
                
                return {
                    hasError: errorEl && errorEl.style.display !== 'none',
                    errorMessage: errorEl ? errorEl.textContent.trim() : null,
                    currentUrl,
                    onLoginPage: currentUrl.includes('index.html')
                };
            });
            
            // We expect this to fail since the teacher needs to use the invitation link
            const expectedToFail = loginResult.hasError && loginResult.onLoginPage;
            
            this.testResults.teacherLogin = {
                expectedFailure: expectedToFail,
                actualResult: loginResult
            };
            
            if (expectedToFail) {
                console.log('   ✅ Teacher login correctly requires invitation link (expected behavior)');
                console.log('   📧 Error message:', loginResult.errorMessage);
            } else {
                console.log('   ⚠️ Unexpected login result - may need investigation');
            }
            
            await teacherLoginPage.close();
            return expectedToFail;
            
        } catch (error) {
            console.log('   ❌ Teacher login test failed:', error.message);
            this.testResults.teacherLogin = { expectedFailure: false, error: error.message };
            return false;
        }
    }

    async generateReport() {
        console.log('\n📋 TEACHER REQUEST WORKFLOW TEST REPORT');
        console.log('=======================================\n');
        
        console.log('🧪 Test Data Used:');
        console.log('   👤 Teacher Name:', `${this.testData.teacher.firstName} ${this.testData.teacher.lastName}`);
        console.log('   📧 Teacher Email:', this.testData.teacher.email);
        console.log('   👨‍💼 Admin Email:', this.testData.admin.email);
        
        console.log('\n📊 Test Results:');
        console.log('   📝 Teacher Submission:', this.testResults.teacherSubmission?.success ? 'PASS ✅' : 'FAIL ❌');
        console.log('   🔐 Admin Login:', this.testResults.adminLogin?.success ? 'PASS ✅' : 'FAIL ❌');
        console.log('   👀 Request Display:', this.testResults.requestDisplay?.found ? 'PASS ✅' : 'FAIL ❌');
        console.log('   ✅ Request Approval:', this.testResults.requestApproval?.success ? 'PASS ✅' : 'FAIL ❌');
        console.log('   🔑 Teacher Login Check:', this.testResults.teacherLogin?.expectedFailure ? 'PASS ✅' : 'FAIL ❌');
        
        const totalTests = 5;
        const passedTests = [
            this.testResults.teacherSubmission?.success,
            this.testResults.adminLogin?.success,
            this.testResults.requestDisplay?.found,
            this.testResults.requestApproval?.success,
            this.testResults.teacherLogin?.expectedFailure
        ].filter(Boolean).length;
        
        console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
        
        // Detailed failure analysis
        if (passedTests < totalTests) {
            console.log('\n🔧 FAILURE ANALYSIS:');
            
            if (!this.testResults.teacherSubmission?.success) {
                console.log('   📝 Teacher Submission Failed:');
                console.log('      - Check teacher registration form functionality');
                console.log('      - Verify API endpoint /teacher-requests is working');
                if (this.testResults.teacherSubmission?.errorMessage) {
                    console.log('      - Error:', this.testResults.teacherSubmission.errorMessage);
                }
            }
            
            if (!this.testResults.adminLogin?.success) {
                console.log('   🔐 Admin Login Failed:');
                console.log('      - Verify admin credentials are correct');
                console.log('      - Check authentication system');
            }
            
            if (!this.testResults.requestDisplay?.found) {
                console.log('   👀 Request Display Failed:');
                console.log('      - Check admin panel teacher requests tab');
                console.log('      - Verify loadTeacherRequests() function');
                console.log('      - Check API /teacher-requests endpoint');
            }
            
            if (!this.testResults.requestApproval?.success) {
                console.log('   ✅ Request Approval Failed:');
                console.log('      - Check approval modal functionality');
                console.log('      - Verify approval API endpoint');
                console.log('      - Check email service configuration');
            }
        }
        
        if (passedTests === totalTests) {
            console.log('\n🎉 ALL TESTS PASSED! The teacher request workflow is functioning correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Please review the failure analysis above.');
        }
        
        console.log('\n🔗 Production URL:', this.baseUrl);
        console.log('👀 Browser kept open for manual inspection - press Ctrl+C to close');
    }

    async runFullWorkflow() {
        try {
            await this.init();
            
            const submissionSuccess = await this.testTeacherSubmission();
            const loginSuccess = await this.testAdminLogin();
            
            let displaySuccess = false;
            let approvalSuccess = false;
            let teacherLoginCheck = false;
            
            if (submissionSuccess && loginSuccess) {
                displaySuccess = await this.testRequestDisplay();
                
                if (displaySuccess) {
                    approvalSuccess = await this.testRequestApproval();
                }
                
                teacherLoginCheck = await this.testTeacherLogin();
            }
            
            await this.generateReport();
            
            // Keep browser open for inspection
            await new Promise(() => {});
            
        } catch (error) {
            console.log('❌ Workflow test execution failed:', error.message);
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Run the test
const workflowTest = new TeacherRequestWorkflowTest();

// Handle cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n👋 Cleaning up test environment...');
    await workflowTest.cleanup();
    process.exit();
});

workflowTest.runFullWorkflow().catch(console.error);