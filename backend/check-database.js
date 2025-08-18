#!/usr/bin/env node

// Check current database structure
const { Pool } = require('pg');

const DATABASE_PUBLIC_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  console.log('🔍 Checking current database structure...');
  
  const client = await pool.connect();
  
  try {
    // Check what tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 Existing tables:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Check users table structure if it exists
    const userTableExists = tables.rows.some(t => t.table_name === 'users');
    if (userTableExists) {
      console.log('\n👥 Users table structure:');
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Check current users
      const users = await client.query('SELECT id, username, email, role FROM users LIMIT 10');
      console.log(`\n👤 Current users (${users.rows.length}):`);
      users.rows.forEach(user => {
        console.log(`  ${user.id}. ${user.username || 'N/A'} / ${user.email || 'N/A'} (${user.role})`);
      });
    } else {
      console.log('\n❌ Users table does not exist');
    }
    
    // Check if this is a fresh database or has existing schema
    const schemaVersion = await client.query(`
      SELECT version, description, applied_at 
      FROM schema_version 
      ORDER BY version DESC 
      LIMIT 5
    `).catch(() => ({ rows: [] }));
    
    if (schemaVersion.rows.length > 0) {
      console.log('\n📋 Schema version history:');
      schemaVersion.rows.forEach(v => {
        console.log(`  v${v.version}: ${v.description} (${v.applied_at})`);
      });
    } else {
      console.log('\n📋 No schema version table found (fresh database)');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase();