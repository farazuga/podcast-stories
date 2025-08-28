/**
 * Token Utility for Secure Password Reset
 * Generates and validates secure, single-use tokens for password reset links
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const TOKEN_EXPIRY_HOURS = 24; // Token valid for 24 hours
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

/**
 * Generate a secure password reset token
 * @param {string} email - User email
 * @param {number} userId - User ID
 * @returns {object} Token and expiry information
 */
function generatePasswordResetToken(email, userId) {
  // Create a unique token identifier
  const tokenId = crypto.randomBytes(32).toString('hex');
  
  // Create JWT payload
  const payload = {
    type: 'password_reset',
    email: email,
    userId: userId,
    tokenId: tokenId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (TOKEN_EXPIRY_HOURS * 60 * 60)
  };
  
  // Sign the token
  const token = jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256'
  });
  
  // Create a URL-safe version
  const urlSafeToken = Buffer.from(token).toString('base64url');
  
  return {
    token: urlSafeToken,
    tokenId: tokenId,
    expiresAt: new Date(payload.exp * 1000),
    expiryHours: TOKEN_EXPIRY_HOURS
  };
}

/**
 * Validate a password reset token
 * @param {string} token - The token to validate
 * @returns {object} Validation result with decoded payload if valid
 */
function validatePasswordResetToken(token) {
  try {
    // Decode from URL-safe base64
    const jwtToken = Buffer.from(token, 'base64url').toString('utf-8');
    
    // Verify and decode the JWT
    const decoded = jwt.verify(jwtToken, JWT_SECRET, {
      algorithms: ['HS256']
    });
    
    // Check token type
    if (decoded.type !== 'password_reset') {
      return {
        valid: false,
        error: 'Invalid token type'
      };
    }
    
    // Check expiration (JWT verify already checks this, but we'll be explicit)
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return {
        valid: false,
        error: 'Token has expired'
      };
    }
    
    return {
      valid: true,
      payload: {
        email: decoded.email,
        userId: decoded.userId,
        tokenId: decoded.tokenId,
        expiresAt: new Date(decoded.exp * 1000)
      }
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return {
        valid: false,
        error: 'Token has expired'
      };
    } else if (error.name === 'JsonWebTokenError') {
      return {
        valid: false,
        error: 'Invalid token'
      };
    }
    
    return {
      valid: false,
      error: 'Token validation failed'
    };
  }
}

/**
 * Generate a secure invitation token for teacher accounts
 * @param {string} email - Teacher email
 * @param {number} requestId - Teacher request ID
 * @param {object} additionalData - Additional data to include
 * @returns {object} Token and expiry information
 */
function generateTeacherInvitationToken(email, requestId, additionalData = {}) {
  const tokenId = crypto.randomBytes(32).toString('hex');
  
  const payload = {
    type: 'teacher_invitation',
    email: email,
    requestId: requestId,
    tokenId: tokenId,
    ...additionalData,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days for invitations
  };
  
  const token = jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256'
  });
  
  const urlSafeToken = Buffer.from(token).toString('base64url');
  
  return {
    token: urlSafeToken,
    tokenId: tokenId,
    expiresAt: new Date(payload.exp * 1000),
    expiryDays: 7
  };
}

/**
 * Validate a teacher invitation token
 * @param {string} token - The token to validate
 * @returns {object} Validation result with decoded payload if valid
 */
function validateTeacherInvitationToken(token) {
  try {
    const jwtToken = Buffer.from(token, 'base64url').toString('utf-8');
    const decoded = jwt.verify(jwtToken, JWT_SECRET, {
      algorithms: ['HS256']
    });
    
    if (decoded.type !== 'teacher_invitation') {
      return {
        valid: false,
        error: 'Invalid token type'
      };
    }
    
    return {
      valid: true,
      payload: {
        email: decoded.email,
        requestId: decoded.requestId,
        tokenId: decoded.tokenId,
        expiresAt: new Date(decoded.exp * 1000)
      }
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return {
        valid: false,
        error: 'Invitation has expired'
      };
    }
    
    return {
      valid: false,
      error: 'Invalid invitation token'
    };
  }
}

/**
 * Generate a secure random temporary password
 * @param {number} length - Password length (default: 12)
 * @returns {string} Random password
 */
function generateTemporaryPassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

/**
 * Create a password reset URL
 * @param {string} baseUrl - Base URL of the application
 * @param {string} token - Reset token
 * @returns {string} Complete reset URL
 */
function createPasswordResetUrl(baseUrl, token) {
  // Remove trailing slash from base URL if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/reset-password.html?token=${token}`;
}

/**
 * Create a teacher invitation URL
 * @param {string} baseUrl - Base URL of the application
 * @param {string} token - Invitation token
 * @returns {string} Complete invitation URL
 */
function createTeacherInvitationUrl(baseUrl, token) {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}/reset-password.html?token=${token}`;
}

module.exports = {
  generatePasswordResetToken,
  validatePasswordResetToken,
  generateTeacherInvitationToken,
  validateTeacherInvitationToken,
  generateTemporaryPassword,
  createPasswordResetUrl,
  createTeacherInvitationUrl,
  TOKEN_EXPIRY_HOURS
};