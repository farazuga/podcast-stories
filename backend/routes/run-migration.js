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

// Run first/last name migration
router.get('/first-last-names', async (req, res) => {
    try {
        console.log('Running first/last name migration...');
        
        // Check if migration already applied
        const checkResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('first_name', 'last_name')
        `);
        
        if (checkResult.rows.length >= 2) {
            return res.json({ 
                message: 'Migration already applied!',
                status: 'already_applied' 
            });
        }
        
        const migrationSQL = `
            -- Add first_name and last_name columns to users table
            ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

            -- Add first_name and last_name columns to teacher_requests table
            ALTER TABLE teacher_requests ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
            ALTER TABLE teacher_requests ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);

            -- Migrate existing data from users table
            UPDATE users 
            SET 
                first_name = CASE 
                    WHEN name IS NULL OR name = '' THEN ''
                    ELSE TRIM(SPLIT_PART(name, ' ', 1))
                END,
                last_name = ''
            WHERE first_name IS NULL;

            -- Migrate existing data from teacher_requests table  
            UPDATE teacher_requests 
            SET 
                first_name = CASE 
                    WHEN name IS NULL OR name = '' THEN ''
                    ELSE TRIM(SPLIT_PART(name, ' ', 1))
                END,
                last_name = ''
            WHERE first_name IS NULL;

            -- Add indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
            CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
            CREATE INDEX IF NOT EXISTS idx_teacher_requests_first_name ON teacher_requests(first_name);
            CREATE INDEX IF NOT EXISTS idx_teacher_requests_last_name ON teacher_requests(last_name);

            -- Create helper function
            CREATE OR REPLACE FUNCTION get_full_name(first_name VARCHAR, last_name VARCHAR) 
            RETURNS VARCHAR AS $$
            BEGIN
                IF first_name IS NULL OR first_name = '' THEN
                    RETURN COALESCE(last_name, '');
                END IF;
                
                IF last_name IS NULL OR last_name = '' THEN
                    RETURN first_name;
                END IF;
                
                RETURN first_name || ' ' || last_name;
            END;
            $$ LANGUAGE plpgsql;
        `;
        
        await pool.query(migrationSQL);
        
        // Get counts for verification
        const userCount = await pool.query('SELECT COUNT(*) FROM users WHERE first_name IS NOT NULL AND first_name != \'\'');
        const teacherRequestCount = await pool.query('SELECT COUNT(*) FROM teacher_requests WHERE first_name IS NOT NULL AND first_name != \'\'');
        
        // Get sample data
        const sampleUsers = await pool.query(`
            SELECT name as original_name, first_name, last_name 
            FROM users 
            WHERE name IS NOT NULL 
            LIMIT 3
        `);
        
        res.json({ 
            success: true, 
            message: 'First/Last name migration completed successfully!',
            migrated_users: userCount.rows[0].count,
            migrated_teacher_requests: teacherRequestCount.rows[0].count,
            sample_data: sampleUsers.rows,
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

// Fix unified password reset system migration
router.get('/fix-password-reset-unified', async (req, res) => {
    try {
        console.log('Applying unified password reset migration...');
        
        const migrationSQL = `
            -- Fix password_reset_tokens table for unified system
            -- Remove unique constraint on user_id to allow multiple reset requests
            
            -- Drop the existing unique constraint on user_id if it exists
            DO $$ 
            BEGIN
                -- Check if the constraint exists and drop it
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'password_reset_tokens_user_id_key' 
                    AND table_name = 'password_reset_tokens'
                ) THEN
                    ALTER TABLE password_reset_tokens DROP CONSTRAINT password_reset_tokens_user_id_key;
                    RAISE NOTICE 'Dropped unique constraint on user_id';
                END IF;
                
                -- Also check for the other constraint name that might exist
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'unique_user_id' 
                    AND table_name = 'password_reset_tokens'
                ) THEN
                    ALTER TABLE password_reset_tokens DROP CONSTRAINT unique_user_id;
                    RAISE NOTICE 'Dropped unique_user_id constraint';
                END IF;
            END $$;
            
            -- Add composite index for better performance
            CREATE INDEX IF NOT EXISTS idx_password_reset_user_active 
            ON password_reset_tokens(user_id, expires_at, used) 
            WHERE used = false;
            
            -- Add cleanup function for expired tokens
            CREATE OR REPLACE FUNCTION cleanup_expired_password_tokens()
            RETURNS INTEGER AS $$
            DECLARE
                deleted_count INTEGER;
            BEGIN
                DELETE FROM password_reset_tokens 
                WHERE expires_at < CURRENT_TIMESTAMP;
                
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                RETURN deleted_count;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Clean up any existing expired tokens
            SELECT cleanup_expired_password_tokens() as cleaned_tokens;
        `;
        
        await pool.query(migrationSQL);
        
        // Check current status
        const constraintCheck = await pool.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'password_reset_tokens' 
            AND constraint_type = 'UNIQUE'
        `);
        
        const indexCheck = await pool.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE indexname = 'idx_password_reset_user_active'
        `);
        
        const functionCheck = await pool.query(`
            SELECT proname 
            FROM pg_proc 
            WHERE proname = 'cleanup_expired_password_tokens'
        `);
        
        console.log('Unified password reset migration completed successfully');
        res.json({ 
            success: true,
            message: 'Unified password reset migration completed successfully!',
            status: 'completed',
            remaining_constraints: constraintCheck.rows.length,
            has_performance_index: indexCheck.rows.length > 0,
            has_cleanup_function: functionCheck.rows.length > 0
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