#!/usr/bin/env node

// Create test stories for the approval system
const { Pool } = require('pg');

const DATABASE_PUBLIC_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestStories() {
  console.log('🎬 Creating test stories for approval system...');
  
  const client = await pool.connect();
  
  try {
    // Check if we have users to assign stories to
    const users = await client.query('SELECT id, email, role FROM users ORDER BY id LIMIT 3');
    console.log(`👥 Found ${users.rows.length} users`);
    
    if (users.rows.length === 0) {
      console.log('❌ No users found. Cannot create test stories.');
      return;
    }
    
    // Create test stories with different statuses
    const testStories = [
      {
        title: 'Climate Change Impact on Local Agriculture',
        description: 'Investigation into how climate change is affecting farming practices in our region.',
        status: 'draft',
        question_1: 'How has weather patterns changed in the last 5 years?',
        question_2: 'What crops are farmers struggling with the most?',
        question_3: 'What adaptation strategies are being used?'
      },
      {
        title: 'Student Mental Health During Pandemic',
        description: 'Exploring the mental health challenges students faced during COVID-19 and recovery.',
        status: 'pending',
        question_1: 'What were the biggest challenges during remote learning?',
        question_2: 'How did schools provide mental health support?',
        question_3: 'What recovery strategies are working now?'
      },
      {
        title: 'Local Business Revival Post-Pandemic',
        description: 'How small businesses in our community adapted and survived the pandemic.',
        status: 'pending',
        question_1: 'What was the biggest challenge during lockdowns?',
        question_2: 'How did you pivot your business model?',
        question_3: 'What support did you receive from the community?'
      },
      {
        title: 'Youth Environmental Activism',
        description: 'Following young environmental activists in our area and their impact.',
        status: 'approved',
        question_1: 'What inspired you to become an environmental activist?',
        question_2: 'What projects are you currently working on?',
        question_3: 'How do you engage other young people?'
      },
      {
        title: 'Technology in Senior Care',
        description: 'How technology is being used to improve care for elderly residents.',
        status: 'rejected',
        question_1: 'What technologies are being implemented?',
        question_2: 'How are seniors adapting to new technology?',
        question_3: 'What are the benefits and challenges?'
      }
    ];
    
    console.log(`📝 Creating ${testStories.length} test stories...`);
    
    for (let i = 0; i < testStories.length; i++) {
      const story = testStories[i];
      const userId = users.rows[i % users.rows.length].id; // Cycle through available users
      
      // Insert story
      const result = await client.query(
        `INSERT INTO story_ideas (
          idea_title, idea_description, question_1, question_2, question_3,
          uploaded_by, approval_status, submitted_at, approved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          story.title,
          story.description, 
          story.question_1,
          story.question_2,
          story.question_3,
          userId,
          story.status,
          story.status === 'pending' ? new Date() : null,
          ['approved', 'rejected'].includes(story.status) ? new Date() : null
        ]
      );
      
      const storyId = result.rows[0].id;
      console.log(`  ✅ Created story ${storyId}: "${story.title}" (${story.status})`);
      
      // Add some fake approval notes for rejected stories
      if (story.status === 'rejected') {
        await client.query(
          'UPDATE story_ideas SET approval_notes = $1, approved_by = $2 WHERE id = $3',
          ['Story needs more specific focus and better interview questions', 1, storyId]
        );
      } else if (story.status === 'approved') {
        await client.query(
          'UPDATE story_ideas SET approval_notes = $1, approved_by = $2 WHERE id = $3',
          ['Excellent story concept with strong interview questions', 1, storyId]
        );
      }
    }
    
    // Get final counts
    const counts = await client.query(`
      SELECT 
        approval_status,
        COUNT(*) as count
      FROM story_ideas 
      GROUP BY approval_status
      ORDER BY approval_status
    `);
    
    console.log('\n📊 Story counts by status:');
    counts.rows.forEach(row => {
      console.log(`  ${row.approval_status}: ${row.count}`);
    });
    
    console.log('\n🎉 Test stories created successfully!');
    console.log('');
    console.log('🔗 You can now test the admin interface at:');
    console.log('   https://frontend-production-b75b.up.railway.app/admin.html');
    console.log('');
    console.log('👤 Login with admin credentials:');
    console.log('   Email: admin@vidpod.com');
    console.log('   Password: rumi&amaml');
    
  } catch (error) {
    console.error('❌ Error creating test stories:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestStories()
  .then(() => {
    console.log('\n✅ Test data creation completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  });