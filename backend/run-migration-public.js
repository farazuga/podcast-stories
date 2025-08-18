#!/usr/bin/env node

// Phase 1 Migration using public DATABASE_URL
const { Pool } = require('pg');

// Use the public DATABASE_URL from Railway
const DATABASE_PUBLIC_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false }
});

async function runPhase1Migration() {
  console.log('🚀 Starting Phase 1 Migration (VidPOD Email Authentication)...');
  console.log('⚠️  WARNING: This will DELETE ALL existing data!');
  console.log('📊 Proceeding in 3 seconds...');
  
  // Wait 3 seconds to allow user to cancel if needed
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🗑️  Step 1: Deleting all existing data...');
    
    // Delete all existing data in correct order (respecting foreign keys)
    // Use silent deletion (ignore if table doesn't exist)
    const deleteOperations = [
      'DELETE FROM user_favorites WHERE id > 0',
      'DELETE FROM user_classes WHERE user_id > 0',
      'DELETE FROM story_tags WHERE story_id > 0',
      'DELETE FROM story_interviewees WHERE story_id > 0',
      'DELETE FROM story_ideas WHERE id > 0',
      'DELETE FROM stories WHERE id > 0',
      'DELETE FROM classes WHERE id > 0',
      'DELETE FROM teacher_requests WHERE id > 0',
      'DELETE FROM password_reset_tokens WHERE id > 0',
      'DELETE FROM users WHERE id > 0',
      'DELETE FROM tags WHERE id > 0',
      'DELETE FROM interviewees WHERE id > 0',
      'DELETE FROM schools WHERE id > 0'
    ];
    
    for (const operation of deleteOperations) {
      try {
        const result = await client.query(operation);
        const tableName = operation.split(' FROM ')[1].split(' WHERE')[0];
        console.log(`  ✓ Cleared ${tableName} (${result.rowCount} rows)`);
      } catch (e) {
        const tableName = operation.split(' FROM ')[1].split(' WHERE')[0];
        console.log(`  - Table ${tableName} doesn't exist (${e.message.split('\n')[0]})`);
      }
    }
    
    console.log('🔄 Step 2: Resetting sequences...');
    
    // Reset all sequences to start fresh
    const sequences = [
      'users_id_seq', 'schools_id_seq', 'classes_id_seq', 'story_ideas_id_seq',
      'tags_id_seq', 'interviewees_id_seq', 'teacher_requests_id_seq', 'user_favorites_id_seq'
    ];
    
    for (const seq of sequences) {
      try {
        await client.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
      } catch (e) {
        console.log(`Note: Sequence ${seq} may not exist (${e.message})`);
      }
    }
    
    console.log('📋 Step 3: Updating users table schema for email authentication...');
    
    // Modify users table for email-based authentication
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key');
    await client.query('ALTER TABLE users ALTER COLUMN username DROP NOT NULL');
    await client.query('ALTER TABLE users ALTER COLUMN email SET NOT NULL');
    await client.query('DROP INDEX IF EXISTS idx_users_email');
    await client.query('CREATE UNIQUE INDEX idx_users_email ON users(email)');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id VARCHAR(50)');
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
    await client.query('ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (\'amitrace_admin\', \'teacher\', \'student\'))');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id)');
    
    console.log('🏫 Step 4: Creating VidPOD Default School...');
    
    // Create default school (need to insert with a temp created_by, then update)
    await client.query(`
      INSERT INTO schools (school_name, created_at) 
      VALUES ('VidPOD Default School', NOW())
    `);
    
    console.log('👥 Step 5: Creating three default accounts...');
    
    // Create the three default accounts with proper bcrypt hashes for "rumi&amaml"
    await client.query(`
      INSERT INTO users (username, password, email, name, role, school_id, student_id, created_at) VALUES 
      ('admin', '$2b$10$9kmNCTT61nxs9qIt9m5NgusindcEsu4w5InzU8k0TC0ytQSdSUHnu', 'admin@vidpod.com', 'VidPOD Admin', 'amitrace_admin', 1, NULL, NOW()),
      ('teacher', '$2b$10$AT4RdjlGzUWPS2yQmHQvbOuRrlQezuxe/P8GNPmHyYZyOFNZZvfMm', 'teacher@vidpod.com', 'Demo Teacher', 'teacher', 1, NULL, NOW()),
      ('student', '$2b$10$fIbgL.UQFoBonLXFI9qk/O0ZRntyDnzCWZXUT0CgDXaxewPl8iCyG', 'student@vidpod.com', 'Demo Student', 'student', 1, 'STU001', NOW())
    `);
    
    // Update school created_by to point to admin user
    await client.query('UPDATE schools SET created_by = 1 WHERE id = 1');
    
    console.log('📚 Step 6: Creating demo class...');
    
    // Create demo class with teacher as owner
    await client.query(`
      INSERT INTO classes (class_name, subject, description, class_code, teacher_id, school_id, is_active, created_at)
      VALUES ('Demo Class', 'Media Studies', 'Sample class for testing VidPOD functionality', 'DEMO', 2, 1, true, NOW())
    `);
    
    console.log('🎓 Step 7: Enrolling demo student in demo class...');
    
    // Enroll student in demo class
    await client.query('INSERT INTO user_classes (user_id, class_id, joined_at) VALUES (3, 1, NOW())');
    
    console.log('📝 Step 8: Recording migration completion...');
    
    // Create/update schema version tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        description TEXT,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      INSERT INTO schema_version (version, description) 
      VALUES (9, 'Phase 1: Email-based authentication migration with complete data reset')
      ON CONFLICT (version) DO UPDATE SET 
        description = EXCLUDED.description,
        applied_at = NOW()
    `);
    
    // Commit all changes
    await client.query('COMMIT');
    
    console.log('');
    console.log('🎉 PHASE 1 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('✅ Summary of Changes:');
    console.log('  📊 Data: All existing data deleted and reset');
    console.log('  🔐 Auth: Email-based authentication enabled');
    console.log('  👤 Users: Three default accounts created');
    console.log('  🏫 School: VidPOD Default School created');
    console.log('  📚 Class: Demo class created with student enrolled');
    console.log('');
    console.log('🔑 Default Login Credentials:');
    console.log('  Admin:   admin@vidpod.com   / rumi&amaml');
    console.log('  Teacher: teacher@vidpod.com / rumi&amaml');
    console.log('  Student: student@vidpod.com / rumi&amaml');
    console.log('');
    console.log('🚀 System Ready for Testing!');
    console.log('  Test URL: https://frontend-production-b75b.up.railway.app');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('  1. Test login with new email addresses');
    console.log('  2. Verify role-based redirects');
    console.log('  3. Begin Phase 2 implementation');
    
    // Verify migration results
    console.log('');
    console.log('🔍 Verification:');
    
    const users = await client.query('SELECT id, email, name, role, student_id FROM users ORDER BY id');
    console.log('👥 Created users:');
    users.rows.forEach(user => {
      console.log(`  ${user.id}. ${user.email} (${user.name}) - ${user.role}${user.student_id ? ` [${user.student_id}]` : ''}`);
    });
    
    const schools = await client.query('SELECT id, school_name FROM schools');
    console.log('🏫 Created schools:');
    schools.rows.forEach(school => {
      console.log(`  ${school.id}. ${school.school_name}`);
    });
    
    const classes = await client.query('SELECT id, class_name, class_code FROM classes');
    console.log('📚 Created classes:');
    classes.rows.forEach(cls => {
      console.log(`  ${cls.id}. ${cls.class_name} (Code: ${cls.class_code})`);
    });
    
    const enrollments = await client.query('SELECT COUNT(*) as count FROM user_classes');
    console.log(`🎓 Student enrollments: ${enrollments.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('🔄 All changes have been rolled back.');
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
runPhase1Migration()
  .then(() => {
    console.log('');
    console.log('✨ Phase 1 Complete - VidPOD is ready for email-based authentication!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  });