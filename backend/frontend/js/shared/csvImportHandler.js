/**
 * Unified CSV Import Handler
 * Single reusable handler for all CSV import forms across the application
 * Consolidates duplicate code from admin-browse-stories.js, dashboard.js, and stories.js
 */

class CSVImportHandler {
  constructor() {
    this.isUploading = false;
    this.defaultOptions = {
      autoApprove: false,
      showProgressIndicator: true,
      showDetailedResults: true
    };
  }

  /**
   * Initialize CSV import handler for a form
   * @param {string} formId - ID of the CSV form element
   * @param {Object} options - Configuration options
   */
  initialize(formId, options = {}) {
    const form = document.getElementById(formId);
    if (!form) {
      console.error(`CSV Import Handler: Form with ID '${formId}' not found`);
      return;
    }

    this.options = { ...this.defaultOptions, ...options };
    
    form.addEventListener('submit', (e) => this.handleCSVUpload(e, options));
    
    console.log(`CSV Import Handler initialized for form: ${formId}`);
  }

  /**
   * Main CSV upload handler
   * @param {Event} e - Form submit event
   * @param {Object} options - Upload options
   */
  async handleCSVUpload(e, options = {}) {
    e.preventDefault();
    
    if (this.isUploading) {
      this.showError('Upload already in progress. Please wait.');
      return;
    }

    const form = e.target;
    const fileInput = this.getFileInput(form);
    const file = fileInput?.files[0];
    
    // Validate file selection
    const fileValidation = this.validateFileSelection(file);
    if (!fileValidation.isValid) {
      this.showError(fileValidation.message);
      return;
    }

    // Get upload options
    const uploadOptions = this.getUploadOptions(form, options);
    
    // Create form data
    const formData = new FormData();
    formData.append('csv', file); // Backend expects 'csv' field name
    if (uploadOptions.autoApprove) {
      formData.append('autoApprove', 'true');
    }

    try {
      this.setUploadingState(form, true);
      
      if (this.options.showProgressIndicator) {
        this.showProgressIndicator('Uploading CSV file...');
      }

      console.log(`Starting CSV import: ${file.name} (${file.size} bytes)`);
      
      const result = await this.uploadCSVFile(formData);
      
      this.handleUploadSuccess(result, form);
      
    } catch (error) {
      console.error('CSV upload error:', error);
      this.handleUploadError(error, form);
    } finally {
      this.setUploadingState(form, false);
      this.hideProgressIndicator();
    }
  }

  /**
   * Find the file input in the form
   * @param {HTMLFormElement} form - The form element
   * @returns {HTMLInputElement|null} File input element
   */
  getFileInput(form) {
    // Try common file input IDs/names
    const commonIds = ['csvFile', 'csv', 'file', 'csvInput'];
    
    for (const id of commonIds) {
      const input = form.querySelector(`#${id}`) || form.querySelector(`[name="${id}"]`);
      if (input && input.type === 'file') {
        return input;
      }
    }
    
    // Fallback: find first file input
    return form.querySelector('input[type="file"]');
  }

  /**
   * Validate file selection
   * @param {File} file - Selected file
   * @returns {Object} Validation result
   */
  validateFileSelection(file) {
    if (!file) {
      return {
        isValid: false,
        message: 'Please select a CSV file to upload'
      };
    }

    // Check file extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return {
        isValid: false,
        message: 'Please select a valid CSV file (.csv extension required)'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        message: 'File size too large. Maximum allowed size is 10MB'
      };
    }

    // Check if file is not empty
    if (file.size === 0) {
      return {
        isValid: false,
        message: 'Selected file is empty. Please choose a file with data'
      };
    }

    return {
      isValid: true,
      message: 'File is valid for upload'
    };
  }

  /**
   * Get upload options from form and parameters
   * @param {HTMLFormElement} form - The form element
   * @param {Object} options - Additional options
   * @returns {Object} Upload options
   */
  getUploadOptions(form, options) {
    const autoApproveCheckbox = form.querySelector('#autoApprove, [name="autoApprove"]');
    
    return {
      autoApprove: autoApproveCheckbox ? autoApproveCheckbox.checked : (options.autoApprove || false),
      ...options
    };
  }

  /**
   * Upload CSV file to server
   * @param {FormData} formData - Form data with file
   * @returns {Promise<Object>} Upload result
   */
  async uploadCSVFile(formData) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    const response = await fetch(`${window.API_URL}/stories/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log(`CSV upload response: ${response.status} ${response.statusText}`);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Upload failed with status ${response.status}`);
    }

    return result;
  }

  /**
   * Handle successful upload
   * @param {Object} result - Upload result from server
   * @param {HTMLFormElement} form - The form element
   */
  handleUploadSuccess(result, form) {
    console.log('CSV upload successful:', result);

    // Reset form
    form.reset();

    if (this.options.showDetailedResults) {
      this.showDetailedSuccessMessage(result);
    } else {
      this.showSuccess(`Successfully imported ${result.imported || 0} stories!`);
    }

    // Close modal if present
    this.closeModalIfPresent(form);

    // Trigger custom event for parent components to refresh data
    this.triggerRefreshEvent();
  }

  /**
   * Handle upload error
   * @param {Error} error - The error that occurred
   * @param {HTMLFormElement} form - The form element
   */
  handleUploadError(error, form) {
    console.error('CSV upload failed:', error);
    
    let errorMessage = 'Upload failed. Please try again.';
    
    if (error.message.includes('Authentication')) {
      errorMessage = 'Please log in again and try uploading.';
    } else if (error.message.includes('permission') || error.message.includes('admin')) {
      errorMessage = 'You do not have permission to import CSV files.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    this.showError(errorMessage);
  }

  /**
   * Show detailed success message with import statistics
   * @param {Object} result - Upload result from server
   */
  showDetailedSuccessMessage(result) {
    let message = `Successfully imported ${result.imported || 0} of ${result.total || 0} stories!`;
    
    if (result.warnings && result.warnings.length > 0) {
      message += `\n⚠️ ${result.warnings.length} warnings`;
      console.warn('Import warnings:', result.warnings);
    }
    
    if (result.errors && result.errors.length > 0) {
      message += `\n❌ ${result.errors.length} errors`;
      console.error('Import errors:', result.errors);
      
      // Show first few errors
      const errorDetails = result.errors.slice(0, 3).map(err => 
        `Row ${err.row}: ${err.error}`
      ).join('\n');
      message += '\n\nFirst errors:\n' + errorDetails;
    }

    if (result.auto_approved_count > 0) {
      message += `\n✅ ${result.auto_approved_count} stories auto-approved`;
    }

    this.showSuccess(message);
  }

  /**
   * Set form uploading state
   * @param {HTMLFormElement} form - The form element
   * @param {boolean} uploading - Whether upload is in progress
   */
  setUploadingState(form, uploading) {
    this.isUploading = uploading;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const fileInput = this.getFileInput(form);
    
    if (submitBtn) {
      submitBtn.disabled = uploading;
      if (uploading) {
        submitBtn.setAttribute('data-original-text', submitBtn.textContent);
        submitBtn.textContent = 'Importing...';
      } else {
        const originalText = submitBtn.getAttribute('data-original-text');
        if (originalText) {
          submitBtn.textContent = originalText;
        }
      }
    }
    
    if (fileInput) {
      fileInput.disabled = uploading;
    }
  }

  /**
   * Show progress indicator
   * @param {string} message - Progress message
   */
  showProgressIndicator(message = 'Uploading...') {
    // Create or update progress indicator
    let indicator = document.getElementById('csv-progress-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'csv-progress-indicator';
      indicator.className = 'csv-progress-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2196F3;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      
      // Add spinner
      const spinner = document.createElement('div');
      spinner.style.cssText = `
        width: 16px;
        height: 16px;
        border: 2px solid #ffffff40;
        border-top: 2px solid #ffffff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      `;
      
      // Add spinner animation
      if (!document.getElementById('csv-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'csv-spinner-style';
        style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }
      
      indicator.appendChild(spinner);
      indicator.appendChild(document.createTextNode(message));
      document.body.appendChild(indicator);
    } else {
      const textNode = Array.from(indicator.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.textContent = message;
      }
    }
  }

  /**
   * Hide progress indicator
   */
  hideProgressIndicator() {
    const indicator = document.getElementById('csv-progress-indicator');
    if (indicator) {
      document.body.removeChild(indicator);
    }
  }

  /**
   * Close modal if form is inside one
   * @param {HTMLFormElement} form - The form element
   */
  closeModalIfPresent(form) {
    const modal = form.closest('.modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Trigger refresh event for parent components
   */
  triggerRefreshEvent() {
    // Dispatch custom event that parent components can listen for
    const event = new CustomEvent('csvImportComplete', {
      detail: { timestamp: new Date().toISOString() }
    });
    document.dispatchEvent(event);
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.showNotification(message, 'success', '✅');
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    this.showNotification(message, 'error', '❌');
  }

  /**
   * Show notification
   * @param {string} message - Message to show
   * @param {string} type - Notification type (success|error)
   * @param {string} icon - Icon to show
   */
  showNotification(message, type = 'info', icon = 'ℹ️') {
    const notification = document.createElement('div');
    notification.className = `csv-notification csv-notification-${type}`;
    notification.textContent = `${icon} ${message}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10002;
      font-weight: 500;
      max-width: 400px;
      word-wrap: break-word;
      white-space: pre-line;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after delay
    const delay = type === 'error' ? 8000 : 5000; // Errors stay longer
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, delay);
  }

  /**
   * Generate and download sample CSV file
   */
  downloadSampleCSV() {
    const sampleData = [
      ['idea_title', 'idea_description', 'question_1', 'question_2', 'question_3', 'question_4', 'question_5', 'question_6', 'coverage_start_date', 'coverage_end_date', 'tags', 'interviewees'],
      ['Local Environmental Impact', 'Investigating pollution effects on local wildlife', 'What pollution sources affect our area?', 'How has wildlife been impacted?', 'What cleanup efforts are underway?', 'How can residents help?', 'What policies need changing?', 'What is the long-term outlook?', '2024-01-15', '2024-03-15', 'environment,pollution,wildlife', 'Environmental Scientist,Local Mayor'],
      ['School Lunch Program Innovation', 'How schools are improving nutrition and sustainability', 'What changes were made to the program?', 'How do students respond to new options?', 'What are the nutritional benefits?', 'How is food sourcing different?', 'What challenges were faced?', 'What are the cost implications?', '2024-02-01', '2024-04-01', 'education,nutrition,sustainability', 'School Nutritionist,Principal,Student Representative']
    ];
    
    const csvContent = sampleData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'vidpod-sample-stories.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showSuccess('Sample CSV file downloaded successfully!');
  }

  /**
   * Show CSV import modal (for pages that have one)
   * @param {string} modalId - ID of the modal to show
   */
  showImportModal(modalId = 'csvModal') {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
    }
  }

  /**
   * Hide CSV import modal
   * @param {string} modalId - ID of the modal to hide
   */
  hideImportModal(modalId = 'csvModal') {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Get import statistics (for debugging/monitoring)
   * @returns {Object} Import statistics
   */
  getImportStats() {
    return {
      isUploading: this.isUploading,
      lastImportTime: this.lastImportTime || null,
      options: this.options
    };
  }
}

// Create global instance
const csvImportHandler = new CSVImportHandler();

// Make available globally for HTML onclick handlers
window.csvImportHandler = csvImportHandler;
window.showCSVImportModal = () => csvImportHandler.showImportModal();
window.downloadSampleCSV = () => csvImportHandler.downloadSampleCSV();

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Auto-detect and initialize CSV forms
  const csvForms = document.querySelectorAll('#csvForm, .csv-import-form, [data-csv-import="true"]');
  csvForms.forEach((form, index) => {
    const formId = form.id || `csv-form-${index}`;
    if (!form.id) form.id = formId;
    
    csvImportHandler.initialize(formId);
  });
});

console.log('Unified CSV Import Handler loaded successfully');