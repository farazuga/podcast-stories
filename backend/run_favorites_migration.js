const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runFavoritesMigration() {
  try {
    console.log('Running user_favorites migration...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '007_create_user_favorites.sql'), 
      'utf8'
    );
    
    await pool.query(migrationSQL);
    
    console.log('✅ User favorites migration completed successfully!');
    
    // Test the table was created
    const testQuery = await pool.query('SELECT COUNT(*) FROM user_favorites');
    console.log(`📊 User favorites table created with ${testQuery.rows[0].count} records`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runFavoritesMigration();