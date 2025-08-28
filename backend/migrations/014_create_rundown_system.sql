-- Migration 014: Create Rundown Management System
-- VidPOD Rundown System Database Schema
-- Created: 2025-01-28

-- Create rundowns table
CREATE TABLE IF NOT EXISTS rundowns (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
    scheduled_date TIMESTAMP,
    total_duration INTEGER DEFAULT 0, -- Duration in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rundown_segments table
CREATE TABLE IF NOT EXISTS rundown_segments (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('intro', 'story', 'interview', 'break', 'outro', 'custom')),
    content JSONB DEFAULT '{}',
    duration INTEGER DEFAULT 0, -- Duration in seconds
    order_index INTEGER NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rundown_id, order_index)
);

-- Create rundown_talent table
CREATE TABLE IF NOT EXISTS rundown_talent (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('host', 'co-host', 'guest', 'expert')),
    bio TEXT,
    contact_info JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rundown_id, name)
);

-- Create rundown_stories table (junction table for story integration)
CREATE TABLE IF NOT EXISTS rundown_stories (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
    story_id INTEGER NOT NULL REFERENCES story_ideas(id) ON DELETE CASCADE,
    segment_id INTEGER REFERENCES rundown_segments(id) ON DELETE SET NULL,
    order_index INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rundown_id, story_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rundowns_created_by ON rundowns(created_by);
CREATE INDEX IF NOT EXISTS idx_rundowns_class_id ON rundowns(class_id);
CREATE INDEX IF NOT EXISTS idx_rundowns_status ON rundowns(status);
CREATE INDEX IF NOT EXISTS idx_rundowns_scheduled_date ON rundowns(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_rundown_segments_rundown_id ON rundown_segments(rundown_id);
CREATE INDEX IF NOT EXISTS idx_rundown_segments_order ON rundown_segments(rundown_id, order_index);
CREATE INDEX IF NOT EXISTS idx_rundown_segments_type ON rundown_segments(type);

CREATE INDEX IF NOT EXISTS idx_rundown_talent_rundown_id ON rundown_talent(rundown_id);
CREATE INDEX IF NOT EXISTS idx_rundown_talent_role ON rundown_talent(role);

CREATE INDEX IF NOT EXISTS idx_rundown_stories_rundown_id ON rundown_stories(rundown_id);
CREATE INDEX IF NOT EXISTS idx_rundown_stories_story_id ON rundown_stories(story_id);

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rundowns_updated_at BEFORE UPDATE ON rundowns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rundown_segments_updated_at BEFORE UPDATE ON rundown_segments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default segment types for new rundowns (via application logic)
COMMENT ON TABLE rundowns IS 'Main rundown records for podcast episodes';
COMMENT ON TABLE rundown_segments IS 'Individual segments within rundowns with flexible JSONB content';
COMMENT ON TABLE rundown_talent IS 'Talent/participants associated with rundowns';
COMMENT ON TABLE rundown_stories IS 'Junction table linking story ideas to rundowns';

COMMENT ON COLUMN rundown_segments.content IS 'Flexible JSONB field for segment-specific data like questions, scripts, etc.';
COMMENT ON COLUMN rundown_segments.is_pinned IS 'Whether segment position is fixed (intro/outro)';
COMMENT ON COLUMN rundown_talent.contact_info IS 'JSONB field for email, phone, social media, etc.';