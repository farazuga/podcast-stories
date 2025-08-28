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
 * Format a date string for display WITHOUT year (MM/DD format)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string without year (MM/DD)
 */
function formatDateSafeWithoutYear(dateStr) {
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
  
  // Format as MM/DD (US format without year)
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  
  return `${monthStr}/${dayStr}`;
}

/**
 * Format a date for calendar display contexts (includes year info for calendar but can be configured)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {Object} options - Calendar formatting options
 * @returns {Object} Object with formatted date and components
 */
function formatDateForCalendar(dateStr, options = {}) {
  if (!dateStr || dateStr.trim() === '') return { display: '', value: '', year: null, month: null, day: null };
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { display: dateStr, value: dateStr, year: null, month: null, day: null };
  
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  
  // Validate the parts
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return { display: dateStr, value: dateStr, year: null, month: null, day: null };
  }
  if (year < 1900 || year > 2100) {
    return { display: dateStr, value: dateStr, year: null, month: null, day: null };
  }
  if (month < 1 || month > 12) {
    return { display: dateStr, value: dateStr, year: null, month: null, day: null };
  }
  if (day < 1 || day > 31) {
    return { display: dateStr, value: dateStr, year: null, month: null, day: null };
  }
  
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  
  return {
    display: options.showYear === false ? `${monthStr}/${dayStr}` : `${monthStr}/${dayStr}/${year}`,
    displayWithoutYear: `${monthStr}/${dayStr}`,
    displayWithYear: `${monthStr}/${dayStr}/${year}`,
    value: dateStr, // Original YYYY-MM-DD format for form values
    year: year,
    month: month,
    day: day,
    monthStr: monthStr,
    dayStr: dayStr
  };
}

/**
 * Get current year for calendar context
 * @returns {number} Current year
 */
function getCurrentYear() {
  return new Date().getFullYear();
}

/**
 * Convert MM/DD input to full date with current year
 * @param {string} monthDayStr - Date in MM/DD format
 * @returns {string} Full date in YYYY-MM-DD format using current year
 */
function addCurrentYearToDate(monthDayStr) {
  if (!monthDayStr || monthDayStr.trim() === '') return '';
  
  const parts = monthDayStr.split('/');
  if (parts.length !== 2) return monthDayStr;
  
  const month = parseInt(parts[0]);
  const day = parseInt(parts[1]);
  
  if (isNaN(month) || isNaN(day)) return monthDayStr;
  if (month < 1 || month > 12) return monthDayStr;
  if (day < 1 || day > 31) return monthDayStr;
  
  const currentYear = getCurrentYear();
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  
  return `${currentYear}-${monthStr}-${dayStr}`;
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
  window.formatDateSafeWithoutYear = formatDateSafeWithoutYear;
  window.formatDateForCalendar = formatDateForCalendar;
  window.getCurrentYear = getCurrentYear;
  window.addCurrentYearToDate = addCurrentYearToDate;
  window.isValidDateString = isValidDateString;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatDateSafe,
    formatDateSafeWithOptions,
    formatDateSafeWithoutYear,
    formatDateForCalendar,
    getCurrentYear,
    addCurrentYearToDate,
    isValidDateString
  };
}