/**
 * VidPOD Rundown Creator Configuration
 * 
 * Centralizes API endpoints and configuration settings
 * for the independent rundown creator application.
 */

// API Configuration
const CONFIG = {
  // Rundown Creator API (this app)
  RUNDOWN_API: window.location.origin + '/api',
  
  // Main VidPOD API (for auth and data integration)
  VIDPOD_API: 'http://localhost:3000/api',
  
  // Frontend URLs
  VIDPOD_FRONTEND: 'http://localhost:3000',
  
  // Application Settings
  APP: {
    name: 'VidPOD Rundown Creator',
    version: '1.0.0',
    maxRundowns: 99,
    autoSaveInterval: 30000, // 30 seconds
    debounceDelay: 500, // 500ms
  },
  
  // Default segment durations (in seconds)
  DEFAULT_DURATIONS: {
    intro: 120,     // 2 minutes
    outro: 60,      // 1 minute
    break: 30,      // 30 seconds
    commercial: 60, // 1 minute
    music: 180,     // 3 minutes
    story: 300,     // 5 minutes
    interview: 600  // 10 minutes
  },
  
  // Segment type configurations
  SEGMENT_TYPES: {
    intro: {
      label: 'Intro',
      icon: '🎙️',
      color: '#f79b5b',
      showGuest: false,
      showStory: false
    },
    story: {
      label: 'Story',
      icon: '📰',
      color: '#10b981',
      showGuest: false,
      showStory: true
    },
    interview: {
      label: 'Interview',
      icon: '🎤',
      color: '#3b82f6',
      showGuest: true,
      showStory: true
    },
    break: {
      label: 'Break',
      icon: '⏸️',
      color: '#6b7280',
      showGuest: false,
      showStory: false
    },
    commercial: {
      label: 'Commercial',
      icon: '📺',
      color: '#8b5cf6',
      showGuest: false,
      showStory: false
    },
    music: {
      label: 'Music',
      icon: '🎵',
      color: '#f59e0b',
      showGuest: false,
      showStory: false
    },
    outro: {
      label: 'Outro',
      icon: '👋',
      color: '#ef4444',
      showGuest: false,
      showStory: false
    }
  },
  
  // Status configurations
  STATUS_CONFIG: {
    draft: {
      label: 'Draft',
      color: '#6b7280',
      icon: '📝',
      description: 'Work in progress'
    },
    submitted: {
      label: 'Submitted',
      color: '#f59e0b',
      icon: '📤',
      description: 'Waiting for teacher review'
    },
    approved: {
      label: 'Approved',
      color: '#10b981',
      icon: '✅',
      description: 'Approved by teacher'
    },
    rejected: {
      label: 'Rejected',
      color: '#ef4444',
      icon: '❌',
      description: 'Needs revision'
    }
  },
  
  // Notification settings
  NOTIFICATIONS: {
    duration: 5000, // 5 seconds
    maxVisible: 3
  },
  
  // Local storage keys
  STORAGE_KEYS: {
    token: 'token',
    user: 'user',
    filters: 'rundown_filters',
    preferences: 'rundown_preferences',
    autosave: 'rundown_autosave'
  },
  
  // Drag and drop settings
  DRAG_DROP: {
    placeholder: '📍 Drop segment here',
    activeClass: 'drag-active',
    overClass: 'drag-over'
  }
};

// Helper function to get full API URL
const getApiUrl = (endpoint) => {
  return `${CONFIG.RUNDOWN_API}${endpoint}`;
};

// Helper function to get VidPOD API URL
const getVidPodApiUrl = (endpoint) => {
  return `${CONFIG.VIDPOD_API}${endpoint}`;
};

// Helper function to format duration
const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

// Helper function to parse duration string to seconds
const parseDuration = (durationString) => {
  if (!durationString) return 0;
  
  const parts = durationString.split(':').map(p => parseInt(p) || 0);
  
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    // SS
    return parts[0];
  }
  
  return 0;
};

// Helper function to get segment type config
const getSegmentTypeConfig = (type) => {
  return CONFIG.SEGMENT_TYPES[type] || CONFIG.SEGMENT_TYPES.story;
};

// Helper function to get status config
const getStatusConfig = (status) => {
  return CONFIG.STATUS_CONFIG[status] || CONFIG.STATUS_CONFIG.draft;
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem(CONFIG.STORAGE_KEYS.token);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Helper function to check if user is authenticated
const isAuthenticated = () => {
  const token = localStorage.getItem(CONFIG.STORAGE_KEYS.token);
  const user = localStorage.getItem(CONFIG.STORAGE_KEYS.user);
  return !!(token && user);
};

// Helper function to get current user
const getCurrentUser = () => {
  try {
    const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.user);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Helper function to check user role
const hasRole = (role) => {
  const user = getCurrentUser();
  return user && user.role === role;
};

// Helper function to handle API errors
const handleApiError = (error, defaultMessage = 'An error occurred') => {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.error || error.response.data?.message || defaultMessage;
    return { success: false, error: message, status: error.response.status };
  } else if (error.request) {
    // Network error
    return { success: false, error: 'Network error. Please check your connection.', status: 0 };
  } else {
    // Other error
    return { success: false, error: error.message || defaultMessage, status: 0 };
  }
};

// Environment detection
const isDevelopment = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

// Debug logging (only in development)
const debugLog = (...args) => {
  if (isDevelopment()) {
    console.log('[Rundown Creator]', ...args);
  }
};

// Export configuration for use in other modules
window.CONFIG = CONFIG;
window.getApiUrl = getApiUrl;
window.getVidPodApiUrl = getVidPodApiUrl;
window.formatDuration = formatDuration;
window.parseDuration = parseDuration;
window.getSegmentTypeConfig = getSegmentTypeConfig;
window.getStatusConfig = getStatusConfig;
window.getAuthHeaders = getAuthHeaders;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.hasRole = hasRole;
window.handleApiError = handleApiError;
window.isDevelopment = isDevelopment;
window.debugLog = debugLog;