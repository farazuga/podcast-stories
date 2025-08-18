#!/usr/bin/env node

// Script to apply Phase 1 migration to production database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  try {
    console.log('🚀 Starting Phase 1 Migration...');
    console.log('📊 This will DELETE ALL existing data and create new structure');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '009_phase1_user_email_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📁 Migration file loaded successfully');
    console.log('🗄️ Connecting to database...');
    
    // Apply the migration
    const result = await pool.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('🎉 Phase 1 Implementation Complete!');
    console.log('');
    console.log('📋 Summary:');
    console.log('- All existing data deleted');
    console.log('- Email-based authentication enabled');
    console.log('- Three default accounts created:');
    console.log('  • admin@vidpod.com (amitrace_admin)');
    console.log('  • teacher@vidpod.com (teacher)');
    console.log('  • student@vidpod.com (student)');
    console.log('- Password for all accounts: rumi&amaml');
    console.log('- Demo school and class created');
    console.log('');
    console.log('🔗 Next Steps:');
    console.log('1. Test login with new email addresses');
    console.log('2. Verify role-based redirects work');
    console.log('3. Begin Phase 2 implementation');
    
    // Verify the migration worked
    console.log('');
    console.log('🔍 Verification:');
    
    const users = await pool.query('SELECT id, email, name, role FROM users ORDER BY id');
    console.log('👥 Created users:');
    users.rows.forEach(user => {
      console.log(`  ${user.id}. ${user.email} (${user.name}) - ${user.role}`);
    });
    
    const schools = await pool.query('SELECT id, school_name FROM schools');
    console.log('🏫 Created schools:');
    schools.rows.forEach(school => {
      console.log(`  ${school.id}. ${school.school_name}`);
    });
    
    const classes = await pool.query('SELECT id, class_name, class_code FROM classes');
    console.log('📚 Created classes:');
    classes.rows.forEach(cls => {
      console.log(`  ${cls.id}. ${cls.class_name} (Code: ${cls.class_code})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
applyMigration();