const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createActualPendingStory() {
  try {
    console.log('🔄 Creating ACTUAL pending story for admin approval...');
    
    // First, check current story statuses
    const currentStories = await pool.query(`
      SELECT id, idea_title, approval_status 
      FROM story_ideas 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log('\n📊 Current stories:');
    currentStories.rows.forEach(story => {
      console.log(`  ID ${story.id}: "${story.idea_title}" - ${story.approval_status}`);
    });
    
    // Create a new story with PENDING status (no auto-approval)
    const result = await pool.query(`
      INSERT INTO story_ideas (
        idea_title, idea_description, 
        question_1, question_2, question_3,
        uploaded_by, approval_status, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
      RETURNING *
    `, [
      '🏠 NEW PENDING: Affordable Housing Crisis Investigation',
      'A deep dive into the affordable housing shortage affecting local families and young professionals.',
      'What factors contributed to the housing affordability crisis in our area?',
      'How are local families adapting to rising housing costs?', 
      'What solutions are local government and organizations proposing?',
      2, // teacher user ID
      'pending' // EXPLICITLY set to pending
    ]);
    
    console.log('\n✅ Created new pending story:');
    console.log(`  ID: ${result.rows[0].id}`);
    console.log(`  Title: ${result.rows[0].idea_title}`);
    console.log(`  Status: ${result.rows[0].approval_status}`);
    console.log(`  Submitted: ${result.rows[0].submitted_at}`);
    
    // Also create a second pending story for testing
    const result2 = await pool.query(`
      INSERT INTO story_ideas (
        idea_title, idea_description, 
        question_1, question_2, question_3,
        uploaded_by, approval_status, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
      RETURNING *
    `, [
      '🌱 NEW PENDING: Local Food Security Initiative',
      'Examining community efforts to address food insecurity and promote local agriculture.',
      'What are the main causes of food insecurity in our community?',
      'How are local organizations working to address food access issues?', 
      'What role do community gardens and farmers markets play?',
      2, // teacher user ID
      'pending' // EXPLICITLY set to pending
    ]);
    
    console.log('\n✅ Created second pending story:');
    console.log(`  ID: ${result2.rows[0].id}`);
    console.log(`  Title: ${result2.rows[0].idea_title}`);
    console.log(`  Status: ${result2.rows[0].approval_status}`);
    
    // Verify pending stories count
    const pendingCount = await pool.query(`
      SELECT COUNT(*) as count 
      FROM story_ideas 
      WHERE approval_status = 'pending'
    `);
    
    console.log(`\n📊 Total pending stories: ${pendingCount.rows[0].count}`);
    
    // Show final status breakdown
    const statusCount = await pool.query(`
      SELECT approval_status, COUNT(*) as count 
      FROM story_ideas 
      GROUP BY approval_status 
      ORDER BY approval_status
    `);
    
    console.log('\n📈 Final story status breakdown:');
    statusCount.rows.forEach(row => {
      console.log(`  - ${row.approval_status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating pending story:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createActualPendingStory()
  .then(() => {
    console.log('\n✨ Pending story creation completed!');
    console.log('🔍 Now test the admin panel - Stories should appear in the approval queue!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });