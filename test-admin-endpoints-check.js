#!/usr/bin/env node

/**
 * Check Admin Endpoints
 */

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function checkAdminEndpoints() {
    console.log('🔍 Checking Admin Endpoints');
    console.log('='.repeat(40));

    try {
        // Authenticate
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

        // Test admin endpoints
        const adminEndpoints = [
            { url: '/api/admin/migrate-teacher-requests', method: 'POST' },
            { url: '/api/admin/migrate-rundown-system', method: 'POST' },
            { url: '/api/admin/migration-status', method: 'GET' },
        ];

        for (const endpoint of adminEndpoints) {
            try {
                const response = await fetch(`${PRODUCTION_URL}${endpoint.url}`, {
                    method: endpoint.method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log(`${endpoint.method} ${endpoint.url}: ${response.status} ${response.statusText}`);
                
                if (endpoint.url.includes('teacher-requests') && response.ok) {
                    const data = await response.json();
                    console.log(`   Teacher migration result: ${data.message}`);
                }
                
            } catch (error) {
                console.log(`${endpoint.method} ${endpoint.url}: Error - ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Check failed:', error.message);
    }
}

checkAdminEndpoints();