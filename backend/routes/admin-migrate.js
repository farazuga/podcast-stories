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
        
        // Try to load and execute the invitation usage table migration
        const usageMigrationPath = path.join(__dirname, '../migrations/013_add_teacher_invitation_usage_table.sql');
        
        if (fs.existsSync(usageMigrationPath)) {
            console.log('📄 Loading invitation usage table migration...');
            const usageMigrationSQL = fs.readFileSync(usageMigrationPath, 'utf8');
            await client.query(usageMigrationSQL);
            console.log('✅ Invitation usage table migration executed');
        } else {
            console.log('⚠️  Invitation usage table migration not found - skipping');
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