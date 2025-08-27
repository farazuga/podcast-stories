/**
 * Teacher Requests Deployment Verification Script
 * 
 * This script specifically tests the production deployment for the "Failed to load teacher requests (500)" error.
 * It verifies API endpoints, database schema, and provides detailed diagnostics for the missing columns issue.
 */

const puppeteer = require('puppeteer');

class TeacherRequestsDeploymentVerifier {
    constructor(options = {}) {
        this.browser = null;
        this.page = null;
        this.baseUrl = process.env.BASE_URL || 'https://podcast-stories-production.up.railway.app';
        this.headless = options.headless || false;
        this.noHold = options.noHold || false;
        
        // Read credentials from environment variables - fail if missing
        if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
            throw new Error('Missing required environment variables: ADMIN_EMAIL and ADMIN_PASSWORD must be set');
        }
        
        this.adminCredentials = {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD
        };
        this.results = {
            authentication: null,
            apiHealth: null,
            teacherRequestsAPI: null,
            databaseSchema: null,
            environmentVars: null,
            recommendations: []
        };
    }

    async init() {
        console.log('🔍 Teacher Requests Deployment Verifier - Starting...\n');
        
        this.browser = await puppeteer.launch({ 
            headless: this.headless,
            defaultViewport: { width: 1200, height: 800 }
        });
        this.page = await this.browser.newPage();
        
        // Listen for console errors
        this.page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.log('❌ JavaScript Error:', msg.text());
            }
        });

        // Listen for failed network requests
        this.page.on('requestfailed', (req) => {
            console.log('❌ Network Request Failed:', req.url());
        });
    }

    async authenticateAdmin() {
        console.log('🔐 Authenticating as admin...');
        
        try {
            await this.page.goto(`${this.baseUrl}/index.html`);
            await this.page.waitForSelector('#email', { timeout: 5000 });
            
            await this.page.type('#email', this.adminCredentials.email);
            await this.page.type('#password', this.adminCredentials.password);
            await this.page.click('button[type="submit"]');
            
            await this.page.waitForNavigation({ timeout: 10000 });
            
            const currentUrl = this.page.url();
            const isAdminPage = currentUrl.includes('admin.html');
            const token = await this.page.evaluate(() => localStorage.getItem('token'));
            const user = await this.page.evaluate(() => JSON.parse(localStorage.getItem('user') || '{}'));
            
            this.results.authentication = {
                success: isAdminPage && token,
                currentUrl,
                tokenExists: !!token,
                userRole: user.role,
                tokenLength: token ? token.length : 0
            };
            
            console.log(`✅ Authentication: ${this.results.authentication.success ? 'SUCCESS' : 'FAILED'}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Token: ${token ? `Present (${token.length} chars)` : 'Missing'}\n`);
            
            return this.results.authentication.success;
            
        } catch (error) {
            console.log('❌ Authentication failed:', error.message);
            this.results.authentication = { success: false, error: error.message };
            return false;
        }
    }

    async testAPIHealth() {
        console.log('🏥 Testing API health endpoints...');
        
        try {
            const healthTests = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token');
                const baseApiUrl = `${window.location.protocol}//${window.location.host}/api`;
                
                const tests = {
                    generalHealth: null,
                    teacherRequestsHealth: null,
                    authTest: null
                };
                
                // Test general API health
                try {
                    const healthResponse = await fetch(`${baseApiUrl}/health`);
                    tests.generalHealth = {
                        status: healthResponse.status,
                        ok: healthResponse.ok,
                        data: healthResponse.ok ? await healthResponse.json() : await healthResponse.text()
                    };
                } catch (error) {
                    tests.generalHealth = { error: error.message };
                }
                
                // Test teacher requests health endpoint
                try {
                    const trHealthResponse = await fetch(`${baseApiUrl}/teacher-requests/health`);
                    tests.teacherRequestsHealth = {
                        status: trHealthResponse.status,
                        ok: trHealthResponse.ok,
                        data: trHealthResponse.ok ? await trHealthResponse.json() : await trHealthResponse.text()
                    };
                } catch (error) {
                    tests.teacherRequestsHealth = { error: error.message };
                }
                
                // Test authenticated endpoint
                try {
                    const authResponse = await fetch(`${baseApiUrl}/auth/verify`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    tests.authTest = {
                        status: authResponse.status,
                        ok: authResponse.ok,
                        data: authResponse.ok ? await authResponse.json() : await authResponse.text()
                    };
                } catch (error) {
                    tests.authTest = { error: error.message };
                }
                
                return tests;
            });
            
            this.results.apiHealth = healthTests;
            
            console.log('📊 API Health Results:');
            console.log(`   General Health: ${healthTests.generalHealth?.ok ? '✅ OK' : '❌ FAILED'}`);
            console.log(`   Teacher Requests Health: ${healthTests.teacherRequestsHealth?.ok ? '✅ OK' : '❌ FAILED'}`);
            console.log(`   Auth Verification: ${healthTests.authTest?.ok ? '✅ OK' : '❌ FAILED'}\n`);
            
            return healthTests.teacherRequestsHealth?.ok && healthTests.authTest?.ok;
            
        } catch (error) {
            console.log('❌ API health test failed:', error.message);
            this.results.apiHealth = { error: error.message };
            return false;
        }
    }

    async testTeacherRequestsAPI() {
        console.log('👥 Testing teacher requests API endpoint...');
        
        try {
            const apiTest = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token');
                const baseApiUrl = `${window.location.protocol}//${window.location.host}/api`;
                
                const testResults = {
                    withoutSkipColumns: null,
                    withSkipColumns: null,
                    errorAnalysis: null
                };
                
                // Test normal endpoint (should fail with 500 if columns missing)
                try {
                    const normalResponse = await fetch(`${baseApiUrl}/teacher-requests`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    testResults.withoutSkipColumns = {
                        status: normalResponse.status,
                        ok: normalResponse.ok,
                        statusText: normalResponse.statusText,
                        data: normalResponse.ok ? await normalResponse.json() : await normalResponse.text(),
                        headers: Object.fromEntries(normalResponse.headers.entries())
                    };
                } catch (error) {
                    testResults.withoutSkipColumns = { networkError: error.message };
                }
                
                // Test if there's a way to skip optional columns (hypothetical test)
                try {
                    const skipResponse = await fetch(`${baseApiUrl}/teacher-requests?skip_optional=true`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    testResults.withSkipColumns = {
                        status: skipResponse.status,
                        ok: skipResponse.ok,
                        statusText: skipResponse.statusText,
                        data: skipResponse.ok ? await skipResponse.json() : await skipResponse.text()
                    };
                } catch (error) {
                    testResults.withSkipColumns = { networkError: error.message };
                }
                
                return testResults;
            });
            
            this.results.teacherRequestsAPI = apiTest;
            
            console.log('📈 Teacher Requests API Test Results:');
            console.log(`   Normal Request: ${apiTest.withoutSkipColumns?.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
            console.log(`   Status: ${apiTest.withoutSkipColumns?.status || 'N/A'}`);
            
            if (!apiTest.withoutSkipColumns?.ok) {
                console.log(`   Error Details: ${apiTest.withoutSkipColumns?.data || apiTest.withoutSkipColumns?.networkError}`);
                
                // Analyze the error for database column issues
                const errorText = apiTest.withoutSkipColumns?.data || '';
                if (typeof errorText === 'string') {
                    if (errorText.includes('column') && errorText.includes('does not exist')) {
                        console.log('🎯 ROOT CAUSE IDENTIFIED: Missing database columns');
                        this.results.recommendations.push({
                            priority: 'HIGH',
                            issue: 'Missing database columns',
                            solution: 'Run database migrations or set SKIP_OPTIONAL_COLUMNS=true'
                        });
                    }
                    
                    if (errorText.includes('processed_at') || errorText.includes('action_type') || errorText.includes('password_set_at')) {
                        console.log('🎯 SPECIFIC COLUMNS MISSING: processed_at, action_type, or password_set_at');
                        this.results.recommendations.push({
                            priority: 'HIGH',
                            issue: 'Missing optional columns: processed_at, action_type, password_set_at',
                            solution: 'Run migration: 012_add_teacher_request_missing_columns.sql'
                        });
                    }
                }
            }
            
            console.log('');
            
            return apiTest.withoutSkipColumns?.ok;
            
        } catch (error) {
            console.log('❌ Teacher requests API test failed:', error.message);
            this.results.teacherRequestsAPI = { error: error.message };
            return false;
        }
    }

    async testDatabaseSchemaCheck() {
        console.log('🗃️ Testing database schema validation...');
        
        try {
            const schemaTest = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token');
                const baseApiUrl = `${window.location.protocol}//${window.location.host}/api`;
                
                // Test if there's a schema check endpoint
                try {
                    const schemaResponse = await fetch(`${baseApiUrl}/teacher-requests/schema-check`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    return {
                        available: true,
                        status: schemaResponse.status,
                        ok: schemaResponse.ok,
                        data: schemaResponse.ok ? await schemaResponse.json() : await schemaResponse.text()
                    };
                } catch (error) {
                    return {
                        available: false,
                        error: error.message
                    };
                }
            });
            
            this.results.databaseSchema = schemaTest;
            
            console.log('📋 Database Schema Check:');
            if (schemaTest.available && schemaTest.ok) {
                console.log('✅ Schema endpoint available');
                console.log('📊 Schema details:', schemaTest.data);
            } else {
                console.log('❌ Schema check endpoint not available or failed');
                this.results.recommendations.push({
                    priority: 'MEDIUM',
                    issue: 'Schema validation endpoint not available',
                    solution: 'Implement /teacher-requests/schema-check endpoint for easier debugging'
                });
            }
            
            console.log('');
            
            return schemaTest.available && schemaTest.ok;
            
        } catch (error) {
            console.log('❌ Database schema test failed:', error.message);
            this.results.databaseSchema = { error: error.message };
            return false;
        }
    }

    async checkEnvironmentVariables() {
        console.log('🌍 Checking relevant environment variables...');
        
        try {
            // We can't directly access server environment variables from the browser,
            // but we can infer their status from API behavior
            const envCheck = await this.page.evaluate(async () => {
                const token = localStorage.getItem('token');
                const baseApiUrl = `${window.location.protocol}//${window.location.host}/api`;
                
                // Try to make requests that would behave differently based on env vars
                const indicators = {
                    nodeEnv: window.location.protocol === 'https:' ? 'likely_production' : 'likely_development',
                    apiBaseDetected: baseApiUrl,
                    skipOptionalColumnsInferred: false
                };
                
                // Test a teacher request to see if it behaves like SKIP_OPTIONAL_COLUMNS is set
                try {
                    const testResponse = await fetch(`${baseApiUrl}/teacher-requests`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (testResponse.ok) {
                        indicators.skipOptionalColumnsInferred = true;
                        indicators.skipOptionalColumnsReason = 'API call succeeded - likely columns exist or are being skipped';
                    } else if (testResponse.status === 500) {
                        const errorText = await testResponse.text();
                        if (errorText.includes('column') && errorText.includes('does not exist')) {
                            indicators.skipOptionalColumnsInferred = false;
                            indicators.skipOptionalColumnsReason = 'API call failed with column error - SKIP_OPTIONAL_COLUMNS likely not set';
                        }
                    }
                } catch (error) {
                    indicators.testError = error.message;
                }
                
                return indicators;
            });
            
            this.results.environmentVars = envCheck;
            
            console.log('🔍 Environment Variable Analysis:');
            console.log(`   NODE_ENV: ${envCheck.nodeEnv}`);
            console.log(`   API Base URL: ${envCheck.apiBaseDetected}`);
            console.log(`   SKIP_OPTIONAL_COLUMNS Inferred: ${envCheck.skipOptionalColumnsInferred}`);
            if (envCheck.skipOptionalColumnsReason) {
                console.log(`   Reasoning: ${envCheck.skipOptionalColumnsReason}`);
            }
            
            if (!envCheck.skipOptionalColumnsInferred) {
                this.results.recommendations.push({
                    priority: 'IMMEDIATE',
                    issue: 'SKIP_OPTIONAL_COLUMNS environment variable likely not set',
                    solution: 'Set SKIP_OPTIONAL_COLUMNS=true in Railway environment variables as immediate fix'
                });
            }
            
            console.log('');
            
            return true;
            
        } catch (error) {
            console.log('❌ Environment variable check failed:', error.message);
            this.results.environmentVars = { error: error.message };
            return false;
        }
    }

    async generateDetailedReport() {
        console.log('\n📋 DEPLOYMENT VERIFICATION REPORT');
        console.log('==================================\n');
        
        // Summary
        const authOk = this.results.authentication?.success;
        const healthOk = this.results.apiHealth && !this.results.apiHealth.error;
        const teacherReqOk = this.results.teacherRequestsAPI?.withoutSkipColumns?.ok;
        
        console.log('📊 SUMMARY:');
        console.log(`   Authentication: ${authOk ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   API Health: ${healthOk ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   Teacher Requests API: ${teacherReqOk ? '✅ PASS' : '❌ FAIL'}`);
        console.log('');
        
        // Root Cause Analysis
        console.log('🔍 ROOT CAUSE ANALYSIS:');
        if (!teacherReqOk && this.results.teacherRequestsAPI?.withoutSkipColumns?.status === 500) {
            const errorData = this.results.teacherRequestsAPI.withoutSkipColumns.data;
            if (typeof errorData === 'string' && errorData.includes('column') && errorData.includes('does not exist')) {
                console.log('✅ CONFIRMED: Missing database columns causing 500 error');
                console.log('   The teacher_requests table is missing optional columns:');
                console.log('   - processed_at (TIMESTAMP)');
                console.log('   - action_type (TEXT)');
                console.log('   - password_set_at (TIMESTAMP)');
                console.log('');
            }
        }
        
        // Immediate Fixes
        console.log('🚨 IMMEDIATE FIXES (Priority Order):');
        this.results.recommendations
            .filter(r => r.priority === 'IMMEDIATE' || r.priority === 'HIGH')
            .forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec.issue}`);
                console.log(`      Solution: ${rec.solution}`);
                console.log('');
            });
        
        // Permanent Solutions
        console.log('🔧 PERMANENT SOLUTIONS:');
        console.log('   1. Run Database Migrations:');
        console.log('      - backend/migrations/012_add_teacher_request_missing_columns.sql');
        console.log('      - backend/migrations/add_teacher_request_audit_fields.sql');
        console.log('');
        console.log('   2. Use Migration Script:');
        console.log('      - node backend/scripts/run-teacher-requests-migration.js');
        console.log('');
        console.log('   3. Remove Environment Variable:');
        console.log('      - After migrations, remove SKIP_OPTIONAL_COLUMNS from Railway');
        console.log('');
        
        // Quick Commands
        console.log('⚡ QUICK DEPLOYMENT COMMANDS:');
        console.log('   Immediate Fix (Railway Dashboard):');
        console.log('   - Go to Environment Variables');
        console.log('   - Add: SKIP_OPTIONAL_COLUMNS=true');
        console.log('   - Deploy changes');
        console.log('');
        console.log('   Test Fix:');
        console.log('   - node testing/debug/verify-teacher-requests-deployment.js');
        console.log('');
        
        // Detailed Results
        console.log('📄 DETAILED RESULTS:');
        console.log('   Authentication:', JSON.stringify(this.results.authentication, null, 2));
        console.log('   API Health:', JSON.stringify(this.results.apiHealth, null, 2));
        console.log('   Teacher Requests API:', JSON.stringify(this.results.teacherRequestsAPI, null, 2));
        console.log('');
        
        console.log('🏁 Verification completed');
        console.log('   Next steps: Follow the immediate fixes above to resolve the 500 error');
    }

    async runFullVerification() {
        try {
            await this.init();
            
            const authSuccess = await this.authenticateAdmin();
            if (!authSuccess) {
                console.log('❌ Cannot continue - authentication failed');
                await this.generateDetailedReport();
                return;
            }
            
            await this.testAPIHealth();
            await this.testTeacherRequestsAPI();
            await this.testDatabaseSchemaCheck();
            await this.checkEnvironmentVariables();
            
            await this.generateDetailedReport();
            
        } catch (error) {
            console.log('❌ Verification failed:', error.message);
        } finally {
            if (this.browser) {
                if (this.noHold || this.headless) {
                    console.log('\n🔄 Closing browser automatically');
                    await this.browser.close();
                    
                    // Exit with appropriate code
                    const hasFailures = !this.results.authentication?.success || 
                                      !this.results.teacherRequestsAPI?.withoutSkipColumns?.ok;
                    process.exit(hasFailures ? 1 : 0);
                } else {
                    console.log('\n👀 Browser kept open for manual inspection');
                    console.log('   Press Ctrl+C to close when done');
                    
                    // Wait for manual close
                    await new Promise(() => {});
                }
            }
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    headless: args.includes('--headless'),
    noHold: args.includes('--no-hold')
};

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
    console.log('\nTeacher Requests Deployment Verifier');
    console.log('====================================\n');
    console.log('Usage:');
    console.log('  node testing/debug/verify-teacher-requests-deployment.js [options]\n');
    console.log('Options:');
    console.log('  --headless       Run browser in headless mode (no GUI)');
    console.log('  --no-hold        Exit automatically after verification (don\'t wait)');
    console.log('  --help, -h       Show this help\n');
    console.log('Environment Variables (Required):');
    console.log('  ADMIN_EMAIL      Admin user email for authentication');
    console.log('  ADMIN_PASSWORD   Admin user password');
    console.log('  BASE_URL         Base URL to test (optional, defaults to production)\n');
    console.log('Examples:');
    console.log('  ADMIN_EMAIL=admin@vidpod.com ADMIN_PASSWORD=vidpod node testing/debug/verify-teacher-requests-deployment.js');
    console.log('  ADMIN_EMAIL=admin@vidpod.com ADMIN_PASSWORD=vidpod node testing/debug/verify-teacher-requests-deployment.js --headless --no-hold');
    console.log('');
    process.exit(0);
}

// Run the verification
const verifier = new TeacherRequestsDeploymentVerifier(options);

// Handle cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n👋 Cleaning up...');
    await verifier.cleanup();
    process.exit();
});

verifier.runFullVerification().catch(console.error);