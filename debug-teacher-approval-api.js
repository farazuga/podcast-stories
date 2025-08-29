/**
 * Debug Teacher Approval API - Get detailed error information
 */

const { default: fetch } = require('node-fetch');

async function debugApprovalAPI() {
    console.log('🔍 Debug Teacher Approval API');
    console.log('==============================\n');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB2aWRwb2QuY29tIiwicm9sZSI6ImFtaXRyYWNlX2FkbWluIiwiaWF0IjoxNzU2NDM0MDc4LCJleHAiOjE3NTcwMzg4Nzh9.M8ep4lggzcdjjiiwnMg_P8DUmxoNxugq-nCU9Ba5dWk';
    const baseUrl = 'https://podcast-stories-production.up.railway.app';
    
    try {
        // First, get current teacher requests
        console.log('1️⃣ Getting current teacher requests...');
        const requestsResponse = await fetch(`${baseUrl}/api/teacher-requests`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const requests = await requestsResponse.json();
        const pendingRequests = requests.filter(r => r.status === 'pending');
        
        console.log(`Found ${pendingRequests.length} pending requests:`);
        pendingRequests.forEach(req => {
            console.log(`  - ID ${req.id}: ${req.name} (${req.email})`);
        });
        
        if (pendingRequests.length === 0) {
            console.log('No pending requests to test with');
            return;
        }
        
        const testRequest = pendingRequests[0];
        console.log(`\n2️⃣ Testing approval for ID ${testRequest.id}: ${testRequest.name}`);
        
        // Try to approve the first pending request
        const approvalResponse = await fetch(`${baseUrl}/api/teacher-requests/${testRequest.id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({})
        });
        
        const responseText = await approvalResponse.text();
        
        console.log(`\n📡 API Response:`);
        console.log(`Status: ${approvalResponse.status} ${approvalResponse.statusText}`);
        console.log(`Response: ${responseText}`);
        
        if (approvalResponse.ok) {
            console.log('✅ Teacher approval succeeded!');
        } else {
            console.log('❌ Teacher approval failed');
            
            // Try to parse as JSON for more details
            try {
                const errorJson = JSON.parse(responseText);
                console.log('Error details:', errorJson);
            } catch (e) {
                console.log('Response is not JSON:', responseText);
            }
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugApprovalAPI();