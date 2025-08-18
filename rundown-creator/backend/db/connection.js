const { Pool } = require('pg');

/**
 * Database Connection for Rundown Creator
 * 
 * Uses the same database as main VidPOD but with independent tables.
 * Connection string should be the same as main application.
 */

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    
    console.log('✅ Rundown Creator database connected successfully');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error('❌ Rundown Creator database connection failed:', error.message);
    return false;
  }
};

// Initialize database tables if they don't exist
const initializeTables = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('✅ Rundown Creator database tables initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error.message);
    return false;
  }
};

// Helper function for safe query execution
const safeQuery = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  } finally {
    client.release();
  }
};

// Helper function for transactions
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Database pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
  }
};

// Initialize on module load
(async () => {
  if (process.env.NODE_ENV !== 'test') {
    await testConnection();
    await initializeTables();
  }
})();

module.exports = {
  pool,
  safeQuery,
  withTransaction,
  testConnection,
  initializeTables,
  closePool
};