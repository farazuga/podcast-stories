// Create Test Users for VidPOD System
// Purpose: Create teacher and student test accounts
// Usage: node create-test-users.js

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/podcast_stories',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestUsers() {
  const client = await pool.connect();
  
  try {
    console.log('👥 Creating test user accounts...\n');
    
    // Get school ID for users
    const school = await client.query('SELECT id FROM schools LIMIT 1');
    const schoolId = school.rows[0]?.id || 1;
    
    // Hash the test password
    const passwordHash = await bcrypt.hash('vidpod', 10);
    
    const testUsers = [
      {
        username: 'teacher',
        email: 'teacher@vidpod.com',
        password: passwordHash,
        role: 'teacher',
        name: 'Test Teacher',
        school_id: schoolId
      },
      {
        username: 'student',
        email: 'student@vidpod.com', 
        password: passwordHash,
        role: 'student',
        name: 'Test Student',
        school_id: schoolId
      }
    ];
    
    for (const user of testUsers) {
      try {
        const result = await client.query(`
          INSERT INTO users (username, email, password, role, name, school_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, email, role
        `, [user.username, user.email, user.password, user.role, user.name, user.school_id]);
        
        console.log(`   ✅ Created ${user.role}: ${result.rows[0].email} (ID: ${result.rows[0].id})`);
        
      } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`   ⚠️ User already exists: ${user.email}`);
        } else {
          throw error;
        }
      }
    }
    
    // Verify all users
    console.log('\n📋 All users in system:');
    const allUsers = await client.query(`
      SELECT id, email, role, name 
      FROM users 
      ORDER BY role, id
    `);
    
    allUsers.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - ${user.name}`);
    });
    
    console.log('\n🔑 Test Login Credentials:');
    console.log('   admin@vidpod.com / vidpod');
    console.log('   teacher@vidpod.com / vidpod'); 
    console.log('   student@vidpod.com / vidpod');
    
    console.log('\n✅ Test user creation completed!');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  createTestUsers();
}

module.exports = { createTestUsers };