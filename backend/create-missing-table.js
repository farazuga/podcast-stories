/**
 * Direct fix for missing password_reset_tokens table
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createMissingTable() {
    console.log('🔧 Creating missing password_reset_tokens table...');
    
    try {
        // Create the table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Table created successfully');
        
        // Create indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at)`);
        
        console.log('✅ Indexes created successfully');
        
        return true;
    } catch (error) {
        console.error('❌ Failed to create table:', error.message);
        return false;
    } finally {
        await pool.end();
    }
}

module.exports = { createMissingTable };