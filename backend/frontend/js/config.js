/**
 * Frontend Configuration
 * Centralized configuration for client-side JavaScript
 */

// Configuration object
window.AppConfig = {
  // API Configuration
  API_URL: 'https://podcast-stories-production.up.railway.app/api',
  
  // Application Settings
  APP_NAME: 'VidPOD',
  APP_DESCRIPTION: 'Story Ideas Database',
  VERSION: '2.1.0',
  
  // UI Settings
  PAGINATION: {
    STORIES_PER_PAGE: 12,
    DEFAULT_PAGE: 0
  },
  
  // Authentication
  TOKEN_KEY: 'token',
  USER_KEY: 'user',
  
  // User Roles
  ROLES: {
    ADMIN: 'amitrace_admin',
    TEACHER: 'teacher',
    STUDENT: 'student'
  },
  
  // Notification Settings
  NOTIFICATIONS: {
    SUCCESS_DURATION: 3000,
    ERROR_DURATION: 5000,
    INFO_DURATION: 3000
  },
  
  // File Upload
  CSV_UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['text/csv']
  },
  
  // Development settings
  DEBUG: false,
  
  // Initialize configuration
  init: function() {
    // Set API_URL based on current location for development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      this.API_URL = `http://${window.location.hostname}:3000/api`;
      this.DEBUG = true;
    }
    
    // Log configuration in development
    if (this.DEBUG) {
      console.log('AppConfig initialized:', this);
    }
    
    return this;
  }
};

// Initialize configuration
window.AppConfig.init();

// For backward compatibility, set the old API_URL variable
// This will be removed in later refactoring phases
window.API_URL = window.AppConfig.API_URL;