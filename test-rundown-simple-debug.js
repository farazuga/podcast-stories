#!/usr/bin/env node

/**
 * Simple Rundown System Debug Test
 * Direct API testing without browser dependencies
 */

// Production configuration
const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';
const TEST_ACCOUNTS = {
    admin: { email: 'admin@vidpod.com', password: 'vidpod' },
    teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
    student: { email: 'student@vidpod.com', password: 'vidpod' }
};

class SimpleRundownTester {
    constructor() {
        this.results = [];
        this.tokens = {};
    }

    log(status, category, message) {
        const emoji = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
        console.log(`${emoji} ${category}: ${message}`);
        this.results.push({ status, category, message });
    }

    async testAuthentication() {
        console.log('🔐 Testing Authentication');
        console.log('-'.repeat(50));

        for (const [role, credentials] of Object.entries(TEST_ACCOUNTS)) {
            try {
                const response = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.token) {
                        this.tokens[role] = data.token;
                        this.log('PASS', 'AUTH', `${role} authentication successful`);
                    } else {
                        this.log('ERROR', 'AUTH', `${role} login successful but no token returned`);
                    }
                } else {
                    const errorText = await response.text();
                    this.log('ERROR', 'AUTH', `${role} login failed: ${response.status} - ${errorText}`);
                }
            } catch (error) {
                this.log('ERROR', 'AUTH', `${role} authentication error: ${error.message}`);
            }
        }
    }

    async testRundownEndpoints() {
        console.log('\n🔌 Testing Rundown API Endpoints');
        console.log('-'.repeat(50));

        const endpoints = [
            { path: '/api/rundowns', method: 'GET', description: 'Get rundowns list' },
            { path: '/api/rundown-segments', method: 'GET', description: 'Get segments endpoint' },
            { path: '/api/rundown-talent', method: 'GET', description: 'Get talent endpoint' },
            { path: '/api/rundown-stories', method: 'GET', description: 'Get stories endpoint' }
        ];

        for (const endpoint of endpoints) {
            console.log(`\nTesting ${endpoint.method} ${endpoint.path}...`);

            // Test with admin token if available
            if (this.tokens.admin) {
                try {
                    const response = await fetch(`${PRODUCTION_URL}${endpoint.path}`, {
                        method: endpoint.method,
                        headers: {
                            'Authorization': `Bearer ${this.tokens.admin}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        this.log('PASS', 'API', `${endpoint.path}: ${response.status} - returned ${Array.isArray(data) ? data.length + ' items' : 'data'}`);
                    } else {
                        const errorText = await response.text();
                        
                        // Check for specific database errors
                        if (errorText.includes('relation') && errorText.includes('does not exist')) {
                            this.log('ERROR', 'DB', `${endpoint.path}: Database table missing - ${errorText.match(/relation "([^"]+)" does not exist/)?.[1] || 'unknown table'}`);
                        } else {
                            this.log('ERROR', 'API', `${endpoint.path}: ${response.status} ${response.statusText} - ${errorText.substring(0, 150)}`);
                        }
                    }
                } catch (error) {
                    this.log('ERROR', 'API', `${endpoint.path}: Network error - ${error.message}`);
                }
            } else {
                this.log('WARN', 'API', `Skipping ${endpoint.path} - no admin token available`);
            }
        }
    }

    async testCreateRundown() {
        console.log('\n📝 Testing Rundown Creation');
        console.log('-'.repeat(50));

        if (!this.tokens.admin) {
            this.log('WARN', 'CREATE', 'Skipping rundown creation - no admin token');
            return;
        }

        try {
            const testRundown = {
                title: 'Debug Test Rundown',
                description: 'Test rundown created by debug script',
                scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            const response = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.tokens.admin}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testRundown)
            });

            if (response.ok) {
                const createdRundown = await response.json();
                this.log('PASS', 'CREATE', `Successfully created rundown ID: ${createdRundown.id}`);

                // Test getting the specific rundown
                const getResponse = await fetch(`${PRODUCTION_URL}/api/rundowns/${createdRundown.id}`, {
                    headers: {
                        'Authorization': `Bearer ${this.tokens.admin}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (getResponse.ok) {
                    const rundownDetails = await getResponse.json();
                    this.log('PASS', 'GET', `Successfully retrieved rundown with ${rundownDetails.segments?.length || 0} segments`);
                } else {
                    this.log('ERROR', 'GET', `Failed to retrieve created rundown: ${getResponse.status}`);
                }

                // Clean up - delete the test rundown
                const deleteResponse = await fetch(`${PRODUCTION_URL}/api/rundowns/${createdRundown.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.tokens.admin}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (deleteResponse.ok) {
                    this.log('PASS', 'DELETE', 'Successfully cleaned up test rundown');
                } else {
                    this.log('WARN', 'DELETE', `Test rundown created but cleanup failed: ${deleteResponse.status}`);
                }

            } else {
                const errorText = await response.text();
                this.log('ERROR', 'CREATE', `Failed to create rundown: ${response.status} - ${errorText}`);
            }

        } catch (error) {
            this.log('ERROR', 'CREATE', `Rundown creation error: ${error.message}`);
        }
    }

    async testServerRegistration() {
        console.log('\n⚙️ Testing Server Route Registration');
        console.log('-'.repeat(50));

        // Test if the basic API is responding
        try {
            const response = await fetch(`${PRODUCTION_URL}/api/auth/verify`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            // We expect 401 without token, but should not get 404
            if (response.status === 401) {
                this.log('PASS', 'SERVER', 'Basic API endpoints are registered and responding');
            } else if (response.status === 404) {
                this.log('ERROR', 'SERVER', 'API endpoints not found - server routing issue');
            } else {
                this.log('WARN', 'SERVER', `Unexpected response from auth verify: ${response.status}`);
            }
        } catch (error) {
            this.log('ERROR', 'SERVER', `Server connectivity error: ${error.message}`);
        }

        // Test specific rundown endpoint registration
        try {
            const response = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.status === 401) {
                this.log('PASS', 'ROUTES', 'Rundown routes are registered (401 auth required as expected)');
            } else if (response.status === 404) {
                this.log('ERROR', 'ROUTES', 'Rundown routes NOT registered in server.js');
            } else {
                this.log('WARN', 'ROUTES', `Unexpected rundown endpoint response: ${response.status}`);
            }
        } catch (error) {
            this.log('ERROR', 'ROUTES', `Rundown route test error: ${error.message}`);
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📋 SIMPLE RUNDOWN SYSTEM DEBUG REPORT');
        console.log('='.repeat(80));

        const categories = ['AUTH', 'API', 'DB', 'CREATE', 'GET', 'DELETE', 'SERVER', 'ROUTES'];
        const summary = {};

        categories.forEach(cat => {
            const results = this.results.filter(r => r.category === cat);
            summary[cat] = {
                total: results.length,
                passed: results.filter(r => r.status === 'PASS').length,
                warnings: results.filter(r => r.status === 'WARN').length,
                errors: results.filter(r => r.status === 'ERROR').length
            };
        });

        let totalTests = 0;
        let totalPassed = 0;
        let totalErrors = 0;

        for (const [category, stats] of Object.entries(summary)) {
            if (stats.total === 0) continue;

            console.log(`\n${category}:`);
            console.log(`  ✅ Passed: ${stats.passed}`);
            console.log(`  ⚠️  Warnings: ${stats.warnings}`);
            console.log(`  ❌ Errors: ${stats.errors}`);

            totalTests += stats.total;
            totalPassed += stats.passed;
            totalErrors += stats.errors;
        }

        console.log('\n' + '='.repeat(80));
        console.log(`📊 OVERALL: ${totalPassed}/${totalTests} tests passed (${Math.round((totalPassed/totalTests)*100)}%)`);

        // Diagnosis
        const dbErrors = this.results.filter(r => r.category === 'DB' && r.status === 'ERROR');
        const authErrors = this.results.filter(r => r.category === 'AUTH' && r.status === 'ERROR');
        const routeErrors = this.results.filter(r => r.category === 'ROUTES' && r.status === 'ERROR');

        console.log('\n🔍 DIAGNOSIS:');
        if (authErrors.length > 0) {
            console.log('❌ CRITICAL: Authentication system not working');
        }
        if (routeErrors.length > 0) {
            console.log('❌ CRITICAL: Rundown routes not registered in server.js');
        }
        if (dbErrors.length > 0) {
            console.log('❌ CRITICAL: Database tables missing - migration required');
            dbErrors.forEach(error => {
                console.log(`   • ${error.message}`);
            });
        }
        if (totalErrors === 0) {
            console.log('✅ System appears to be functioning correctly');
        }

        console.log('\n🛠️ RECOMMENDED ACTIONS:');
        if (dbErrors.length > 0) {
            console.log('1. Run database migration:');
            console.log('   psql $DATABASE_URL < backend/migrations/014_create_rundown_system.sql');
        }
        if (authErrors.length > 0) {
            console.log('2. Check authentication credentials and system');
        }
        if (routeErrors.length > 0) {
            console.log('3. Verify rundown routes are registered in server.js');
        }

        console.log('='.repeat(80));

        return { totalTests, totalPassed, totalErrors, recommendations: this.getRecommendations() };
    }

    getRecommendations() {
        const recommendations = [];
        
        if (this.results.some(r => r.category === 'DB' && r.status === 'ERROR')) {
            recommendations.push('Database migration required');
        }
        if (this.results.some(r => r.category === 'AUTH' && r.status === 'ERROR')) {
            recommendations.push('Authentication system needs fixing');
        }
        if (this.results.some(r => r.category === 'ROUTES' && r.status === 'ERROR')) {
            recommendations.push('Server route registration needed');
        }
        
        return recommendations;
    }

    async run() {
        console.log('🚀 Simple VidPOD Rundown System Debug');
        console.log('🌐 Production URL:', PRODUCTION_URL);
        console.log('📅 Test Time:', new Date().toISOString());
        console.log('='.repeat(80));

        await this.testAuthentication();
        await this.testServerRegistration();
        await this.testRundownEndpoints();
        await this.testCreateRundown();

        return this.generateReport();
    }
}

// Run the test
if (require.main === module) {
    const tester = new SimpleRundownTester();
    tester.run().then(report => {
        process.exit(report.totalErrors > 0 ? 1 : 0);
    }).catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = SimpleRundownTester;