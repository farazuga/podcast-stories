// Run database migration for password_reset_tokens
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    try {
        console.log('🔧 Running database migration...\n');
        
        // First, check if constraint already exists
        const constraintCheck = await pool.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'password_reset_tokens' 
            AND constraint_type = 'UNIQUE'
        `);
        
        if (constraintCheck.rows.some(row => row.constraint_name === 'unique_user_id')) {
            console.log('✅ Constraint already exists!');
            process.exit(0);
        }
        
        // Remove duplicates
        console.log('Removing duplicate entries...');
        const deleteResult = await pool.query(`
            DELETE FROM password_reset_tokens 
            WHERE id NOT IN (
                SELECT MAX(id) 
                FROM password_reset_tokens 
                GROUP BY user_id
            )
        `);
        console.log(`Deleted ${deleteResult.rowCount} duplicate entries`);
        
        // Add unique constraint
        console.log('Adding unique constraint...');
        await pool.query(`
            ALTER TABLE password_reset_tokens 
            ADD CONSTRAINT unique_user_id UNIQUE (user_id)
        `);
        
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();