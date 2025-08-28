// VidPOD Rundown Utilities
// Common utility functions for rundown management

class RundownUtils {
  // Time parsing and formatting utilities
  static parseTimeString(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    
    if (seconds > 59) return 0; // Invalid seconds
    
    return minutes * 60 + seconds;
  }
  
  static formatTimeString(totalSeconds) {
    if (!totalSeconds || totalSeconds < 0) return '00:00';
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Validation utilities
  static validateTimeInput(input) {
    const timeRegex = /^[0-9]{1,2}:[0-9]{2}$/;
    if (!timeRegex.test(input)) return false;
    
    const parts = input.split(':');
    const seconds = parseInt(parts[1], 10);
    
    return seconds <= 59;
  }
  
  static formatTimeInput(input) {
    if (!input) return '';
    
    // Remove non-digit and colon characters
    let cleaned = input.replace(/[^0-9:]/g, '');
    
    // Auto-format as MM:SS
    if (cleaned.length === 1 && cleaned !== ':') {
      cleaned = '0' + cleaned + ':';
    } else if (cleaned.length === 2 && !cleaned.includes(':')) {
      cleaned = cleaned + ':';
    } else if (cleaned.length === 3 && cleaned.charAt(2) === ':') {
      cleaned = cleaned + '0';
    }
    
    return cleaned;
  }
  
  // Status management
  static getNextStatus(currentStatus) {
    const statuses = ['Draft', 'Needs Review', 'Ready'];
    const currentIndex = statuses.indexOf(currentStatus);
    return statuses[(currentIndex + 1) % statuses.length];
  }
  
  static getPrevStatus(currentStatus) {
    const statuses = ['Draft', 'Needs Review', 'Ready'];
    const currentIndex = statuses.indexOf(currentStatus);
    return statuses[currentIndex === 0 ? statuses.length - 1 : currentIndex - 1];
  }
  
  // API utilities
  static async apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(endpoint, mergedOptions);
      
      if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
        return null;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }
  
  // UI utilities
  static showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }
  
  static hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }
  
  static showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-weight: 600;
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#10b981';
        break;
      case 'error':
        notification.style.backgroundColor = '#ef4444';
        break;
      case 'warning':
        notification.style.backgroundColor = '#f59e0b';
        break;
      default:
        notification.style.backgroundColor = '#3b82f6';
    }
    
    document.body.appendChild(notification);
    
    // Slide in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Slide out and remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }
  
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
  
  // Drag and drop utilities
  static setupDragAndDrop(container, options = {}) {
    const {
      draggableSelector = '.draggable',
      handleSelector = '.drag-handle',
      dropCallback = null,
      dragStartCallback = null,
      dragEndCallback = null
    } = options;
    
    let draggedElement = null;
    let draggedIndex = null;
    let dropLine = null;
    
    // Create drop line indicator
    const createDropLine = () => {
      const line = document.createElement('div');
      line.className = 'drop-line';
      return line;
    };
    
    container.addEventListener('dragstart', (e) => {
      const draggable = e.target.closest(draggableSelector);
      if (!draggable) return;
      
      // Check if drag started from handle (if specified)
      if (handleSelector && !e.target.closest(handleSelector)) {
        e.preventDefault();
        return;
      }
      
      draggedElement = draggable;
      draggedIndex = Array.from(container.children).indexOf(draggable);
      draggable.classList.add('dragging');
      
      if (dragStartCallback) dragStartCallback(draggable, draggedIndex);
    });
    
    container.addEventListener('dragend', (e) => {
      const draggable = e.target.closest(draggableSelector);
      if (draggable) {
        draggable.classList.remove('dragging');
        if (dropLine && dropLine.parentNode) {
          dropLine.parentNode.removeChild(dropLine);
          dropLine = null;
        }
        
        if (dragEndCallback) dragEndCallback(draggable);
      }
      
      draggedElement = null;
      draggedIndex = null;
    });
    
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      
      if (!draggedElement) return;
      
      const afterElement = getDragAfterElement(container, e.clientY);
      
      if (!dropLine) {
        dropLine = createDropLine();
      }
      
      if (afterElement == null) {
        container.appendChild(dropLine);
      } else {
        container.insertBefore(dropLine, afterElement);
      }
      
      dropLine.classList.add('active');
    });
    
    container.addEventListener('drop', (e) => {
      e.preventDefault();
      
      if (!draggedElement || !dropLine) return;
      
      const newIndex = Array.from(container.children).indexOf(dropLine);
      
      // Insert dragged element before drop line
      container.insertBefore(draggedElement, dropLine);
      
      // Remove drop line
      if (dropLine.parentNode) {
        dropLine.parentNode.removeChild(dropLine);
        dropLine = null;
      }
      
      if (dropCallback && draggedIndex !== newIndex) {
        dropCallback(draggedElement, draggedIndex, newIndex);
      }
    });
    
    // Helper function to find drop position
    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll(`${draggableSelector}:not(.dragging)`)];
      
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
  }
  
  // Keyboard navigation utilities
  static setupKeyboardNavigation(container, options = {}) {
    const {
      itemSelector = '.selectable',
      onSelect = null,
      onActivate = null
    } = options;
    
    let selectedIndex = -1;
    
    const items = () => container.querySelectorAll(itemSelector);
    
    const updateSelection = (newIndex) => {
      const itemList = items();
      
      // Remove previous selection
      itemList.forEach(item => item.classList.remove('selected'));
      
      // Clamp index
      selectedIndex = Math.max(-1, Math.min(newIndex, itemList.length - 1));
      
      // Add new selection
      if (selectedIndex >= 0 && itemList[selectedIndex]) {
        itemList[selectedIndex].classList.add('selected');
        itemList[selectedIndex].scrollIntoView({ block: 'nearest' });
        
        if (onSelect) onSelect(itemList[selectedIndex], selectedIndex);
      }
    };
    
    container.addEventListener('keydown', (e) => {
      const itemList = items();
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          updateSelection(selectedIndex - 1);
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          updateSelection(selectedIndex + 1);
          break;
          
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (selectedIndex >= 0 && itemList[selectedIndex]) {
            if (onActivate) onActivate(itemList[selectedIndex], selectedIndex);
          }
          break;
      }
    });
    
    // Allow manual selection
    return {
      selectIndex: updateSelection,
      getSelectedIndex: () => selectedIndex,
      getSelectedElement: () => {
        const itemList = items();
        return selectedIndex >= 0 ? itemList[selectedIndex] : null;
      }
    };
  }
  
  // Auto-resize textarea
  static autoResizeTextarea(textarea) {
    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    
    textarea.addEventListener('input', resize);
    textarea.addEventListener('focus', resize);
    
    // Initial resize
    resize();
  }
  
  // Local storage utilities for auto-save
  static saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }
  
  static loadFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  }
  
  // Generate unique IDs
  static generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Sort utilities
  static sortByAirDate(rundowns) {
    return [...rundowns].sort((a, b) => {
      const dateA = new Date(a.air_date);
      const dateB = new Date(b.air_date);
      return dateA - dateB;
    });
  }
}

// Export for use in other modules
window.RundownUtils = RundownUtils;