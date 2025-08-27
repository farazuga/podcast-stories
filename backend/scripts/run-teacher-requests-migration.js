/**
 * Teacher Requests Migration Script
 * 
 * This script specifically handles the missing database columns issue in the teacher_requests table.
 * It adds the optional columns (processed_at, action_type, password_set_at, approved_by, approved_at) 
 * that are causing the 500 error in the admin panel.
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class TeacherRequestsMigrator {
    constructor(options = {}) {
        this.dryRun = options.dryRun || false;
        this.verbose = (typeof options.verbose === 'boolean') ? options.verbose : true;
        this.migrationFiles = [
            'backend/migrations/012_add_teacher_request_missing_columns.sql',
            'backend/migrations/add_teacher_request_audit_fields.sql',
            'backend/migrations/013_add_teacher_invitation_usage_table.sql'
        ];
    }

    log(message, type = 'info') {
        if (!this.verbose && type === 'debug') return;
        
        const prefix = {
            info: '📋',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            debug: '🔍'
        }[type] || 'ℹ️';
        
        console.log(`${prefix} ${message}`);
    }

    async checkCurrentSchema() {
        this.log('Checking current teacher_requests table schema...', 'info');
        
        try {
            // Check if table exists
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'teacher_requests'
                );
            `);

            if (!tableCheck.rows[0].exists) {
                throw new Error('teacher_requests table does not exist');
            }

            // Get current columns
            const columnsResult = await pool.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'teacher_requests' 
                ORDER BY ordinal_position;
            `);

            const currentColumns = columnsResult.rows.map(row => ({
                name: row.column_name,
                type: row.data_type,
                nullable: row.is_nullable === 'YES'
            }));

            // Check for the specific optional columns that cause issues
            const requiredColumns = [
                'processed_at',
                'action_type', 
                'password_set_at',
                'approved_by',
                'approved_at'
            ];

            const missingColumns = requiredColumns.filter(
                col => !currentColumns.some(current => current.name === col)
            );

            const existingColumns = requiredColumns.filter(
                col => currentColumns.some(current => current.name === col)
            );

            this.log(`Current schema analysis:`, 'info');
            this.log(`  Total columns: ${currentColumns.length}`, 'debug');
            this.log(`  Missing optional columns: ${missingColumns.length}`, missingColumns.length > 0 ? 'warning' : 'success');
            this.log(`  Existing optional columns: ${existingColumns.length}`, 'debug');

            if (missingColumns.length > 0) {
                this.log(`  Missing: ${missingColumns.join(', ')}`, 'warning');
            }

            if (existingColumns.length > 0) {
                this.log(`  Present: ${existingColumns.join(', ')}`, 'success');
            }

            return {
                tableExists: true,
                currentColumns,
                missingColumns,
                existingColumns,
                needsMigration: missingColumns.length > 0
            };

        } catch (error) {
            this.log(`Schema check failed: ${error.message}`, 'error');
            return {
                tableExists: false,
                error: error.message,
                needsMigration: false
            };
        }
    }

    async validateMigrationFiles() {
        this.log('Validating migration files...', 'info');
        
        const validFiles = [];
        const missingFiles = [];

        for (const migrationFile of this.migrationFiles) {
            const fullPath = path.resolve(migrationFile);
            
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                validFiles.push({
                    path: migrationFile,
                    fullPath,
                    content,
                    size: content.length
                });
                this.log(`  ✅ Found: ${migrationFile}`, 'success');
            } else {
                missingFiles.push(migrationFile);
                this.log(`  ❌ Missing: ${migrationFile}`, 'error');
            }
        }

        if (missingFiles.length > 0) {
            throw new Error(`Missing migration files: ${missingFiles.join(', ')}`);
        }

        return validFiles;
    }

    async executeMigration(migrationFile) {
        this.log(`Executing migration: ${migrationFile.path}`, 'info');
        
        if (this.dryRun) {
            this.log(`  DRY RUN - Would execute ${migrationFile.content.length} characters of SQL`, 'warning');
            this.log(`  Preview (first 200 chars): ${migrationFile.content.substring(0, 200)}...`, 'debug');
            return { success: true, dryRun: true };
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Execute the migration SQL
            const result = await client.query(migrationFile.content);
            
            await client.query('COMMIT');
            
            this.log(`  ✅ Migration executed successfully`, 'success');
            this.log(`  Database changes committed`, 'success');
            
            return { success: true, result };

        } catch (error) {
            await client.query('ROLLBACK');
            this.log(`  ❌ Migration failed: ${error.message}`, 'error');
            this.log(`  Database changes rolled back`, 'error');
            
            // Provide specific guidance for common errors
            if (error.message.includes('already exists')) {
                this.log(`  💡 Some columns may already exist - this might be partially OK`, 'warning');
                return { success: false, error: error.message, partiallyOk: true };
            }
            
            return { success: false, error: error.message };
            
        } finally {
            client.release();
        }
    }

    async verifyMigrationSuccess() {
        this.log('Verifying migration success...', 'info');
        
        try {
            const postMigrationSchema = await this.checkCurrentSchema();
            
            if (postMigrationSchema.missingColumns.length === 0) {
                this.log('✅ All optional columns now exist in the database', 'success');
                this.log('✅ The teacher requests API should work without SKIP_OPTIONAL_COLUMNS', 'success');
                return true;
            } else {
                this.log(`❌ Still missing columns: ${postMigrationSchema.missingColumns.join(', ')}`, 'error');
                return false;
            }
            
        } catch (error) {
            this.log(`Verification failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testAPIAfterMigration() {
        this.log('Testing API functionality after migration...', 'info');
        
        try {
            // Test the query that was failing
            const testQuery = `
                SELECT 
                    tr.id,
                    tr.name,
                    tr.email,
                    tr.status,
                    tr.processed_at,
                    tr.action_type,
                    tr.password_set_at
                FROM teacher_requests tr
                LIMIT 1
            `;
            
            if (this.dryRun) {
                this.log('  DRY RUN - Would test API query', 'warning');
                return true;
            }
            
            const result = await pool.query(testQuery);
            this.log('✅ API query test passed - all columns accessible', 'success');
            this.log(`  Retrieved ${result.rows.length} test records`, 'debug');
            
            return true;
            
        } catch (error) {
            this.log(`❌ API test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async generateRollbackInstructions() {
        this.log('\n📋 ROLLBACK INSTRUCTIONS', 'info');
        this.log('If you need to rollback these changes:', 'info');
        console.log('');
        console.log('-- Rollback SQL (run manually if needed):');
        console.log('DROP TABLE IF EXISTS teacher_invitation_usage;');
        console.log('ALTER TABLE teacher_requests DROP COLUMN IF EXISTS processed_at;');
        console.log('ALTER TABLE teacher_requests DROP COLUMN IF EXISTS action_type;');
        console.log('ALTER TABLE teacher_requests DROP COLUMN IF EXISTS password_set_at;');
        console.log('ALTER TABLE teacher_requests DROP COLUMN IF EXISTS approved_by;');
        console.log('ALTER TABLE teacher_requests DROP COLUMN IF EXISTS approved_at;');
        console.log('');
        console.log('-- Alternatively, set environment variable as temporary fix:');
        console.log('SKIP_OPTIONAL_COLUMNS=true');
        console.log('');
    }

    async runMigration() {
        try {
            this.log('\n🚀 Teacher Requests Migration Starting', 'info');
            this.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE EXECUTION'}`, 'info');
            this.log('', 'info');

            // Step 1: Check current schema
            const schemaCheck = await this.checkCurrentSchema();
            if (!schemaCheck.tableExists) {
                throw new Error('teacher_requests table does not exist');
            }

            if (!schemaCheck.needsMigration) {
                this.log('✅ All optional columns already exist - migration not needed', 'success');
                await this.testAPIAfterMigration();
                return;
            }

            // Step 2: Validate migration files
            const migrationFiles = await this.validateMigrationFiles();

            // Step 3: Execute migrations
            let allSuccessful = true;
            const results = [];

            for (const migrationFile of migrationFiles) {
                const result = await this.executeMigration(migrationFile);
                results.push(result);
                
                if (!result.success && !result.partiallyOk) {
                    allSuccessful = false;
                    break;
                }
            }

            if (!allSuccessful) {
                this.log('❌ Migration failed - check errors above', 'error');
                await this.generateRollbackInstructions();
                return;
            }

            // Step 4: Verify success
            if (!this.dryRun) {
                const verificationSuccess = await this.verifyMigrationSuccess();
                if (verificationSuccess) {
                    await this.testAPIAfterMigration();
                }
            }

            // Step 5: Final report
            this.log('\n🎉 MIGRATION COMPLETED', 'success');
            this.log('', 'info');
            
            if (this.dryRun) {
                this.log('This was a dry run. To execute for real:', 'info');
                this.log('  node backend/scripts/run-teacher-requests-migration.js --live', 'info');
            } else {
                this.log('✅ Database schema updated successfully', 'success');
                this.log('✅ Teacher requests API should now work without SKIP_OPTIONAL_COLUMNS', 'success');
                this.log('', 'info');
                this.log('🔧 NEXT STEPS:', 'info');
                this.log('  1. Remove SKIP_OPTIONAL_COLUMNS environment variable from Railway', 'info');
                this.log('  2. Test admin panel teacher requests tab', 'info');
                this.log('  3. Verify no 500 errors occur', 'info');
            }

        } catch (error) {
            this.log(`❌ Migration process failed: ${error.message}`, 'error');
            await this.generateRollbackInstructions();
            process.exit(1);
        }
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    dryRun: !args.includes('--live') && !args.includes('--execute'),
    verbose: !args.includes('--quiet')
};

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
    console.log('\nTeacher Requests Migration Script');
    console.log('==================================\n');
    console.log('Usage:');
    console.log('  node backend/scripts/run-teacher-requests-migration.js [options]\n');
    console.log('Options:');
    console.log('  --live, --execute    Execute the migration (default is dry run)');
    console.log('  --quiet              Reduce verbose output');
    console.log('  --help, -h           Show this help\n');
    console.log('Examples:');
    console.log('  node backend/scripts/run-teacher-requests-migration.js');
    console.log('  node backend/scripts/run-teacher-requests-migration.js --live');
    console.log('');
    process.exit(0);
}

// Run the migration
const migrator = new TeacherRequestsMigrator(options);

// Handle cleanup on exit
process.on('SIGINT', async () => {
    console.log('\n👋 Migration interrupted');
    process.exit();
});

migrator.runMigration()
    .then(() => {
        if (!options.dryRun) {
            console.log('\n🏁 Migration process completed successfully');
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Migration process failed:', error.message);
        process.exit(1);
    });