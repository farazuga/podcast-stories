#!/usr/bin/env node

/**
 * Verification test for teacher class creation fix
 * Tests that the API_URL conflict issues have been resolved
 */

const API_URL = 'https://podcast-stories-production.up.railway.app/api';
const TEST_TEACHER = { email: 'teacher@vidpod.com', password: 'vidpod' };

async function makeRequest(endpoint, options = {}, token = null) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    try {
        const response = await fetch(url, { ...options, headers });
        const text = await response.text();
        
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }

        return { status: response.status, ok: response.ok, data };
    } catch (error) {
        return { status: 0, ok: false, error: error.message };
    }
}

async function testTeacherLogin() {
    console.log('🔐 Testing teacher login...');
    
    const response = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: TEST_TEACHER.email,
            password: TEST_TEACHER.password
        })
    });

    if (response.ok) {
        console.log('✅ Teacher login successful');
        return response.data.token;
    } else {
        console.log('❌ Teacher login failed:', response.data);
        return null;
    }
}

async function testJavaScriptUpdate() {
    console.log('\n📜 Testing JavaScript fix deployment...');
    
    try {
        const response = await fetch('https://podcast-stories-production.up.railway.app/js/teacher-dashboard.js');
        const js = await response.text();
        
        // Check for the fixes we implemented
        const hasFixedAPIURL = js.includes('window.API_URL = window.API_URL ||');
        const hasTokenValidation = js.includes('payload.exp && currentTime >= payload.exp');
        const hasAuthenticatedRequest = js.includes('async function makeAuthenticatedRequest');
        const hasFixedCreateClass = js.includes('await makeAuthenticatedRequest(`${API_URL}/classes`');
        
        console.log('📋 JavaScript Fix Verification:');
        console.log(`  ✅ Fixed API_URL conflict: ${hasFixedAPIURL ? 'DEPLOYED' : '❌ Not found'}`);
        console.log(`  ✅ Enhanced token validation: ${hasTokenValidation ? 'DEPLOYED' : '❌ Not found'}`);
        console.log(`  ✅ makeAuthenticatedRequest helper: ${hasAuthenticatedRequest ? 'DEPLOYED' : '❌ Not found'}`);
        console.log(`  ✅ Updated createClass function: ${hasFixedCreateClass ? 'DEPLOYED' : '❌ Not found'}`);
        
        return hasFixedAPIURL && hasTokenValidation && hasAuthenticatedRequest && hasFixedCreateClass;
    } catch (error) {
        console.log('❌ Failed to fetch updated JavaScript:', error.message);
        return false;
    }
}

async function testClassCreation(token) {
    console.log('\n🎓 Testing class creation after fix...');
    
    const testClassName = `Post-Fix Test Class ${Date.now()}`;
    const testSubject = 'Post-Fix Testing';
    const testDescription = 'Test class created after API_URL fix deployment';
    
    console.log(`Creating class: "${testClassName}"`);
    
    const response = await makeRequest('/classes', {
        method: 'POST',
        body: JSON.stringify({
            class_name: testClassName,
            subject: testSubject,
            description: testDescription
        })
    }, token);

    if (response.ok) {
        console.log('✅ Class creation successful after fix!');
        console.log(`📋 New class: "${response.data.class_name}" with code: ${response.data.class_code}`);
        return true;
    } else {
        console.log('❌ Class creation still failing:', response.data);
        return false;
    }
}

async function testMultipleClassCreation(token) {
    console.log('\n🔄 Testing multiple class creation (stress test)...');
    
    const results = [];
    
    for (let i = 1; i <= 3; i++) {
        const testClassName = `Batch Test Class ${i} - ${Date.now()}`;
        
        const response = await makeRequest('/classes', {
            method: 'POST',
            body: JSON.stringify({
                class_name: testClassName,
                subject: `Test Subject ${i}`,
                description: `Batch test class ${i} for verification`
            })
        }, token);
        
        if (response.ok) {
            results.push(`✅ Class ${i}: "${response.data.class_name}" (${response.data.class_code})`);
        } else {
            results.push(`❌ Class ${i}: Failed - ${response.data.error || 'Unknown error'}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('📋 Batch Creation Results:');
    results.forEach(result => console.log(`  ${result}`));
    
    const successCount = results.filter(r => r.includes('✅')).length;
    console.log(`📊 Success Rate: ${successCount}/3 (${Math.round(successCount/3*100)}%)`);
    
    return successCount === 3;
}

async function runVerificationTests() {
    console.log('🔧 Teacher Class Creation Fix Verification');
    console.log('=' .repeat(50));
    
    // Test 1: JavaScript fixes deployed
    const jsFixed = await testJavaScriptUpdate();
    
    if (!jsFixed) {
        console.log('\n❌ JavaScript fixes not fully deployed yet');
        console.log('   Please wait a few more minutes for Railway deployment');
        return;
    }
    
    // Test 2: Teacher login
    const token = await testTeacherLogin();
    if (!token) {
        console.log('\n❌ Cannot continue - teacher login failed');
        return;
    }
    
    // Test 3: Single class creation
    const singleSuccess = await testClassCreation(token);
    
    // Test 4: Multiple class creation (stress test)
    const batchSuccess = await testMultipleClassCreation(token);
    
    // Summary
    console.log('\n📊 Fix Verification Summary');
    console.log('=' .repeat(50));
    console.log(`✅ JavaScript Fixes Deployed: ${jsFixed ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Teacher Authentication: ${token ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Single Class Creation: ${singleSuccess ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Batch Class Creation: ${batchSuccess ? 'PASSED' : 'FAILED'}`);
    
    const allPassed = jsFixed && token && singleSuccess && batchSuccess;
    
    console.log('\n🎉 Overall Result');
    console.log('=' .repeat(50));
    
    if (allPassed) {
        console.log('🎉 ✅ ALL TESTS PASSED!');
        console.log('🎯 Teacher class creation is now fully functional');
        console.log('📱 Frontend JavaScript conflicts resolved');
        console.log('🔐 Authentication improvements deployed');
        console.log('🚀 Teachers can now create classes without issues');
    } else {
        console.log('❌ Some tests failed - issue may persist');
        console.log('🔍 Check browser console for additional error details');
        console.log('🔄 Try clearing browser cache and cookies');
    }
}

// Run tests if called directly
if (require.main === module) {
    runVerificationTests().catch(console.error);
}

module.exports = { runVerificationTests, testClassCreation };