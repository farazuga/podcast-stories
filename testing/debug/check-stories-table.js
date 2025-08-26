#!/usr/bin/env node

// Check story_ideas table structure for Phase 2 planning
const { Pool } = require('pg');

const DATABASE_PUBLIC_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkStoriesTable() {
  console.log('🔍 Checking story_ideas table for Phase 2 planning...');
  
  const client = await pool.connect();
  
  try {
    // Check story_ideas table structure
    console.log('\n📖 Story_ideas table structure:');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'story_ideas' 
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // Check if approval status field exists
    const hasApprovalStatus = columns.rows.some(col => col.column_name === 'approval_status');
    const hasIsApproved = columns.rows.some(col => col.column_name === 'is_approved');
    
    console.log('\n🔍 Approval Field Analysis:');
    console.log(`  - approval_status field: ${hasApprovalStatus ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - is_approved field: ${hasIsApproved ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // Check current stories count
    const storiesCount = await client.query('SELECT COUNT(*) as count FROM story_ideas');
    console.log(`\n📊 Current stories: ${storiesCount.rows[0].count}`);
    
    if (storiesCount.rows[0].count > 0) {
      const sampleStories = await client.query('SELECT id, idea_title, uploaded_by FROM story_ideas LIMIT 5');
      console.log('\n📝 Sample stories:');
      sampleStories.rows.forEach(story => {
        console.log(`  ${story.id}. "${story.idea_title}" (by user ${story.uploaded_by})`);
      });
    }
    
    // Check related tables
    console.log('\n🔗 Related tables:');
    const tagCount = await client.query('SELECT COUNT(*) as count FROM story_tags');
    const intervieweeCount = await client.query('SELECT COUNT(*) as count FROM story_interviewees');
    console.log(`  - story_tags relationships: ${tagCount.rows[0].count}`);
    console.log(`  - story_interviewees relationships: ${intervieweeCount.rows[0].count}`);
    
    console.log('\n💡 Phase 2 Recommendation:');
    if (!hasApprovalStatus && !hasIsApproved) {
      console.log('  ✅ Ready to add approval_status field');
      console.log('  📋 Suggested: approval_status VARCHAR(20) DEFAULT \'draft\' CHECK (approval_status IN (\'draft\', \'pending\', \'approved\', \'rejected\'))');
    } else {
      console.log('  ⚠️  Approval field already exists - review current implementation');
    }
    
  } catch (error) {
    console.error('❌ Error checking stories table:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkStoriesTable();