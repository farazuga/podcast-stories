#!/usr/bin/env node

/**
 * Test what endpoints exist
 */

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function testEndpoints() {
    console.log('🔍 Testing Endpoint Availability');
    console.log('='.repeat(40));

    try {
        // Authenticate first
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

        const { token } = await loginResponse.json();
        console.log('✅ Authenticated');

        // Test endpoints
        const endpoints = [
            '/api/rundown-migration/status',
            '/api/rundown-simple-migration/run-simple',
            '/api/rundowns',
            '/api/rundown-segments',
            '/api/rundown-talent',
            '/api/rundown-stories'
        ];

        for (const endpoint of endpoints) {
            const response = await fetch(`${PRODUCTION_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`${endpoint}: ${response.status} ${response.statusText}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testEndpoints();