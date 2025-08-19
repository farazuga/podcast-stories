/**
 * Date Helper Utilities
 * Centralized date formatting and manipulation functions
 */

const dateHelpers = {
  /**
   * Format date for display in UI
   * @param {string|Date} dateString - Date to format
   * @returns {string} Formatted date string
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  },

  /**
   * Format date for CSV export (YYYY-MM-DD)
   * @param {string|Date} dateString - Date to format
   * @returns {string} CSV-formatted date string
   */
  formatDateForCSV(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (error) {
      return '';
    }
  },

  /**
   * Format date and time for detailed display
   * @param {string|Date} dateString - Date to format
   * @returns {string} Formatted date and time string
   */
  formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  },

  /**
   * Get current timestamp in ISO format
   * @returns {string} ISO timestamp string
   */
  getCurrentTimestamp() {
    return new Date().toISOString();
  },

  /**
   * Get current date for file naming (YYYY-MM-DD)
   * @returns {string} Date string for file names
   */
  getCurrentDateForFilename() {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Check if a date is valid
   * @param {string|Date} dateString - Date to validate
   * @returns {boolean} True if valid date
   */
  isValidDate(dateString) {
    if (!dateString) return false;
    
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch (error) {
      return false;
    }
  },

  /**
   * Calculate days between two dates
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date
   * @returns {number} Number of days between dates
   */
  daysBetween(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      
      const timeDifference = end.getTime() - start.getTime();
      return Math.ceil(timeDifference / (1000 * 3600 * 24));
    } catch (error) {
      return 0;
    }
  },

  /**
   * Format relative time (e.g., "2 days ago")
   * @param {string|Date} dateString - Date to format
   * @returns {string} Relative time string
   */
  formatRelativeTime(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
      if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
      
      return `${Math.floor(diffInSeconds / 31536000)} years ago`;
    } catch (error) {
      return 'Unknown';
    }
  }
};

// For Node.js module exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = dateHelpers;
}

// For browser global access
if (typeof window !== 'undefined') {
  window.DateHelpers = dateHelpers;
}