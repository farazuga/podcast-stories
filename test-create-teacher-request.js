/**
 * Create a new teacher request for testing approval
 */

const { default: fetch } = require('node-fetch');

async function createTestTeacherRequest() {
    console.log('🧪 Creating Test Teacher Request for Approval Testing');
    console.log('=====================================================\n');
    
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    const testEmail = `test-teacher-${Date.now()}@example.com`;
    const testName = 'Test Teacher Request';
    
    try {
        // Create a new teacher request
        console.log(`1️⃣ Creating teacher request for: ${testEmail}`);
        
        const requestData = {
            first_name: 'Test',
            last_name: 'Teacher',
            email: testEmail,
            school_id: 1, // VidPOD Default School
            message: 'Test teacher request for approval testing'
        };
        
        const createResponse = await fetch(`${baseUrl}/api/teacher-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const createResult = await createResponse.text();
        console.log(`Create response (${createResponse.status}):`, createResult);
        
        if (!createResponse.ok) {
            console.log('❌ Failed to create teacher request');
            return;
        }
        
        const requestInfo = JSON.parse(createResult);
        const newRequestId = requestInfo.id;
        
        console.log(`✅ Created teacher request with ID: ${newRequestId}`);
        console.log(`   Email: ${testEmail}`);
        console.log(`   Name: ${testName}`);
        
        // Wait a moment for the request to be fully created
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Now try to approve it
        console.log(`\n2️⃣ Getting admin token and testing approval...`);
        
        const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@vidpod.com',
                password: 'vidpod'
            })
        });
        
        const loginResult = await loginResponse.json();
        const token = loginResult.token;
        
        if (!token) {
            console.log('❌ Failed to get admin token');
            return;
        }
        
        console.log(`✅ Got admin token`);
        
        // Try to approve the new request
        console.log(`\n3️⃣ Attempting to approve teacher request ${newRequestId}...`);
        
        const approveResponse = await fetch(`${baseUrl}/api/teacher-requests/${newRequestId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({})
        });
        
        const approveResult = await approveResponse.text();
        
        console.log(`Approval response (${approveResponse.status}):`);
        console.log(approveResult);
        
        if (approveResponse.ok) {
            console.log('\n🎉 ✅ TEACHER APPROVAL SUCCESSFUL!');
        } else {
            console.log('\n❌ Teacher approval failed');
            try {
                const errorJson = JSON.parse(approveResult);
                if (errorJson.debug) {
                    console.log('Debug info:', errorJson.debug);
                }
            } catch (e) {
                // Not JSON
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

createTestTeacherRequest();