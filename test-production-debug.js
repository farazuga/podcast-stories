/**
 * Comprehensive Production Debugging Test
 * Tests all major debugging tools and endpoints
 */

const baseUrl = 'https://podcast-stories-production.up.railway.app';

async function testProductionDebug() {
    console.log('🔍 VidPOD Production Debugging Test');
    console.log('=====================================\n');
    
    let totalTests = 0;
    let passedTests = 0;
    
    // Test 1: Basic connectivity
    console.log('1️⃣ Testing Basic Connectivity...');
    try {
        const response = await fetch(baseUrl);
        if (response.ok) {
            console.log('   ✅ Site is reachable (Status: ' + response.status + ')');
            passedTests++;
        } else {
            console.log('   ❌ Site returned error: ' + response.status);
        }
    } catch (error) {
        console.log('   ❌ Failed to connect: ' + error.message);
    }
    totalTests++;
    
    // Test 2: Public API endpoints
    console.log('\n2️⃣ Testing Public API Endpoints...');
    const publicEndpoints = [
        '/api/schools/public',
        '/api/auth/verify'
    ];
    
    for (const endpoint of publicEndpoints) {
        try {
            const response = await fetch(baseUrl + endpoint);
            if (response.ok || response.status === 401) { // 401 is expected for auth/verify without token
                console.log(`   ✅ ${endpoint} - Status: ${response.status}`);
                passedTests++;
            } else {
                console.log(`   ❌ ${endpoint} - Status: ${response.status}`);
            }
        } catch (error) {
            console.log(`   ❌ ${endpoint} - Error: ${error.message}`);
        }
        totalTests++;
    }
    
    // Test 3: Authentication
    console.log('\n3️⃣ Testing Authentication System...');
    const testAccounts = [
        { email: 'admin@vidpod.com', password: 'vidpod', role: 'amitrace_admin' },
        { email: 'teacher@vidpod.com', password: 'vidpod', role: 'teacher' },
        { email: 'student@vidpod.com', password: 'vidpod', role: 'student' }
    ];
    
    for (const account of testAccounts) {
        try {
            const response = await fetch(baseUrl + '/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(account)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.token && data.user.role === account.role) {
                    console.log(`   ✅ ${account.role} login successful`);
                    passedTests++;
                    
                    // Test authenticated endpoints with this token
                    await testAuthenticatedEndpoints(data.token, account.role);
                } else {
                    console.log(`   ❌ ${account.role} login - unexpected response`);
                }
            } else {
                console.log(`   ❌ ${account.role} login failed - Status: ${response.status}`);
            }
        } catch (error) {
            console.log(`   ❌ ${account.role} login error: ${error.message}`);
        }
        totalTests++;
    }
    
    // Test 4: Static resources
    console.log('\n4️⃣ Testing Static Resources...');
    const staticFiles = [
        '/css/styles.css',
        '/js/navigation.js',
        '/includes/navigation.html'
    ];
    
    for (const file of staticFiles) {
        try {
            const response = await fetch(baseUrl + file);
            if (response.ok) {
                console.log(`   ✅ ${file} - Loaded`);
                passedTests++;
            } else {
                console.log(`   ❌ ${file} - Status: ${response.status}`);
            }
        } catch (error) {
            console.log(`   ❌ ${file} - Error: ${error.message}`);
        }
        totalTests++;
    }
    
    // Test 5: Error handling
    console.log('\n5️⃣ Testing Error Handling...');
    try {
        const response = await fetch(baseUrl + '/nonexistent-page');
        if (response.status === 404) {
            console.log('   ✅ 404 error page working');
            passedTests++;
        } else {
            console.log(`   ❌ Unexpected status for 404: ${response.status}`);
        }
    } catch (error) {
        console.log('   ❌ Error handling test failed: ' + error.message);
    }
    totalTests++;
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Production is fully functional.');
    } else if (passedTests / totalTests > 0.7) {
        console.log('\n⚠️ Most tests passed but some issues detected.');
    } else {
        console.log('\n❌ Multiple failures detected. Production needs attention.');
    }
}

async function testAuthenticatedEndpoints(token, role) {
    const endpoints = {
        'amitrace_admin': ['/api/teacher-requests', '/api/schools'],
        'teacher': ['/api/classes', '/api/stories'],
        'student': ['/api/favorites', '/api/stories']
    };
    
    const testEndpoints = endpoints[role] || [];
    
    for (const endpoint of testEndpoints) {
        try {
            const response = await fetch(baseUrl + endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                console.log(`     ✅ ${endpoint} accessible for ${role}`);
            } else {
                console.log(`     ❌ ${endpoint} returned ${response.status} for ${role}`);
            }
        } catch (error) {
            console.log(`     ❌ ${endpoint} error: ${error.message}`);
        }
    }
}

// Run the test
testProductionDebug().catch(console.error);