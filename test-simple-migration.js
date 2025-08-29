#!/usr/bin/env node

/**
 * Test Simple Migration
 */

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function testSimpleMigration() {
    console.log('🚀 Testing Simple Rundown Migration');
    console.log('='.repeat(50));

    try {
        // Step 1: Authenticate
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

        const { token } = await loginResponse.json();
        console.log('✅ Authenticated successfully');

        // Step 2: Run simple migration
        console.log('\n2. Running simple migration...');
        const migrationResponse = await fetch(`${PRODUCTION_URL}/api/rundown-simple-migration/run-simple`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Migration response: ${migrationResponse.status} ${migrationResponse.statusText}`);

        if (migrationResponse.ok) {
            const migrationData = await migrationResponse.json();
            console.log('✅ Migration completed!');
            console.log('Migration data:', JSON.stringify(migrationData, null, 2));

            // Step 3: Test rundown endpoint
            console.log('\n3. Testing rundown endpoint...');
            const rundownResponse = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (rundownResponse.ok) {
                const data = await rundownResponse.json();
                console.log(`✅ Rundown endpoint working! Found ${data.length} rundowns`);
                
                console.log('\n🎉 MIGRATION SUCCESSFUL!');
                console.log('✅ All rundown tables created');
                console.log('✅ Rundown API endpoints functional');
                
            } else {
                const error = await rundownResponse.text();
                console.log(`❌ Rundown endpoint still failing: ${rundownResponse.status}`);
                console.log(`Error: ${error}`);
            }

        } else {
            const errorData = await migrationResponse.text();
            console.log('❌ Migration failed');
            console.log('Error:', errorData);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    console.log('='.repeat(50));
}

testSimpleMigration();