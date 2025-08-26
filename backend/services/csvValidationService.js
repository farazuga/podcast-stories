/**
 * CSV Validation Service
 * Centralized validation functions for CSV import
 * Extends and uses existing validationHelpers
 */

const validationHelpers = require('../utils/validationHelpers');

class CSVValidationService {
  
  /**
   * Validate uploaded CSV file
   * @param {Object} file - Multer file object
   * @returns {Object} Validation result
   */
  validateUploadedFile(file) {
    // Use existing file validation from validationHelpers
    const fileValidation = validationHelpers.validateFileUpload(
      file, 
      ['text/csv', 'application/csv', 'text/plain'], // Allow common CSV MIME types
      10 * 1024 * 1024 // 10MB limit
    );

    if (!fileValidation.isValid) {
      return fileValidation;
    }

    // Additional CSV-specific validations
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      return {
        isValid: false,
        message: 'File must have .csv extension'
      };
    }

    return { isValid: true, message: 'File is valid for CSV import' };
  }

  /**
   * Validate CSV content structure
   * @param {Array} parsedData - Parsed CSV rows
   * @returns {Object} Validation result
   */
  validateCSVStructure(parsedData) {
    if (!parsedData || !Array.isArray(parsedData)) {
      return {
        isValid: false,
        message: 'Invalid CSV data structure'
      };
    }

    if (parsedData.length === 0) {
      return {
        isValid: false,
        message: 'CSV file is empty'
      };
    }

    if (parsedData.length > 1000) {
      return {
        isValid: false,
        message: 'CSV file cannot contain more than 1000 rows'
      };
    }

    // Check if at least one row has a title field
    const hasValidRows = parsedData.some(row => 
      (row.idea_title && row.idea_title.trim()) || 
      (row.title && row.title.trim())
    );

    if (!hasValidRows) {
      return {
        isValid: false,
        message: 'CSV must contain at least one row with an idea_title or title field'
      };
    }

    return {
      isValid: true,
      message: `CSV structure is valid with ${parsedData.length} rows`,
      rowCount: parsedData.length
    };
  }

  /**
   * Validate individual CSV row
   * @param {Object} row - CSV row data
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Object} Validation result with warnings
   */
  validateCSVRow(row, rowNumber) {
    const errors = [];
    const warnings = [];

    // Check required title field
    const title = row.idea_title || row.title;
    if (!title || !title.trim()) {
      errors.push(`Row ${rowNumber}: Story title is required (idea_title or title field)`);
    } else {
      // Validate title length
      const titleValidation = validationHelpers.validateTextLength(title.trim(), 1, 200);
      if (!titleValidation.isValid) {
        errors.push(`Row ${rowNumber}: Title - ${titleValidation.message}`);
      }
    }

    // Validate description if present
    const description = row.idea_description || row.enhanced_description || row.description;
    if (description && description.trim()) {
      const descValidation = validationHelpers.validateTextLength(description.trim(), 0, 2000);
      if (!descValidation.isValid) {
        errors.push(`Row ${rowNumber}: Description - ${descValidation.message}`);
      }
    }

    // Validate question fields
    for (let i = 1; i <= 6; i++) {
      const question = row[`question_${i}`];
      if (question && question.trim()) {
        const questionValidation = validationHelpers.validateTextLength(question.trim(), 0, 500);
        if (!questionValidation.isValid) {
          errors.push(`Row ${rowNumber}: Question ${i} - ${questionValidation.message}`);
        }
      }
    }

    // Check date formats and warn about potential issues
    const startDate = row.coverage_start_date || row.start_date;
    const endDate = row.coverage_end_date || row.end_date;

    if (startDate && startDate.trim() && !this.isValidDateFormat(startDate.trim())) {
      warnings.push(`Row ${rowNumber}: Start date "${startDate}" may not parse correctly. Recommended format: YYYY-MM-DD`);
    }

    if (endDate && endDate.trim() && !this.isValidDateFormat(endDate.trim())) {
      warnings.push(`Row ${rowNumber}: End date "${endDate}" may not parse correctly. Recommended format: YYYY-MM-DD`);
    }

    // Validate tags format
    const tags = row.tags || row.auto_tags || row.tag;
    if (tags && tags.trim()) {
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
      if (tagList.length > 10) {
        warnings.push(`Row ${rowNumber}: Too many tags (${tagList.length}). Maximum recommended: 10`);
      }
      
      // Check individual tag lengths
      tagList.forEach((tag, index) => {
        if (tag.length > 50) {
          warnings.push(`Row ${rowNumber}: Tag "${tag}" is too long. Maximum: 50 characters`);
        }
      });
    }

    // Validate interviewees
    const interviewees = row.interviewees || row.people_to_interview;
    if (interviewees && interviewees.trim()) {
      const intervieweeList = interviewees.split(',').map(p => p.trim()).filter(p => p);
      if (intervieweeList.length > 15) {
        warnings.push(`Row ${rowNumber}: Too many interviewees (${intervieweeList.length}). Maximum recommended: 15`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      title: title || 'Unknown'
    };
  }

  /**
   * Validate batch of CSV rows
   * @param {Array} parsedData - Array of CSV rows
   * @returns {Object} Batch validation results
   */
  validateCSVBatch(parsedData) {
    const structureValidation = this.validateCSVStructure(parsedData);
    if (!structureValidation.isValid) {
      return structureValidation;
    }

    const allErrors = [];
    const allWarnings = [];
    let validRowCount = 0;

    parsedData.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because CSV row 1 is header, and we're 0-indexed
      const rowValidation = this.validateCSVRow(row, rowNumber);
      
      if (rowValidation.isValid) {
        validRowCount++;
      }
      
      if (rowValidation.errors.length > 0) {
        allErrors.push(...rowValidation.errors);
      }
      
      if (rowValidation.warnings.length > 0) {
        allWarnings.push(...rowValidation.warnings);
      }
    });

    return {
      isValid: allErrors.length === 0,
      totalRows: parsedData.length,
      validRows: validRowCount,
      errors: allErrors,
      warnings: allWarnings,
      canProceed: validRowCount > 0, // Can proceed if at least some rows are valid
      message: allErrors.length === 0 
        ? `All ${parsedData.length} rows are valid` 
        : `${allErrors.length} validation errors found across ${parsedData.length} rows`
    };
  }

  /**
   * Validate user permissions for CSV import
   * @param {Object} user - User object
   * @returns {Object} Permission validation result
   */
  validateImportPermissions(user) {
    if (!user) {
      return {
        isValid: false,
        message: 'User authentication required'
      };
    }

    // Check if user role is valid
    if (!validationHelpers.isValidRole(user.role)) {
      return {
        isValid: false,
        message: 'Invalid user role'
      };
    }

    // CSV import is restricted to admin users only (based on analysis)
    if (user.role !== 'amitrace_admin') {
      return {
        isValid: false,
        message: 'CSV import is restricted to admin users only'
      };
    }

    return {
      isValid: true,
      message: 'User has permission to import CSV files'
    };
  }

  /**
   * Check if date string is in a recognizable format
   * @param {string} dateStr - Date string to check
   * @returns {boolean} True if likely to be parseable
   */
  isValidDateFormat(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;

    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{4}-\d{1,2}-\d{1,2}$/, // YYYY-M-D
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{1,2}\/\d{1,2}\/\d{2}$/, // MM/DD/YY
      /^\d{1,2}-[A-Za-z]{3}$/, // DD-MMM
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/ // ISO format
    ];

    return datePatterns.some(pattern => pattern.test(dateStr.trim()));
  }

  /**
   * Generate CSV template/sample data for downloads
   * @returns {Object} Template data structure
   */
  generateCSVTemplate() {
    return {
      headers: [
        'idea_title',
        'idea_description', 
        'question_1',
        'question_2',
        'question_3',
        'question_4',
        'question_5',
        'question_6',
        'coverage_start_date',
        'coverage_end_date',
        'tags',
        'interviewees'
      ],
      sampleRows: [
        [
          'Local Environmental Impact',
          'Investigating pollution effects on local wildlife',
          'What pollution sources affect our area?',
          'How has wildlife been impacted?',
          'What cleanup efforts are underway?',
          'How can residents help?',
          'What policies need changing?',
          'What is the long-term outlook?',
          '2024-01-15',
          '2024-03-15',
          'environment,pollution,wildlife',
          'Environmental Scientist,Local Mayor'
        ],
        [
          'School Lunch Program Innovation',
          'How schools are improving nutrition and sustainability',
          'What changes were made to the program?',
          'How do students respond to new options?',
          'What are the nutritional benefits?',
          'How is food sourcing different?',
          'What challenges were faced?',
          'What are the cost implications?',
          '2024-02-01',
          '2024-04-01',
          'education,nutrition,sustainability',
          'School Nutritionist,Principal,Student Representative'
        ]
      ],
      requiredFields: ['idea_title'],
      optionalFields: [
        'idea_description', 'question_1', 'question_2', 'question_3', 
        'question_4', 'question_5', 'question_6', 'coverage_start_date', 
        'coverage_end_date', 'tags', 'interviewees'
      ]
    };
  }

  /**
   * Create standardized CSV validation error response
   * @param {Array} errors - Array of error messages
   * @param {Array} warnings - Array of warning messages
   * @returns {Object} Formatted error response
   */
  createValidationErrorResponse(errors, warnings = []) {
    return {
      error: 'CSV validation failed',
      validation_errors: errors,
      validation_warnings: warnings,
      total_errors: errors.length,
      total_warnings: warnings.length,
      suggestions: [
        'Check that required fields (idea_title) are present',
        'Ensure dates are in YYYY-MM-DD format',
        'Verify text fields don\'t exceed maximum lengths',
        'Use comma-separated values for tags and interviewees'
      ]
    };
  }
}

module.exports = new CSVValidationService();