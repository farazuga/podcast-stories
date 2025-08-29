// Check Users in Database
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/podcast_stories',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkUsers() {
  const client = await pool.connect();
  
  try {
    console.log('👥 Current users in database:');
    
    const users = await client.query(`
      SELECT id, email, role, name, school_id 
      FROM users 
      ORDER BY role, id
    `);
    
    users.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - ${user.name || 'No name'}`);
    });
    
    console.log(`\nTotal users: ${users.rows.length}`);
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsers();