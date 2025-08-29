/**
 * Check if password_reset_tokens table exists
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTokenTable() {
    try {
        console.log('🔍 Checking password_reset_tokens table...');
        
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'password_reset_tokens'
            ORDER BY ordinal_position
        `);
        
        if (result.rows.length === 0) {
            console.log('❌ PROBLEM FOUND: password_reset_tokens table is MISSING!');
            console.log('   This explains the 500 error in teacher approval');
            console.log('   createPasswordResetToken() fails because the table doesn\'t exist');
            console.log('\n💡 SOLUTION: Create the password_reset_tokens table');
            return false;
        } else {
            console.log('✅ password_reset_tokens table exists with columns:');
            result.rows.forEach(row => {
                console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'NO' ? 'NOT NULL' : 'nullable'})`);
            });
            return true;
        }
    } catch (error) {
        console.log('❌ Database error:', error.message);
        return false;
    } finally {
        await pool.end();
    }
}

checkTokenTable().then(exists => {
    if (!exists) {
        console.log('\n🚨 ACTION REQUIRED: Create password_reset_tokens table to fix teacher approval');
    }
});