-- Migration: Add audit fields to teacher_requests table
-- Purpose: Track when requests are processed (approved/rejected) and action type
-- Date: 2025-08-27

-- Add processed_at field to track when any decision was made
ALTER TABLE teacher_requests 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- Add action_type field to specify the nature of the action
ALTER TABLE teacher_requests
ADD COLUMN IF NOT EXISTS action_type TEXT;

-- Add constraint to ensure action_type has valid values
ALTER TABLE teacher_requests
ADD CONSTRAINT check_action_type CHECK (action_type IN ('approved','rejected') OR action_type IS NULL);

-- Migrate existing data: copy approved_at to processed_at for approved requests
UPDATE teacher_requests 
SET processed_at = approved_at,
    action_type = CASE 
        WHEN status = 'approved' THEN 'approved'
        WHEN status = 'rejected' THEN 'rejected'
        ELSE NULL
    END
WHERE status IN ('approved', 'rejected');

-- Add unique constraint on email column in users table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_unique'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
    END IF;
END $$;

-- Add index on processed_at for performance
CREATE INDEX IF NOT EXISTS idx_teacher_requests_processed_at ON teacher_requests(processed_at);

-- Add index on action_type for performance
CREATE INDEX IF NOT EXISTS idx_teacher_requests_action_type ON teacher_requests(action_type);

-- Add password_set_at field to track when teacher sets their password
ALTER TABLE teacher_requests
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP;

-- Add index on password_set_at for performance
CREATE INDEX IF NOT EXISTS idx_teacher_requests_password_set_at ON teacher_requests(password_set_at);