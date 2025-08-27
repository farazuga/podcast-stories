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
  
  // Environment detection
  getEnvironment: function() {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    } else if (hostname.includes('railway.app')) {
      return 'production';
    } else {
      return 'unknown';
    }
  },
  
  // Initialize configuration
  init: function() {
    const environment = this.getEnvironment();
    
    // Set API_URL based on environment
    if (environment === 'development') {
      this.API_URL = `http://${window.location.hostname}:3000/api`;
      this.DEBUG = true;
    } else if (environment === 'production') {
      this.API_URL = 'https://podcast-stories-production.up.railway.app/api';
      this.DEBUG = false;
    }
    
    // Enhanced logging for debugging teacher requests
    console.log('🔧 AppConfig initialized:', {
      environment: environment,
      apiUrl: this.API_URL,
      debug: this.DEBUG,
      hostname: window.location.hostname,
      timestamp: new Date().toISOString()
    });
    
    return this;
  }
};

// Initialize configuration
window.AppConfig.init();

// For backward compatibility, set the old API_URL variable
// This will be removed in later refactoring phases
window.API_URL = window.AppConfig.API_URL;

// Enhanced debugging for teacher request issues
console.log('🔧 Teacher Request Debug - Config loaded:', {
  API_URL: window.API_URL,
  environment: window.AppConfig.getEnvironment(),
  timestamp: new Date().toISOString()
});