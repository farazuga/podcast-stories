/**
 * Unified Password Utilities for VidPOD
 * Handles password validation and hashing consistently across all flows
 */

const bcrypt = require('bcrypt');

/**
 * Unified password validation - 6+ characters minimum
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with success and error message
 */
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return {
            isValid: false,
            error: 'Password is required'
        };
    }

    if (password.length < 6) {
        return {
            isValid: false,
            error: 'Password must be at least 6 characters long'
        };
    }

    return {
        isValid: true,
        error: null
    };
}

/**
 * Hash password using consistent salt rounds
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

/**
 * Generate password strength score (0-4)
 * Used for UI feedback, not validation
 * @param {string} password - Password to analyze
 * @returns {Object} Strength analysis
 */
function analyzePasswordStrength(password) {
    if (!password) {
        return {
            score: 0,
            strength: 'none',
            feedback: []
        };
    }

    let score = 0;
    const feedback = [];

    // Length check
    if (password.length >= 6) score++;
    else feedback.push('Use at least 6 characters');

    // Uppercase check
    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Include uppercase letters');

    // Lowercase check  
    if (/[a-z]/.test(password)) score++;
    else feedback.push('Include lowercase letters');

    // Number check
    if (/[0-9]/.test(password)) score++;
    else feedback.push('Include numbers');

    const strengthLevels = {
        0: 'none',
        1: 'weak', 
        2: 'fair',
        3: 'good',
        4: 'strong'
    };

    return {
        score,
        strength: strengthLevels[score],
        feedback,
        meetsMinimum: score >= 1 && password.length >= 6
    };
}

/**
 * Validate password confirmation match
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {Object} Validation result
 */
function validatePasswordConfirmation(password, confirmPassword) {
    if (!confirmPassword) {
        return {
            isValid: false,
            error: 'Password confirmation is required'
        };
    }

    if (password !== confirmPassword) {
        return {
            isValid: false,
            error: 'Passwords do not match'
        };
    }

    return {
        isValid: true,
        error: null
    };
}

module.exports = {
    validatePassword,
    hashPassword,
    verifyPassword,
    analyzePasswordStrength,
    validatePasswordConfirmation
};