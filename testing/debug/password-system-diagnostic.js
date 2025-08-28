/**
 * Password System Diagnostic Tool
 * Helps identify which password system failed and diagnose the exact issue
 */

const puppeteer = require('puppeteer');

class PasswordSystemDiagnostic {
    constructor() {
        this.baseUrl = 'https://podcast-stories-production.up.railway.app';
        this.browser = null;
        this.results = {
            systemType: null,
            urlAccessibility: {},
            apiEndpoints: {},
            tokenValidation: {},
            databaseSchema: {}
        };
    }

    async init() {
        this.browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: { width: 1200, height: 800 }
        });
        console.log('🔍 Password System Diagnostic Tool\n');
        console.log('='*50 + '\n');
    }

    async testURLAccessibility() {
        console.log('🌐 Testing URL Accessibility...\n');
        
        const page = await this.browser.newPage();
        
        const urlsToTest = [
            '/reset-password.html',
            '/reset-password.html?token=test'
        ];

        for (const url of urlsToTest) {
            try {
                const response = await page.goto(`${this.baseUrl}${url}`, { 
                    waitUntil: 'networkidle0', 
                    timeout: 10000 
                });
                
                this.results.urlAccessibility[url] = {
                    status: response.status(),
                    accessible: response.status() === 200,
                    error: null
                };
                
                console.log(`   ${url}: ${response.status() === 200 ? '✅' : '❌'} (${response.status()})`);
                
            } catch (error) {
                this.results.urlAccessibility[url] = {
                    status: null,
                    accessible: false,
                    error: error.message
                };
                console.log(`   ${url}: ❌ Error - ${error.message}`);
            }
        }
        
        await page.close();
        console.log('');
    }

    async testAPIEndpoints() {
        console.log('🔌 Testing API Endpoints...\n');
        
        const page = await this.browser.newPage();
        
        // First login as admin to get auth token
        try {
            await page.goto(`${this.baseUrl}/index.html`);
            await page.waitForSelector('#email', { timeout: 5000 });
            
            await page.type('#email', 'admin@vidpod.com');
            await page.type('#password', 'vidpod');
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ timeout: 10000 });
            
            const token = await page.evaluate(() => localStorage.getItem('token'));
            if (!token) {
                console.log('❌ Failed to get admin authentication token');
                return;
            }
            console.log('✅ Admin authentication successful');
            
        } catch (error) {
            console.log('❌ Admin login failed:', error.message);
            return;
        }

        // Test API endpoints
        const endpointsToTest = [
            {
                name: 'Unified Password Reset',
                endpoint: '/api/password-reset/reset',
                method: 'POST',
                body: { token: 'test-token', password: 'TestPass123' }
            },
            {
                name: 'Teacher Requests Schema Check',
                endpoint: '/api/teacher-requests/schema-check',
                method: 'GET',
                requiresAuth: true
            }
        ];

        for (const apiTest of endpointsToTest) {
            try {
                const result = await page.evaluate(async (test) => {
                    const token = localStorage.getItem('token');
                    const headers = {
                        'Content-Type': 'application/json'
                    };
                    
                    if (test.requiresAuth) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                    
                    const options = {
                        method: test.method,
                        headers: headers
                    };
                    
                    if (test.body) {
                        options.body = JSON.stringify(test.body);
                    }
                    
                    const response = await fetch(test.endpoint, options);
                    
                    let responseData;
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        responseData = await response.json();
                    } else {
                        responseData = await response.text();
                    }
                    
                    return {
                        status: response.status,
                        ok: response.ok,
                        data: responseData,
                        headers: Object.fromEntries(response.headers.entries())
                    };
                }, apiTest);
                
                this.results.apiEndpoints[apiTest.name] = result;
                
                const status = result.ok ? '✅' : '❌';
                console.log(`   ${apiTest.name}: ${status} (${result.status})`);
                
                if (!result.ok && typeof result.data === 'string' && result.data.length < 200) {
                    console.log(`      Error: ${result.data}`);
                } else if (!result.ok && result.data.error) {
                    console.log(`      Error: ${result.data.error}`);
                }
                
            } catch (error) {
                console.log(`   ${apiTest.name}: ❌ Network Error - ${error.message}`);
                this.results.apiEndpoints[apiTest.name] = { error: error.message };
            }
        }
        
        await page.close();
        console.log('');
    }

    async testTokenGeneration() {
        console.log('🎫 Testing Token Systems...\n');
        
        const page = await this.browser.newPage();
        
        // Test token generation by creating a real teacher request and approval
        try {
            console.log('   Creating test teacher request...');
            
            // Go to teacher registration
            await page.goto(`${this.baseUrl}/register-teacher.html`);
            await page.waitForSelector('#first_name', { timeout: 10000 });
            
            const testEmail = `diagnostic.${Date.now()}@example.com`;
            
            // Fill form
            await page.type('#first_name', 'Diagnostic');
            await page.type('#last_name', 'Test');
            await page.type('#email', testEmail);
            await page.type('#message', 'Password system diagnostic test');
            
            // Select school
            const schoolSelected = await page.evaluate(() => {
                const schoolSelect = document.querySelector('#school_id');
                const options = schoolSelect.querySelectorAll('option');
                for (let option of options) {
                    if (option.value && option.value !== '' && !option.textContent.includes('Select')) {
                        schoolSelect.value = option.value;
                        return true;
                    }
                }
                return false;
            });
            
            if (schoolSelected) {
                await page.click('button[type="submit"]');
                await page.waitForTimeout(3000);
                console.log('   ✅ Test teacher request submitted');
                
                // Now login as admin and approve it
                await page.goto(`${this.baseUrl}/index.html`);
                await page.type('#email', 'admin@vidpod.com');
                await page.type('#password', 'vidpod');
                await page.click('button[type="submit"]');
                await page.waitForNavigation();
                
                // Go to teacher requests
                await page.goto(`${this.baseUrl}/admin.html`);
                await page.waitForTimeout(2000);
                
                await page.evaluate(() => {
                    if (typeof window.showTab === 'function') {
                        window.showTab('teachers');
                    }
                });
                await page.waitForTimeout(3000);
                
                // Look for our request and try to approve
                const approvalResult = await page.evaluate((email) => {
                    const pageText = document.body.textContent;
                    if (pageText.includes(email)) {
                        // Try to find approve button
                        const buttons = document.querySelectorAll('button, a');
                        for (const btn of buttons) {
                            if (btn.textContent && btn.textContent.toLowerCase().includes('approve')) {
                                btn.click();
                                return { found: true, approved: true };
                            }
                        }
                        return { found: true, approved: false };
                    }
                    return { found: false, approved: false };
                }, testEmail);
                
                if (approvalResult.found) {
                    console.log('   ✅ Test request found in admin panel');
                    if (approvalResult.approved) {
                        console.log('   ✅ Approval attempted');
                        await page.waitForTimeout(3000);
                        
                        // Check for any error/success messages
                        const messages = await page.evaluate(() => {
                            const alerts = document.querySelectorAll('.alert, .message, .error, .success');
                            return Array.from(alerts).map(el => el.textContent.trim());
                        });
                        
                        if (messages.length > 0) {
                            console.log('   📝 System messages:', messages);
                        }
                    } else {
                        console.log('   ❌ Could not find approve button');
                    }
                } else {
                    console.log('   ❌ Test request not found (possible 500 error still occurring)');
                }
                
                this.results.tokenValidation.testRequestProcessed = approvalResult;
                
            } else {
                console.log('   ❌ No schools available for test request');
            }
            
        } catch (error) {
            console.log('   ❌ Token generation test failed:', error.message);
            this.results.tokenValidation.error = error.message;
        }
        
        await page.close();
        console.log('');
    }

    async analyzeDatabaseSchema() {
        console.log('🗃️ Analyzing Database Schema...\n');
        
        const page = await this.browser.newPage();
        
        try {
            // Login as admin
            await page.goto(`${this.baseUrl}/index.html`);
            await page.waitForSelector('#email');
            
            await page.type('#email', 'admin@vidpod.com');
            await page.type('#password', 'vidpod');
            await page.click('button[type="submit"]');
            await page.waitForNavigation();
            
            // Test schema check endpoint
            const schemaResult = await page.evaluate(async () => {
                const token = localStorage.getItem('token');
                
                try {
                    const response = await fetch('/api/teacher-requests/schema-check', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    return {
                        status: response.status,
                        ok: response.ok,
                        data: response.ok ? await response.json() : await response.text()
                    };
                } catch (error) {
                    return { error: error.message };
                }
            });
            
            if (schemaResult.ok) {
                console.log('   ✅ Schema check endpoint accessible');
                const schema = schemaResult.data;
                
                console.log(`   📊 Teacher Requests Table: ${schema.tableExists ? '✅ EXISTS' : '❌ MISSING'}`);
                console.log(`   📊 Total Columns: ${schema.totalColumns || 'Unknown'}`);
                
                if (schema.optionalColumnsStatus) {
                    const optional = schema.optionalColumnsStatus;
                    console.log(`   📊 Optional Columns: ${optional.present}/${optional.total} present`);
                    
                    if (optional.missing > 0) {
                        console.log('   ⚠️  Missing columns detected:');
                        optional.details.forEach(col => {
                            if (!col.exists) {
                                console.log(`      - ${col.name} (${col.expected ? 'expected' : 'optional'})`);
                            }
                        });
                    }
                }
                
                if (schema.queryTest) {
                    console.log(`   📊 Query Test: ${schema.queryTest.works ? '✅ PASSES' : '❌ FAILS'}`);
                    if (!schema.queryTest.works && schema.queryTest.error) {
                        console.log(`      Error: ${schema.queryTest.error}`);
                    }
                }
                
                if (schema.recommendations && schema.recommendations.length > 0) {
                    console.log('   🔧 Recommendations:');
                    schema.recommendations.forEach(rec => {
                        console.log(`      ${rec.priority}: ${rec.solution}`);
                    });
                }
                
                this.results.databaseSchema = schema;
                
            } else {
                console.log(`   ❌ Schema check failed: ${schemaResult.status || 'Network Error'}`);
                if (schemaResult.data) {
                    console.log(`      ${schemaResult.data}`);
                }
            }
            
        } catch (error) {
            console.log('   ❌ Database schema analysis failed:', error.message);
        }
        
        await page.close();
        console.log('');
    }

    async generateDiagnosticReport() {
        console.log('\n' + '='*50);
        console.log('📋 DIAGNOSTIC REPORT');
        console.log('='*50 + '\n');
        
        // URL Accessibility Summary
        console.log('🌐 URL Accessibility:');
        Object.entries(this.results.urlAccessibility).forEach(([url, result]) => {
            const status = result.accessible ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE';
            console.log(`   ${url}: ${status}`);
        });
        
        // API Endpoints Summary  
        console.log('\n🔌 API Endpoints:');
        Object.entries(this.results.apiEndpoints).forEach(([name, result]) => {
            if (result.error) {
                console.log(`   ${name}: ❌ ERROR`);
            } else {
                const status = result.ok ? '✅ WORKING' : '❌ FAILING';
                console.log(`   ${name}: ${status} (${result.status})`);
            }
        });
        
        // Database Schema Summary
        console.log('\n🗃️ Database Schema:');
        if (this.results.databaseSchema.tableExists) {
            console.log('   Teacher Requests Table: ✅ EXISTS');
            if (this.results.databaseSchema.optionalColumnsStatus) {
                const missing = this.results.databaseSchema.optionalColumnsStatus.missing;
                if (missing > 0) {
                    console.log(`   Optional Columns: ⚠️  ${missing} MISSING`);
                } else {
                    console.log('   Optional Columns: ✅ ALL PRESENT');
                }
            }
        } else {
            console.log('   Teacher Requests Table: ❌ MISSING OR INACCESSIBLE');
        }
        
        // Root Cause Analysis
        console.log('\n🔍 ROOT CAUSE ANALYSIS:');
        
        const issues = [];
        
        // Check for URL accessibility issues
        if (!this.results.urlAccessibility['/reset-password.html']?.accessible) {
            issues.push('reset-password.html page not accessible');
        }
        
        // Check for API issues
        const passwordResetAPI = this.results.apiEndpoints['Unified Password Reset'];
        if (passwordResetAPI && !passwordResetAPI.ok && passwordResetAPI.status === 404) {
            issues.push('Unified password reset API endpoint missing');
        }
        
        // Check for database issues
        if (this.results.databaseSchema.optionalColumnsStatus?.missing > 0) {
            issues.push('Missing database columns causing API failures');
        }
        
        if (issues.length > 0) {
            issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        } else {
            console.log('   No obvious issues detected - check Railway logs for detailed errors');
        }
        
        // Next Steps
        console.log('\n🔧 RECOMMENDED NEXT STEPS:');
        console.log('1. Share the specific error message and URL you encountered');
        console.log('2. Check Railway application logs for detailed error messages');
        console.log('3. Test the password setting flow again with this diagnostic information');
        console.log('4. If database columns are missing, run the missing migrations');
        
        console.log('\n🏁 Diagnostic completed');
        console.log('Press Ctrl+C to close the browser when done reviewing');
    }

    async runFullDiagnostic() {
        try {
            await this.init();
            
            await this.testURLAccessibility();
            await this.testAPIEndpoints();
            await this.testTokenGeneration();
            await this.analyzeDatabaseSchema();
            
            await this.generateDiagnosticReport();
            
            // Keep browser open for manual inspection
            await new Promise(() => {});
            
        } catch (error) {
            console.log('❌ Diagnostic failed:', error.message);
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Run diagnostic if called directly
if (require.main === module) {
    const diagnostic = new PasswordSystemDiagnostic();
    
    // Handle cleanup on Ctrl+C
    process.on('SIGINT', async () => {
        console.log('\n👋 Cleaning up...');
        await diagnostic.cleanup();
        process.exit();
    });
    
    diagnostic.runFullDiagnostic().catch(console.error);
}

module.exports = PasswordSystemDiagnostic;