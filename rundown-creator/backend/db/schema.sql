-- VidPOD Rundown Creator Database Schema
-- Independent tables with rundown_app_ prefix to avoid conflicts

-- Main rundowns table
CREATE TABLE IF NOT EXISTS rundown_app_rundowns (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,  -- References main users(id) but no FK for independence
    class_id INTEGER,             -- References main classes(id) but no FK for independence
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    teacher_comment TEXT,
    reviewed_by INTEGER,          -- References main users(id) for teacher who reviewed
    reviewed_at TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    total_duration INTEGER DEFAULT 0, -- Total duration in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rundown segments table
CREATE TABLE IF NOT EXISTS rundown_app_segments (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER NOT NULL REFERENCES rundown_app_rundowns(id) ON DELETE CASCADE,
    segment_type VARCHAR(50) NOT NULL CHECK (segment_type IN ('intro', 'story', 'outro', 'interview', 'break', 'commercial', 'music')),
    title VARCHAR(255) NOT NULL,
    duration INTEGER DEFAULT 0,   -- Duration in seconds
    notes TEXT,
    sort_order INTEGER NOT NULL,
    story_id INTEGER,             -- References main story_ideas(id) but no FK for independence
    guest_name VARCHAR(255),
    is_remote BOOLEAN DEFAULT FALSE,
    script_notes TEXT,
    audio_file_url VARCHAR(500),  -- For future audio integration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for rundown-story relationships
CREATE TABLE IF NOT EXISTS rundown_app_stories (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER NOT NULL REFERENCES rundown_app_rundowns(id) ON DELETE CASCADE,
    story_id INTEGER NOT NULL,    -- References main story_ideas(id) but no FK for independence
    segment_id INTEGER REFERENCES rundown_app_segments(id) ON DELETE SET NULL,
    notes TEXT,
    questions TEXT,               -- Custom questions for this story in this rundown
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rundown_id, story_id)  -- Prevent duplicate story additions
);

-- Rundown templates for reusable show formats
CREATE TABLE IF NOT EXISTS rundown_app_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL, -- References main users(id)
    is_public BOOLEAN DEFAULT FALSE,
    template_data JSONB,          -- Store template structure as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics for rundown usage
CREATE TABLE IF NOT EXISTS rundown_app_analytics (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER NOT NULL REFERENCES rundown_app_rundowns(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,    -- References main users(id)
    action_type VARCHAR(50) NOT NULL, -- 'created', 'submitted', 'approved', 'exported', 'viewed'
    details JSONB,               -- Additional action details
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rundown_app_rundowns_created_by ON rundown_app_rundowns(created_by);
CREATE INDEX IF NOT EXISTS idx_rundown_app_rundowns_class_id ON rundown_app_rundowns(class_id);
CREATE INDEX IF NOT EXISTS idx_rundown_app_rundowns_status ON rundown_app_rundowns(status);
CREATE INDEX IF NOT EXISTS idx_rundown_app_rundowns_archived ON rundown_app_rundowns(is_archived);
CREATE INDEX IF NOT EXISTS idx_rundown_app_segments_rundown_id ON rundown_app_segments(rundown_id);
CREATE INDEX IF NOT EXISTS idx_rundown_app_segments_sort_order ON rundown_app_segments(rundown_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_rundown_app_stories_rundown_id ON rundown_app_stories(rundown_id);
CREATE INDEX IF NOT EXISTS idx_rundown_app_analytics_rundown_id ON rundown_app_analytics(rundown_id);
CREATE INDEX IF NOT EXISTS idx_rundown_app_analytics_user_id ON rundown_app_analytics(user_id);

-- Views for easier querying
CREATE OR REPLACE VIEW rundown_app_rundowns_with_stats AS
SELECT 
    r.*,
    COUNT(s.id) as segment_count,
    COUNT(rs.id) as story_count,
    COALESCE(SUM(s.duration), 0) as calculated_duration
FROM rundown_app_rundowns r
LEFT JOIN rundown_app_segments s ON r.id = s.rundown_id
LEFT JOIN rundown_app_stories rs ON r.id = rs.rundown_id
GROUP BY r.id;

-- Function to update total_duration when segments change
CREATE OR REPLACE FUNCTION update_rundown_duration()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE rundown_app_rundowns 
    SET total_duration = (
        SELECT COALESCE(SUM(duration), 0) 
        FROM rundown_app_segments 
        WHERE rundown_id = COALESCE(NEW.rundown_id, OLD.rundown_id)
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.rundown_id, OLD.rundown_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update duration
DROP TRIGGER IF EXISTS trigger_update_rundown_duration_insert ON rundown_app_segments;
CREATE TRIGGER trigger_update_rundown_duration_insert
    AFTER INSERT ON rundown_app_segments
    FOR EACH ROW EXECUTE FUNCTION update_rundown_duration();

DROP TRIGGER IF EXISTS trigger_update_rundown_duration_update ON rundown_app_segments;
CREATE TRIGGER trigger_update_rundown_duration_update
    AFTER UPDATE ON rundown_app_segments
    FOR EACH ROW EXECUTE FUNCTION update_rundown_duration();

DROP TRIGGER IF EXISTS trigger_update_rundown_duration_delete ON rundown_app_segments;
CREATE TRIGGER trigger_update_rundown_duration_delete
    AFTER DELETE ON rundown_app_segments
    FOR EACH ROW EXECUTE FUNCTION update_rundown_duration();