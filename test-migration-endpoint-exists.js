#!/usr/bin/env node

/**
 * Test if the migration endpoint exists
 */

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function testEndpoint() {
    console.log('🔍 Testing Migration Endpoint Availability');
    console.log('='.repeat(50));

    try {
        // Test 1: Login
        console.log('1. Authenticating...');
        const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@vidpod.com',
                password: 'vidpod'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Authentication failed');
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Authentication successful');

        // Test 2: Check if migration endpoint exists
        console.log('\n2. Testing migration endpoint...');
        const statusResponse = await fetch(`${PRODUCTION_URL}/api/rundown-migration/status`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Status response: ${statusResponse.status} ${statusResponse.statusText}`);

        if (statusResponse.status === 404) {
            console.log('❌ Migration endpoint not found - deployment not complete');
            const responseText = await statusResponse.text();
            console.log('Response body:', responseText.substring(0, 200));
        } else if (statusResponse.status === 200) {
            const data = await statusResponse.json();
            console.log('✅ Migration endpoint exists and working');
            console.log('Status data:', JSON.stringify(data, null, 2));
        } else {
            const responseText = await statusResponse.text();
            console.log(`⚠️ Unexpected status: ${statusResponse.status}`);
            console.log('Response body:', responseText.substring(0, 200));
        }

        // Test 3: Check basic rundown endpoint still failing
        console.log('\n3. Testing rundown endpoint...');
        const rundownResponse = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Rundown response: ${rundownResponse.status} ${rundownResponse.statusText}`);
        
        if (rundownResponse.status === 500) {
            console.log('❌ Rundown endpoint still failing (migration needed)');
        } else if (rundownResponse.status === 200) {
            const data = await rundownResponse.json();
            console.log(`✅ Rundown endpoint working! Found ${data.length} rundowns`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testEndpoint();