/**
 * Unified Token Service for VidPOD
 * Handles token generation, validation, and cleanup for all password reset flows
 */

const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Generate secure random token
 * @returns {string} 64-character hex token
 */
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create password reset token for any user
 * @param {number} userId - User ID
 * @param {number} expirationHours - Hours until expiration (default 1)
 * @param {Object} client - Optional database client to use (for transactions)
 * @returns {Promise<string>} Generated token
 */
async function createPasswordResetToken(userId, expirationHours = 1, client = null) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + (expirationHours * 60 * 60 * 1000));

    // Use provided client (for transactions) or fallback to pool
    const dbConnection = client || pool;

    // Since unique constraint is removed, we can simply insert
    // If user already has tokens, this will create multiple (which is now allowed)
    console.log(`Creating password reset token for user ${userId}, token: ${token}, expires: ${expiresAt}`);
    try {
        const insertResult = await dbConnection.query(`
            INSERT INTO password_reset_tokens (user_id, token, expires_at, used, created_at) 
            VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
            RETURNING id, created_at
        `, [userId, token, expiresAt]);
        console.log(`Token created successfully - ID: ${insertResult.rows[0].id}, created: ${insertResult.rows[0].created_at}, user: ${userId}, token: ${token.substring(0, 16)}...`);
    } catch (insertError) {
        console.error(`Token creation failed for user ${userId}:`, insertError);
        throw insertError;
    }

    return token;
}

/**
 * Validate and retrieve token information
 * @param {string} token - Token to validate
 * @returns {Promise<Object>} Token validation result
 */
async function validateToken(token) {
    if (!token) {
        return {
            isValid: false,
            error: 'Token is required',
            user: null
        };
    }

    try {
        console.log(`Validating token: ${token.substring(0, 8)}...`);
        console.log(`Full token for validation: ${token}`);
        
        // First, let's try a simpler query to see if the token exists at all
        const tokenExistsResult = await pool.query(
            'SELECT id, user_id, expires_at, used, created_at FROM password_reset_tokens WHERE token = $1',
            [token]
        );
        console.log(`Simple token query returned ${tokenExistsResult.rows.length} rows`);
        
        if (tokenExistsResult.rows.length > 0) {
            console.log(`Found token in database:`, tokenExistsResult.rows[0]);
        }
        
        // Now try the full query with JOIN
        const result = await pool.query(`
            SELECT 
                prt.id,
                prt.user_id,
                prt.expires_at,
                prt.used,
                prt.created_at,
                u.email,
                u.username,
                u.name,
                u.role
            FROM password_reset_tokens prt
            JOIN users u ON prt.user_id = u.id
            WHERE prt.token = $1
        `, [token]);

        console.log(`Token validation query returned ${result.rows.length} rows for token: ${token.substring(0, 16)}...`);
        
        if (result.rows.length === 0) {
            console.log(`Token not found in database: ${token}`);
            // Let's also check how many total tokens exist for debugging
            const countResult = await pool.query('SELECT COUNT(*) as total FROM password_reset_tokens');
            console.log(`Total tokens in database: ${countResult.rows[0].total}`);
            return {
                isValid: false,
                error: 'Invalid or expired reset token',
                user: null
            };
        }

        const tokenData = result.rows[0];

        // Check if token is expired
        const now = new Date();
        const expiresAt = new Date(tokenData.expires_at);
        console.log(`Token expires at: ${expiresAt}, current time: ${now}`);
        
        if (now > expiresAt) {
            console.log(`Token expired: ${token.substring(0, 8)}...`);
            return {
                isValid: false,
                error: 'Reset token has expired. Please request a new one.',
                user: null
            };
        }

        // Check if token has been used
        if (tokenData.used) {
            console.log(`Token already used: ${token.substring(0, 8)}...`);
            return {
                isValid: false,
                error: 'Reset token has already been used. Please request a new one.',
                user: null
            };
        }

        console.log(`Token validation successful for user ${tokenData.email}`);
        return {
            isValid: true,
            error: null,
            user: {
                id: tokenData.user_id,
                email: tokenData.email,
                username: tokenData.username,
                name: tokenData.name,
                role: tokenData.role
            },
            tokenId: tokenData.id,
            createdAt: tokenData.created_at
        };

    } catch (error) {
        console.error('Token validation error:', error);
        return {
            isValid: false,
            error: 'Failed to validate token',
            user: null
        };
    }
}

/**
 * Mark token as used
 * @param {string} token - Token to mark as used
 * @returns {Promise<boolean>} Success status
 */
async function markTokenAsUsed(token) {
    try {
        const result = await pool.query(
            'UPDATE password_reset_tokens SET used = true WHERE token = $1',
            [token]
        );
        
        return result.rowCount > 0;
    } catch (error) {
        console.error('Error marking token as used:', error);
        return false;
    }
}

/**
 * Clean up expired tokens (should be called periodically)
 * @returns {Promise<number>} Number of tokens cleaned up
 */
async function cleanupExpiredTokens() {
    try {
        const result = await pool.query(
            'DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP'
        );
        
        console.log(`Cleaned up ${result.rowCount} expired password reset tokens`);
        return result.rowCount;
    } catch (error) {
        console.error('Token cleanup error:', error);
        return 0;
    }
}

/**
 * Get user by email for password reset
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User data or null if not found
 */
async function getUserByEmail(email) {
    try {
        const result = await pool.query(
            'SELECT id, email, username, name, role FROM users WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error fetching user by email:', error);
        return null;
    }
}

/**
 * Update user password
 * @param {number} userId - User ID
 * @param {string} hashedPassword - New hashed password
 * @returns {Promise<boolean>} Success status
 */
async function updateUserPassword(userId, hashedPassword) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Update password
        await client.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, userId]
        );
        
        // Mark all tokens as used for this user
        await client.query(
            'UPDATE password_reset_tokens SET used = true WHERE user_id = $1',
            [userId]
        );
        
        await client.query('COMMIT');
        return true;
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating user password:', error);
        return false;
    } finally {
        client.release();
    }
}

// Schedule automatic cleanup every 24 hours
if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
        cleanupExpiredTokens().catch(error => {
            console.error('Scheduled token cleanup failed:', error);
        });
    }, 24 * 60 * 60 * 1000); // 24 hours
}

module.exports = {
    generateToken,
    createPasswordResetToken,
    validateToken,
    markTokenAsUsed,
    cleanupExpiredTokens,
    getUserByEmail,
    updateUserPassword
};