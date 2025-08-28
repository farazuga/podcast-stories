-- Rundown System Database Migration
-- Creates rundowns and rundown_segments tables for VidPOD Rundown Creator
-- Run after all existing migrations

-- Main rundowns table
CREATE TABLE rundowns (
    id SERIAL PRIMARY KEY,
    show_name VARCHAR(255) NOT NULL,
    air_date DATE NOT NULL,
    target_duration INTEGER DEFAULT 1200, -- Target duration in seconds (20 min default)
    share_with_class BOOLEAN DEFAULT false,
    
    -- User and class relationships
    created_by INTEGER REFERENCES users(id) NOT NULL,
    class_id INTEGER REFERENCES classes(id),
    
    -- Status and timestamps
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Segments within rundowns (using JSONB for flexible segment data)
CREATE TABLE rundown_segments (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER REFERENCES rundowns(id) ON DELETE CASCADE,
    
    -- Basic segment info
    segment_type VARCHAR(50) NOT NULL CHECK (segment_type IN ('intro', 'segment', 'outro')),
    title VARCHAR(255) NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60, -- Duration in seconds
    sort_order INTEGER NOT NULL,
    
    -- Segment status
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Needs Review', 'Ready')),
    is_pinned BOOLEAN DEFAULT false, -- For intro/outro
    is_expanded BOOLEAN DEFAULT false, -- UI state
    
    -- Content stored as JSONB for flexibility
    content JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Talent (hosts and guests) for rundowns
CREATE TABLE rundown_talent (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER REFERENCES rundowns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('host', 'guest')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stories integrated into rundowns (copied data, not live references)
CREATE TABLE rundown_stories (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER REFERENCES rundowns(id) ON DELETE CASCADE,
    segment_id INTEGER REFERENCES rundown_segments(id) ON DELETE CASCADE,
    
    -- Original story reference (for tracking)
    original_story_id INTEGER REFERENCES story_ideas(id),
    
    -- Copied story data (snapshot at time of integration)
    story_title VARCHAR(255) NOT NULL,
    story_description TEXT,
    questions JSONB DEFAULT '[]'::jsonb,
    interviewees JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Integration metadata
    notes TEXT,
    added_by INTEGER REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_rundowns_created_by ON rundowns(created_by);
CREATE INDEX idx_rundowns_class_id ON rundowns(class_id);
CREATE INDEX idx_rundowns_air_date ON rundowns(air_date);
CREATE INDEX idx_rundowns_status ON rundowns(status);

CREATE INDEX idx_rundown_segments_rundown_id ON rundown_segments(rundown_id);
CREATE INDEX idx_rundown_segments_sort_order ON rundown_segments(rundown_id, sort_order);
CREATE INDEX idx_rundown_segments_type ON rundown_segments(segment_type);

CREATE INDEX idx_rundown_talent_rundown_id ON rundown_talent(rundown_id);
CREATE INDEX idx_rundown_talent_role ON rundown_talent(role);

CREATE INDEX idx_rundown_stories_rundown_id ON rundown_stories(rundown_id);
CREATE INDEX idx_rundown_stories_segment_id ON rundown_stories(segment_id);
CREATE INDEX idx_rundown_stories_original ON rundown_stories(original_story_id);

-- Unique constraint for segment ordering within rundown
CREATE UNIQUE INDEX idx_rundown_segments_order_unique ON rundown_segments(rundown_id, sort_order);

-- Unique constraint for talent ordering within rundown
CREATE UNIQUE INDEX idx_rundown_talent_order_unique ON rundown_talent(rundown_id, sort_order);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_rundowns_updated_at 
    BEFORE UPDATE ON rundowns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rundown_segments_updated_at 
    BEFORE UPDATE ON rundown_segments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (only if no rundowns exist)
INSERT INTO rundowns (show_name, air_date, created_by, class_id)
SELECT 
    'Sample Show',
    CURRENT_DATE + INTERVAL '7 days',
    u.id,
    c.id
FROM users u
JOIN classes c ON c.teacher_id = u.id
WHERE u.role = 'teacher'
AND NOT EXISTS (SELECT 1 FROM rundowns)
LIMIT 1;

-- Sample segments for the first rundown (only if it was just created)
DO $$
DECLARE
    first_rundown_id INTEGER;
BEGIN
    SELECT id INTO first_rundown_id FROM rundowns ORDER BY id LIMIT 1;
    
    IF first_rundown_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM rundown_segments WHERE rundown_id = first_rundown_id) THEN
        -- Insert intro segment
        INSERT INTO rundown_segments (rundown_id, segment_type, title, duration, sort_order, is_pinned, status, content)
        VALUES (
            first_rundown_id,
            'intro',
            'Show Intro',
            60,
            0,
            true,
            'Ready',
            '{"intro": "", "questions": [""], "close": "", "notes": ""}'::jsonb
        );
        
        -- Insert sample segment
        INSERT INTO rundown_segments (rundown_id, segment_type, title, duration, sort_order, is_pinned, status, content)
        VALUES (
            first_rundown_id,
            'segment',
            'School News Update',
            300,
            1,
            false,
            'Draft',
            '{"intro": "Let\'s talk about what\'s happening around campus this week...", "questions": ["What are the biggest stories affecting students?", "How are teachers responding to recent changes?"], "close": "Keep an eye on these developing stories.", "notes": "Check with principal about policy updates"}'::jsonb
        );
        
        -- Insert outro segment
        INSERT INTO rundown_segments (rundown_id, segment_type, title, duration, sort_order, is_pinned, status, content)
        VALUES (
            first_rundown_id,
            'outro',
            'Show Outro',
            45,
            2,
            true,
            'Ready',
            '{"intro": "", "questions": [""], "close": "", "notes": ""}'::jsonb
        );
    END IF;
END $$;

-- Grant permissions (assuming standard VidPOD user for database access)
-- Note: Adjust based on actual database user configuration
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rundowns TO vidpod_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rundown_segments TO vidpod_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rundown_talent TO vidpod_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rundown_stories TO vidpod_user;
-- GRANT USAGE ON SEQUENCE rundowns_id_seq TO vidpod_user;
-- GRANT USAGE ON SEQUENCE rundown_segments_id_seq TO vidpod_user;
-- GRANT USAGE ON SEQUENCE rundown_talent_id_seq TO vidpod_user;
-- GRANT USAGE ON SEQUENCE rundown_stories_id_seq TO vidpod_user;