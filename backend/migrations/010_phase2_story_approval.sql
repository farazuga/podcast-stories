-- Phase 2: Story Approval System Migration
-- Adds approval status field and related constraints to story_ideas table

-- Start transaction
BEGIN;

-- 1. ADD APPROVAL STATUS FIELD
ALTER TABLE story_ideas 
ADD COLUMN approval_status VARCHAR(20) DEFAULT 'draft' 
CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'));

-- 2. ADD INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_story_ideas_approval_status ON story_ideas(approval_status);

-- 3. ADD APPROVAL TIMESTAMP FIELDS
ALTER TABLE story_ideas ADD COLUMN submitted_at TIMESTAMP NULL;
ALTER TABLE story_ideas ADD COLUMN approved_at TIMESTAMP NULL;
ALTER TABLE story_ideas ADD COLUMN approved_by INTEGER REFERENCES users(id);

-- 4. ADD APPROVAL NOTES FIELD
ALTER TABLE story_ideas ADD COLUMN approval_notes TEXT NULL;

-- 5. CREATE APPROVAL HISTORY TABLE (for audit trail)
CREATE TABLE IF NOT EXISTS story_approval_history (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES story_ideas(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    notes TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ADD INDEX FOR APPROVAL HISTORY
CREATE INDEX IF NOT EXISTS idx_story_approval_history_story_id ON story_approval_history(story_id);
CREATE INDEX IF NOT EXISTS idx_story_approval_history_changed_at ON story_approval_history(changed_at);

-- 7. UPDATE EXISTING STORIES (if any) TO APPROVED STATUS
-- Since this is a fresh system after Phase 1 reset, this is just precautionary
UPDATE story_ideas SET approval_status = 'approved' WHERE approval_status IS NULL;

-- 8. CREATE TRIGGER FUNCTION FOR AUTOMATIC APPROVAL HISTORY
CREATE OR REPLACE FUNCTION log_approval_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if approval_status actually changed
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
        INSERT INTO story_approval_history (
            story_id, 
            previous_status, 
            new_status, 
            changed_by,
            notes,
            changed_at
        ) VALUES (
            NEW.id,
            OLD.approval_status,
            NEW.approval_status,
            COALESCE(NEW.approved_by, NEW.uploaded_by), -- Use approved_by if set, otherwise uploaded_by
            NEW.approval_notes,
            CURRENT_TIMESTAMP
        );
        
        -- Update timestamp fields based on new status
        IF NEW.approval_status = 'pending' AND OLD.approval_status = 'draft' THEN
            NEW.submitted_at = CURRENT_TIMESTAMP;
        ELSIF NEW.approval_status IN ('approved', 'rejected') THEN
            NEW.approved_at = CURRENT_TIMESTAMP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. CREATE TRIGGER FOR APPROVAL HISTORY
DROP TRIGGER IF EXISTS trigger_log_approval_change ON story_ideas;
CREATE TRIGGER trigger_log_approval_change
    BEFORE UPDATE ON story_ideas
    FOR EACH ROW
    EXECUTE FUNCTION log_approval_change();

-- 10. UPDATE SCHEMA VERSION
INSERT INTO schema_version (version, description) 
VALUES (10, 'Phase 2: Story approval system with status tracking and history');

-- Commit transaction
COMMIT;

-- Display migration summary
DO $$
BEGIN
    RAISE NOTICE '=== PHASE 2 MIGRATION COMPLETED ===';
    RAISE NOTICE 'Story Approval System Features Added:';
    RAISE NOTICE '1. ✅ approval_status field with constraint (draft, pending, approved, rejected)';
    RAISE NOTICE '2. ✅ Approval timestamp fields (submitted_at, approved_at)';
    RAISE NOTICE '3. ✅ approved_by field to track who approved/rejected';
    RAISE NOTICE '4. ✅ approval_notes field for admin feedback';
    RAISE NOTICE '5. ✅ story_approval_history table for audit trail';
    RAISE NOTICE '6. ✅ Automatic history logging via trigger';
    RAISE NOTICE '7. ✅ Performance indexes on approval fields';
    RAISE NOTICE '';
    RAISE NOTICE 'Approval Workflow:';
    RAISE NOTICE '• draft → Stories created by users start as draft';
    RAISE NOTICE '• pending → Stories submitted for review';
    RAISE NOTICE '• approved → Stories approved by admins (visible to all)';
    RAISE NOTICE '• rejected → Stories rejected by admins (back to draft)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Create approval endpoints for admins';
    RAISE NOTICE '2. Update story creation to use draft status';
    RAISE NOTICE '3. Add approval interface to admin panel';
    RAISE NOTICE '4. Filter stories by approval status for users';
END $$;