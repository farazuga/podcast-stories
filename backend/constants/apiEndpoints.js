/**
 * API Endpoints Constants
 * Centralized API endpoint definitions for client-side usage
 */

const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY: '/auth/verify'
  },

  // Story management endpoints
  STORIES: {
    BASE: '/stories',
    BY_ID: (id) => `/stories/${id}`,
    IMPORT_CSV: '/stories/import',
    ADMIN_BY_STATUS: (status) => `/stories/admin/by-status/${status}`,
    APPROVE: (id) => `/stories/${id}/approve`,
    REJECT: (id) => `/stories/${id}/reject`
  },

  // User favorites endpoints
  FAVORITES: {
    BASE: '/favorites',
    BY_STORY: (storyId) => `/favorites/${storyId}`,
    CHECK: (storyId) => `/favorites/${storyId}/check`,
    POPULAR: '/favorites/popular',
    STATS: '/favorites/stats'
  },

  // Class management endpoints
  CLASSES: {
    BASE: '/classes',
    BY_ID: (id) => `/classes/${id}`,
    JOIN: '/classes/join',
    STUDENTS: (id) => `/classes/${id}/students`,
    ANALYTICS: (id) => `/classes/${id}/analytics`
  },

  // User management endpoints
  USERS: {
    STUDENTS: '/students',
    REGISTER_STUDENT: '/students/register'
  },

  // Teacher request endpoints
  TEACHER_REQUESTS: {
    BASE: '/teacher-requests',
    APPROVE: (id) => `/teacher-requests/${id}/approve`,
    REJECT: (id) => `/teacher-requests/${id}/reject`
  },

  // Admin endpoints
  ADMIN: {
    TEACHERS: '/admin/teachers',
    TOGGLE_TEACHER_STATUS: (id) => `/admin/teachers/${id}/toggle-status`,
    UPDATE_PASSWORDS: '/admin/update-passwords'
  },

  // Content management endpoints
  TAGS: {
    BASE: '/tags'
  },

  SCHOOLS: {
    BASE: '/schools'
  },

  // Analytics endpoints
  ANALYTICS: {
    BASE: '/analytics',
    DASHBOARD: '/analytics/dashboard',
    TRACK: '/analytics/track',
    CLASS: (id) => `/analytics/class/${id}`
  },

  // Password reset endpoints
  PASSWORD_RESET: {
    REQUEST: '/password-reset/request',
    RESET: '/password-reset/reset'
  },

  // System endpoints
  SYSTEM: {
    HEALTH: '/health',
    DEBUG: '/debug',
    TEST: '/test',
    MIGRATION: '/migration'
  }
};

const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
};

const HTTP_STATUS_CODES = {
  // Success codes
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // Client error codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,

  // Server error codes
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

const apiHelpers = {
  /**
   * Build full API URL
   * @param {string} baseUrl - Base API URL
   * @param {string} endpoint - Endpoint path
   * @returns {string} Full API URL
   */
  buildUrl(baseUrl, endpoint) {
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    return `${cleanBaseUrl}/api/${cleanEndpoint}`;
  },

  /**
   * Get endpoint with parameters
   * @param {Function|string} endpoint - Endpoint function or string
   * @param {...any} params - Parameters for endpoint function
   * @returns {string} Endpoint with parameters
   */
  getEndpoint(endpoint, ...params) {
    return typeof endpoint === 'function' ? endpoint(...params) : endpoint;
  },

  /**
   * Create request options with authentication
   * @param {string} method - HTTP method
   * @param {string} token - JWT token
   * @param {any} body - Request body (optional)
   * @returns {object} Fetch options object
   */
  createRequestOptions(method, token = null, body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    return options;
  },

  /**
   * Create FormData request options
   * @param {string} token - JWT token
   * @param {FormData} formData - Form data
   * @returns {object} Fetch options object
   */
  createFormDataOptions(token, formData) {
    const options = {
      method: 'POST',
      headers: {}
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    options.body = formData;
    return options;
  },

  /**
   * Handle API response
   * @param {Response} response - Fetch response
   * @returns {Promise} Parsed response data
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
      }
      
      return data;
    } else {
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.text();
    }
  }
};

module.exports = {
  API_ENDPOINTS,
  HTTP_METHODS,
  HTTP_STATUS_CODES,
  apiHelpers
};