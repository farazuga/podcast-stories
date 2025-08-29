-- Create password_reset_tokens table if it doesn't exist
-- This fixes the teacher approval 500 error

-- Check if table exists and create it if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'password_reset_tokens') THEN
        CREATE TABLE password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(255) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
        CREATE INDEX IF NOT EXISTS idx_password_reset_user_expires ON password_reset_tokens(user_id, expires_at, used);
        
        RAISE NOTICE 'Created password_reset_tokens table successfully';
    ELSE
        RAISE NOTICE 'password_reset_tokens table already exists';
    END IF;
END $$;