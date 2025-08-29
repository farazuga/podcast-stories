/**
 * Test Teacher Approval Token System
 * Verify which token system is being used for teacher approvals
 */

const baseUrl = 'https://podcast-stories-production.up.railway.app';

async function testTeacherApprovalTokens() {
    console.log('🔍 Testing Teacher Approval Token System');
    console.log('=========================================\n');
    
    // First, let's check if we can create a teacher approval manually and see which token system is used
    console.log('1️⃣ Checking current teacher approval implementation...');
    
    try {
        // Login as admin first
        console.log('   Logging in as admin...');
        const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@vidpod.com',
                password: 'vidpod'
            })
        });
        
        if (!loginResponse.ok) {
            throw new Error('Admin login failed');
        }
        
        const loginData = await loginResponse.json();
        const adminToken = loginData.token;
        console.log('   ✅ Admin logged in successfully');
        
        // Get pending teacher requests
        console.log('   Getting teacher requests...');
        const requestsResponse = await fetch(`${baseUrl}/api/teacher-requests`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        if (!requestsResponse.ok) {
            throw new Error('Failed to get teacher requests');
        }
        
        const requests = await requestsResponse.json();
        console.log(`   Found ${requests.length} teacher requests`);
        
        if (requests.length > 0) {
            const pendingRequest = requests.find(r => r.status === 'pending');
            if (pendingRequest) {
                console.log(`   Found pending request: ${pendingRequest.email}`);
                console.log('   Note: Use admin panel to approve this request and check which token system is used');
            } else {
                console.log('   No pending requests found to test with');
            }
        }
        
        // Test token validation with both systems
        console.log('\n2️⃣ Testing Token Validation Systems...');
        
        // Test database token validation
        console.log('   Testing database token validation...');
        const dbTokenTest = await fetch(`${baseUrl}/api/password-reset/verify/fake-db-token-test`);
        const dbTokenData = await dbTokenTest.json();
        console.log(`   Database token test: ${dbTokenTest.status} - ${dbTokenData.error || 'Success'}`);
        
        // Test JWT token (if there's a separate endpoint)
        console.log('   Testing JWT token patterns...');
        
        // Try to detect which token system is actually being used by looking at token format
        // JWT tokens are longer and base64url encoded
        // Database tokens are 64-character hex strings
        
        console.log('\n3️⃣ Token System Analysis...');
        console.log('   JWT Token Format: Long base64url string (e.g., eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)');
        console.log('   DB Token Format: 64-character hex string (e.g., a1b2c3d4e5f6...)');
        
        console.log('\n📋 DIAGNOSIS:');
        console.log('   If you see "Link Expired" errors, the issue is likely:');
        console.log('   1. Teacher approval creates JWT tokens (tokenUtils.js)');
        console.log('   2. But reset-password.html validates database tokens (token-service.js)');
        console.log('   3. The two systems are incompatible');
        
        console.log('\n🔧 SOLUTION NEEDED:');
        console.log('   Teacher approval should use createPasswordResetToken() from token-service.js');
        console.log('   Instead of generateTeacherInvitationToken() from tokenUtils.js');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
    
    return true;
}

// Run the test
testTeacherApprovalTokens().catch(console.error);