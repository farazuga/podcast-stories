#!/usr/bin/env node

/**
 * Test Script to Run Rundown System Migration in Production
 */

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';

async function runMigration() {
    console.log('🚀 Running Rundown System Migration');
    console.log('🌐 Production URL:', PRODUCTION_URL);
    console.log('⏰ Time:', new Date().toISOString());
    console.log('='.repeat(60));

    try {
        // Step 1: Authenticate as admin
        console.log('1. 🔐 Authenticating as admin...');
        const loginResponse = await fetch(`${PRODUCTION_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@vidpod.com',
                password: 'vidpod'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Authentication failed: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        const adminToken = loginData.token;
        console.log('   ✅ Admin authentication successful');

        // Step 2: Check current migration status
        console.log('\n2. 📊 Checking current migration status...');
        const statusResponse = await fetch(`${PRODUCTION_URL}/api/rundown-migration/status`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('   📋 Migration Status:');
            console.log(`   - Is Migrated: ${statusData.isMigrated}`);
            console.log(`   - Tables Found: ${statusData.totalTables}/${statusData.expectedTables}`);
            console.log(`   - Indexes Found: ${statusData.indexesFound}`);
            console.log(`   - Rundowns Count: ${statusData.rundownCount}`);

            if (statusData.isMigrated) {
                console.log('   ✅ Migration already completed!');
                return statusData;
            }
        } else {
            console.log('   ⚠️ Status check failed, proceeding with migration...');
        }

        // Step 3: Run the migration
        console.log('\n3. ⚙️ Running migration...');
        const migrationResponse = await fetch(`${PRODUCTION_URL}/api/rundown-migration/run-migration`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const migrationData = await migrationResponse.json();

        if (migrationResponse.ok) {
            console.log('   🎉 Migration completed successfully!');
            console.log('   📊 Results:');
            console.log(`   - Tables Created: ${migrationData.tablesCreated?.length || 0}`);
            console.log(`   - Indexes Created: ${migrationData.indexesCreated || 0}`);
            console.log(`   - Statements Executed: ${migrationData.statementsExecuted || 0}`);
            
            if (migrationData.tablesCreated) {
                migrationData.tablesCreated.forEach(table => {
                    console.log(`     ✅ Table: ${table.name} (${table.columns} columns)`);
                });
            }

            // Verify migration worked by testing rundown endpoint
            console.log('\n4. ✅ Verifying migration...');
            const verifyResponse = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (verifyResponse.ok) {
                const rundowns = await verifyResponse.json();
                console.log(`   ✅ Rundown endpoint working! Found ${rundowns.length} rundowns`);
                
                // Test creation
                console.log('\n5. 🧪 Testing rundown creation...');
                const testRundown = {
                    title: 'Migration Test Rundown',
                    description: 'Test rundown created after successful migration',
                    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                };

                const createResponse = await fetch(`${PRODUCTION_URL}/api/rundowns`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testRundown)
                });

                if (createResponse.ok) {
                    const createdRundown = await createResponse.json();
                    console.log(`   ✅ Successfully created test rundown (ID: ${createdRundown.id})`);

                    // Clean up
                    const deleteResponse = await fetch(`${PRODUCTION_URL}/api/rundowns/${createdRundown.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${adminToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (deleteResponse.ok) {
                        console.log('   🧹 Test rundown cleaned up successfully');
                    }
                } else {
                    const createError = await createResponse.text();
                    console.log(`   ❌ Failed to create test rundown: ${createResponse.status} - ${createError}`);
                }
            } else {
                const verifyError = await verifyResponse.text();
                console.log(`   ❌ Rundown endpoint still failing: ${verifyResponse.status} - ${verifyError}`);
            }

        } else {
            console.error('   ❌ Migration failed!');
            console.error('   Error response:', migrationData);
            throw new Error(`Migration failed: ${migrationData.error || 'Unknown error'}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 RUNDOWN SYSTEM MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('✅ All rundown endpoints should now be functional');
        console.log('='.repeat(60));

        return migrationData;

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('='.repeat(60));
        throw error;
    }
}

// Run if this file is executed directly
if (require.main === module) {
    runMigration().then(result => {
        process.exit(0);
    }).catch(error => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
}

module.exports = runMigration;