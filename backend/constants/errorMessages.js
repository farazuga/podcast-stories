/**
 * Error Messages Constants
 * Centralized error message definitions for consistency
 */

const ERROR_MESSAGES = {
  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_REQUIRED: 'Email is required',
    PASSWORD_REQUIRED: 'Password is required',
    EMAIL_PASSWORD_REQUIRED: 'Email and password are required',
    TOKEN_REQUIRED: 'Authentication token is required',
    INVALID_TOKEN: 'Invalid or expired token',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access denied',
    TOKEN_EXPIRED: 'Token has expired',
    LOGIN_FAILED: 'Login failed'
  },

  // User management errors
  USER: {
    ALREADY_EXISTS: 'An account with this email already exists',
    EMAIL_EXISTS: 'Email already exists',
    USERNAME_EXISTS: 'Username already exists',
    USERNAME_EMAIL_EXISTS: 'Username or email already exists',
    NOT_FOUND: 'User not found',
    INVALID_ROLE: 'Invalid user role',
    REGISTRATION_FAILED: 'User registration failed',
    UPDATE_FAILED: 'Failed to update user information'
  },

  // Validation errors
  VALIDATION: {
    REQUIRED_FIELDS: 'Required fields are missing',
    INVALID_EMAIL: 'Invalid email format',
    PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long',
    PASSWORD_WEAK: 'Password does not meet security requirements',
    INVALID_INPUT: 'Invalid input data',
    FIELD_TOO_LONG: 'Field exceeds maximum length',
    FIELD_TOO_SHORT: 'Field is too short',
    INVALID_DATE: 'Invalid date format',
    INVALID_NUMBER: 'Invalid number format'
  },

  // Story management errors
  STORY: {
    NOT_FOUND: 'Story not found',
    TITLE_REQUIRED: 'Story title is required',
    CREATION_FAILED: 'Failed to create story',
    UPDATE_FAILED: 'Failed to update story',
    DELETE_FAILED: 'Failed to delete story',
    PERMISSION_DENIED: 'You do not have permission to modify this story',
    APPROVAL_FAILED: 'Failed to approve story',
    REJECTION_FAILED: 'Failed to reject story',
    INVALID_STATUS: 'Invalid story status'
  },

  // File upload errors
  FILE: {
    REQUIRED: 'File is required',
    TOO_LARGE: 'File size exceeds maximum limit',
    INVALID_TYPE: 'Invalid file type',
    UPLOAD_FAILED: 'File upload failed',
    CSV_INVALID: 'Invalid CSV format',
    CSV_TOO_LARGE: 'CSV file contains too many rows',
    CSV_EMPTY: 'CSV file is empty',
    PROCESSING_FAILED: 'File processing failed'
  },

  // Class management errors
  CLASS: {
    NOT_FOUND: 'Class not found',
    NAME_REQUIRED: 'Class name is required',
    CODE_INVALID: 'Invalid class code',
    CODE_NOT_FOUND: 'Class code not found',
    CREATION_FAILED: 'Failed to create class',
    JOIN_FAILED: 'Failed to join class',
    ALREADY_JOINED: 'Already joined this class',
    PERMISSION_DENIED: 'You do not have permission to access this class',
    STUDENT_REMOVAL_FAILED: 'Failed to remove student from class'
  },

  // Favorites errors
  FAVORITES: {
    ADD_FAILED: 'Failed to add to favorites',
    REMOVE_FAILED: 'Failed to remove from favorites',
    ALREADY_FAVORITED: 'Story is already in favorites',
    NOT_FAVORITED: 'Story is not in favorites'
  },

  // School management errors
  SCHOOL: {
    NOT_FOUND: 'School not found',
    NAME_REQUIRED: 'School name is required',
    CREATION_FAILED: 'Failed to create school',
    UPDATE_FAILED: 'Failed to update school',
    DELETE_FAILED: 'Failed to delete school'
  },

  // Teacher request errors
  TEACHER_REQUEST: {
    NOT_FOUND: 'Teacher request not found',
    PENDING_EXISTS: 'A pending request with this email already exists',
    APPROVAL_FAILED: 'Failed to approve teacher request',
    REJECTION_FAILED: 'Failed to reject teacher request',
    CREATION_FAILED: 'Failed to create teacher request'
  },

  // System errors
  SYSTEM: {
    INTERNAL_ERROR: 'Internal server error',
    DATABASE_ERROR: 'Database connection error',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    NETWORK_ERROR: 'Network error occurred',
    TIMEOUT: 'Request timeout',
    MAINTENANCE: 'System is under maintenance'
  },

  // Email errors
  EMAIL: {
    INVALID_FORMAT: 'Invalid email format',
    SEND_FAILED: 'Failed to send email',
    SERVICE_ERROR: 'Email service error',
    CONFIGURATION_ERROR: 'Email service not configured'
  },

  // Password reset errors
  PASSWORD_RESET: {
    TOKEN_INVALID: 'Invalid or expired reset token',
    TOKEN_USED: 'Reset token has already been used',
    REQUEST_FAILED: 'Failed to process password reset request',
    RESET_FAILED: 'Failed to reset password',
    EMAIL_NOT_FOUND: 'No account found with this email address'
  }
};

const SUCCESS_MESSAGES = {
  // Authentication success
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    REGISTRATION_SUCCESS: 'Registration successful',
    TOKEN_VALID: 'Token is valid'
  },

  // User management success
  USER: {
    CREATED: 'User created successfully',
    UPDATED: 'User updated successfully',
    DELETED: 'User deleted successfully',
    PASSWORD_CHANGED: 'Password changed successfully'
  },

  // Story management success
  STORY: {
    CREATED: 'Story created successfully',
    UPDATED: 'Story updated successfully',
    DELETED: 'Story deleted successfully',
    APPROVED: 'Story approved successfully',
    REJECTED: 'Story rejected successfully',
    IMPORTED: 'Stories imported successfully'
  },

  // File upload success
  FILE: {
    UPLOADED: 'File uploaded successfully',
    PROCESSED: 'File processed successfully',
    CSV_IMPORTED: 'CSV data imported successfully'
  },

  // Class management success
  CLASS: {
    CREATED: 'Class created successfully',
    JOINED: 'Successfully joined class',
    UPDATED: 'Class updated successfully',
    STUDENT_REMOVED: 'Student removed from class'
  },

  // Favorites success
  FAVORITES: {
    ADDED: 'Added to favorites',
    REMOVED: 'Removed from favorites'
  },

  // General success
  GENERAL: {
    OPERATION_SUCCESS: 'Operation completed successfully',
    CHANGES_SAVED: 'Changes saved successfully',
    DATA_RETRIEVED: 'Data retrieved successfully'
  }
};

const messageHelpers = {
  /**
   * Get error message by category and key
   * @param {string} category - Error category (e.g., 'AUTH', 'USER')
   * @param {string} key - Error key
   * @returns {string} Error message
   */
  getError(category, key) {
    return ERROR_MESSAGES[category]?.[key] || ERROR_MESSAGES.SYSTEM.INTERNAL_ERROR;
  },

  /**
   * Get success message by category and key
   * @param {string} category - Success category
   * @param {string} key - Success key
   * @returns {string} Success message
   */
  getSuccess(category, key) {
    return SUCCESS_MESSAGES[category]?.[key] || SUCCESS_MESSAGES.GENERAL.OPERATION_SUCCESS;
  },

  /**
   * Create validation error message
   * @param {Array<string>} missingFields - Missing field names
   * @returns {string} Formatted validation error message
   */
  getValidationError(missingFields) {
    if (!missingFields || missingFields.length === 0) {
      return ERROR_MESSAGES.VALIDATION.REQUIRED_FIELDS;
    }
    return `Missing required fields: ${missingFields.join(', ')}`;
  },

  /**
   * Create permission denied message
   * @param {string} resource - Resource being accessed
   * @returns {string} Permission denied message
   */
  getPermissionDenied(resource = 'resource') {
    return `You do not have permission to access this ${resource}`;
  },

  /**
   * Create not found message
   * @param {string} resource - Resource that was not found
   * @returns {string} Not found message
   */
  getNotFound(resource = 'resource') {
    return `${resource.charAt(0).toUpperCase() + resource.slice(1)} not found`;
  }
};

module.exports = {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  messageHelpers
};