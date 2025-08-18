const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:nKDDalkMNysRUnZPHifzWPvgxoxvzXSp@maglev.proxy.rlwy.net:32294/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyAdminFunctionality() {
  try {
    console.log('🔍 Verifying Admin Functionality...\n');
    
    // 1. Check admin user details
    console.log('1. ADMIN USER VERIFICATION:');
    const adminUser = await pool.query(`
      SELECT id, username, email, role, name 
      FROM users 
      WHERE email = 'admin@vidpod.com'
    `);
    
    if (adminUser.rows.length > 0) {
      const user = adminUser.rows[0];
      console.log('✅ Admin user found:');
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Username: ${user.username}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Name: ${user.name}`);
    } else {
      console.log('❌ Admin user NOT found');
    }
    
    // 2. Check pending stories
    console.log('\n2. PENDING STORIES VERIFICATION:');
    const pendingStories = await pool.query(`
      SELECT s.id, s.idea_title, s.approval_status, s.uploaded_by,
             u.username as uploaded_by_name, s.submitted_at
      FROM story_ideas s
      JOIN users u ON s.uploaded_by = u.id  
      WHERE s.approval_status = 'pending'
      ORDER BY s.submitted_at DESC
    `);
    
    console.log(`✅ Found ${pendingStories.rows.length} pending stories:`);
    pendingStories.rows.forEach((story, index) => {
      console.log(`   ${index + 1}. "${story.idea_title}"`);
      console.log(`      - ID: ${story.id}`);
      console.log(`      - Status: ${story.approval_status}`);
      console.log(`      - Submitted by: ${story.uploaded_by_name} (ID: ${story.uploaded_by})`);
      console.log(`      - Submitted at: ${story.submitted_at}`);
    });
    
    // 3. Check all tags
    console.log('\n3. TAGS VERIFICATION:');
    const tags = await pool.query(`
      SELECT t.id, t.tag_name, t.created_by, u.username as created_by_name
      FROM tags t
      LEFT JOIN users u ON t.created_by = u.id
      ORDER BY t.tag_name
    `);
    
    console.log(`✅ Found ${tags.rows.length} tags:`);
    tags.rows.forEach((tag, index) => {
      console.log(`   ${index + 1}. "${tag.tag_name}" (ID: ${tag.id}, Created by: ${tag.created_by_name || 'Unknown'})`);
    });
    
    // 4. Check all story statuses
    console.log('\n4. STORY STATUS BREAKDOWN:');
    const statusCounts = await pool.query(`
      SELECT approval_status, COUNT(*) as count
      FROM story_ideas
      GROUP BY approval_status
      ORDER BY approval_status
    `);
    
    statusCounts.rows.forEach(row => {
      console.log(`   - ${row.approval_status}: ${row.count} stories`);
    });
    
    // 5. Test API endpoints manually
    console.log('\n5. API ENDPOINT TEST URLS:');
    console.log('   Test these URLs manually with admin token:');
    console.log('   - GET https://podcast-stories-production.up.railway.app/api/auth/login');
    console.log('   - GET https://podcast-stories-production.up.railway.app/api/tags');
    console.log('   - GET https://podcast-stories-production.up.railway.app/api/stories/admin/by-status/pending');
    console.log('   - GET https://podcast-stories-production.up.railway.app/api/stories');
    
    console.log('\n6. FRONTEND TESTING:');
    console.log('   - URL: https://podcast-stories-production.up.railway.app/admin.html');
    console.log('   - Login: admin@vidpod.com / vidpod');
    console.log('   - Check browser console for debug messages starting with "🔍 Admin Debug"');
    
    console.log('\n✨ Verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyAdminFunctionality()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });