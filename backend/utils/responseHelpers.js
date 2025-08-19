/**
 * Response Helper Utilities
 * Standardized API response formatting functions
 */

const responseHelpers = {
  /**
   * Send standardized success response
   * @param {object} res - Express response object
   * @param {string} message - Success message
   * @param {any} data - Response data (optional)
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  sendSuccess(res, message, data = null, statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data })
    };

    return res.status(statusCode).json(response);
  },

  /**
   * Send standardized error response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 400)
   * @param {any} details - Additional error details (optional)
   */
  sendError(res, message, statusCode = 400, details = null) {
    const response = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    };

    return res.status(statusCode).json(response);
  },

  /**
   * Send validation error response
   * @param {object} res - Express response object
   * @param {string} message - Validation error message
   * @param {Array<string>} missingFields - Missing required fields (optional)
   */
  sendValidationError(res, message, missingFields = null) {
    const response = {
      success: false,
      error: message,
      type: 'validation_error',
      timestamp: new Date().toISOString(),
      ...(missingFields && { missingFields })
    };

    return res.status(400).json(response);
  },

  /**
   * Send not found error response
   * @param {object} res - Express response object
   * @param {string} resource - Resource that was not found
   */
  sendNotFound(res, resource = 'Resource') {
    return this.sendError(res, `${resource} not found`, 404);
  },

  /**
   * Send unauthorized error response
   * @param {object} res - Express response object
   * @param {string} message - Custom message (optional)
   */
  sendUnauthorized(res, message = 'Unauthorized access') {
    return this.sendError(res, message, 401);
  },

  /**
   * Send forbidden error response
   * @param {object} res - Express response object
   * @param {string} message - Custom message (optional)
   */
  sendForbidden(res, message = 'Forbidden access') {
    return this.sendError(res, message, 403);
  },

  /**
   * Send internal server error response
   * @param {object} res - Express response object
   * @param {string} message - Error message (optional)
   * @param {Error} error - Original error object (for logging)
   */
  sendInternalError(res, message = 'Internal server error', error = null) {
    // Log the error for debugging (in production, use proper logging)
    if (error && process.env.NODE_ENV === 'development') {
      console.error('Internal Server Error:', error);
    }

    return this.sendError(res, message, 500);
  },

  /**
   * Send paginated data response
   * @param {object} res - Express response object
   * @param {Array} data - Array of data items
   * @param {object} pagination - Pagination info
   * @param {string} message - Success message (optional)
   */
  sendPaginatedData(res, data, pagination, message = 'Data retrieved successfully') {
    const response = {
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 0,
        limit: pagination.limit || 10,
        total: pagination.total || data.length,
        totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / (pagination.limit || 10)),
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      },
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(response);
  },

  /**
   * Send file upload success response
   * @param {object} res - Express response object
   * @param {string} filename - Uploaded filename
   * @param {number} size - File size in bytes
   * @param {any} processedData - Processed file data (optional)
   */
  sendFileUploadSuccess(res, filename, size, processedData = null) {
    const response = {
      success: true,
      message: 'File uploaded successfully',
      file: {
        name: filename,
        size,
        uploadedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      ...(processedData && { data: processedData })
    };

    return res.status(201).json(response);
  },

  /**
   * Handle async route errors
   * @param {Function} fn - Async route handler function
   * @returns {Function} Wrapped function with error handling
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  },

  /**
   * Create Express error handling middleware
   * @returns {Function} Error handling middleware
   */
  createErrorHandler() {
    return (error, req, res, next) => {
      // Log error for debugging
      console.error('Express Error Handler:', error);

      // Handle specific error types
      if (error.name === 'ValidationError') {
        return this.sendValidationError(res, error.message);
      }

      if (error.name === 'UnauthorizedError' || error.status === 401) {
        return this.sendUnauthorized(res);
      }

      if (error.name === 'ForbiddenError' || error.status === 403) {
        return this.sendForbidden(res);
      }

      if (error.status === 404) {
        return this.sendNotFound(res);
      }

      // Default to internal server error
      return this.sendInternalError(res, 
        process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message, 
        error
      );
    };
  },

  /**
   * Create health check response
   * @param {object} res - Express response object
   * @param {object} checks - Health check results
   */
  sendHealthCheck(res, checks = {}) {
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    const response = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks
    };

    return res.status(allHealthy ? 200 : 503).json(response);
  }
};

module.exports = responseHelpers;