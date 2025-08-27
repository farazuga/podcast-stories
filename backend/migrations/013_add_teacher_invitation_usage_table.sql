-- Migration: Add teacher_invitation_usage table to prevent token reuse when SKIP_OPTIONAL_COLUMNS is true
-- Purpose: When password_set_at is unavailable, track invitation token usage to prevent reuse
-- Date: 2025-08-27

-- Create teacher_invitation_usage table only if it doesn't exist
CREATE TABLE IF NOT EXISTS teacher_invitation_usage (
    request_id UUID PRIMARY KEY,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add foreign key constraint to teacher_requests if table structure allows
-- Note: We need to handle the case where teacher_requests.id might not be UUID
DO $$
BEGIN
    -- Check if teacher_requests.id is compatible for foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teacher_requests' 
        AND column_name = 'id'
        AND data_type IN ('uuid', 'integer')
    ) THEN
        -- Check if foreign key constraint doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'teacher_invitation_usage_request_id_fkey' 
            AND table_name = 'teacher_invitation_usage'
        ) THEN
            -- Add foreign key constraint
            ALTER TABLE teacher_invitation_usage 
            ADD CONSTRAINT teacher_invitation_usage_request_id_fkey 
            FOREIGN KEY (request_id) REFERENCES teacher_requests(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_teacher_invitation_usage_used_at ON teacher_invitation_usage(used_at);

-- Add comments for documentation
COMMENT ON TABLE teacher_invitation_usage IS 'Tracks usage of teacher invitation tokens to prevent reuse when password_set_at column is not available';
COMMENT ON COLUMN teacher_invitation_usage.request_id IS 'Reference to teacher_requests.id - tracks which invitation was used';
COMMENT ON COLUMN teacher_invitation_usage.used_at IS 'Timestamp when the invitation token was used to set password';
COMMENT ON COLUMN teacher_invitation_usage.created_at IS 'Record creation timestamp';