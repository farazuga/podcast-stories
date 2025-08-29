/**
 * Apply password_reset_tokens table fix to production database
 */

const fs = require('fs');
const { Pool } = require('./backend/node_modules/pg');

// Use production database URL
const DATABASE_URL = "postgresql://postgres:GOjhJKJKjqoQMuTysDiCOVWrMyCIVNEr@roundhouse.proxy.rlwy.net:36007/railway";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function applyPasswordResetTokensFix() {
    console.log('🔧 Applying password_reset_tokens table fix to production');
    console.log('==================================================\n');
    
    try {
        // Read the SQL file
        const sqlContent = fs.readFileSync('./backend/create-password-reset-tokens-table.sql', 'utf8');
        
        console.log('1️⃣ Executing SQL migration...');
        
        // Execute the migration
        const result = await pool.query(sqlContent);
        
        console.log('✅ Migration executed successfully');
        
        // Verify the table exists now
        console.log('\n2️⃣ Verifying table creation...');
        
        const verifyResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'password_reset_tokens'
            ORDER BY ordinal_position
        `);
        
        if (verifyResult.rows.length > 0) {
            console.log('✅ password_reset_tokens table verified with columns:');
            verifyResult.rows.forEach(row => {
                console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'NO' ? 'NOT NULL' : 'nullable'})`);
            });
            
            console.log('\n🎉 SUCCESS! Teacher approval should now work');
            console.log('   The 500 error was caused by missing password_reset_tokens table');
            console.log('   createPasswordResetToken() can now insert tokens successfully');
        } else {
            console.log('❌ Verification failed - table still not found');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.message.includes('already exists')) {
            console.log('   Table may already exist - checking...');
            
            try {
                const checkResult = await pool.query(`
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'password_reset_tokens'
                `);
                
                if (checkResult.rows.length > 0) {
                    console.log('✅ Table already exists - this is good!');
                } else {
                    console.log('❌ Table check failed');
                }
            } catch (checkError) {
                console.log('❌ Table check error:', checkError.message);
            }
        }
    } finally {
        await pool.end();
    }
}

applyPasswordResetTokensFix();