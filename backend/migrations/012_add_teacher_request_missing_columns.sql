-- Migration to add missing columns to teacher_requests table
-- Comment 3: Create migration for missing columns (processed_at, action_type, password_set_at, approved_by, approved_at)

-- Add missing columns to teacher_requests table
ALTER TABLE teacher_requests
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;

-- Add foreign key constraint for approved_by if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'teacher_requests_approved_by_fkey' 
        AND table_name = 'teacher_requests'
    ) THEN
        ALTER TABLE teacher_requests 
        ADD CONSTRAINT teacher_requests_approved_by_fkey 
        FOREIGN KEY (approved_by) REFERENCES users(id);
    END IF;
END $$;

-- Create index on processed_at for better query performance
CREATE INDEX IF NOT EXISTS idx_teacher_requests_processed_at ON teacher_requests(processed_at);

-- Create index on action_type for filtering
CREATE INDEX IF NOT EXISTS idx_teacher_requests_action_type ON teacher_requests(action_type);

-- Create index on password_set_at for invitation token validation
CREATE INDEX IF NOT EXISTS idx_teacher_requests_password_set_at ON teacher_requests(password_set_at);

-- Update existing approved/rejected records to have processed_at and action_type
UPDATE teacher_requests 
SET 
  processed_at = COALESCE(approved_at, updated_at, requested_at),
  action_type = CASE 
    WHEN status = 'approved' THEN 'approved'
    WHEN status = 'rejected' THEN 'rejected'
    ELSE NULL
  END
WHERE (processed_at IS NULL OR action_type IS NULL) 
  AND status IN ('approved', 'rejected');

-- Add comments for documentation
COMMENT ON COLUMN teacher_requests.processed_at IS 'Timestamp when the request was processed (approved/rejected)';
COMMENT ON COLUMN teacher_requests.action_type IS 'Type of action taken (approved, rejected)';
COMMENT ON COLUMN teacher_requests.password_set_at IS 'Timestamp when teacher set their password using invitation token';
COMMENT ON COLUMN teacher_requests.approved_by IS 'User ID of admin who approved/rejected the request';
COMMENT ON COLUMN teacher_requests.approved_at IS 'Timestamp when request was approved/rejected';