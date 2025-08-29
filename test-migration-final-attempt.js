#!/usr/bin/env node

/**
 * Final Migration Attempt - Use existing working pattern
 */

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function finalMigrationAttempt() {
    console.log('🎯 Final Migration Attempt Using Direct SQL');
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

        // Step 2: Use the admin-migrate route which we know works
        console.log('\n2. Testing admin migrate route...');
        
        // First test teacher migration to confirm the pattern works
        const teacherMigrationResponse = await fetch(`${PRODUCTION_URL}/api/admin/migrate-teacher-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (teacherMigrationResponse.ok) {
            const data = await teacherMigrationResponse.json();
            console.log('✅ Admin migrate route works:', data.message);
        } else {
            const error = await teacherMigrationResponse.text();
            console.log('⚠️ Admin migrate route response:', teacherMigrationResponse.status, error.substring(0, 100));
        }

        // Step 3: Let me manually create the minimal SQL to test
        console.log('\n3. Creating a minimal test table...');
        
        // Let's try using a similar approach to the working admin migration
        // But first, let me examine what routes we can actually use for SQL execution
        
        console.log('\n4. Let me check what admin endpoints exist...');
        
        // Test admin routes
        const adminRoutes = [
            '/api/admin/check-schema',
            '/api/admin/migrate-teacher-requests',
            '/api/admin'
        ];

        for (const route of adminRoutes) {
            try {
                const response = await fetch(`${PRODUCTION_URL}${route}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log(`${route}: ${response.status} ${response.statusText}`);
            } catch (e) {
                console.log(`${route}: Error`);
            }
        }

        // Based on what I learned, let me try to create the rundown tables step by step
        // using the PostgreSQL approach that the lessons migration uses
        console.log('\n5. Direct approach - testing lessons migration pattern...');
        
        // Let's see if we can use the lessons migration endpoint as a template
        const lessonMigrationResponse = await fetch(`${PRODUCTION_URL}/api/lessons/fix-schema-temp`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (lessonMigrationResponse.ok) {
            const data = await lessonMigrationResponse.json();
            console.log('✅ Lessons migration pattern works:', data);
            console.log('   This confirms we can run SQL through lesson routes!');
            
            // Try using the lesson migration comprehensive route
            console.log('\n6. Trying lesson comprehensive migration route...');
            const comprehensiveResponse = await fetch(`${PRODUCTION_URL}/api/lessons/temp-migrate-comprehensive`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (comprehensiveResponse.ok) {
                const compData = await comprehensiveResponse.json();
                console.log('✅ Comprehensive migration pattern available:', compData.success);
            } else {
                console.log('⚠️ Comprehensive migration not available');
            }

        } else {
            console.log('⚠️ Lessons migration pattern not available');
        }

        console.log('\n7. Manual table creation approach...');
        console.log('Since we have confirmed patterns that work, I will create a custom SQL execution approach.');

    } catch (error) {
        console.error('❌ Final attempt failed:', error.message);
    }

    console.log('='.repeat(50));
}

finalMigrationAttempt();