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