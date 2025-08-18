const { Pool } = require('pg');

// Use the Railway DATABASE_PUBLIC_URL from the environment
const DATABASE_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyUserFavoritesFix() {
  try {
    console.log('🔄 Connecting to Railway database...');
    
    // Check if user_favorites table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_favorites'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('✅ user_favorites table already exists');
    } else {
      console.log('🔧 Creating user_favorites table...');
      
      // Create user_favorites table
      await pool.query(`
        CREATE TABLE user_favorites (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          story_id INTEGER NOT NULL REFERENCES story_ideas(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, story_id)
        );
      `);
      
      // Create indexes
      await pool.query(`
        CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
        CREATE INDEX idx_user_favorites_story_id ON user_favorites(story_id);
        CREATE INDEX idx_user_favorites_created_at ON user_favorites(created_at);
      `);
      
      console.log('✅ user_favorites table and indexes created successfully');
    }
    
    // Verify the table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_favorites' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Table structure:');
    tableInfo.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('🎉 Database fix applied successfully!');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
applyUserFavoritesFix()
  .then(() => {
    console.log('✨ All done! The API should work now.');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });