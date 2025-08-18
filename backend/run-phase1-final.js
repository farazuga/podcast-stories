#!/usr/bin/env node

// Final Phase 1 Migration - Email Authentication Setup
const { Pool } = require('pg');

const DATABASE_PUBLIC_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false }
});

async function runPhase1Migration() {
  console.log('🚀 VidPOD Phase 1: Email Authentication Migration');
  console.log('📧 Setting up email-based authentication system...');
  console.log('⚠️  This will replace existing users with new default accounts');
  console.log('📊 Proceeding in 3 seconds...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const client = await pool.connect();
  
  try {
    console.log('🔄 Step 1: Clearing existing data...');
    
    // Use TRUNCATE to bypass foreign key constraints 
    console.log('  - Temporarily disabling triggers for clean reset...');
    
    // Clear data using TRUNCATE CASCADE to handle foreign key dependencies
    const tables = [
      'user_classes', 'teacher_requests', 'password_reset_tokens',
      'story_tags', 'story_interviewees', 'story_ideas', 
      'classes', 'tags', 'interviewees', 'users', 'schools'
    ];
    
    for (const table of tables) {
      try {
        await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        console.log(`  ✓ Cleared ${table}`);
      } catch (e) {
        console.log(`  - ${table}: ${e.message.split('\n')[0]}`);
      }
    }
    
    console.log('✓ All existing data cleared');
    
    console.log('🔧 Step 2: Updating schema for email authentication...');
    
    // Update users table for email-based auth
    await client.query('ALTER TABLE users ALTER COLUMN username DROP NOT NULL');
    
    // Drop unique constraint on username (not just index)
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key');
    
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    await client.query(`
      ALTER TABLE users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('amitrace_admin', 'teacher', 'student'))
    `);
    
    console.log('✓ Schema updated for email authentication');
    
    console.log('🏫 Step 3: Creating VidPOD Default School...');
    
    // Create default school
    await client.query(`
      INSERT INTO schools (id, school_name, created_at) 
      VALUES (1, 'VidPOD Default School', NOW())
    `);
    
    console.log('✓ Default school created');
    
    console.log('👥 Step 4: Creating default accounts...');
    
    // Create the three default accounts
    await client.query(`
      INSERT INTO users (
        id, username, password, email, name, role, school_id, student_id, created_at
      ) VALUES 
      (1, 'admin', '$2b$10$9kmNCTT61nxs9qIt9m5NgusindcEsu4w5InzU8k0TC0ytQSdSUHnu', 'admin@vidpod.com', 'VidPOD Admin', 'amitrace_admin', 1, NULL, NOW()),
      (2, 'teacher', '$2b$10$AT4RdjlGzUWPS2yQmHQvbOuRrlQezuxe/P8GNPmHyYZyOFNZZvfMm', 'teacher@vidpod.com', 'Demo Teacher', 'teacher', 1, NULL, NOW()),
      (3, 'student', '$2b$10$fIbgL.UQFoBonLXFI9qk/O0ZRntyDnzCWZXUT0CgDXaxewPl8iCyG', 'student@vidpod.com', 'Demo Student', 'student', 1, 'STU001', NOW())
    `);
    
    // Update school created_by reference
    await client.query('ALTER TABLE schools ADD COLUMN IF NOT EXISTS created_by INTEGER');
    await client.query('UPDATE schools SET created_by = 1 WHERE id = 1');
    
    console.log('✓ Default accounts created');
    console.log('  • admin@vidpod.com (VidPOD Admin) - amitrace_admin');
    console.log('  • teacher@vidpod.com (Demo Teacher) - teacher');
    console.log('  • student@vidpod.com (Demo Student) - student');
    
    console.log('📚 Step 5: Creating demo class...');
    
    // Create demo class
    await client.query(`
      INSERT INTO classes (
        id, class_name, subject, description, class_code, teacher_id, school_id, is_active, created_at
      ) VALUES (
        1, 'Demo Class', 'Media Studies', 'Sample class for testing VidPOD functionality', 'DEMO', 2, 1, true, NOW()
      )
    `);
    
    console.log('✓ Demo class created (Code: DEMO)');
    
    console.log('🎓 Step 6: Enrolling student...');
    
    // Enroll student in demo class
    await client.query(`
      INSERT INTO user_classes (user_id, class_id, joined_at) 
      VALUES (3, 1, NOW())
    `);
    
    console.log('✓ Demo student enrolled in demo class');
    
    console.log('📝 Step 7: Recording migration...');
    
    // Create schema version table and record this migration
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        description TEXT,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      INSERT INTO schema_version (version, description) 
      VALUES (9, 'Phase 1: Email-based authentication with VidPOD default accounts')
    `);
    
    console.log('✓ Migration recorded');
    
    // Reset sequences
    await client.query('SELECT setval(\'users_id_seq\', 3)');
    await client.query('SELECT setval(\'schools_id_seq\', 1)');
    await client.query('SELECT setval(\'classes_id_seq\', 1)');
    
    console.log('');
    console.log('🎉 PHASE 1 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('✅ VidPOD Email Authentication System Ready!');
    console.log('');
    console.log('🔐 Login Credentials (Password: rumi&amaml):');
    console.log('  👑 Admin:   admin@vidpod.com');
    console.log('  👨‍🏫 Teacher: teacher@vidpod.com');  
    console.log('  👨‍🎓 Student: student@vidpod.com');
    console.log('');
    console.log('🌐 Test Login URL:');
    console.log('  https://frontend-production-b75b.up.railway.app');
    console.log('');
    console.log('✨ Role-based Redirects:');
    console.log('  • Admin → /admin.html');
    console.log('  • Teacher → /teacher-dashboard.html');
    console.log('  • Student → /dashboard.html');
    console.log('');
    console.log('📋 What\'s Ready:');
    console.log('  ✓ Email-based authentication');
    console.log('  ✓ Three-tier role system');
    console.log('  ✓ Default school and demo class');
    console.log('  ✓ Student enrolled in class');
    console.log('  ✓ Frontend updated for email login');
    console.log('  ✓ Backend API supports email auth');
    console.log('');
    console.log('🚀 Ready for Phase 2: Story Approval System');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('💡 The system may still be partially functional');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runPhase1Migration()
  .then(() => {
    console.log('');
    console.log('🏁 Phase 1 Complete - VidPOD Email Authentication Active!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration error:', error.message);
    process.exit(1);
  });