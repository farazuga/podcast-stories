#!/usr/bin/env node

/**
 * VidPOD Rundown System Production Debug Test
 * Tests the complete rundown system in production environment
 */

const https = require('https');
const querystring = require('querystring');

const BASE_URL = 'https://podcast-stories-production.up.railway.app';

// Test accounts
const TEST_ACCOUNTS = {
    admin: { email: 'admin@vidpod.com', password: 'vidpod' },
    teacher: { email: 'teacher@vidpod.com', password: 'vidpod' },
    student: { email: 'student@vidpod.com', password: 'vidpod' }
};

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'VidPOD-Debug-Test/1.0',
                ...options.headers
            }
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
                } catch (error) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

// Login function
async function login(email, password) {
    console.log(`🔐 Attempting login for: ${email}`);
    
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: { email, password }
        });
        
        if (response.status === 200 && response.data.token) {
            console.log(`✅ Login successful for ${email} (Role: ${response.data.user.role})`);
            return {
                token: response.data.token,
                role: response.data.user.role,
                userId: response.data.user.id
            };
        } else {
            console.log(`❌ Login failed for ${email}:`, response.data);
            return null;
        }
    } catch (error) {
        console.error(`🚨 Login error for ${email}:`, error.message);
        return null;
    }
}

// Test database tables existence
async function testDatabaseTables() {
    console.log('\n📊 PHASE 1: Testing Database Migration Status');
    console.log('=' .repeat(50));
    
    // Test if rundown endpoints respond (indicates tables exist)
    const adminAuth = await login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    
    if (!adminAuth) {
        console.log('❌ Cannot test database - admin login failed');
        return false;
    }
    
    try {
        const response = await makeRequest(`${BASE_URL}/api/rundowns`, {
            headers: { 'Authorization': `Bearer ${adminAuth.token}` }
        });
        
        if (response.status === 200) {
            console.log('✅ Rundown API responds - database tables exist');
            console.log(`📋 Found ${Array.isArray(response.data) ? response.data.length : 0} rundowns`);
            return true;
        } else {
            console.log('❌ Rundown API error:', response.data);
            return false;
        }
    } catch (error) {
        console.error('🚨 Database test error:', error.message);
        return false;
    }
}

// Test role-based access
async function testRoleBasedAccess() {
    console.log('\n👥 PHASE 2: Testing Role-Based Access');
    console.log('=' .repeat(50));
    
    const results = {};
    
    for (const [role, credentials] of Object.entries(TEST_ACCOUNTS)) {
        console.log(`\n🔍 Testing ${role} access:`);
        
        const auth = await login(credentials.email, credentials.password);
        if (!auth) {
            results[role] = 'LOGIN_FAILED';
            continue;
        }
        
        try {
            const response = await makeRequest(`${BASE_URL}/api/rundowns`, {
                headers: { 'Authorization': `Bearer ${auth.token}` }
            });
            
            if (response.status === 200) {
                const rundownCount = Array.isArray(response.data) ? response.data.length : 0;
                console.log(`✅ ${role} can access rundowns (${rundownCount} visible)`);
                results[role] = 'SUCCESS';
            } else {
                console.log(`❌ ${role} access denied:`, response.data);
                results[role] = 'ACCESS_DENIED';
            }
        } catch (error) {
            console.log(`🚨 ${role} test error:`, error.message);
            results[role] = 'ERROR';
        }
    }
    
    return results;
}

// Test API endpoints
async function testApiEndpoints() {
    console.log('\n🌐 PHASE 3: Testing API Endpoints');
    console.log('=' .repeat(50));
    
    const adminAuth = await login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    
    if (!adminAuth) {
        console.log('❌ Cannot test APIs - admin login failed');
        return {};
    }
    
    const endpoints = [
        { path: '/api/rundowns', method: 'GET', name: 'List Rundowns' },
        { path: '/api/rundown-talent/summary', method: 'GET', name: 'List Talent Summary' },
        { path: '/api/rundown-stories', method: 'POST', name: 'Rundown Stories Endpoint', body: { rundown_id: 1, story_id: 1 } }
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
        try {
            console.log(`🔍 Testing ${endpoint.name}...`);
            
            const response = await makeRequest(`${BASE_URL}${endpoint.path}`, {
                method: endpoint.method,
                headers: { 'Authorization': `Bearer ${adminAuth.token}` },
                body: endpoint.body
            });
            
            if (response.status === 200) {
                console.log(`✅ ${endpoint.name}: Working`);
                results[endpoint.name] = 'SUCCESS';
            } else {
                console.log(`❌ ${endpoint.name}: Failed (${response.status})`, response.data);
                results[endpoint.name] = 'FAILED';
            }
        } catch (error) {
            console.log(`🚨 ${endpoint.name}: Error - ${error.message}`);
            results[endpoint.name] = 'ERROR';
        }
    }
    
    return results;
}

// Test frontend page load
async function testFrontendPages() {
    console.log('\n🎨 PHASE 4: Testing Frontend Pages');
    console.log('=' .repeat(50));
    
    const pages = [
        '/rundowns.html',
        '/js/rundowns.js',
        '/css/rundown.css'
    ];
    
    const results = {};
    
    for (const page of pages) {
        try {
            console.log(`🔍 Testing ${page}...`);
            
            const response = await makeRequest(`${BASE_URL}${page}`);
            
            if (response.status === 200) {
                console.log(`✅ ${page}: Accessible`);
                results[page] = 'SUCCESS';
            } else {
                console.log(`❌ ${page}: Not found (${response.status})`);
                results[page] = 'NOT_FOUND';
            }
        } catch (error) {
            console.log(`🚨 ${page}: Error - ${error.message}`);
            results[page] = 'ERROR';
        }
    }
    
    return results;
}

// Main test execution
async function runTests() {
    console.log('🎬 VidPOD Rundown System Production Debug Test');
    console.log('🎯 Testing environment:', BASE_URL);
    console.log('⏰ Started at:', new Date().toISOString());
    console.log('\n' + '='.repeat(60));
    
    const testResults = {
        database: await testDatabaseTables(),
        roleAccess: await testRoleBasedAccess(),
        apiEndpoints: await testApiEndpoints(),
        frontend: await testFrontendPages()
    };
    
    console.log('\n📊 TEST SUMMARY');
    console.log('=' .repeat(50));
    
    console.log('\n📋 Database Status:', testResults.database ? '✅ WORKING' : '❌ ISSUES');
    
    console.log('\n👥 Role Access:');
    for (const [role, status] of Object.entries(testResults.roleAccess)) {
        console.log(`  ${role}: ${status === 'SUCCESS' ? '✅' : '❌'} ${status}`);
    }
    
    console.log('\n🌐 API Endpoints:');
    for (const [endpoint, status] of Object.entries(testResults.apiEndpoints)) {
        console.log(`  ${endpoint}: ${status === 'SUCCESS' ? '✅' : '❌'} ${status}`);
    }
    
    console.log('\n🎨 Frontend Pages:');
    for (const [page, status] of Object.entries(testResults.frontend)) {
        console.log(`  ${page}: ${status === 'SUCCESS' ? '✅' : '❌'} ${status}`);
    }
    
    const allWorking = testResults.database && 
                      Object.values(testResults.roleAccess).every(s => s === 'SUCCESS') &&
                      Object.values(testResults.apiEndpoints).every(s => s === 'SUCCESS') &&
                      Object.values(testResults.frontend).every(s => s === 'SUCCESS');
    
    console.log('\n🎯 OVERALL STATUS:', allWorking ? '✅ SYSTEM WORKING' : '⚠️ ISSUES DETECTED');
    console.log('⏰ Completed at:', new Date().toISOString());
    
    return testResults;
}

// Run the tests
if (require.main === module) {
    runTests().catch(error => {
        console.error('🚨 Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runTests, login, makeRequest };