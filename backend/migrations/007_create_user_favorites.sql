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