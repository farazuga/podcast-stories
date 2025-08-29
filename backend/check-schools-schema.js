// Check Schools Table Schema
// Purpose: Verify schools table structure for proper testing
// Usage: node check-schools-schema.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/podcast_stories',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSchoolsSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking schools table schema...\n');
    
    // Get table structure
    const columns = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'schools' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Schools table columns:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // Check existing data
    const data = await client.query('SELECT * FROM schools LIMIT 5');
    console.log(`\n📋 Existing schools (${data.rows.length} records):`);
    data.rows.forEach((school, index) => {
      console.log(`   ${index + 1}. ID: ${school.id}, Name: ${school.school_name || school.name || 'N/A'}`);
    });
    
    console.log('\n✅ Schools schema check completed');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  checkSchoolsSchema().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { checkSchoolsSchema };