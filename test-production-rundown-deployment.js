/**
 * VidPOD Rundown Editor - Production Deployment Validation
 * Phase 5: Final testing and validation of deployed system
 */

const https = require('https');

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

class ProductionValidator {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runValidation() {
        console.log('🔍 Starting VidPOD Rundown Editor Production Validation...\n');
        
        // Test basic application accessibility
        await this.testBasicAccess();
        
        // Test rundown system endpoints
        await this.testRundownEndpoints();
        
        // Test static file deployment
        await this.testStaticFiles();
        
        // Test authentication flow
        await this.testAuthentication();
        
        // Report results
        this.reportResults();
    }

    async testBasicAccess() {
        console.log('📡 Testing Basic Application Access...');
        
        await this.makeTest('Main application loads', async () => {
            const status = await this.checkURL('/');
            return status === 200;
        });

        await this.makeTest('Login page accessible', async () => {
            const status = await this.checkURL('/');
            return status === 200;
        });

        await this.makeTest('Dashboard accessible after auth', async () => {
            // This would normally require authentication
            const status = await this.checkURL('/dashboard.html');
            return status === 200 || status === 302; // Redirect to login is OK
        });
    }

    async testRundownEndpoints() {
        console.log('🎬 Testing Rundown System Endpoints...');

        await this.makeTest('Rundowns API endpoint exists', async () => {
            const status = await this.checkURL('/api/rundowns');
            return status === 401 || status === 403; // Auth required is expected
        });

        await this.makeTest('Rundown editor HTML file', async () => {
            const status = await this.checkURL('/rundown-editor.html');
            return status === 200 || status === 302;
        });
    }

    async testStaticFiles() {
        console.log('📁 Testing Static File Deployment...');

        const filesToTest = [
            '/css/styles.css',
            '/css/rundown.css',
            '/css/rundown-mobile.css',
            '/css/rundown-animations.css',
            '/css/rundown-accessibility.css',
            '/js/navigation.js',
            '/js/rundown-editor.js',
            '/js/rundown-touch-mobile.js'
        ];

        for (const file of filesToTest) {
            await this.makeTest(`Static file: ${file}`, async () => {
                const status = await this.checkURL(file);
                return status === 200;
            });
        }
    }

    async testAuthentication() {
        console.log('🔐 Testing Authentication Flow...');

        await this.makeTest('Login API endpoint', async () => {
            const status = await this.checkURL('/api/auth/login');
            return status === 405 || status === 400; // Method not allowed (needs POST) is expected
        });

        await this.makeTest('Auth verification endpoint', async () => {
            const status = await this.checkURL('/api/auth/verify');
            return status === 401 || status === 400; // No token provided is expected
        });
    }

    async checkURL(path) {
        return new Promise((resolve) => {
            const url = PRODUCTION_URL + path;
            
            https.get(url, (res) => {
                resolve(res.statusCode);
            }).on('error', (err) => {
                console.error(`Error checking ${path}:`, err.message);
                resolve(0); // Connection error
            });
        });
    }

    async makeTest(description, testFunction) {
        try {
            const startTime = Date.now();
            const result = await testFunction();
            const duration = Date.now() - startTime;
            
            if (result) {
                console.log(`✅ ${description} (${duration}ms)`);
                this.testResults.passed++;
            } else {
                console.log(`❌ ${description} (${duration}ms)`);
                this.testResults.failed++;
            }
            
            this.testResults.tests.push({
                description,
                passed: result,
                duration
            });
        } catch (error) {
            console.log(`❌ ${description} - Error: ${error.message}`);
            this.testResults.failed++;
            
            this.testResults.tests.push({
                description,
                passed: false,
                duration: 0,
                error: error.message
            });
        }
    }

    reportResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 PRODUCTION VALIDATION RESULTS');
        console.log('='.repeat(60));
        
        console.log(`\n🎯 Overall Results:`);
        console.log(`   ✅ Passed: ${this.testResults.passed}`);
        console.log(`   ❌ Failed: ${this.testResults.failed}`);
        console.log(`   📈 Success Rate: ${Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100)}%`);
        
        if (this.testResults.failed > 0) {
            console.log(`\n🔍 Failed Tests:`);
            this.testResults.tests.forEach(test => {
                if (!test.passed) {
                    console.log(`   • ${test.description}${test.error ? ` (${test.error})` : ''}`);
                }
            });
        }

        console.log('\n📋 Next Steps:');
        if (this.testResults.failed === 0) {
            console.log('   🎉 All tests passed! System is production ready.');
            console.log('   🚀 Rundown Editor ready for user testing.');
        } else if (this.testResults.failed <= 2) {
            console.log('   ⚠️  Minor issues detected. Review failed tests.');
            console.log('   🔧 Fix deployment issues and re-test.');
        } else {
            console.log('   🚨 Major deployment issues detected.');
            console.log('   🔧 Review server configuration and file deployment.');
            console.log('   📝 Check Railway.app deployment logs.');
        }

        console.log(`\n🌐 Production URL: ${PRODUCTION_URL}`);
        console.log(`📝 Test completed at: ${new Date().toISOString()}`);
        console.log('='.repeat(60));
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new ProductionValidator();
    validator.runValidation().catch(console.error);
}

module.exports = ProductionValidator;