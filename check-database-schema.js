/**
 * Check database schema for teacher approval dependencies
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDatabaseSchema() {
    console.log('🔍 Checking Database Schema for Teacher Approval');
    console.log('==============================================\n');
    
    try {
        // Check if password_reset_tokens table exists
        console.log('1️⃣ Checking password_reset_tokens table...');
        const tokenTableCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'password_reset_tokens'
            ORDER BY ordinal_position
        `);
        
        if (tokenTableCheck.rows.length === 0) {
            console.log('❌ password_reset_tokens table does NOT exist!');
            console.log('   This is likely the cause of the 500 error.');
            console.log('   The createPasswordResetToken function needs this table.');
        } else {
            console.log('✅ password_reset_tokens table exists with columns:');
            tokenTableCheck.rows.forEach(row => {
                console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
            });
        }
        
        // Check users table structure
        console.log('\n2️⃣ Checking users table structure...');
        const usersTableCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('id', 'email', 'password', 'role', 'name', 'school_id')
            ORDER BY ordinal_position
        `);
        
        console.log('✅ Users table relevant columns:');
        usersTableCheck.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
        });
        
        // Check teacher_requests table structure  
        console.log('\n3️⃣ Checking teacher_requests table structure...');
        const requestsTableCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'teacher_requests'
            ORDER BY ordinal_position
        `);
        
        console.log('✅ Teacher_requests table columns:');
        requestsTableCheck.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
        });
        
        // Test a simple token creation
        console.log('\n4️⃣ Testing token service...');
        try {
            const tokenService = require('./backend/utils/token-service');
            console.log('✅ Token service module loads successfully');
            
            // Don't actually create a token, just test if we can call the function
            console.log('   Token service appears to be available');
        } catch (tokenError) {
            console.log('❌ Token service error:', tokenError.message);
        }
        
    } catch (error) {
        console.error('❌ Database schema check failed:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabaseSchema();