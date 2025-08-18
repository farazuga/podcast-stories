const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSchema() {
  try {
    console.log('Checking database schema...');
    
    // Check existing tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Existing tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check if required tables exist
    const requiredTables = [
      'users', 'story_ideas', 'interviewees', 'story_interviewees',
      'tags', 'story_tags', 'schools', 'user_favorites'
    ];
    
    console.log('\n🔍 Required tables check:');
    for (const table of requiredTables) {
      const exists = tables.rows.some(row => row.table_name === table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }
    
    // Check users table columns
    console.log('\n👤 Users table structure:');
    const userColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    if (userColumns.rows.length > 0) {
      userColumns.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('  ❌ Users table not found');
    }
    
    // Check story_ideas table columns
    console.log('\n📖 Story_ideas table structure:');
    const storyColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'story_ideas' 
      ORDER BY ordinal_position
    `);
    
    if (storyColumns.rows.length > 0) {
      storyColumns.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('  ❌ Story_ideas table not found');
    }
    
    console.log('\n🎉 Schema check completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  }
}

checkSchema();