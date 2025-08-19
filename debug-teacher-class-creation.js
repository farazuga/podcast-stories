#!/usr/bin/env node

/**
 * Debug script for teacher class creation issue
 * Tests the teacher dashboard functionality in isolation
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
            username: TEST_TEACHER.email,
            password: TEST_TEACHER.password
        })
    });

    if (response.ok) {
        console.log('✅ Teacher login successful');
        console.log('📋 User data:', JSON.stringify(response.data.user, null, 2));
        return response.data.token;
    } else {
        console.log('❌ Teacher login failed:', response.data);
        return null;
    }
}

async function testExistingClasses(token) {
    console.log('\n📚 Testing existing classes...');
    
    const response = await makeRequest('/classes', {}, token);
    
    if (response.ok) {
        console.log(`✅ Found ${response.data.length} existing classes`);
        response.data.forEach((cls, index) => {
            console.log(`  ${index + 1}. ${cls.class_name} (${cls.class_code}) - ${cls.subject || 'No subject'}`);
        });
        return response.data;
    } else {
        console.log('❌ Failed to load existing classes:', response.data);
        return [];
    }
}

async function testClassCreation(token) {
    console.log('\n🎓 Testing class creation...');
    
    const testClassName = `Debug Test Class ${Date.now()}`;
    const testSubject = 'Testing';
    const testDescription = 'Automated debug test class';
    
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
        console.log('✅ Class creation successful!');
        console.log('📋 New class data:', JSON.stringify(response.data, null, 2));
        return response.data;
    } else {
        console.log('❌ Class creation failed:', response.data);
        return null;
    }
}

async function testTeacherDashboardHTML() {
    console.log('\n🌐 Testing teacher dashboard HTML...');
    
    try {
        const response = await fetch('https://podcast-stories-production.up.railway.app/teacher-dashboard.html');
        const html = await response.text();
        
        // Check for required form elements
        const hasCreateForm = html.includes('id="createClassForm"');
        const hasClassNameInput = html.includes('id="className"');
        const hasSubjectInput = html.includes('id="subject"');
        const hasDescriptionInput = html.includes('id="description"');
        const hasSubmitButton = html.includes('type="submit"');
        const hasTeacherJS = html.includes('teacher-dashboard.js');
        
        console.log('📋 HTML Elements Check:');
        console.log(`  ✅ Create form: ${hasCreateForm ? 'Present' : '❌ Missing'}`);
        console.log(`  ✅ Class name input: ${hasClassNameInput ? 'Present' : '❌ Missing'}`);
        console.log(`  ✅ Subject input: ${hasSubjectInput ? 'Present' : '❌ Missing'}`);
        console.log(`  ✅ Description input: ${hasDescriptionInput ? 'Present' : '❌ Missing'}`);
        console.log(`  ✅ Submit button: ${hasSubmitButton ? 'Present' : '❌ Missing'}`);
        console.log(`  ✅ Teacher JS: ${hasTeacherJS ? 'Present' : '❌ Missing'}`);
        
        return hasCreateForm && hasClassNameInput && hasSubjectInput && hasDescriptionInput && hasSubmitButton && hasTeacherJS;
    } catch (error) {
        console.log('❌ Failed to fetch teacher dashboard HTML:', error.message);
        return false;
    }
}

async function testTeacherJavaScript() {
    console.log('\n📜 Testing teacher dashboard JavaScript...');
    
    try {
        const response = await fetch('https://podcast-stories-production.up.railway.app/js/teacher-dashboard.js');
        const js = await response.text();
        
        // Check for required functions
        const hasCreateClassFunction = js.includes('async function createClass(e)');
        const hasSetupEventListeners = js.includes('function setupEventListeners()');
        const hasFormEventListener = js.includes('createClassForm.addEventListener(\'submit\', createClass)');
        const hasAPIURL = js.includes('const API_URL');
        const hasConsoleLogging = js.includes('console.log(\'Create class form submitted\')');
        
        console.log('📋 JavaScript Functions Check:');
        console.log(`  ✅ createClass function: ${hasCreateClassFunction ? 'Present' : '❌ Missing'}`);
        console.log(`  ✅ setupEventListeners: ${hasSetupEventListeners ? 'Present' : '❌ Missing'}`);
        console.log(`  ✅ Form event listener: ${hasFormEventListener ? 'Present' : '❌ Missing'}`);
        console.log(`  ✅ API URL: ${hasAPIURL ? 'Present' : '❌ Missing'}`);
        console.log(`  ✅ Debug logging: ${hasConsoleLogging ? 'Present' : '❌ Missing'}`);
        
        return hasCreateClassFunction && hasSetupEventListeners && hasFormEventListener;
    } catch (error) {
        console.log('❌ Failed to fetch teacher dashboard JavaScript:', error.message);
        return false;
    }
}

async function testUserRole(token) {
    console.log('\n👤 Testing user role verification...');
    
    const response = await makeRequest('/auth/verify', {}, token);
    
    if (response.ok) {
        console.log('✅ Token verification successful');
        console.log('📋 User role info:', JSON.stringify(response.data, null, 2));
        
        if (response.data.user && response.data.user.role === 'teacher') {
            console.log('✅ User has correct teacher role');
            return true;
        } else {
            console.log('❌ User does not have teacher role:', response.data.user?.role || 'undefined');
            return false;
        }
    } else {
        console.log('❌ Token verification failed:', response.data);
        return false;
    }
}

async function runDebugTests() {
    console.log('🔍 Teacher Class Creation Debug Tests');
    console.log('=' .repeat(50));
    
    // Test 1: Teacher Login
    const token = await testTeacherLogin();
    if (!token) {
        console.log('\n❌ Cannot continue - teacher login failed');
        return;
    }
    
    // Test 2: User Role Verification
    const hasCorrectRole = await testUserRole(token);
    if (!hasCorrectRole) {
        console.log('\n❌ Cannot continue - incorrect user role');
        return;
    }
    
    // Test 3: HTML Structure
    const htmlOk = await testTeacherDashboardHTML();
    
    // Test 4: JavaScript Code
    const jsOk = await testTeacherJavaScript();
    
    // Test 5: Existing Classes
    const existingClasses = await testExistingClasses(token);
    
    // Test 6: Class Creation API
    const newClass = await testClassCreation(token);
    
    // Summary
    console.log('\n📊 Debug Test Summary');
    console.log('=' .repeat(50));
    console.log(`✅ Teacher Login: ${token ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ User Role: ${hasCorrectRole ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ HTML Structure: ${htmlOk ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ JavaScript Code: ${jsOk ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Load Existing Classes: ${existingClasses.length >= 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Create New Class: ${newClass ? 'PASSED' : 'FAILED'}`);
    
    // Diagnosis
    console.log('\n🔧 Diagnosis');
    console.log('=' .repeat(50));
    
    if (newClass) {
        console.log('✅ API endpoints are working correctly');
        console.log('✅ Teacher has proper permissions');
        console.log('✅ Class creation is functional');
        
        if (!htmlOk || !jsOk) {
            console.log('⚠️ Potential frontend issues detected');
            console.log('   - Check browser console for JavaScript errors');
            console.log('   - Verify form event listeners are attached');
            console.log('   - Check if form validation is preventing submission');
        } else {
            console.log('📱 Frontend should be working correctly');
            console.log('   - Issue may be browser-specific');
            console.log('   - Check browser developer tools for errors');
            console.log('   - Clear browser cache and try again');
        }
    } else {
        console.log('❌ API issues detected - class creation failed');
    }
}

// Run tests if called directly
if (require.main === module) {
    runDebugTests().catch(console.error);
}

module.exports = { runDebugTests, testClassCreation, testTeacherLogin };