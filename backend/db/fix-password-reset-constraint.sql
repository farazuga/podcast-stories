-- Fix password_reset_tokens table constraint
-- Add unique constraint on user_id so ON CONFLICT works properly

-- First, remove any duplicate user_id entries (keep the most recent)
DELETE FROM password_reset_tokens 
WHERE id NOT IN (
    SELECT MAX(id) 
    FROM password_reset_tokens 
    GROUP BY user_id
);

-- Add unique constraint on user_id
ALTER TABLE password_reset_tokens 
ADD CONSTRAINT unique_user_id UNIQUE (user_id);