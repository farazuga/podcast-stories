-- Update test user passwords to 'vidpod' for easier testing
-- Generated hash: $2b$10$AGCaAbCkxghVTy7xxXdJOe7ZG0nKxtnvarSx.ruwQDNK6XCTrJ9bW

UPDATE users 
SET password = '$2b$10$AGCaAbCkxghVTy7xxXdJOe7ZG0nKxtnvarSx.ruwQDNK6XCTrJ9bW' 
WHERE email IN ('admin@vidpod.com', 'teacher@vidpod.com', 'student@vidpod.com');

-- Verify the update
SELECT email, name, role, 
       CASE WHEN password = '$2b$10$AGCaAbCkxghVTy7xxXdJOe7ZG0nKxtnvarSx.ruwQDNK6XCTrJ9bW' 
            THEN 'Updated' 
            ELSE 'Not Updated' 
       END as password_status
FROM users 
WHERE email IN ('admin@vidpod.com', 'teacher@vidpod.com', 'student@vidpod.com')
ORDER BY email;