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
 * @returns {Promise<string>} Generated token
 */
async function createPasswordResetToken(userId, expirationHours = 1) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + (expirationHours * 60 * 60 * 1000));

    try {
        await pool.query(`
            INSERT INTO password_reset_tokens (user_id, token, expires_at, used) 
            VALUES ($1, $2, $3, false)
        `, [userId, token, expiresAt]);
    } catch (error) {
        // If constraint error, delete existing token and try again
        if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
            console.log('Constraint error, deleting existing token and retrying...');
            await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
            await pool.query(`
                INSERT INTO password_reset_tokens (user_id, token, expires_at, used) 
                VALUES ($1, $2, $3, false)
            `, [userId, token, expiresAt]);
        } else {
            throw error;
        }
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

        if (result.rows.length === 0) {
            return {
                isValid: false,
                error: 'Invalid or expired reset token',
                user: null
            };
        }

        const tokenData = result.rows[0];

        // Check if token is expired
        if (new Date() > new Date(tokenData.expires_at)) {
            return {
                isValid: false,
                error: 'Reset token has expired. Please request a new one.',
                user: null
            };
        }

        // Check if token has been used
        if (tokenData.used) {
            return {
                isValid: false,
                error: 'Reset token has already been used. Please request a new one.',
                user: null
            };
        }

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
            'UPDATE users SET password_hash = $1 WHERE id = $2',
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