/**
 * Utility Functions for Rundown Creator
 * 
 * Common helper functions used throughout the application.
 */

// DOM utility functions
const DOM = {
  // Get element by ID with error handling
  get(id) {
    const element = document.getElementById(id);
    if (!element) {
      debugLog(`Element with ID '${id}' not found`);
    }
    return element;
  },

  // Get elements by selector
  getAll(selector) {
    return document.querySelectorAll(selector);
  },

  // Show element
  show(element) {
    if (typeof element === 'string') {
      element = this.get(element);
    }
    if (element) {
      element.style.display = 'block';
    }
  },

  // Hide element
  hide(element) {
    if (typeof element === 'string') {
      element = this.get(element);
    }
    if (element) {
      element.style.display = 'none';
    }
  },

  // Toggle element visibility
  toggle(element, show) {
    if (typeof element === 'string') {
      element = this.get(element);
    }
    if (element) {
      element.style.display = show ? 'block' : 'none';
    }
  },

  // Add class to element
  addClass(element, className) {
    if (typeof element === 'string') {
      element = this.get(element);
    }
    if (element) {
      element.classList.add(className);
    }
  },

  // Remove class from element
  removeClass(element, className) {
    if (typeof element === 'string') {
      element = this.get(element);
    }
    if (element) {
      element.classList.remove(className);
    }
  },

  // Toggle class on element
  toggleClass(element, className, force) {
    if (typeof element === 'string') {
      element = this.get(element);
    }
    if (element) {
      if (force !== undefined) {
        element.classList.toggle(className, force);
      } else {
        element.classList.toggle(className);
      }
    }
  },

  // Set element text content
  setText(element, text) {
    if (typeof element === 'string') {
      element = this.get(element);
    }
    if (element) {
      element.textContent = text;
    }
  },

  // Set element HTML content
  setHTML(element, html) {
    if (typeof element === 'string') {
      element = this.get(element);
    }
    if (element) {
      element.innerHTML = html;
    }
  },

  // Create element with attributes
  create(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.keys(attributes).forEach(key => {
      if (key === 'className') {
        element.className = attributes[key];
      } else if (key === 'innerHTML') {
        element.innerHTML = attributes[key];
      } else {
        element.setAttribute(key, attributes[key]);
      }
    });
    
    if (content) {
      element.textContent = content;
    }
    
    return element;
  }
};

// Date and time utilities
const DateUtils = {
  // Format date for display
  formatDate(date, options = {}) {
    if (!date) return '';
    
    const d = new Date(date);
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    return d.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  },

  // Format date and time
  formatDateTime(date, options = {}) {
    if (!date) return '';
    
    const d = new Date(date);
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return d.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  },

  // Get relative time (e.g., "2 hours ago")
  getRelativeTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return this.formatDate(date);
  },

  // Check if date is today
  isToday(date) {
    if (!date) return false;
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }
};

// String utilities
const StringUtils = {
  // Truncate string with ellipsis
  truncate(str, length = 100, suffix = '...') {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },

  // Capitalize first letter
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  // Convert to title case
  toTitleCase(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, txt => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  // Generate slug from string
  slugify(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  // Escape HTML
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Check if string is empty or whitespace
  isEmpty(str) {
    return !str || str.trim().length === 0;
  }
};

// Number utilities
const NumberUtils = {
  // Format number with commas
  formatNumber(num) {
    if (num === null || num === undefined) return '';
    return num.toLocaleString();
  },

  // Format duration in minutes to readable format
  formatMinutes(minutes) {
    if (!minutes || minutes === 0) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins} min`;
    }
  },

  // Parse number from string
  parseNumber(str) {
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  },

  // Clamp number between min and max
  clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }
};

// Array utilities
const ArrayUtils = {
  // Group array by key
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  },

  // Sort array by multiple keys
  sortBy(array, ...keys) {
    return array.sort((a, b) => {
      for (const key of keys) {
        const aVal = key.startsWith('-') ? a[key.slice(1)] : a[key];
        const bVal = key.startsWith('-') ? b[key.slice(1)] : b[key];
        const modifier = key.startsWith('-') ? -1 : 1;
        
        if (aVal < bVal) return -1 * modifier;
        if (aVal > bVal) return 1 * modifier;
      }
      return 0;
    });
  },

  // Remove duplicates from array
  unique(array, key) {
    if (key) {
      const seen = new Set();
      return array.filter(item => {
        const val = item[key];
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
      });
    }
    return [...new Set(array)];
  },

  // Chunk array into smaller arrays
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
};

// Validation utilities
const Validator = {
  // Validate email
  isEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  // Validate required field
  isRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
  },

  // Validate string length
  hasLength(str, min, max) {
    if (!str) return false;
    const len = str.length;
    if (min && len < min) return false;
    if (max && len > max) return false;
    return true;
  },

  // Validate number range
  inRange(num, min, max) {
    if (min && num < min) return false;
    if (max && num > max) return false;
    return true;
  },

  // Validate URL
  isUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

// Debounce function
function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

// Throttle function
function throttle(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    if (!timeout) {
      func.apply(this, args);
      timeout = setTimeout(() => {
        timeout = null;
      }, wait);
    }
  };
}

// Deep clone object
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
}

// Generate random ID
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Local storage helpers with error handling
const Storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
      return false;
    }
  },

  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
};

// Export utilities for global use
window.DOM = DOM;
window.DateUtils = DateUtils;
window.StringUtils = StringUtils;
window.NumberUtils = NumberUtils;
window.ArrayUtils = ArrayUtils;
window.Validator = Validator;
window.debounce = debounce;
window.throttle = throttle;
window.deepClone = deepClone;
window.generateId = generateId;
window.Storage = Storage;