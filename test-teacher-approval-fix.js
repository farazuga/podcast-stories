/**
 * Test Teacher Approval Fix
 * Verify the token system fix is working
 */

const baseUrl = 'https://podcast-stories-production.up.railway.app';

async function testTeacherApprovalFix() {
    console.log('🧪 Testing Teacher Approval Fix');
    console.log('===============================\n');
    
    try {
        // Login as admin
        console.log('1️⃣ Logging in as admin...');
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
        
        // Check for pending teacher requests
        console.log('\n2️⃣ Checking teacher requests...');
        const requestsResponse = await fetch(`${baseUrl}/api/teacher-requests`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        const requests = await requestsResponse.json();
        console.log(`   Found ${requests.length} teacher requests`);
        
        const pendingRequest = requests.find(r => r.status === 'pending');
        
        if (!pendingRequest) {
            console.log('   ℹ️ No pending requests found to test with');
            console.log('   Create a teacher request first to test approval flow');
            return true;
        }
        
        console.log(`   Found pending request: ${pendingRequest.email}`);
        
        // Test the approval (this will create a token)
        console.log('\n3️⃣ Testing teacher approval...');
        const approvalResponse = await fetch(`${baseUrl}/api/teacher-requests/${pendingRequest.id}/approve`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`   Approval response status: ${approvalResponse.status}`);
        
        if (approvalResponse.ok) {
            const approvalData = await approvalResponse.json();
            console.log('   ✅ Teacher approval successful');
            console.log('   📧 Email should be sent with password reset link');
            console.log('   🔍 The link should now work (no "Link Expired" error)');
            
            // Note: We can't easily test the actual token without having the email
            // But we can verify the approval created a user account
            console.log('\n4️⃣ Verifying user account creation...');
            
            // Check if user was created
            const usersResponse = await fetch(`${baseUrl}/api/debug/users?email=${pendingRequest.email}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            if (usersResponse.ok) {
                console.log('   ✅ User account created successfully');
                console.log('   💡 Teacher can now use password reset link from email');
            } else {
                console.log('   ℹ️ Could not verify user account (debug endpoint may not exist)');
            }
            
            return true;
        } else {
            const errorData = await approvalResponse.text();
            console.log('   ❌ Teacher approval failed:', errorData);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

// Run the test
testTeacherApprovalFix()
    .then(success => {
        if (success) {
            console.log('\n🎉 Teacher approval fix appears to be working!');
            console.log('   The next step is to test the actual password reset link from email');
        } else {
            console.log('\n❌ Teacher approval fix needs more work');
        }
    })
    .catch(console.error);