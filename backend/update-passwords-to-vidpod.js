const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Use Railway DATABASE_PUBLIC_URL
const DATABASE_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updatePasswordsToVidpod() {
  try {
    console.log('🔄 Connecting to Railway database...');
    
    // New password to set
    const newPassword = 'vidpod';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('🔧 Updating all user passwords to "vidpod"...');
    
    // Get all users first
    const users = await pool.query('SELECT id, email, username FROM users ORDER BY id');
    
    console.log(`📋 Found ${users.rows.length} users to update:`);
    users.rows.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Username: ${user.username || 'N/A'}`);
    });
    
    // Update all user passwords
    const updateResult = await pool.query(
      'UPDATE users SET password = $1',
      [hashedPassword]
    );
    
    console.log(`✅ Successfully updated ${updateResult.rowCount} user passwords`);
    
    // Verify the update worked by testing one account
    console.log('\n🧪 Verifying password update...');
    const testUser = await pool.query('SELECT id, email, password FROM users WHERE email = $1', ['admin@vidpod.com']);
    
    if (testUser.rows.length > 0) {
      const isValid = await bcrypt.compare('vidpod', testUser.rows[0].password);
      console.log(`✅ Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    }
    
    console.log('\n🎉 All passwords updated successfully!');
    console.log('\n📋 Updated Test Accounts:');
    console.log('  • admin@vidpod.com / vidpod');
    console.log('  • teacher@vidpod.com / vidpod');
    console.log('  • student@vidpod.com / vidpod');
    
  } catch (error) {
    console.error('❌ Password update failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the password update
updatePasswordsToVidpod()
  .then(() => {
    console.log('✨ Password update completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });