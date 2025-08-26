const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestPendingStory() {
  try {
    console.log('🔄 Creating test pending story...');
    
    // Create a test story with pending status
    const result = await pool.query(`
      INSERT INTO story_ideas (
        idea_title, idea_description, 
        question_1, question_2, question_3,
        uploaded_by, approval_status, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
      RETURNING *
    `, [
      'Test Pending Story - Community Garden Initiative',
      'A story about local community members creating a neighborhood garden.',
      'What inspired you to start this community garden?',
      'What challenges did you face in organizing the community?', 
      'What impact has the garden had on the neighborhood?',
      2, // teacher user ID
      'pending'
    ]);
    
    console.log('✅ Created test pending story:', result.rows[0]);
    
    // Verify current story statuses
    const statusCount = await pool.query(`
      SELECT approval_status, COUNT(*) as count 
      FROM story_ideas 
      GROUP BY approval_status 
      ORDER BY approval_status
    `);
    
    console.log('📊 Current story status counts:');
    statusCount.rows.forEach(row => {
      console.log(`  - ${row.approval_status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating test story:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createTestPendingStory()
  .then(() => {
    console.log('✨ Test story creation completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });