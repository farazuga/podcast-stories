#!/usr/bin/env node

/**
 * Test Database Rundown Tables Status
 * Check if rundown system tables exist in production database
 */

// Test via API since we don't have direct DB access
const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function testDatabaseStatus() {
    console.log('🗄️ Testing Database Rundown Tables Status');
    console.log('🌐 Production URL:', PRODUCTION_URL);
    console.log('='.repeat(60));

    try {
        // First authenticate as admin
        console.log('1. Authenticating as admin...');
        const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@vidpod.com',
                password: 'vidpod'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Failed to authenticate');
        }

        const loginData = await loginResponse.json();
        const adminToken = loginData.token;
        console.log('✅ Admin authentication successful');

        // Test the rundown endpoint with more detailed error handling
        console.log('\n2. Testing rundown endpoint...');
        const rundownResponse = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Response status: ${rundownResponse.status} ${rundownResponse.statusText}`);
        
        if (rundownResponse.ok) {
            const data = await rundownResponse.json();
            console.log('✅ Rundown endpoint working');
            console.log(`📊 Found ${Array.isArray(data) ? data.length : 0} rundowns`);
        } else {
            const errorText = await rundownResponse.text();
            console.log('❌ Rundown endpoint failed');
            console.log('Error response:', errorText);

            // Parse error to determine issue
            try {
                const errorData = JSON.parse(errorText);
                console.log('Parsed error:', errorData);
            } catch (e) {
                console.log('Raw error text:', errorText);
            }
        }

        // Test creating a simple rundown to see detailed database error
        console.log('\n3. Testing rundown creation for detailed error...');
        const createResponse = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Database Test Rundown',
                description: 'Testing database table existence'
            })
        });

        console.log(`Create response status: ${createResponse.status} ${createResponse.statusText}`);
        const createErrorText = await createResponse.text();
        console.log('Create error response:', createErrorText);

        // Test if it's a table-specific issue
        console.log('\n4. Testing related endpoints...');
        
        const endpoints = [
            '/api/stories', // This should work
            '/api/classes',  // This should work
            '/api/rundown-segments/test', // This might give us more info
        ];

        for (const endpoint of endpoints) {
            try {
                const testResponse = await fetch(`${PRODUCTION_URL}${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`${endpoint}: ${testResponse.status} ${testResponse.statusText}`);
                
                if (endpoint === '/api/stories' && testResponse.ok) {
                    const storiesData = await testResponse.json();
                    console.log(`  ✅ Stories working - ${storiesData.length} stories found`);
                }
            } catch (error) {
                console.log(`${endpoint}: Error - ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Database test failed:', error.message);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    testDatabaseStatus().then(() => {
        console.log('\n='.repeat(60));
        console.log('Database test completed');
    }).catch(error => {
        console.error('Database test error:', error);
        process.exit(1);
    });
}

module.exports = testDatabaseStatus;