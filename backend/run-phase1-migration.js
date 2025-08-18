#!/usr/bin/env node

// Simple Phase 1 Migration Runner for Railway
const { Pool } = require('pg');

// Use Railway's DATABASE_URL directly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('🚀 Phase 1 Migration Starting...');
    console.log('⚠️  WARNING: This will DELETE ALL existing data!');
    
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('🗑️  Step 1: Deleting all existing data...');
      
      // Delete all existing data
      await client.query('DELETE FROM user_favorites WHERE id > 0');
      await client.query('DELETE FROM user_classes WHERE user_id > 0');
      await client.query('DELETE FROM story_tags WHERE story_id > 0');
      await client.query('DELETE FROM story_interviewees WHERE story_id > 0');
      await client.query('DELETE FROM story_ideas WHERE id > 0');
      await client.query('DELETE FROM stories WHERE id > 0');
      await client.query('DELETE FROM classes WHERE id > 0');
      await client.query('DELETE FROM teacher_requests WHERE id > 0');
      await client.query('DELETE FROM password_reset_tokens WHERE id > 0');
      await client.query('DELETE FROM users WHERE id > 0');
      await client.query('DELETE FROM tags WHERE id > 0');
      await client.query('DELETE FROM interviewees WHERE id > 0');
      await client.query('DELETE FROM schools WHERE id > 0');
      
      console.log('🔄 Step 2: Resetting sequences...');
      
      // Reset sequences
      await client.query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE schools_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE classes_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE story_ideas_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE tags_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE interviewees_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE teacher_requests_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE user_favorites_id_seq RESTART WITH 1');
      
      console.log('📋 Step 3: Updating schema...');
      
      // Update schema
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
      
      console.log('🏫 Step 4: Creating default school...');
      
      // Create default school
      const schoolResult = await client.query(
        'INSERT INTO schools (school_name, created_by, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        ['VidPOD Default School', 1]
      );
      
      console.log('👥 Step 5: Creating default accounts...');
      
      // Create default accounts with proper bcrypt hashes
      await client.query(`
        INSERT INTO users (username, password, email, name, role, school_id, student_id, created_at) VALUES 
        ('admin', '$2b$10$9kmNCTT61nxs9qIt9m5NgusindcEsu4w5InzU8k0TC0ytQSdSUHnu', 'admin@vidpod.com', 'VidPOD Admin', 'amitrace_admin', 1, NULL, NOW()),
        ('teacher', '$2b$10$AT4RdjlGzUWPS2yQmHQvbOuRrlQezuxe/P8GNPmHyYZyOFNZZvfMm', 'teacher@vidpod.com', 'Demo Teacher', 'teacher', 1, NULL, NOW()),
        ('student', '$2b$10$fIbgL.UQFoBonLXFI9qk/O0ZRntyDnzCWZXUT0CgDXaxewPl8iCyG', 'student@vidpod.com', 'Demo Student', 'student', 1, 'STU001', NOW())
      `);
      
      console.log('📚 Step 6: Creating demo class...');
      
      // Create demo class
      await client.query(`
        INSERT INTO classes (class_name, subject, description, class_code, teacher_id, school_id, is_active, created_at)
        VALUES ('Demo Class', 'Media Studies', 'Sample class for testing VidPOD functionality', 'DEMO', 2, 1, true, NOW())
      `);
      
      console.log('🎓 Step 7: Enrolling student...');
      
      // Enroll student in demo class
      await client.query('INSERT INTO user_classes (user_id, class_id, joined_at) VALUES (3, 1, NOW())');
      
      console.log('📝 Step 8: Updating schema version...');
      
      // Update schema version
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          description TEXT,
          applied_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await client.query(`
        INSERT INTO schema_version (version, description) 
        VALUES (9, 'Phase 1: Email-based authentication migration with data reset')
      `);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('✅ Migration completed successfully!');
      console.log('');
      console.log('🎉 PHASE 1 IMPLEMENTATION COMPLETE!');
      console.log('');
      console.log('📊 Summary:');
      console.log('✓ All existing data deleted');
      console.log('✓ Email-based authentication enabled');
      console.log('✓ Three default accounts created:');
      console.log('  • admin@vidpod.com (password: rumi&amaml)');
      console.log('  • teacher@vidpod.com (password: rumi&amaml)');
      console.log('  • student@vidpod.com (password: rumi&amaml)');
      console.log('✓ Demo school and class created');
      console.log('✓ Student enrolled in demo class');
      console.log('');
      console.log('🔗 Ready for testing!');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;