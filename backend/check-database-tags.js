/**
 * Check actual database state for tags and story_tags relationships
 */

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDatabaseTags() {
    console.log('🔍 DATABASE CHECK: Tags and story relationships');
    console.log('='.repeat(60));
    
    try {
        // Check if tags table has data
        const tagsCount = await pool.query('SELECT COUNT(*) as count FROM tags');
        console.log(`📊 Total tags in database: ${tagsCount.rows[0].count}`);
        
        if (tagsCount.rows[0].count > 0) {
            const sampleTags = await pool.query('SELECT * FROM tags LIMIT 5');
            console.log('🏷️  Sample tags:');
            sampleTags.rows.forEach((tag, i) => {
                console.log(`   ${i + 1}. ${tag.tag_name} (ID: ${tag.id})`);
            });
        }
        
        // Check story_tags relationships
        const storyTagsCount = await pool.query('SELECT COUNT(*) as count FROM story_tags');
        console.log(`\n🔗 Total story-tag relationships: ${storyTagsCount.rows[0].count}`);
        
        if (storyTagsCount.rows[0].count > 0) {
            const sampleRelationships = await pool.query(`
                SELECT st.story_id, st.tag_id, t.tag_name, s.idea_title
                FROM story_tags st 
                LEFT JOIN tags t ON st.tag_id = t.id
                LEFT JOIN story_ideas s ON st.story_id = s.id
                LIMIT 5
            `);
            console.log('🔗 Sample story-tag relationships:');
            sampleRelationships.rows.forEach((rel, i) => {
                console.log(`   ${i + 1}. Story "${rel.idea_title}" -> Tag "${rel.tag_name}"`);
            });
        }
        
        // Test the fixed query on a few stories
        console.log('\n🧪 Testing new SQL query:');
        const fixedQuery = await pool.query(`
            SELECT 
                s.id,
                s.idea_title,
                COALESCE(array_agg(DISTINCT t.tag_name) FILTER (WHERE t.tag_name IS NOT NULL), '{}') as tags,
                COALESCE(array_agg(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL), '{}') as interviewees
            FROM story_ideas s
            LEFT JOIN story_tags st ON s.id = st.story_id
            LEFT JOIN tags t ON st.tag_id = t.id
            LEFT JOIN story_interviewees si ON s.id = si.story_id
            LEFT JOIN interviewees i ON si.interviewee_id = i.id
            WHERE s.id IN (1094, 740, 741, 742, 743)
            GROUP BY s.id, s.idea_title
            ORDER BY s.id
        `);
        
        console.log('📋 Results with fixed query:');
        fixedQuery.rows.forEach((story, i) => {
            console.log(`   ${i + 1}. "${story.idea_title}"`);
            console.log(`      Tags: ${JSON.stringify(story.tags)} (length: ${story.tags.length})`);
            console.log(`      Interviewees: ${JSON.stringify(story.interviewees)}`);
        });
        
        // Check if these specific stories actually should have tags
        console.log('\n🔎 Raw story_tags check for these stories:');
        const rawCheck = await pool.query(`
            SELECT st.story_id, COUNT(*) as tag_count
            FROM story_tags st 
            WHERE st.story_id IN (1094, 740, 741, 742, 743)
            GROUP BY st.story_id
        `);
        
        if (rawCheck.rows.length > 0) {
            rawCheck.rows.forEach(row => {
                console.log(`   Story ${row.story_id} has ${row.tag_count} tags`);
            });
        } else {
            console.log('   ✅ These stories have NO tags assigned - empty array display is correct!');
        }
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabaseTags().catch(console.error);