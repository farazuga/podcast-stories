const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verifyMigration() {
  try {
    console.log('Verifying user_favorites table...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_favorites'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ user_favorites table exists');
    } else {
      console.log('❌ user_favorites table not found');
      process.exit(1);
    }
    
    // Check table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_favorites' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table structure:');
    structure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check indexes
    const indexes = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'user_favorites'
    `);
    
    console.log('🔍 Indexes:');
    indexes.rows.forEach(row => {
      console.log(`  ${row.indexname}`);
    });
    
    // Check view exists
    const viewCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'popular_stories'
    `);
    
    if (viewCheck.rows.length > 0) {
      console.log('✅ popular_stories view exists');
    } else {
      console.log('❌ popular_stories view not found');
    }
    
    console.log('🎉 Migration verification completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyMigration();