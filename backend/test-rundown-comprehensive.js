#!/usr/bin/env node

/**
 * Comprehensive Rundown System Test
 * Tests all aspects of the rundown system including auth, API, database, and frontend integration
 */

const puppeteer = require('puppeteer');
const { Pool } = require('pg');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = { email: 'admin@vidpod.com', password: 'vidpod' };
const TEST_TIMEOUT = 30000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/podcast_stories',
    ssl: false
});

class RundownTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            database: { passed: 0, failed: 0, details: [] },
            api: { passed: 0, failed: 0, details: [] },
            frontend: { passed: 0, failed: 0, details: [] },
            integration: { passed: 0, failed: 0, details: [] }
        };
        this.adminToken = null;
    }

    async init() {
        console.log('🚀 Initializing Comprehensive Rundown System Test\n');
        
        try {
            // Initialize browser
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: TEST_TIMEOUT
            });
            
            this.page = await this.browser.newPage();
            await this.page.setDefaultTimeout(TEST_TIMEOUT);
            
            // Set viewport
            await this.page.setViewport({ width: 1366, height: 768 });
            
            console.log('✅ Browser initialized successfully\n');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize test environment:', error.message);
            return false;
        }
    }

    async testDatabase() {
        console.log('🗄️  Testing Database Layer');
        console.log('='.repeat(50));

        try {
            // Test 1: Database connection
            console.log('📊 Test 1: Database Connection');
            const connectionTest = await pool.query('SELECT NOW() as current_time');
            this.addResult('database', true, 'Database connection successful');
            console.log('✅ Database connected successfully');

            // Test 2: Check rundown tables exist
            console.log('\n📊 Test 2: Rundown Tables Existence');
            const tables = ['rundowns', 'rundown_segments', 'rundown_talent', 'rundown_stories'];
            
            for (const table of tables) {
                try {
                    const tableCheck = await pool.query(`
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = $1 
                        ORDER BY ordinal_position
                    `, [table]);
                    
                    if (tableCheck.rows.length > 0) {
                        this.addResult('database', true, `Table ${table} exists with ${tableCheck.rows.length} columns`);
                        console.log(`✅ Table ${table}: ${tableCheck.rows.length} columns`);
                    } else {
                        this.addResult('database', false, `Table ${table} does not exist`);
                        console.log(`❌ Table ${table}: NOT FOUND`);
                    }
                } catch (error) {
                    this.addResult('database', false, `Table ${table} check failed: ${error.message}`);
                    console.log(`❌ Table ${table}: ERROR - ${error.message}`);
                }
            }

            // Test 3: Check indexes
            console.log('\n📊 Test 3: Database Indexes');
            const indexCheck = await pool.query(`
                SELECT indexname, tablename 
                FROM pg_indexes 
                WHERE tablename LIKE 'rundown%' 
                ORDER BY tablename, indexname
            `);
            
            if (indexCheck.rows.length > 0) {
                this.addResult('database', true, `Found ${indexCheck.rows.length} rundown indexes`);
                console.log(`✅ Indexes: ${indexCheck.rows.length} found`);
                indexCheck.rows.forEach(idx => {
                    console.log(`   - ${idx.tablename}.${idx.indexname}`);
                });
            } else {
                this.addResult('database', false, 'No rundown indexes found');
                console.log('❌ No rundown indexes found');
            }

            // Test 4: Test user_classes table (needed for student access)
            console.log('\n📊 Test 4: User Classes Table (Student Access)');
            try {
                const userClassesCheck = await pool.query(`
                    SELECT COUNT(*) as count 
                    FROM information_schema.tables 
                    WHERE table_name = 'user_classes'
                `);
                
                if (userClassesCheck.rows[0].count > 0) {
                    this.addResult('database', true, 'user_classes table exists for student enrollment');
                    console.log('✅ user_classes table exists');
                } else {
                    this.addResult('database', false, 'user_classes table missing - students cannot access rundowns');
                    console.log('❌ user_classes table missing');
                }
            } catch (error) {
                this.addResult('database', false, `user_classes table check failed: ${error.message}`);
                console.log(`❌ user_classes check error: ${error.message}`);
            }

        } catch (error) {
            this.addResult('database', false, `Database test failed: ${error.message}`);
            console.error('❌ Database test error:', error.message);
        }
    }

    async testAPI() {
        console.log('\n🔌 Testing API Layer');
        console.log('='.repeat(50));

        try {
            // Test 1: Authentication
            console.log('🔑 Test 1: Admin Authentication');
            const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ADMIN_CREDENTIALS)
            });

            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                this.adminToken = loginData.token;
                this.addResult('api', true, 'Admin authentication successful');
                console.log('✅ Admin login successful');
            } else {
                this.addResult('api', false, `Admin login failed: ${loginResponse.status}`);
                console.log(`❌ Admin login failed: ${loginResponse.status}`);
                return; // Can't continue without token
            }

            // Test 2: Get Rundowns (should return empty array initially)
            console.log('\n🔑 Test 2: GET Rundowns Endpoint');
            const getResponse = await fetch(`${BASE_URL}/api/rundowns`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (getResponse.ok) {
                const rundowns = await getResponse.json();
                this.addResult('api', true, `GET rundowns successful, returned ${rundowns.length} items`);
                console.log(`✅ GET rundowns: ${rundowns.length} items returned`);
            } else {
                this.addResult('api', false, `GET rundowns failed: ${getResponse.status}`);
                console.log(`❌ GET rundowns failed: ${getResponse.status}`);
            }

            // Test 3: Create Test Rundown
            console.log('\n🔑 Test 3: POST Create Rundown');
            const createResponse = await fetch(`${BASE_URL}/api/rundowns`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Test Rundown - Comprehensive Testing',
                    description: 'This is a test rundown created by the comprehensive test suite',
                    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                })
            });

            if (createResponse.ok) {
                const createdRundown = await createResponse.json();
                this.testRundownId = createdRundown.id;
                this.addResult('api', true, `Created test rundown with ID ${createdRundown.id}`);
                console.log(`✅ Created test rundown: ID ${createdRundown.id}`);
            } else {
                const errorText = await createResponse.text();
                this.addResult('api', false, `Create rundown failed: ${createResponse.status} - ${errorText}`);
                console.log(`❌ Create rundown failed: ${createResponse.status}`);
            }

            // Test 4: Test other rundown endpoints if creation succeeded
            if (this.testRundownId) {
                console.log('\n🔑 Test 4: Additional API Endpoints');
                
                // Test segments endpoint
                const segmentsResponse = await fetch(`${BASE_URL}/api/rundown-segments/rundown/${this.testRundownId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.adminToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (segmentsResponse.ok) {
                    const segments = await segmentsResponse.json();
                    this.addResult('api', true, `GET segments successful, found ${segments.length} segments`);
                    console.log(`✅ GET segments: ${segments.length} segments found`);
                } else {
                    this.addResult('api', false, `GET segments failed: ${segmentsResponse.status}`);
                    console.log(`❌ GET segments failed: ${segmentsResponse.status}`);
                }

                // Test talent endpoint
                const talentResponse = await fetch(`${BASE_URL}/api/rundown-talent/rundown/${this.testRundownId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.adminToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (talentResponse.ok) {
                    const talent = await talentResponse.json();
                    this.addResult('api', true, `GET talent successful, found ${talent.length} talent members`);
                    console.log(`✅ GET talent: ${talent.length} talent members found`);
                } else {
                    this.addResult('api', false, `GET talent failed: ${talentResponse.status}`);
                    console.log(`❌ GET talent failed: ${talentResponse.status}`);
                }
            }

        } catch (error) {
            this.addResult('api', false, `API test error: ${error.message}`);
            console.error('❌ API test error:', error.message);
        }
    }

    async testFrontend() {
        console.log('\n🎨 Testing Frontend Layer');
        console.log('='.repeat(50));

        try {
            // Test 1: Load rundowns page
            console.log('🌐 Test 1: Load Rundowns Page');
            await this.page.goto(`${BASE_URL}/rundowns.html`, { waitUntil: 'networkidle2' });
            
            // Check if redirected to login (expected without auth)
            const currentUrl = this.page.url();
            if (currentUrl.includes('index.html') || currentUrl.endsWith('/')) {
                this.addResult('frontend', true, 'Rundowns page redirects to login when not authenticated');
                console.log('✅ Authentication redirect working');
            } else {
                this.addResult('frontend', false, 'Rundowns page accessible without authentication');
                console.log('❌ No authentication redirect');
            }

            // Test 2: Login and access rundowns
            console.log('\n🌐 Test 2: Admin Login Flow');
            if (currentUrl.includes('index.html') || currentUrl.endsWith('/')) {
                // We're on login page, let's login
                await this.page.waitForSelector('#email', { timeout: 5000 });
                await this.page.type('#email', ADMIN_CREDENTIALS.email);
                await this.page.type('#password', ADMIN_CREDENTIALS.password);
                await this.page.click('button[type="submit"]');
                
                // Wait for redirect
                await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                
                this.addResult('frontend', true, 'Login flow completed successfully');
                console.log('✅ Login successful');
            }

            // Test 3: Navigate to rundowns page after login
            console.log('\n🌐 Test 3: Access Rundowns After Login');
            await this.page.goto(`${BASE_URL}/rundowns.html`, { waitUntil: 'networkidle2' });
            
            // Wait for page to load and check for key elements
            await this.page.waitForSelector('.page-header', { timeout: 5000 });
            
            const pageTitle = await this.page.$eval('h1', el => el.textContent);
            if (pageTitle.includes('Rundown')) {
                this.addResult('frontend', true, 'Rundowns page loaded successfully');
                console.log('✅ Rundowns page accessible after login');
            } else {
                this.addResult('frontend', false, 'Rundowns page did not load correctly');
                console.log('❌ Rundowns page loading issue');
            }

            // Test 4: Check if scripts load without errors
            console.log('\n🌐 Test 4: JavaScript Errors Check');
            const jsErrors = [];
            this.page.on('console', msg => {
                if (msg.type() === 'error') {
                    jsErrors.push(msg.text());
                }
            });
            
            this.page.on('pageerror', error => {
                jsErrors.push(error.message);
            });

            // Wait a bit for scripts to execute
            await this.page.waitForTimeout(3000);

            if (jsErrors.length === 0) {
                this.addResult('frontend', true, 'No JavaScript errors detected');
                console.log('✅ No JavaScript errors');
            } else {
                this.addResult('frontend', false, `JavaScript errors found: ${jsErrors.join(', ')}`);
                console.log(`❌ JavaScript errors: ${jsErrors.length} found`);
                jsErrors.forEach(error => console.log(`   - ${error}`));
            }

            // Test 5: Check if API requests are working
            console.log('\n🌐 Test 5: Frontend API Integration');
            const responses = [];
            this.page.on('response', response => {
                if (response.url().includes('/api/rundowns')) {
                    responses.push({
                        url: response.url(),
                        status: response.status(),
                        statusText: response.statusText()
                    });
                }
            });

            // Trigger a page refresh to make API calls
            await this.page.reload({ waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(2000);

            if (responses.length > 0) {
                const successfulResponses = responses.filter(r => r.status === 200);
                if (successfulResponses.length > 0) {
                    this.addResult('frontend', true, `API requests successful: ${successfulResponses.length}/${responses.length}`);
                    console.log(`✅ API integration working: ${successfulResponses.length} successful requests`);
                } else {
                    this.addResult('frontend', false, `All API requests failed: ${responses.map(r => `${r.status} ${r.statusText}`).join(', ')}`);
                    console.log(`❌ API requests failing: ${responses.map(r => r.status).join(', ')}`);
                }
            } else {
                this.addResult('frontend', false, 'No API requests detected');
                console.log('❌ No API requests made from frontend');
            }

        } catch (error) {
            this.addResult('frontend', false, `Frontend test error: ${error.message}`);
            console.error('❌ Frontend test error:', error.message);
        }
    }

    async testIntegration() {
        console.log('\n🔗 Testing System Integration');
        console.log('='.repeat(50));

        try {
            // Test 1: Navigation integration
            console.log('🔗 Test 1: Navigation Integration');
            await this.page.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'networkidle2' });
            
            // Look for rundown navigation link
            const rundownLink = await this.page.$('a[href="/rundowns.html"]');
            if (rundownLink) {
                const linkText = await rundownLink.evaluate(el => el.textContent);
                if (linkText.includes('Rundown')) {
                    this.addResult('integration', true, 'Rundown navigation link found in main navigation');
                    console.log('✅ Navigation integration working');
                } else {
                    this.addResult('integration', false, 'Rundown link exists but has wrong text');
                    console.log('❌ Navigation link text issue');
                }
            } else {
                this.addResult('integration', false, 'Rundown navigation link not found');
                console.log('❌ Navigation integration missing');
            }

            // Test 2: Stories page integration
            console.log('\n🔗 Test 2: Stories Page Integration');
            await this.page.goto(`${BASE_URL}/stories.html`, { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(3000);

            // Check if rundown scripts are loading based on user role
            const rundownScriptLoaded = await this.page.evaluate(() => {
                return window.RundownUtils !== undefined || window.rundownStories !== undefined;
            });

            if (rundownScriptLoaded) {
                this.addResult('integration', true, 'Rundown scripts loaded on stories page');
                console.log('✅ Stories page rundown integration working');
            } else {
                this.addResult('integration', false, 'Rundown scripts not loaded on stories page');
                console.log('❌ Stories page integration issue');
            }

            // Test 3: File structure integration
            console.log('\n🔗 Test 3: File Structure Verification');
            const requiredFiles = [
                'backend/routes/rundowns.js',
                'backend/routes/rundown-segments.js',
                'backend/routes/rundown-talent.js',
                'backend/routes/rundown-stories.js',
                'backend/frontend/rundowns.html',
                'backend/frontend/css/rundown.css',
                'backend/frontend/js/rundowns.js',
                'backend/frontend/js/rundown-utils.js'
            ];

            let filesFound = 0;
            for (const file of requiredFiles) {
                if (fs.existsSync(file)) {
                    filesFound++;
                } else {
                    console.log(`   ❌ Missing: ${file}`);
                }
            }

            if (filesFound === requiredFiles.length) {
                this.addResult('integration', true, `All ${requiredFiles.length} required files found`);
                console.log(`✅ File structure complete: ${filesFound}/${requiredFiles.length} files`);
            } else {
                this.addResult('integration', false, `Missing files: ${requiredFiles.length - filesFound}/${requiredFiles.length}`);
                console.log(`❌ File structure incomplete: ${filesFound}/${requiredFiles.length} files`);
            }

        } catch (error) {
            this.addResult('integration', false, `Integration test error: ${error.message}`);
            console.error('❌ Integration test error:', error.message);
        }
    }

    addResult(category, passed, message) {
        this.results[category][passed ? 'passed' : 'failed']++;
        this.results[category].details.push({
            status: passed ? 'PASS' : 'FAIL',
            message: message
        });
    }

    async cleanup() {
        try {
            // Clean up test rundown if created
            if (this.testRundownId && this.adminToken) {
                console.log('\n🧹 Cleaning up test data...');
                await fetch(`${BASE_URL}/api/rundowns/${this.testRundownId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.adminToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log('✅ Test rundown cleaned up');
            }

            // Close database connection
            if (pool) {
                await pool.end();
                console.log('✅ Database connection closed');
            }

            // Close browser
            if (this.browser) {
                await this.browser.close();
                console.log('✅ Browser closed');
            }
        } catch (error) {
            console.warn('⚠️  Cleanup warning:', error.message);
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📋 COMPREHENSIVE RUNDOWN SYSTEM TEST REPORT');
        console.log('='.repeat(80));

        const categories = ['database', 'api', 'frontend', 'integration'];
        let totalPassed = 0;
        let totalFailed = 0;

        categories.forEach(category => {
            const result = this.results[category];
            totalPassed += result.passed;
            totalFailed += result.failed;
            
            console.log(`\n${category.toUpperCase()} TESTS:`);
            console.log(`✅ Passed: ${result.passed}`);
            console.log(`❌ Failed: ${result.failed}`);
            console.log(`📊 Success Rate: ${result.passed + result.failed > 0 ? Math.round((result.passed / (result.passed + result.failed)) * 100) : 0}%`);
            
            if (result.details.length > 0) {
                console.log('Details:');
                result.details.forEach(detail => {
                    console.log(`  ${detail.status === 'PASS' ? '✅' : '❌'} ${detail.message}`);
                });
            }
        });

        console.log('\n' + '='.repeat(80));
        console.log('📊 OVERALL RESULTS');
        console.log('='.repeat(80));
        console.log(`✅ Total Passed: ${totalPassed}`);
        console.log(`❌ Total Failed: ${totalFailed}`);
        console.log(`📊 Overall Success Rate: ${totalPassed + totalFailed > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0}%`);

        if (totalFailed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Rundown system is fully functional.');
        } else if (totalFailed <= 3) {
            console.log('\n⚠️  MINOR ISSUES DETECTED. Most functionality working correctly.');
        } else {
            console.log('\n🚨 SIGNIFICANT ISSUES DETECTED. Rundown system needs attention.');
        }

        console.log('='.repeat(80));

        return {
            totalPassed,
            totalFailed,
            successRate: Math.round((totalPassed / (totalPassed + totalFailed)) * 100),
            details: this.results
        };
    }

    async run() {
        console.log('🧪 Starting Comprehensive Rundown System Test');
        console.log('📅 Test Date:', new Date().toISOString());
        console.log('🌐 Base URL:', BASE_URL);
        console.log('👤 Test User:', ADMIN_CREDENTIALS.email);
        console.log('\n');

        const initialized = await this.init();
        if (!initialized) {
            console.error('❌ Test initialization failed');
            process.exit(1);
        }

        try {
            await this.testDatabase();
            await this.testAPI();
            await this.testFrontend();
            await this.testIntegration();
        } catch (error) {
            console.error('❌ Test execution error:', error.message);
        } finally {
            await this.cleanup();
        }

        return this.generateReport();
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    const tester = new RundownTester();
    tester.run().then(report => {
        process.exit(report.totalFailed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('❌ Test runner error:', error);
        process.exit(1);
    });
}

module.exports = RundownTester;