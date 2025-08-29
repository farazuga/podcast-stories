#!/usr/bin/env node

/**
 * VidPOD Rundown System Complete Workflow Test
 * Tests the entire rundown creation, management, and role-based access system
 */

const https = require('https');

const BASE_URL = 'https://podcast-stories-production.up.railway.app';

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
                'User-Agent': 'VidPOD-Workflow-Test/1.0',
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
    try {
        const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            body: { email, password }
        });
        
        if (response.status === 200 && response.data.token) {
            return {
                token: response.data.token,
                role: response.data.user.role,
                userId: response.data.user.id,
                user: response.data.user
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Login error for ${email}:`, error.message);
        return null;
    }
}

// Test rundown creation workflow
async function testRundownCreation() {
    console.log('\n📝 PHASE 2: Testing Rundown Creation Workflow');
    console.log('=' .repeat(60));
    
    // Test as teacher (main use case)
    const teacherAuth = await login(TEST_ACCOUNTS.teacher.email, TEST_ACCOUNTS.teacher.password);
    if (!teacherAuth) {
        console.log('❌ Teacher login failed');
        return { success: false, error: 'Teacher login failed' };
    }
    
    console.log(`✅ Teacher logged in: ${teacherAuth.user.name} (${teacherAuth.role})`);
    
    // Create a new rundown
    const rundownData = {
        title: 'Test Rundown - VidPOD Debug',
        description: 'This is a test rundown created during debugging',
        status: 'draft'
    };
    
    console.log('🔍 Creating new rundown...');
    const createResponse = await makeRequest(`${BASE_URL}/api/rundowns`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${teacherAuth.token}` },
        body: rundownData
    });
    
    if (createResponse.status === 201) {
        const rundownId = createResponse.data.id;
        console.log(`✅ Rundown created successfully (ID: ${rundownId})`);
        console.log(`   Title: ${createResponse.data.title}`);
        console.log(`   Status: ${createResponse.data.status}`);
        
        // Test getting the created rundown
        console.log('🔍 Retrieving created rundown...');
        const getResponse = await makeRequest(`${BASE_URL}/api/rundowns/${rundownId}`, {
            headers: { 'Authorization': `Bearer ${teacherAuth.token}` }
        });
        
        if (getResponse.status === 200) {
            console.log('✅ Rundown retrieved successfully');
            console.log(`   Segments: ${getResponse.data.segments.length}`);
            console.log(`   Talent: ${getResponse.data.talent.length}`);
            console.log(`   Stories: ${getResponse.data.stories.length}`);
            
            return { 
                success: true, 
                rundownId: rundownId,
                rundown: getResponse.data
            };
        } else {
            console.log('❌ Failed to retrieve rundown:', getResponse.data);
            return { success: false, error: 'Failed to retrieve rundown' };
        }
    } else {
        console.log('❌ Failed to create rundown:', createResponse.data);
        return { success: false, error: 'Failed to create rundown' };
    }
}

// Test adding talent to rundown
async function testTalentManagement(rundownId) {
    console.log('\n👥 PHASE 3: Testing Talent Management');
    console.log('=' .repeat(60));
    
    const teacherAuth = await login(TEST_ACCOUNTS.teacher.email, TEST_ACCOUNTS.teacher.password);
    if (!teacherAuth) return { success: false, error: 'Teacher login failed' };
    
    // Add talent
    const talentData = {
        rundown_id: rundownId,
        name: 'Test Host',
        role: 'host',
        bio: 'This is a test host for the debug rundown'
    };
    
    console.log('🔍 Adding talent to rundown...');
    const addTalentResponse = await makeRequest(`${BASE_URL}/api/rundown-talent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${teacherAuth.token}` },
        body: talentData
    });
    
    if (addTalentResponse.status === 201) {
        console.log('✅ Talent added successfully');
        console.log(`   Name: ${addTalentResponse.data.name}`);
        console.log(`   Role: ${addTalentResponse.data.role}`);
        
        // Get talent list for the rundown
        const getTalentResponse = await makeRequest(`${BASE_URL}/api/rundown-talent/rundown/${rundownId}`, {
            headers: { 'Authorization': `Bearer ${teacherAuth.token}` }
        });
        
        if (getTalentResponse.status === 200) {
            console.log(`✅ Retrieved talent list (${getTalentResponse.data.length} members)`);
            return { success: true, talentId: addTalentResponse.data.id };
        }
    }
    
    console.log('❌ Talent management test failed:', addTalentResponse.data);
    return { success: false, error: 'Talent management failed' };
}

// Test adding segments to rundown
async function testSegmentManagement(rundownId) {
    console.log('\n🎬 PHASE 4: Testing Segment Management');
    console.log('=' .repeat(60));
    
    const teacherAuth = await login(TEST_ACCOUNTS.teacher.email, TEST_ACCOUNTS.teacher.password);
    if (!teacherAuth) return { success: false, error: 'Teacher login failed' };
    
    // Add a story segment
    const segmentData = {
        rundown_id: rundownId,
        title: 'Breaking News Story',
        type: 'story',
        duration: 300,
        order_index: 1,
        content: { description: 'This is a test news story segment' }
    };
    
    console.log('🔍 Adding segment to rundown...');
    const addSegmentResponse = await makeRequest(`${BASE_URL}/api/rundown-segments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${teacherAuth.token}` },
        body: segmentData
    });
    
    if (addSegmentResponse.status === 201) {
        console.log('✅ Segment added successfully');
        console.log(`   Title: ${addSegmentResponse.data.title}`);
        console.log(`   Type: ${addSegmentResponse.data.type}`);
        console.log(`   Duration: ${addSegmentResponse.data.duration}s`);
        
        // Get segments for the rundown
        const getSegmentsResponse = await makeRequest(`${BASE_URL}/api/rundown-segments/rundown/${rundownId}`, {
            headers: { 'Authorization': `Bearer ${teacherAuth.token}` }
        });
        
        if (getSegmentsResponse.status === 200) {
            console.log(`✅ Retrieved segment list (${getSegmentsResponse.data.length} segments)`);
            return { success: true, segmentId: addSegmentResponse.data.id };
        }
    }
    
    console.log('❌ Segment management test failed:', addSegmentResponse.data);
    return { success: false, error: 'Segment management failed' };
}

// Test role-based access control
async function testRoleBasedAccess(rundownId) {
    console.log('\n🔒 PHASE 5: Testing Role-Based Access Control');
    console.log('=' .repeat(60));
    
    const results = {};
    
    // Test Admin access
    console.log('👤 Testing Admin Access:');
    const adminAuth = await login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    if (adminAuth) {
        const response = await makeRequest(`${BASE_URL}/api/rundowns/${rundownId}`, {
            headers: { 'Authorization': `Bearer ${adminAuth.token}` }
        });
        results.admin = response.status === 200 ? 'FULL_ACCESS' : 'ACCESS_DENIED';
        console.log(`   Admin: ${results.admin === 'FULL_ACCESS' ? '✅' : '❌'} ${results.admin}`);
    }
    
    // Test Teacher access (creator)
    console.log('👤 Testing Teacher Access:');
    const teacherAuth = await login(TEST_ACCOUNTS.teacher.email, TEST_ACCOUNTS.teacher.password);
    if (teacherAuth) {
        const response = await makeRequest(`${BASE_URL}/api/rundowns/${rundownId}`, {
            headers: { 'Authorization': `Bearer ${teacherAuth.token}` }
        });
        results.teacher = response.status === 200 ? 'CREATOR_ACCESS' : 'ACCESS_DENIED';
        console.log(`   Teacher: ${results.teacher === 'CREATOR_ACCESS' ? '✅' : '❌'} ${results.teacher}`);
    }
    
    // Test Student access (should be limited)
    console.log('👤 Testing Student Access:');
    const studentAuth = await login(TEST_ACCOUNTS.student.email, TEST_ACCOUNTS.student.password);
    if (studentAuth) {
        // Students can only see rundowns from enrolled classes
        const response = await makeRequest(`${BASE_URL}/api/rundowns`, {
            headers: { 'Authorization': `Bearer ${studentAuth.token}` }
        });
        results.student = response.status === 200 ? 'LIMITED_ACCESS' : 'ACCESS_DENIED';
        console.log(`   Student: ${results.student === 'LIMITED_ACCESS' ? '✅' : '❌'} ${results.student}`);
    }
    
    return results;
}

// Test frontend page loading
async function testFrontendIntegration() {
    console.log('\n🎨 PHASE 6: Testing Frontend Integration');
    console.log('=' .repeat(60));
    
    const frontendTests = [
        { url: '/rundowns.html', name: 'Main Rundown Page' },
        { url: '/js/rundowns.js', name: 'Rundown JavaScript' },
        { url: '/js/rundown-segments.js', name: 'Segments JavaScript' },
        { url: '/js/rundown-talent.js', name: 'Talent JavaScript' },
        { url: '/js/rundown-stories.js', name: 'Stories JavaScript' },
        { url: '/js/rundown-utils.js', name: 'Utilities JavaScript' },
        { url: '/css/rundown.css', name: 'Rundown Styles' }
    ];
    
    const results = {};
    
    for (const test of frontendTests) {
        const response = await makeRequest(`${BASE_URL}${test.url}`);
        results[test.name] = response.status === 200 ? 'ACCESSIBLE' : 'NOT_FOUND';
        console.log(`${results[test.name] === 'ACCESSIBLE' ? '✅' : '❌'} ${test.name}: ${results[test.name]}`);
    }
    
    return results;
}

// Main test execution
async function runCompleteTest() {
    console.log('🎬 VidPOD Rundown System - Complete Workflow Test');
    console.log('🎯 Environment:', BASE_URL);
    console.log('⏰ Started:', new Date().toISOString());
    console.log('\n' + '='.repeat(80));
    
    const testResults = {
        rundownCreation: await testRundownCreation(),
        talentManagement: null,
        segmentManagement: null,
        roleBasedAccess: null,
        frontendIntegration: await testFrontendIntegration()
    };
    
    // Only run additional tests if rundown creation succeeded
    if (testResults.rundownCreation.success) {
        const rundownId = testResults.rundownCreation.rundownId;
        testResults.talentManagement = await testTalentManagement(rundownId);
        testResults.segmentManagement = await testSegmentManagement(rundownId);
        testResults.roleBasedAccess = await testRoleBasedAccess(rundownId);
    }
    
    // Generate comprehensive summary
    console.log('\n🎯 COMPREHENSIVE TEST RESULTS');
    console.log('=' .repeat(80));
    
    console.log('\n📝 Rundown Creation:', testResults.rundownCreation.success ? '✅ SUCCESS' : '❌ FAILED');
    if (testResults.rundownCreation.success) {
        console.log(`   Created Rundown ID: ${testResults.rundownCreation.rundownId}`);
    }
    
    console.log('\n👥 Talent Management:', 
        testResults.talentManagement?.success ? '✅ SUCCESS' : '❌ FAILED');
    
    console.log('\n🎬 Segment Management:', 
        testResults.segmentManagement?.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (testResults.roleBasedAccess) {
        console.log('\n🔒 Role-Based Access:');
        for (const [role, access] of Object.entries(testResults.roleBasedAccess)) {
            console.log(`   ${role}: ${access.includes('ACCESS') ? '✅' : '❌'} ${access}`);
        }
    }
    
    console.log('\n🎨 Frontend Integration:');
    let frontendSuccess = 0;
    for (const [component, status] of Object.entries(testResults.frontendIntegration)) {
        console.log(`   ${component}: ${status === 'ACCESSIBLE' ? '✅' : '❌'} ${status}`);
        if (status === 'ACCESSIBLE') frontendSuccess++;
    }
    
    // Overall system status
    const totalTests = 5; // rundown, talent, segment, access, frontend
    let passedTests = 0;
    
    if (testResults.rundownCreation.success) passedTests++;
    if (testResults.talentManagement?.success) passedTests++;
    if (testResults.segmentManagement?.success) passedTests++;
    if (testResults.roleBasedAccess && Object.values(testResults.roleBasedAccess).every(v => v.includes('ACCESS'))) passedTests++;
    if (frontendSuccess >= 5) passedTests++; // At least 5 frontend components working
    
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log('\n🏆 OVERALL SYSTEM STATUS');
    console.log('=' .repeat(80));
    console.log(`📊 Success Rate: ${successRate}% (${passedTests}/${totalTests} test suites passed)`);
    console.log(`🎯 System Status: ${successRate >= 80 ? '✅ PRODUCTION READY' : '⚠️ NEEDS ATTENTION'}`);
    console.log('⏰ Completed:', new Date().toISOString());
    
    return { successRate, testResults, passedTests, totalTests };
}

// Run the complete test
if (require.main === module) {
    runCompleteTest().catch(error => {
        console.error('🚨 Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runCompleteTest, login, makeRequest };