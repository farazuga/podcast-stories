#!/usr/bin/env node

/**
 * VidPOD Rundown System Production Debug & Test
 * Comprehensive testing of the rundown system in production environment
 */

const puppeteer = require('puppeteer');

// Production configuration
const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';
const TEST_ACCOUNTS = {
    admin: { email: 'admin@vidpod.com', password: 'vidpod' },
    teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
    student: { email: 'student@vidpod.com', password: 'vidpod' }
};

class RundownProductionTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            database: [],
            api: [],
            frontend: [],
            authentication: [],
            integration: []
        };
        this.tokens = {}; // Store auth tokens for each role
    }

    async init() {
        console.log('🚀 VidPOD Rundown System Production Test');
        console.log('🌐 Production URL:', PRODUCTION_URL);
        console.log('📅 Test Time:', new Date().toISOString());
        console.log('='.repeat(80) + '\n');

        try {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 30000
            });

            this.page = await this.browser.newPage();
            await this.page.setDefaultTimeout(30000);
            await this.page.setViewport({ width: 1366, height: 768 });

            // Set up error tracking
            this.page.on('console', msg => {
                if (msg.type() === 'error') {
                    this.addResult('frontend', 'ERROR', `Console Error: ${msg.text()}`);
                }
            });

            this.page.on('pageerror', error => {
                this.addResult('frontend', 'ERROR', `Page Error: ${error.message}`);
            });

            console.log('✅ Browser initialized successfully\n');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize browser:', error.message);
            return false;
        }
    }

    addResult(category, status, message) {
        this.results[category].push({
            status,
            message,
            timestamp: new Date().toISOString()
        });
        
        const emoji = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
        console.log(`${emoji} ${category.toUpperCase()}: ${message}`);
    }

    async testAuthentication() {
        console.log('🔐 Phase 1: Authentication Testing');
        console.log('-'.repeat(50));

        for (const [role, credentials] of Object.entries(TEST_ACCOUNTS)) {
            try {
                console.log(`\nTesting ${role} authentication...`);
                
                // Navigate to login page
                await this.page.goto(`${PRODUCTION_URL}`, { waitUntil: 'networkidle2' });
                
                // Fill login form
                await this.page.waitForSelector('#email', { timeout: 10000 });
                await this.page.evaluate(() => {
                    document.querySelector('#email').value = '';
                    document.querySelector('#password').value = '';
                });
                
                await this.page.type('#email', credentials.email);
                await this.page.type('#password', credentials.password);
                
                // Submit login
                await this.page.click('button[type="submit"]');
                
                // Wait for redirect or error
                await this.page.waitForTimeout(3000);
                
                const currentUrl = this.page.url();
                if (currentUrl.includes('dashboard') || currentUrl.includes('admin') || currentUrl.includes('teacher')) {
                    this.addResult('authentication', 'PASS', `${role} login successful`);
                    
                    // Extract token from localStorage
                    const token = await this.page.evaluate(() => localStorage.getItem('token'));
                    if (token) {
                        this.tokens[role] = token;
                        this.addResult('authentication', 'PASS', `${role} JWT token obtained`);
                    } else {
                        this.addResult('authentication', 'WARN', `${role} login successful but no token found`);
                    }
                } else {
                    this.addResult('authentication', 'ERROR', `${role} login failed - stayed on login page`);
                }
                
            } catch (error) {
                this.addResult('authentication', 'ERROR', `${role} authentication error: ${error.message}`);
            }
        }
    }

    async testAPIConnectivity() {
        console.log('\n🔌 Phase 2: API Connectivity Testing');
        console.log('-'.repeat(50));

        const endpoints = [
            { path: '/api/rundowns', method: 'GET', roles: ['admin', 'teacher', 'student'] },
            { path: '/api/rundown-segments', method: 'GET', roles: ['admin', 'teacher'] },
            { path: '/api/rundown-talent', method: 'GET', roles: ['admin', 'teacher'] },
            { path: '/api/rundown-stories', method: 'GET', roles: ['admin', 'teacher'] }
        ];

        for (const endpoint of endpoints) {
            console.log(`\nTesting ${endpoint.method} ${endpoint.path}...`);
            
            for (const role of endpoint.roles) {
                if (!this.tokens[role]) {
                    this.addResult('api', 'WARN', `Skipping ${endpoint.path} for ${role} - no token`);
                    continue;
                }

                try {
                    const response = await fetch(`${PRODUCTION_URL}${endpoint.path}`, {
                        method: endpoint.method,
                        headers: {
                            'Authorization': `Bearer ${this.tokens[role]}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        this.addResult('api', 'PASS', `${endpoint.path} (${role}): ${response.status} - returned ${Array.isArray(data) ? data.length + ' items' : 'data'}`);
                    } else {
                        const errorText = await response.text();
                        this.addResult('api', 'ERROR', `${endpoint.path} (${role}): ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
                    }
                } catch (error) {
                    this.addResult('api', 'ERROR', `${endpoint.path} (${role}): Request failed - ${error.message}`);
                }
            }
        }
    }

    async testFrontendPages() {
        console.log('\n🎨 Phase 3: Frontend Page Testing');
        console.log('-'.repeat(50));

        const pages = [
            { url: '/rundowns.html', name: 'Rundowns Page', roles: ['admin', 'teacher'] },
            { url: '/stories.html', name: 'Stories Page', roles: ['admin', 'teacher', 'student'] }
        ];

        for (const pageInfo of pages) {
            console.log(`\nTesting ${pageInfo.name}...`);
            
            for (const role of pageInfo.roles) {
                try {
                    // Login as this role first
                    if (this.tokens[role]) {
                        await this.page.goto(`${PRODUCTION_URL}`, { waitUntil: 'networkidle2' });
                        
                        // Set token in localStorage
                        await this.page.evaluate((token) => {
                            localStorage.setItem('token', token);
                        }, this.tokens[role]);
                    }
                    
                    // Navigate to the page
                    await this.page.goto(`${PRODUCTION_URL}${pageInfo.url}`, { waitUntil: 'networkidle2' });
                    
                    // Check if page loaded correctly
                    const currentUrl = this.page.url();
                    if (currentUrl.includes(pageInfo.url.replace('.html', ''))) {
                        this.addResult('frontend', 'PASS', `${pageInfo.name} accessible by ${role}`);
                        
                        // Check for specific elements
                        if (pageInfo.url === '/rundowns.html') {
                            const hasRundownElements = await this.page.evaluate(() => {
                                return document.querySelector('.page-header h1') && 
                                       document.querySelector('#rundownsGrid') &&
                                       document.querySelector('#createRundownBtn');
                            });
                            
                            if (hasRundownElements) {
                                this.addResult('frontend', 'PASS', `${pageInfo.name} has required elements (${role})`);
                            } else {
                                this.addResult('frontend', 'WARN', `${pageInfo.name} missing some elements (${role})`);
                            }
                        }
                        
                    } else if (currentUrl.includes('index.html') || currentUrl.endsWith('/')) {
                        this.addResult('frontend', 'WARN', `${pageInfo.name} redirected to login for ${role} - check navigation permissions`);
                    } else {
                        this.addResult('frontend', 'ERROR', `${pageInfo.name} unexpected redirect for ${role}: ${currentUrl}`);
                    }
                    
                } catch (error) {
                    this.addResult('frontend', 'ERROR', `${pageInfo.name} (${role}): ${error.message}`);
                }
            }
        }
    }

    async testNavigationIntegration() {
        console.log('\n🧭 Phase 4: Navigation Integration Testing');
        console.log('-'.repeat(50));

        try {
            // Test as admin first
            if (this.tokens.admin) {
                await this.page.goto(`${PRODUCTION_URL}`, { waitUntil: 'networkidle2' });
                await this.page.evaluate((token) => {
                    localStorage.setItem('token', token);
                }, this.tokens.admin);

                await this.page.goto(`${PRODUCTION_URL}/admin.html`, { waitUntil: 'networkidle2' });
                
                // Check if rundown navigation link exists
                const rundownNavLink = await this.page.$('a[href="/rundowns.html"]');
                if (rundownNavLink) {
                    const linkText = await rundownNavLink.evaluate(el => el.textContent);
                    this.addResult('integration', 'PASS', `Rundown navigation link found: "${linkText.trim()}"`);
                    
                    // Test if link works
                    await rundownNavLink.click();
                    await this.page.waitForTimeout(3000);
                    
                    if (this.page.url().includes('rundowns')) {
                        this.addResult('integration', 'PASS', 'Rundown navigation link functional');
                    } else {
                        this.addResult('integration', 'ERROR', 'Rundown navigation link not working');
                    }
                } else {
                    this.addResult('integration', 'ERROR', 'Rundown navigation link not found in admin navigation');
                }
            }
            
            // Test student access - should NOT see rundown link
            if (this.tokens.student) {
                await this.page.goto(`${PRODUCTION_URL}`, { waitUntil: 'networkidle2' });
                await this.page.evaluate((token) => {
                    localStorage.setItem('token', token);
                }, this.tokens.student);

                await this.page.goto(`${PRODUCTION_URL}/dashboard.html`, { waitUntil: 'networkidle2' });
                
                const studentRundownLink = await this.page.$('a[href="/rundowns.html"]');
                if (studentRundownLink) {
                    this.addResult('integration', 'ERROR', 'Student can see rundown navigation link (should be hidden)');
                } else {
                    this.addResult('integration', 'PASS', 'Student correctly cannot see rundown navigation link');
                }
            }
            
        } catch (error) {
            this.addResult('integration', 'ERROR', `Navigation test error: ${error.message}`);
        }
    }

    async testDatabaseMigration() {
        console.log('\n🗄️ Phase 5: Database Migration Testing');
        console.log('-'.repeat(50));

        if (!this.tokens.admin) {
            this.addResult('database', 'ERROR', 'Cannot test database - no admin token');
            return;
        }

        try {
            // Try to fetch rundowns to verify database tables exist
            const response = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
                headers: {
                    'Authorization': `Bearer ${this.tokens.admin}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.addResult('database', 'PASS', 'Rundown database tables accessible');
                
                const data = await response.json();
                this.addResult('database', 'PASS', `Found ${data.length} existing rundowns in database`);
            } else if (response.status === 404) {
                this.addResult('database', 'ERROR', 'Rundown API endpoint not found - check server.js registration');
            } else if (response.status === 500) {
                const errorText = await response.text();
                if (errorText.includes('relation') && errorText.includes('does not exist')) {
                    this.addResult('database', 'ERROR', 'Rundown tables do not exist - migration needed');
                } else {
                    this.addResult('database', 'ERROR', `Database error: ${errorText.substring(0, 200)}`);
                }
            } else {
                this.addResult('database', 'ERROR', `Unexpected database response: ${response.status} ${response.statusText}`);
            }

            // Test creating a rundown to verify full database functionality
            const createResponse = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.tokens.admin}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Production Test Rundown',
                    description: 'Test rundown created by production debug script',
                    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                })
            });

            if (createResponse.ok) {
                const createdRundown = await createResponse.json();
                this.addResult('database', 'PASS', `Successfully created test rundown (ID: ${createdRundown.id})`);
                
                // Clean up test rundown
                const deleteResponse = await fetch(`${PRODUCTION_URL}/api/rundowns/${createdRundown.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.tokens.admin}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (deleteResponse.ok) {
                    this.addResult('database', 'PASS', 'Test rundown cleaned up successfully');
                } else {
                    this.addResult('database', 'WARN', 'Test rundown created but cleanup failed');
                }
            } else {
                const errorText = await createResponse.text();
                this.addResult('database', 'ERROR', `Failed to create test rundown: ${createResponse.status} - ${errorText.substring(0, 200)}`);
            }

        } catch (error) {
            this.addResult('database', 'ERROR', `Database test error: ${error.message}`);
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📋 VidPOD RUNDOWN SYSTEM PRODUCTION TEST REPORT');
        console.log('='.repeat(80));

        let totalTests = 0;
        let totalPassed = 0;
        let totalWarnings = 0;
        let totalErrors = 0;

        for (const [category, results] of Object.entries(this.results)) {
            if (results.length === 0) continue;

            const passed = results.filter(r => r.status === 'PASS').length;
            const warnings = results.filter(r => r.status === 'WARN').length;
            const errors = results.filter(r => r.status === 'ERROR').length;

            totalTests += results.length;
            totalPassed += passed;
            totalWarnings += warnings;
            totalErrors += errors;

            console.log(`\n${category.toUpperCase()} RESULTS:`);
            console.log(`✅ Passed: ${passed}`);
            console.log(`⚠️  Warnings: ${warnings}`);
            console.log(`❌ Errors: ${errors}`);
            console.log(`📊 Success Rate: ${results.length > 0 ? Math.round((passed / results.length) * 100) : 0}%`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 OVERALL SUMMARY');
        console.log('='.repeat(80));
        console.log(`📝 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${totalPassed}`);
        console.log(`⚠️  Warnings: ${totalWarnings}`);
        console.log(`❌ Errors: ${totalErrors}`);
        console.log(`📊 Overall Success Rate: ${totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0}%`);

        // Determine system status
        if (totalErrors === 0 && totalWarnings === 0) {
            console.log('\n🎉 RUNDOWN SYSTEM FULLY FUNCTIONAL');
            console.log('All tests passed successfully. Production deployment is working correctly.');
        } else if (totalErrors === 0 && totalWarnings <= 3) {
            console.log('\n✅ RUNDOWN SYSTEM MOSTLY FUNCTIONAL');
            console.log('Minor issues detected but core functionality is working.');
        } else if (totalErrors <= 5) {
            console.log('\n⚠️  RUNDOWN SYSTEM NEEDS ATTENTION');
            console.log('Several issues detected that should be addressed.');
        } else {
            console.log('\n🚨 RUNDOWN SYSTEM HAS MAJOR ISSUES');
            console.log('Significant problems detected. System requires immediate attention.');
        }

        // Provide specific recommendations
        console.log('\n🔧 RECOMMENDATIONS:');
        if (this.results.database.some(r => r.status === 'ERROR' && r.message.includes('tables do not exist'))) {
            console.log('• Run database migration: psql $DATABASE_URL < backend/migrations/014_create_rundown_system.sql');
        }
        if (this.results.api.some(r => r.status === 'ERROR' && r.message.includes('404'))) {
            console.log('• Check server.js - rundown routes may not be registered');
        }
        if (this.results.frontend.some(r => r.status === 'ERROR')) {
            console.log('• Check frontend JavaScript files and CSS for errors');
        }
        if (this.results.authentication.some(r => r.status === 'ERROR')) {
            console.log('• Verify test account credentials and authentication system');
        }

        console.log('='.repeat(80));

        return {
            totalTests,
            totalPassed,
            totalWarnings,
            totalErrors,
            successRate: Math.round((totalPassed / totalTests) * 100),
            recommendations: this.getRecommendations()
        };
    }

    getRecommendations() {
        const recommendations = [];
        
        if (this.results.database.some(r => r.status === 'ERROR' && r.message.includes('tables do not exist'))) {
            recommendations.push('Database migration required');
        }
        if (this.results.api.some(r => r.status === 'ERROR' && r.message.includes('404'))) {
            recommendations.push('API routes not registered');
        }
        if (this.results.frontend.some(r => r.status === 'ERROR')) {
            recommendations.push('Frontend JavaScript errors');
        }
        
        return recommendations;
    }

    async run() {
        const initialized = await this.init();
        if (!initialized) {
            console.error('❌ Test initialization failed');
            process.exit(1);
        }

        try {
            await this.testAuthentication();
            await this.testDatabaseMigration();
            await this.testAPIConnectivity();
            await this.testFrontendPages();
            await this.testNavigationIntegration();
        } catch (error) {
            console.error('❌ Test execution error:', error.message);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }

        return this.generateReport();
    }
}

// Run the test
if (require.main === module) {
    const tester = new RundownProductionTester();
    tester.run().then(report => {
        process.exit(report.totalErrors > 0 ? 1 : 0);
    }).catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = RundownProductionTester;