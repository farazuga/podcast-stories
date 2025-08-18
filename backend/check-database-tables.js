const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDatabaseTables() {
  try {
    console.log('🔍 Checking database tables...');
    
    // List all tables
    const tables = await pool.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Available tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });
    
    // Check specific tables the app needs
    const requiredTables = ['users', 'story_ideas', 'user_favorites', 'classes', 'schools'];
    console.log('\n🔍 Checking required tables:');
    
    for (const tableName of requiredTables) {
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);
      
      const status = exists.rows[0].exists ? '✅' : '❌';
      console.log(`  ${status} ${tableName}`);
      
      if (exists.rows[0].exists) {
        // Count records in the table
        const count = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`    └─ Records: ${count.rows[0].count}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkDatabaseTables()
  .then(() => {
    console.log('✨ Database check completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });