/**
 * CSV Parser Service
 * Utilities for parsing CSV data and dates
 * Extracted from routes/stories.js parseFlexibleDate function
 */

class CSVParserService {

  /**
   * Parse various date formats with flexible input handling
   * Extracted and enhanced from original parseFlexibleDate function
   * @param {string} dateStr - Date string to parse
   * @returns {string|null} Parsed date in YYYY-MM-DD format or null if unparseable
   */
  parseFlexibleDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;
    
    const cleaned = dateStr.trim();
    
    // Handle formats like "1-Jan", "2-Feb", etc.
    const monthMap = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    // Pattern: "1-Jan", "15-Dec", etc.
    const dayMonthPattern = /^(\d{1,2})-([A-Za-z]{3})$/;
    const match = cleaned.match(dayMonthPattern);
    
    if (match) {
      let day = parseInt(match[1]);
      const monthName = match[2];
      const monthNum = monthMap[monthName];
      
      if (monthNum) {
        // Default to current year for month/day only dates
        const currentYear = new Date().getFullYear();
        
        // Handle leap day for non-leap years
        if (monthNum === '02' && day === 29) {
          const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
          if (!isLeapYear) {
            day = 28; // Adjust Feb 29 to Feb 28 for non-leap years
          }
        }
        
        const paddedDay = day.toString().padStart(2, '0');
        return `${currentYear}-${monthNum}-${paddedDay}`;
      }
    }
    
    // Handle MM/DD/YY format (e.g., "1/1/25")
    const shortDatePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
    const shortMatch = cleaned.match(shortDatePattern);
    
    if (shortMatch) {
      const month = shortMatch[1].padStart(2, '0');
      const day = shortMatch[2].padStart(2, '0');
      let year = parseInt(shortMatch[3]);
      
      // Convert 2-digit year to 4-digit (assuming 20xx for now)
      if (year < 50) {
        year = 2000 + year;
      } else {
        year = 1900 + year;
      }
      
      return `${year}-${month}-${day}`;
    }

    // Handle MM/DD/YYYY format (e.g., "1/1/2025")
    const longDatePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const longMatch = cleaned.match(longDatePattern);
    
    if (longMatch) {
      const month = longMatch[1].padStart(2, '0');
      const day = longMatch[2].padStart(2, '0');
      const year = longMatch[3];
      
      return `${year}-${month}-${day}`;
    }

    // Handle DD/MM/YYYY format (European)
    const europeanDatePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const europeanMatch = cleaned.match(europeanDatePattern);
    
    if (europeanMatch && this.isLikelyEuropeanDate(cleaned)) {
      const day = europeanMatch[1].padStart(2, '0');
      const month = europeanMatch[2].padStart(2, '0');
      const year = europeanMatch[3];
      
      return `${year}-${month}-${day}`;
    }

    // Handle YYYY-MM-DD format (already correct)
    const isoDatePattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const isoMatch = cleaned.match(isoDatePattern);
    
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    }
    
    // Try standard date parsing for other formats (timezone-safe)
    const parsedDate = new Date(cleaned);
    if (!isNaN(parsedDate.getTime())) {
      // Use local date components instead of UTC to avoid timezone offset bug
      const year = parsedDate.getFullYear();
      const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = parsedDate.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return null; // Return null for unparseable dates
  }

  /**
   * Determine if a date string is likely in European (DD/MM/YYYY) format
   * @param {string} dateStr - Date string to analyze
   * @returns {boolean} True if likely European format
   */
  isLikelyEuropeanDate(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    
    // If first number > 12, it's likely day (European format)
    if (first > 12) return true;
    
    // If second number > 12, it's likely NOT European format
    if (second > 12) return false;
    
    // Default to American format if ambiguous
    return false;
  }

  /**
   * Parse CSV field mappings and normalize column names
   * @param {Object} rawRow - Raw CSV row data
   * @returns {Object} Normalized row data with consistent field names
   */
  normalizeCSVRow(rawRow) {
    const normalized = {};
    
    // Title field mappings
    const titleFields = ['idea_title', 'title', 'story_title', 'name'];
    const titleValue = this.getFirstAvailableField(rawRow, titleFields);
    if (titleValue) normalized.idea_title = titleValue;
    
    // Description field mappings
    const descFields = ['idea_description', 'description', 'enhanced_description', 'summary'];
    const descValue = this.getFirstAvailableField(rawRow, descFields);
    if (descValue) normalized.idea_description = descValue;
    
    // Date field mappings
    const startDateFields = ['coverage_start_date', 'start_date', 'date_start', 'begin_date'];
    const startDateValue = this.getFirstAvailableField(rawRow, startDateFields);
    if (startDateValue) normalized.coverage_start_date = startDateValue;
    
    const endDateFields = ['coverage_end_date', 'end_date', 'date_end', 'finish_date'];
    const endDateValue = this.getFirstAvailableField(rawRow, endDateFields);
    if (endDateValue) normalized.coverage_end_date = endDateValue;
    
    // Question field mappings (preserve existing)
    for (let i = 1; i <= 6; i++) {
      const questionFields = [`question_${i}`, `q${i}`, `question${i}`];
      const questionValue = this.getFirstAvailableField(rawRow, questionFields);
      if (questionValue) normalized[`question_${i}`] = questionValue;
    }
    
    // Tags field mappings
    const tagFields = ['tags', 'auto_tags', 'tag', 'categories', 'keywords'];
    const tagValue = this.getFirstAvailableField(rawRow, tagFields);
    if (tagValue) normalized.tags = tagValue;
    
    // Interviewees field mappings
    const intervieweeFields = ['interviewees', 'people_to_interview', 'contacts', 'sources'];
    const intervieweeValue = this.getFirstAvailableField(rawRow, intervieweeFields);
    if (intervieweeValue) normalized.interviewees = intervieweeValue;
    
    // Add any numbered interviewee fields
    Object.keys(rawRow).forEach(key => {
      if (key.match(/^interviewees?\s*\d+$/i) && rawRow[key] && rawRow[key].trim()) {
        if (!normalized.additional_interviewees) normalized.additional_interviewees = [];
        normalized.additional_interviewees.push(rawRow[key].trim());
      }
    });
    
    return normalized;
  }

  /**
   * Get the first available non-empty field from a list
   * @param {Object} row - CSV row data
   * @param {Array} fields - Array of field names to check
   * @returns {string|null} First non-empty value found
   */
  getFirstAvailableField(row, fields) {
    for (const field of fields) {
      if (row[field] && row[field].trim()) {
        return row[field].trim();
      }
    }
    return null;
  }

  /**
   * Clean and sanitize CSV field value
   * @param {string} value - Raw field value
   * @returns {string} Cleaned value
   */
  sanitizeCSVField(value) {
    if (!value || typeof value !== 'string') return '';
    
    return value
      .trim()
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove BOM characters
      .replace(/^\uFEFF/, '')
      // Handle common CSV escape sequences
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
  }

  /**
   * Parse comma-separated values (tags, interviewees)
   * @param {string} csvValue - Comma-separated string
   * @returns {Array} Array of cleaned values
   */
  parseCommaSeparatedValues(csvValue) {
    if (!csvValue || typeof csvValue !== 'string') return [];
    
    return csvValue
      .split(',')
      .map(item => this.sanitizeCSVField(item))
      .filter(item => item.length > 0);
  }

  /**
   * Validate and clean date string before parsing
   * @param {string} dateStr - Date string to validate
   * @returns {string|null} Cleaned date string or null if invalid
   */
  preprocessDateString(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    const cleaned = dateStr.trim();
    
    // Remove common invalid characters
    const invalidChars = ['#', '$', '%', '&', '*'];
    if (invalidChars.some(char => cleaned.includes(char))) {
      return null;
    }
    
    // Check minimum length
    if (cleaned.length < 3) return null;
    
    // Check maximum reasonable length
    if (cleaned.length > 20) return null;
    
    return cleaned;
  }

  /**
   * Generate helpful date parsing error message
   * @param {string} originalDate - Original unparseable date string
   * @returns {string} Helpful error message
   */
  getDateParsingErrorMessage(originalDate) {
    if (!originalDate) return 'Date field is empty';
    
    return `Could not parse date "${originalDate}". Supported formats: YYYY-MM-DD, MM/DD/YYYY, DD-MMM (e.g., 1-Jan)`;
  }

  /**
   * Extract year from various date formats for validation
   * @param {string} dateStr - Date string
   * @returns {number|null} Extracted year or null if not found
   */
  extractYear(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    const yearPatterns = [
      /(\d{4})/, // Find 4-digit year anywhere in string
      /\/(\d{2})$/ // 2-digit year at end after slash
    ];
    
    for (const pattern of yearPatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        let year = parseInt(match[1]);
        
        // Convert 2-digit year to 4-digit if needed
        if (year < 100) {
          if (year < 50) {
            year += 2000;
          } else {
            year += 1900;
          }
        }
        
        // Validate year range
        const currentYear = new Date().getFullYear();
        if (year >= 1900 && year <= currentYear + 10) {
          return year;
        }
      }
    }
    
    return null;
  }

  /**
   * Create detailed parsing report for debugging
   * @param {string} dateStr - Original date string
   * @param {string|null} parsedDate - Parsed result
   * @returns {Object} Parsing report
   */
  createDateParsingReport(dateStr, parsedDate) {
    return {
      original: dateStr,
      parsed: parsedDate,
      success: parsedDate !== null,
      detectedYear: this.extractYear(dateStr),
      possibleFormats: this.detectPossibleDateFormats(dateStr),
      recommendations: parsedDate === null ? this.getDateFormatRecommendations(dateStr) : []
    };
  }

  /**
   * Detect possible date formats in string
   * @param {string} dateStr - Date string to analyze
   * @returns {Array} Array of detected possible formats
   */
  detectPossibleDateFormats(dateStr) {
    if (!dateStr) return [];
    
    const formats = [];
    
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(dateStr)) formats.push('ISO (YYYY-MM-DD)');
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) formats.push('American (MM/DD/YYYY)');
    if (/^\d{1,2}\/\d{1,2}\/\d{2}/.test(dateStr)) formats.push('Short American (MM/DD/YY)');
    if (/^\d{1,2}-[A-Za-z]{3}/.test(dateStr)) formats.push('Day-Month (DD-MMM)');
    if (/T\d{2}:\d{2}:\d{2}/.test(dateStr)) formats.push('ISO with time');
    
    return formats;
  }

  /**
   * Get recommendations for fixing unparseable dates
   * @param {string} dateStr - Unparseable date string
   * @returns {Array} Array of recommendation strings
   */
  getDateFormatRecommendations(dateStr) {
    const recommendations = [];
    
    if (!dateStr) {
      recommendations.push('Provide a date value');
      return recommendations;
    }
    
    recommendations.push('Use YYYY-MM-DD format (e.g., 2024-01-15)');
    recommendations.push('Check for typos in month/day values');
    
    if (dateStr.includes('/')) {
      recommendations.push('Ensure MM/DD/YYYY format for slash-separated dates');
    }
    
    if (dateStr.includes('-') && dateStr.length < 8) {
      recommendations.push('Use full year (YYYY) instead of 2-digit year');
    }
    
    return recommendations;
  }
}

module.exports = new CSVParserService();