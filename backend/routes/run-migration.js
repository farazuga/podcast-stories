const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Run migration endpoint (one-time use)
router.get('/fix-constraint', async (req, res) => {
    try {
        // Check if constraint already exists
        const constraintCheck = await pool.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'password_reset_tokens' 
            AND constraint_type = 'UNIQUE'
        `);
        
        if (constraintCheck.rows.some(row => row.constraint_name === 'unique_user_id')) {
            return res.json({ 
                message: 'Constraint already exists!',
                status: 'already_fixed' 
            });
        }
        
        // Remove duplicates
        const deleteResult = await pool.query(`
            DELETE FROM password_reset_tokens 
            WHERE id NOT IN (
                SELECT MAX(id) 
                FROM password_reset_tokens 
                GROUP BY user_id
            )
        `);
        
        // Add unique constraint
        await pool.query(`
            ALTER TABLE password_reset_tokens 
            ADD CONSTRAINT unique_user_id UNIQUE (user_id)
        `);
        
        res.json({ 
            message: 'Migration completed successfully!',
            deleted_duplicates: deleteResult.rowCount,
            status: 'fixed'
        });
    } catch (error) {
        console.error('Migration failed:', error);
        res.status(500).json({ 
            error: 'Migration failed',
            details: error.message 
        });
    }
});

// Run favorites migration
router.get('/favorites', async (req, res) => {
    try {
        console.log('Running user_favorites migration...');
        
        const migrationSQL = `
            -- Create user_favorites table for story favoriting functionality
            CREATE TABLE IF NOT EXISTS user_favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, story_id)
            );

            -- Create indexes for performance
            CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_favorites_story_id ON user_favorites(story_id);
            CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at);

            -- Add a view for popular stories (most favorited)
            CREATE OR REPLACE VIEW popular_stories AS
            SELECT 
                s.*,
                COUNT(uf.id) as favorite_count,
                ARRAY_AGG(DISTINCT u.username) FILTER (WHERE u.username IS NOT NULL) as favorited_by_users
            FROM stories s
            LEFT JOIN user_favorites uf ON s.id = uf.story_id
            LEFT JOIN users u ON uf.user_id = u.id
            GROUP BY s.id, s.title, s.description, s.audio_url, s.uploaded_by, s.created_at, s.is_approved
            ORDER BY favorite_count DESC, s.created_at DESC;
        `;
        
        await pool.query(migrationSQL);
        
        // Test the table was created
        const testQuery = await pool.query('SELECT COUNT(*) FROM user_favorites');
        
        res.json({ 
            success: true, 
            message: 'User favorites migration completed successfully!',
            records: testQuery.rows[0].count,
            status: 'completed'
        });
    } catch (error) {
        console.error('Migration failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            status: 'failed'
        });
    }
});

module.exports = router;