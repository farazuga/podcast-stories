#!/usr/bin/env node

/**
 * List all amitrace_admin users in the VidPOD database
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function listAmitracAdmins() {
  try {
    console.log('🔍 Querying for amitrace_admin users...\n');
    
    const query = `
      SELECT 
        id, 
        email, 
        username, 
        name, 
        role,
        school_id,
        created_at::date as created_date,
        CASE 
          WHEN created_at > NOW() - INTERVAL '7 days' THEN '🆕 New'
          WHEN created_at > NOW() - INTERVAL '30 days' THEN '📅 Recent' 
          ELSE '👤 Existing'
        END as status
      FROM users 
      WHERE role = 'amitrace_admin' 
      ORDER BY created_at DESC;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ No amitrace_admin users found in the database.');
      return;
    }
    
    console.log(`✅ Found ${result.rows.length} amitrace_admin user(s):\n`);
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.status} Amitrace Admin`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Username: ${user.username || 'N/A'}`);
      console.log(`   🏷️  Name: ${user.name || 'N/A'}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   🏫 School ID: ${user.school_id || 'N/A'}`);
      console.log(`   📅 Created: ${user.created_date}`);
      console.log('');
    });

    // Also get total user counts by role for context
    const roleCountQuery = `
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY count DESC;
    `;
    
    const roleResult = await pool.query(roleCountQuery);
    
    console.log('📊 User Role Distribution:');
    roleResult.rows.forEach(row => {
      const icon = row.role === 'amitrace_admin' ? '👑' : 
                   row.role === 'admin' ? '⚙️' : 
                   row.role === 'teacher' ? '🎓' : 
                   row.role === 'student' ? '📚' : '❓';
      console.log(`   ${icon} ${row.role}: ${row.count} users`);
    });
    
  } catch (error) {
    console.error('❌ Error querying database:', error.message);
  } finally {
    await pool.end();
  }
}

listAmitracAdmins();