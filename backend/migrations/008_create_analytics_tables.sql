-- Analytics tables for teachers and admins

-- Table to track story views/interactions
CREATE TABLE IF NOT EXISTS story_analytics (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- 'view', 'play', 'download', 'share'
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track class engagement
CREATE TABLE IF NOT EXISTS class_analytics (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'join', 'leave', 'story_view', 'favorite'
    story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
    metadata JSONB, -- Additional data like time spent, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for user engagement metrics
CREATE TABLE IF NOT EXISTS user_engagement (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    login_count INTEGER DEFAULT 0,
    stories_viewed INTEGER DEFAULT 0,
    stories_favorited INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_analytics_story_id ON story_analytics(story_id);
CREATE INDEX IF NOT EXISTS idx_story_analytics_user_id ON story_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_story_analytics_created_at ON story_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_story_analytics_action_type ON story_analytics(action_type);

CREATE INDEX IF NOT EXISTS idx_class_analytics_class_id ON class_analytics(class_id);
CREATE INDEX IF NOT EXISTS idx_class_analytics_student_id ON class_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_class_analytics_created_at ON class_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_class_analytics_activity_type ON class_analytics(activity_type);

CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_date ON user_engagement(date);

-- Views for easy analytics queries

-- Teacher analytics view
CREATE OR REPLACE VIEW teacher_analytics AS
SELECT 
    u.id as teacher_id,
    u.username as teacher_username,
    u.name as teacher_name,
    COUNT(DISTINCT c.id) as total_classes,
    COUNT(DISTINCT e.student_id) as total_students,
    COUNT(DISTINCT ca.id) as total_activities,
    COUNT(DISTINCT CASE WHEN ca.activity_type = 'story_view' THEN ca.id END) as story_views,
    COUNT(DISTINCT CASE WHEN ca.activity_type = 'favorite' THEN ca.id END) as favorites_made,
    AVG(class_student_counts.student_count) as avg_students_per_class
FROM users u
LEFT JOIN classes c ON u.id = c.teacher_id AND c.is_active = true
LEFT JOIN enrollments e ON c.id = e.class_id
LEFT JOIN class_analytics ca ON c.id = ca.class_id
LEFT JOIN (
    SELECT class_id, COUNT(*) as student_count
    FROM enrollments
    GROUP BY class_id
) class_student_counts ON c.id = class_student_counts.class_id
WHERE u.role = 'teacher' AND u.is_active = true
GROUP BY u.id, u.username, u.name;

-- Student engagement view
CREATE OR REPLACE VIEW student_engagement_summary AS
SELECT 
    u.id as student_id,
    u.username,
    u.name,
    COUNT(DISTINCT e.class_id) as classes_joined,
    COUNT(DISTINCT uf.story_id) as stories_favorited,
    COUNT(DISTINCT ca.story_id) as stories_viewed,
    MAX(ue.last_activity) as last_activity_date,
    SUM(ue.time_spent_minutes) as total_time_spent_minutes
FROM users u
LEFT JOIN enrollments e ON u.id = e.student_id
LEFT JOIN user_favorites uf ON u.id = uf.user_id
LEFT JOIN class_analytics ca ON u.id = ca.student_id AND ca.activity_type = 'story_view'
LEFT JOIN user_engagement ue ON u.id = ue.user_id
WHERE u.role = 'student' AND u.is_active = true
GROUP BY u.id, u.username, u.name;

-- Popular stories analytics view
CREATE OR REPLACE VIEW story_popularity AS
SELECT 
    s.id as story_id,
    s.idea_title as title,
    s.uploaded_by,
    uploader.username as uploaded_by_username,
    COUNT(DISTINCT uf.user_id) as favorite_count,
    COUNT(DISTINCT sa.id) FILTER (WHERE sa.action_type = 'view') as view_count,
    COUNT(DISTINCT sa.id) FILTER (WHERE sa.action_type = 'play') as play_count,
    COUNT(DISTINCT ca.student_id) as class_views,
    s.created_at
FROM stories s
JOIN users uploader ON s.uploaded_by = uploader.id
LEFT JOIN user_favorites uf ON s.id = uf.story_id
LEFT JOIN story_analytics sa ON s.id = sa.story_id
LEFT JOIN class_analytics ca ON s.id = ca.story_id AND ca.activity_type = 'story_view'
WHERE s.is_approved = true
GROUP BY s.id, s.idea_title, s.uploaded_by, uploader.username, s.created_at
ORDER BY favorite_count DESC, view_count DESC;