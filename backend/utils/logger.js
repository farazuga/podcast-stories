/**
 * Structured Logging Utility
 * Provides consistent logging with PII masking and environment-aware configuration
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Mask sensitive information in strings
 * @param {string} str - String to mask
 * @param {string} type - Type of data to mask (email, password, etc.)
 * @returns {string} Masked string
 */
function maskSensitiveData(str, type = 'generic') {
  if (!str || typeof str !== 'string') return str;
  
  switch (type) {
    case 'email':
      // Show first 2 chars and domain
      const emailParts = str.split('@');
      if (emailParts.length === 2) {
        const localPart = emailParts[0];
        const domain = emailParts[1];
        const masked = localPart.substring(0, 2) + '***';
        return `${masked}@${domain}`;
      }
      return '***@***.***';
    
    case 'password':
      return '********';
    
    case 'token':
      // Show first and last 4 chars
      if (str.length > 8) {
        return str.substring(0, 4) + '...' + str.substring(str.length - 4);
      }
      return '********';
    
    default:
      // Generic masking - show first 3 chars
      if (str.length > 3) {
        return str.substring(0, 3) + '***';
      }
      return '***';
  }
}

/**
 * Format log entry as structured data
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} data - Additional data
 * @returns {object} Structured log entry
 */
function formatLogEntry(level, message, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV || 'development',
    ...data
  };
}

/**
 * Logger class with structured logging and PII protection
 */
class Logger {
  constructor(options = {}) {
    this.component = options.component || 'app';
    this.maskPII = options.maskPII !== false; // Default to true
  }

  /**
   * Log info level message
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  info(message, data = {}) {
    const logEntry = formatLogEntry('info', message, {
      component: this.component,
      ...this.sanitizeData(data)
    });
    
    if (isProduction) {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, data);
    }
  }

  /**
   * Log warning level message
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  warn(message, data = {}) {
    const logEntry = formatLogEntry('warn', message, {
      component: this.component,
      ...this.sanitizeData(data)
    });
    
    if (isProduction) {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.warn(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, data);
    }
  }

  /**
   * Log error level message
   * @param {string} message - Log message
   * @param {Error|object} error - Error object or additional data
   */
  error(message, error = {}) {
    const errorData = error instanceof Error ? {
      error_message: error.message,
      error_stack: isProduction ? undefined : error.stack,
      error_code: error.code
    } : error;
    
    const logEntry = formatLogEntry('error', message, {
      component: this.component,
      ...this.sanitizeData(errorData)
    });
    
    if (isProduction) {
      console.error(JSON.stringify(logEntry));
    } else {
      console.error(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, error);
    }
  }

  /**
   * Log debug level message (only in development)
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  debug(message, data = {}) {
    if (isProduction) return; // Skip debug logs in production
    
    const logEntry = formatLogEntry('debug', message, {
      component: this.component,
      ...this.sanitizeData(data)
    });
    
    console.log(`[${logEntry.level.toUpperCase()}] ${logEntry.message}`, data);
  }

  /**
   * Sanitize data to mask PII
   * @param {object} data - Data to sanitize
   * @returns {object} Sanitized data
   */
  sanitizeData(data) {
    if (!this.maskPII || !data || typeof data !== 'object') {
      return data;
    }

    const sanitized = {};
    const sensitiveFields = [
      'email', 'password', 'token', 'authorization',
      'api_key', 'secret', 'credit_card', 'ssn'
    ];

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Check if field name suggests sensitive data
      const isSensitive = sensitiveFields.some(field => 
        lowerKey.includes(field)
      );

      if (isSensitive && typeof value === 'string') {
        // Determine masking type based on field name
        let maskType = 'generic';
        if (lowerKey.includes('email')) maskType = 'email';
        else if (lowerKey.includes('password')) maskType = 'password';
        else if (lowerKey.includes('token') || lowerKey.includes('key')) maskType = 'token';
        
        sanitized[key] = maskSensitiveData(value, maskType);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Create a child logger with additional context
   * @param {string} component - Component name
   * @returns {Logger} New logger instance
   */
  child(component) {
    return new Logger({
      component: `${this.component}:${component}`,
      maskPII: this.maskPII
    });
  }
}

/**
 * Create a logger instance
 * @param {string} component - Component name
 * @returns {Logger} Logger instance
 */
function createLogger(component = 'app') {
  return new Logger({ component });
}

// Default logger instance
const defaultLogger = createLogger();

module.exports = {
  Logger,
  createLogger,
  maskSensitiveData,
  logger: defaultLogger
};