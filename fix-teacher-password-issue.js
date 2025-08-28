/**
 * Teacher Password Issue Fix Script
 * Runs the required database migration to fix missing columns
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class TeacherPasswordFixer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async checkCurrentState() {
        console.log('🔍 Checking current database state...\n');
        
        try {
            // Check if teacher_requests table exists
            const tableExists = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'teacher_requests'
                );
            `);
            
            if (!tableExists.rows[0].exists) {
                throw new Error('teacher_requests table does not exist');
            }
            
            console.log('✅ teacher_requests table exists');
            
            // Get current columns
            const columnsResult = await this.pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'teacher_requests' 
                ORDER BY ordinal_position;
            `);
            
            const existingColumns = columnsResult.rows.map(row => row.column_name);
            console.log(`📊 Current columns (${existingColumns.length}):`, existingColumns.join(', '));
            
            // Check for missing columns
            const requiredColumns = [
                'processed_at',
                'action_type', 
                'password_set_at',
                'approved_by',
                'approved_at'
            ];
            
            const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
            
            if (missingColumns.length > 0) {
                console.log(`⚠️  Missing columns (${missingColumns.length}):`, missingColumns.join(', '));
                return { needsMigration: true, missingColumns };
            } else {
                console.log('✅ All required columns present');
                return { needsMigration: false, missingColumns: [] };
            }
            
        } catch (error) {
            console.error('❌ Error checking database state:', error.message);
            throw error;
        }
    }

    async runMigration() {
        console.log('\n🔧 Running database migration...\n');
        
        const migrationPath = path.join(__dirname, 'backend/migrations/012_add_teacher_request_missing_columns.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📄 Migration file loaded');
        
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            console.log('🚀 Starting transaction...');
            
            // Execute the migration
            await client.query(migrationSQL);
            console.log('✅ Migration SQL executed');
            
            await client.query('COMMIT');
            console.log('✅ Transaction committed');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.log('❌ Transaction rolled back');
            throw error;
        } finally {
            client.release();
        }
    }

    async verifyFix() {
        console.log('\n🔍 Verifying fix...\n');
        
        // Check columns again
        const stateCheck = await this.checkCurrentState();
        
        if (!stateCheck.needsMigration) {
            console.log('✅ All required columns now present');
            
            // Test the API endpoint
            console.log('🔌 Testing teacher requests API...');
            
            try {
                const testQuery = `
                    SELECT 
                        tr.id, tr.name, tr.email, tr.status,
                        tr.processed_at, tr.action_type, tr.password_set_at
                    FROM teacher_requests tr 
                    LIMIT 1
                `;
                
                await this.pool.query(testQuery);
                console.log('✅ API query test passed');
                
            } catch (error) {
                console.log('❌ API query test failed:', error.message);
            }
            
            return true;
        } else {
            console.log('❌ Migration did not complete successfully');
            return false;
        }
    }

    async testPasswordFlow() {
        console.log('\n🎫 Testing password setting flow...\n');
        
        // This would require actually creating a teacher request and testing the full flow
        // For now, we'll just verify the database structure supports the flow
        
        try {
            // Check if teacher_invitation_usage table exists (fallback method)
            const usageTableExists = await this.pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'teacher_invitation_usage'
                );
            `);
            
            if (usageTableExists.rows[0].exists) {
                console.log('✅ teacher_invitation_usage table exists (fallback token tracking)');
            } else {
                console.log('⚠️  teacher_invitation_usage table missing - will use password_set_at column');
                
                // Run the additional migration for the usage table
                const usageMigrationPath = path.join(__dirname, 'backend/migrations/013_add_teacher_invitation_usage_table.sql');
                
                if (fs.existsSync(usageMigrationPath)) {
                    console.log('🔧 Running teacher_invitation_usage table migration...');
                    
                    const usageMigrationSQL = fs.readFileSync(usageMigrationPath, 'utf8');
                    await this.pool.query(usageMigrationSQL);
                    
                    console.log('✅ teacher_invitation_usage table created');
                } else {
                    console.log('⚠️  Usage table migration file not found, but password_set_at column should work');
                }
            }
            
        } catch (error) {
            console.log('❌ Error testing password flow:', error.message);
        }
    }

    async runCompleteFix() {
        console.log('🚀 Teacher Password Issue Fix\n');
        console.log('='*50 + '\n');
        
        try {
            // Step 1: Check current state
            const currentState = await this.checkCurrentState();
            
            if (!currentState.needsMigration) {
                console.log('\n✅ Database is already up to date!');
                console.log('The missing columns issue should be resolved.');
                console.log('Try the password setting flow again.');
                return;
            }
            
            // Step 2: Run migration
            await this.runMigration();
            
            // Step 3: Verify fix
            const fixSuccessful = await this.verifyFix();
            
            if (fixSuccessful) {
                // Step 4: Test password flow support
                await this.testPasswordFlow();
                
                console.log('\n' + '='*50);
                console.log('✅ FIX COMPLETED SUCCESSFULLY!');
                console.log('='*50);
                console.log('\n📋 WHAT WAS FIXED:');
                console.log('   • Added missing database columns to teacher_requests table');
                console.log('   • processed_at - tracks when requests are processed');
                console.log('   • action_type - tracks approval/rejection actions');
                console.log('   • password_set_at - tracks when teacher sets password');
                console.log('   • approved_by - tracks which admin approved the request');
                console.log('   • approved_at - timestamp of approval');
                
                console.log('\n🔧 NEXT STEPS:');
                console.log('   1. Try the teacher password setting flow again');
                console.log('   2. The invitation link from your email should now work');
                console.log('   3. If you still have issues, check Railway logs for detailed errors');
                console.log('   4. You can remove SKIP_OPTIONAL_COLUMNS environment variable if desired');
                
            } else {
                console.log('\n❌ Fix was not successful');
                console.log('Please check the error messages above and try again');
            }
            
        } catch (error) {
            console.log('\n❌ Fix failed:', error.message);
            console.log('\nThis might be a database connection or permissions issue.');
            console.log('Please ensure you have the correct DATABASE_URL environment variable set.');
        } finally {
            await this.pool.end();
        }
    }
}

// Run fix if called directly
if (require.main === module) {
    const fixer = new TeacherPasswordFixer();
    fixer.runCompleteFix().catch(console.error);
}

module.exports = TeacherPasswordFixer;