/**
 * Validation Helper Utilities
 * Centralized validation functions for data integrity
 */

const validationHelpers = {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email format
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {object} Validation result with isValid and message
   */
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: 'Password is required' };
    }

    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters long' };
    }

    return { isValid: true, message: 'Password is valid' };
  },

  /**
   * Validate required fields in an object
   * @param {object} data - Data object to validate
   * @param {Array<string>} requiredFields - Array of required field names
   * @returns {object} Validation result with isValid, message, and missing fields
   */
  validateRequiredFields(data, requiredFields) {
    if (!data || typeof data !== 'object') {
      return { 
        isValid: false, 
        message: 'Data is required', 
        missingFields: requiredFields 
      };
    }

    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return !value || (typeof value === 'string' && !value.trim());
    });

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      };
    }

    return { isValid: true, message: 'All required fields present' };
  },

  /**
   * Sanitize string input (trim and escape)
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';
    
    return str.trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Validate text length
   * @param {string} text - Text to validate
   * @param {number} minLength - Minimum length (default: 1)
   * @param {number} maxLength - Maximum length (default: 1000)
   * @returns {object} Validation result
   */
  validateTextLength(text, minLength = 1, maxLength = 1000) {
    if (!text || typeof text !== 'string') {
      return { 
        isValid: false, 
        message: `Text must be between ${minLength} and ${maxLength} characters` 
      };
    }

    const length = text.trim().length;
    
    if (length < minLength) {
      return { 
        isValid: false, 
        message: `Text must be at least ${minLength} characters long` 
      };
    }
    
    if (length > maxLength) {
      return { 
        isValid: false, 
        message: `Text must be no more than ${maxLength} characters long` 
      };
    }

    return { isValid: true, message: 'Text length is valid' };
  },

  /**
   * Validate user role
   * @param {string} role - Role to validate
   * @returns {boolean} True if valid role
   */
  isValidRole(role) {
    const validRoles = ['amitrace_admin', 'teacher', 'student'];
    return validRoles.includes(role);
  },

  /**
   * Validate database ID (must be positive integer)
   * @param {any} id - ID to validate
   * @returns {boolean} True if valid ID
   */
  isValidId(id) {
    const numId = parseInt(id, 10);
    return !isNaN(numId) && numId > 0;
  },

  /**
   * Validate and sanitize CSV data
   * @param {string} csvText - CSV text to validate
   * @returns {object} Validation result with row count and any issues
   */
  validateCSVData(csvText) {
    if (!csvText || typeof csvText !== 'string') {
      return { 
        isValid: false, 
        message: 'CSV data is required',
        rowCount: 0
      };
    }

    const lines = csvText.trim().split('\n');
    const rowCount = lines.length - 1; // Subtract header row

    if (rowCount < 1) {
      return { 
        isValid: false, 
        message: 'CSV must contain at least one data row',
        rowCount: 0
      };
    }

    if (rowCount > 1000) {
      return { 
        isValid: false, 
        message: 'CSV cannot contain more than 1000 rows',
        rowCount
      };
    }

    return { 
      isValid: true, 
      message: `CSV contains ${rowCount} valid rows`,
      rowCount
    };
  },

  /**
   * Validate file upload
   * @param {object} file - File object to validate
   * @param {Array<string>} allowedTypes - Allowed MIME types
   * @param {number} maxSize - Maximum file size in bytes
   * @returns {object} Validation result
   */
  validateFileUpload(file, allowedTypes = ['text/csv'], maxSize = 5 * 1024 * 1024) {
    if (!file) {
      return { isValid: false, message: 'File is required' };
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return { 
        isValid: false, 
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` 
      };
    }

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return { 
        isValid: false, 
        message: `File size too large. Maximum size: ${maxSizeMB}MB` 
      };
    }

    return { isValid: true, message: 'File is valid' };
  },

  /**
   * Create standardized error response
   * @param {string} message - Error message
   * @param {number} status - HTTP status code (default: 400)
   * @param {object} details - Additional error details
   * @returns {object} Standardized error object
   */
  createErrorResponse(message, status = 400, details = null) {
    return {
      error: message,
      status,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    };
  },

  /**
   * Create standardized success response
   * @param {string} message - Success message
   * @param {any} data - Response data
   * @returns {object} Standardized success object
   */
  createSuccessResponse(message, data = null) {
    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data })
    };
  }
};

// For Node.js module exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = validationHelpers;
}

// For browser global access
if (typeof window !== 'undefined') {
  window.ValidationHelpers = validationHelpers;
}