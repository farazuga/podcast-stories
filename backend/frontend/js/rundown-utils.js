/**
 * VidPOD Rundown Utilities
 * Common utility functions for rundown management
 */

class RundownUtils {
    
    // Parse time string (MM:SS) to seconds
    static parseTimeString(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        
        return (minutes * 60) + seconds;
    }
    
    // Format seconds to MM:SS string
    static formatTimeString(totalSeconds) {
        if (!totalSeconds || totalSeconds < 0) return '00:00';
        
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Validate time input format
    static validateTimeInput(timeStr) {
        if (!timeStr) return true; // Empty is valid
        
        const timeRegex = /^[0-9]+:[0-5][0-9]$/;
        return timeRegex.test(timeStr);
    }
    
    // Make API request with authentication
    static async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }
        
        // Get API base URL from global config
        const apiBaseUrl = window.API_URL || window.AppConfig?.API_URL || '/api';
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        const config = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(`${apiBaseUrl}${endpoint}`, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Network error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }
    
    // Show success message
    static showSuccess(message, container = document.body) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.innerHTML = `✅ ${message}`;
        
        container.insertBefore(alert, container.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
    
    // Show error message
    static showError(message, container = document.body) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger';
        alert.innerHTML = `❌ ${message}`;
        
        container.insertBefore(alert, container.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 8000);
    }
    
    // Show warning message
    static showWarning(message, container = document.body) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-warning';
        alert.innerHTML = `⚠️ ${message}`;
        
        container.insertBefore(alert, container.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 6000);
    }
    
    // Format date for display
    static formatDate(dateString) {
        if (!dateString) return 'Not scheduled';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Debounce function for search inputs
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Generate unique ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Sanitize HTML content
    static sanitizeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // Truncate text with ellipsis
    static truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }
    
    // Copy text to clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            RundownUtils.showSuccess('Copied to clipboard!');
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            RundownUtils.showError('Failed to copy to clipboard');
            return false;
        }
    }
    
    // Download file from blob
    static downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
    
    // Show loading spinner
    static showLoading(container) {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner"></div>
            <p>Loading...</p>
        `;
        container.appendChild(spinner);
        return spinner;
    }
    
    // Hide loading spinner
    static hideLoading(spinner) {
        if (spinner && spinner.parentNode) {
            spinner.parentNode.removeChild(spinner);
        }
    }
    
    // Modal utilities
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Focus first input if exists
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }
    
    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            
            // Clear form if exists
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }
    
    // Form validation utilities
    static validateForm(formElement) {
        const errors = [];
        const requiredFields = formElement.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                errors.push(`${field.name || field.id} is required`);
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
        });
        
        return errors;
    }
    
    // Get form data as object
    static getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }
    
    // Update timing display
    static updateTimingChip(totalSeconds) {
        const timingChip = document.getElementById('timingChip');
        const timingDisplay = document.getElementById('timingDisplay');
        
        if (timingChip && timingDisplay) {
            timingDisplay.textContent = RundownUtils.formatTimeString(totalSeconds);
            timingChip.style.display = totalSeconds > 0 ? 'inline-flex' : 'none';
        }
    }
    
    // Setup keyboard shortcuts
    static setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key closes modals
            if (e.key === 'Escape') {
                const visibleModal = document.querySelector('.modal[style*="block"]');
                if (visibleModal) {
                    const closeBtn = visibleModal.querySelector('.close');
                    if (closeBtn) closeBtn.click();
                }
            }
            
            // Ctrl+Enter saves forms
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const visibleModal = document.querySelector('.modal[style*="block"]');
                if (visibleModal) {
                    const saveBtn = visibleModal.querySelector('.btn-primary');
                    if (saveBtn) saveBtn.click();
                }
            }
        });
    }
    
    // Initialize tooltips
    static initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[title]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = e.target.title;
                tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 1000;
                    pointer-events: none;
                `;
                
                document.body.appendChild(tooltip);
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                
                e.target.addEventListener('mouseleave', () => {
                    tooltip.remove();
                }, { once: true });
            });
        });
    }
}

// Initialize utilities when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    RundownUtils.setupKeyboardShortcuts();
    RundownUtils.initializeTooltips();
});

// Export for use in other modules
window.RundownUtils = RundownUtils;