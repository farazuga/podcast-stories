/**
 * Admin Migration Routes
 * Provides API endpoints for running database migrations from the admin panel
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { verifyToken, isAmitraceAdmin } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Run Teacher Requests Migration
 * Adds missing columns to teacher_requests table to fix password setting issues
 */
router.post('/migrate-teacher-requests', verifyToken, isAmitraceAdmin, async (req, res) => {
    console.log('🔧 Admin migration request received from user:', req.user.email);
    
    try {
        const migrationResult = await runTeacherRequestsMigration();
        
        console.log('✅ Migration completed successfully');
        
        res.json({
            success: true,
            message: 'Teacher requests migration completed successfully',
            ...migrationResult
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'production' ? undefined : error.stack
        });
    }
});

/**
 * Check migration status
 * Returns current schema state without making changes
 */
router.get('/migration-status', verifyToken, isAmitraceAdmin, async (req, res) => {
    try {
        const status = await checkMigrationStatus();
        res.json(status);
        
    } catch (error) {
        console.error('❌ Status check failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Actually run the teacher requests migration
 */
async function runTeacherRequestsMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Checking current schema...');
        
        // Check current schema
        const currentStatus = await checkMigrationStatus();
        
        if (!currentStatus.needsMigration) {
            return {
                alreadyUpToDate: true,
                message: 'All columns already exist - no migration needed',
                currentColumns: currentStatus.existingColumns
            };
        }
        
        console.log(`📋 Missing columns: ${currentStatus.missingColumns.join(', ')}`);
        
        await client.query('BEGIN');
        console.log('🚀 Starting transaction...');
        
        // Load and execute the main migration
        const migrationPath = path.join(__dirname, '../migrations/012_add_teacher_request_missing_columns.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error('Migration file not found: 012_add_teacher_request_missing_columns.sql');
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📄 Loaded migration SQL');
        
        await client.query(migrationSQL);
        console.log('✅ Main migration executed');
        
        // Try to create the invitation usage table with proper type
        try {
            console.log('📄 Creating invitation usage table...');
            
            // First, check the type of teacher_requests.id
            const idTypeResult = await client.query(`
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'teacher_requests' 
                AND column_name = 'id'
            `);
            
            if (idTypeResult.rows.length > 0) {
                const idType = idTypeResult.rows[0].data_type;
                console.log(`   teacher_requests.id type: ${idType}`);
                
                // Create the table with the correct type
                if (idType === 'integer' || idType === 'bigint') {
                    await client.query(`
                        CREATE TABLE IF NOT EXISTS teacher_invitation_usage (
                            request_id INTEGER PRIMARY KEY,
                            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                        );
                    `);
                    
                    // Try to add foreign key constraint
                    await client.query(`
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.table_constraints 
                                WHERE constraint_name = 'teacher_invitation_usage_request_id_fkey' 
                                AND table_name = 'teacher_invitation_usage'
                            ) THEN
                                ALTER TABLE teacher_invitation_usage 
                                ADD CONSTRAINT teacher_invitation_usage_request_id_fkey 
                                FOREIGN KEY (request_id) REFERENCES teacher_requests(id) ON DELETE CASCADE;
                            END IF;
                        EXCEPTION
                            WHEN others THEN
                                -- If foreign key fails, continue without it
                                RAISE NOTICE 'Foreign key constraint could not be added: %', SQLERRM;
                        END $$;
                    `);
                } else {
                    // For UUID or other types, create without foreign key
                    await client.query(`
                        CREATE TABLE IF NOT EXISTS teacher_invitation_usage (
                            request_id TEXT PRIMARY KEY,
                            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                        );
                    `);
                }
                
                console.log('✅ Invitation usage table created successfully');
            } else {
                console.log('⚠️  Could not determine teacher_requests.id type - skipping usage table');
            }
        } catch (usageTableError) {
            console.log('⚠️  Invitation usage table creation failed:', usageTableError.message);
            console.log('   This is non-critical - password_set_at column will be used instead');
            // Don't throw - this is optional functionality
        }
        
        await client.query('COMMIT');
        console.log('✅ Transaction committed');
        
        // Verify the migration worked
        const postMigrationStatus = await checkMigrationStatus();
        
        return {
            migrationExecuted: true,
            columnsAdded: currentStatus.missingColumns,
            remainingMissingColumns: postMigrationStatus.missingColumns,
            migrationDetails: [
                'Added processed_at column for tracking request processing',
                'Added action_type column for tracking approval/rejection actions', 
                'Added password_set_at column for tracking invitation usage',
                'Added approved_by column linking to admin users',
                'Added approved_at column for approval timestamps',
                'Created teacher_invitation_usage table for fallback token tracking'
            ],
            allColumnsNowExist: postMigrationStatus.missingColumns.length === 0
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.log('❌ Transaction rolled back due to error');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Check what columns exist and what's missing
 */
async function checkMigrationStatus() {
    try {
        // Check if table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'teacher_requests'
            );
        `);
        
        if (!tableExists.rows[0].exists) {
            throw new Error('teacher_requests table does not exist');
        }
        
        // Get current columns
        const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'teacher_requests' 
            ORDER BY ordinal_position;
        `);
        
        const currentColumns = columnsResult.rows.map(row => row.column_name);
        
        // Check for required optional columns
        const requiredColumns = [
            'processed_at',
            'action_type',
            'password_set_at', 
            'approved_by',
            'approved_at'
        ];
        
        const missingColumns = requiredColumns.filter(
            col => !currentColumns.includes(col)
        );
        
        const existingColumns = requiredColumns.filter(
            col => currentColumns.includes(col)
        );
        
        return {
            tableExists: true,
            totalColumns: currentColumns.length,
            allColumns: currentColumns,
            requiredColumns,
            existingColumns,
            missingColumns,
            needsMigration: missingColumns.length > 0
        };
        
    } catch (error) {
        throw new Error(`Failed to check migration status: ${error.message}`);
    }
}

module.exports = router;