/**
 * Date Utilities - Timezone-Safe Date Formatting
 * Prevents the one-day offset issue when displaying dates
 */

/**
 * Format a date string for display without timezone conversion
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
function formatDateSafe(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  
  // Parse the date components directly instead of using new Date()
  // This avoids timezone conversion issues
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr; // Return as-is if not in expected format
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  
  // Validate the parts
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
  if (year < 1900 || year > 2100) return dateStr;
  if (month < 1 || month > 12) return dateStr;
  if (day < 1 || day > 31) return dateStr;
  
  // Format as MM/DD/YYYY (US format)
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  
  return `${monthStr}/${dayStr}/${year}`;
}

/**
 * Format a date string with custom options without timezone conversion
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
function formatDateSafeWithOptions(dateStr, options = {}) {
  if (!dateStr || dateStr.trim() === '') return '';
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const shortMonthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  if (options.month === 'long') {
    return `${monthNames[month - 1]} ${day}, ${year}`;
  } else if (options.month === 'short') {
    return `${shortMonthNames[month - 1]} ${day}, ${year}`;
  } else {
    // Default MM/DD/YYYY format
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${monthStr}/${dayStr}/${year}`;
  }
}

/**
 * Check if a date string is valid
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid
 */
function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return false;
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  return true;
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.formatDateSafe = formatDateSafe;
  window.formatDateSafeWithOptions = formatDateSafeWithOptions;
  window.isValidDateString = isValidDateString;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatDateSafe,
    formatDateSafeWithOptions,
    isValidDateString
  };
}