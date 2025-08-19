/**
 * Database Configuration
 * Centralized database connection and query settings
 */

const { Pool } = require('pg');
const config = require('./environment');

// Database connection pool configuration
const poolConfig = {
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Database utility functions
const db = {
  // Get pool instance
  getPool: () => pool,
  
  // Execute query with error handling
  query: async (text, params = []) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (config.NODE_ENV === 'development') {
        console.log('Executed query', { text, duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('Database query error', { text, duration, error: error.message });
      throw error;
    }
  },
  
  // Begin transaction
  beginTransaction: async () => {
    const client = await pool.connect();
    await client.query('BEGIN');
    return client;
  },
  
  // Commit transaction
  commitTransaction: async (client) => {
    await client.query('COMMIT');
    client.release();
  },
  
  // Rollback transaction
  rollbackTransaction: async (client) => {
    await client.query('ROLLBACK');
    client.release();
  },
  
  // Health check
  healthCheck: async () => {
    try {
      await pool.query('SELECT 1');
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
};

module.exports = db;