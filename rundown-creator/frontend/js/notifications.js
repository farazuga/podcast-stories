/**
 * Notification System for Rundown Creator
 * 
 * Handles display of success, error, warning, and info messages
 * with automatic dismissal and user interaction.
 */

class NotificationManager {
  constructor() {
    this.container = this.createContainer();
    this.notifications = new Map();
    this.maxVisible = CONFIG.NOTIFICATIONS.maxVisible;
    this.defaultDuration = CONFIG.NOTIFICATIONS.duration;
  }

  createContainer() {
    let container = document.getElementById('notifications');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'notifications';
      container.className = 'notifications-container';
      document.body.appendChild(container);
    }
    
    return container;
  }

  show(message, type = 'info', options = {}) {
    const notification = this.createNotification(message, type, options);
    this.addNotification(notification);
    return notification.id;
  }

  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', { 
      duration: 0, // Errors don't auto-dismiss
      ...options 
    });
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  createNotification(message, type, options) {
    const id = generateId('notification');
    const duration = options.duration !== undefined ? options.duration : this.defaultDuration;
    const dismissible = options.dismissible !== false;
    const actions = options.actions || [];

    const notification = {
      id,
      message,
      type,
      duration,
      dismissible,
      actions,
      element: null,
      timer: null,
      createdAt: Date.now()
    };

    notification.element = this.createNotificationElement(notification);
    return notification;
  }

  createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `notification ${notification.type}`;
    element.dataset.id = notification.id;

    // Icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    // Create notification content
    const content = `
      <div class="notification-content">
        <div class="notification-header">
          <span class="notification-icon">${icons[notification.type]}</span>
          <span class="notification-message">${StringUtils.escapeHtml(notification.message)}</span>
          ${notification.dismissible ? '<button class="notification-close" aria-label="Close">×</button>' : ''}
        </div>
        ${notification.actions.length > 0 ? this.createActionsHTML(notification.actions) : ''}
      </div>
    `;

    element.innerHTML = content;

    // Add event listeners
    this.setupNotificationEvents(element, notification);

    return element;
  }

  createActionsHTML(actions) {
    const actionsHTML = actions.map(action => 
      `<button class="notification-action btn btn-${action.type || 'secondary'}" data-action="${action.id}">
        ${StringUtils.escapeHtml(action.label)}
      </button>`
    ).join('');

    return `<div class="notification-actions">${actionsHTML}</div>`;
  }

  setupNotificationEvents(element, notification) {
    // Close button
    const closeBtn = element.querySelector('.notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss(notification.id);
      });
    }

    // Action buttons
    const actionBtns = element.querySelectorAll('.notification-action');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const actionId = btn.dataset.action;
        const action = notification.actions.find(a => a.id === actionId);
        if (action && action.handler) {
          action.handler(notification.id);
        }
      });
    });

    // Click to dismiss (if dismissible and no actions)
    if (notification.dismissible && notification.actions.length === 0) {
      element.addEventListener('click', () => {
        this.dismiss(notification.id);
      });
      element.style.cursor = 'pointer';
    }

    // Auto-dismiss timer
    if (notification.duration > 0) {
      notification.timer = setTimeout(() => {
        this.dismiss(notification.id);
      }, notification.duration);
    }
  }

  addNotification(notification) {
    // Remove oldest notifications if at max limit
    while (this.notifications.size >= this.maxVisible) {
      const oldestId = Array.from(this.notifications.keys())[0];
      this.dismiss(oldestId);
    }

    // Add to container with animation
    this.container.appendChild(notification.element);
    this.notifications.set(notification.id, notification);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      notification.element.classList.add('notification-enter');
    });

    debugLog('Notification added:', notification.type, notification.message);
  }

  dismiss(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // Clear timer if exists
    if (notification.timer) {
      clearTimeout(notification.timer);
    }

    // Animate out
    notification.element.classList.add('notification-exit');
    
    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.notifications.delete(id);
    }, 300); // Match CSS animation duration

    debugLog('Notification dismissed:', id);
  }

  dismissAll() {
    Array.from(this.notifications.keys()).forEach(id => {
      this.dismiss(id);
    });
  }

  // Convenience methods for common scenarios
  saveSuccess(action = 'saved') {
    return this.success(`Successfully ${action}!`);
  }

  saveError(error = 'save') {
    return this.error(`Failed to ${error}. Please try again.`);
  }

  loadingError(resource = 'data') {
    return this.error(`Failed to load ${resource}. Please refresh the page.`);
  }

  networkError() {
    return this.error('Network error. Please check your connection and try again.');
  }

  permissionError() {
    return this.error('You don\'t have permission to perform this action.');
  }

  validationError(field) {
    return this.warning(`Please check the ${field} field and try again.`);
  }

  confirmAction(message, onConfirm, onCancel) {
    const actions = [
      {
        id: 'cancel',
        label: 'Cancel',
        type: 'secondary',
        handler: (notificationId) => {
          this.dismiss(notificationId);
          if (onCancel) onCancel();
        }
      },
      {
        id: 'confirm',
        label: 'Confirm',
        type: 'primary',
        handler: (notificationId) => {
          this.dismiss(notificationId);
          if (onConfirm) onConfirm();
        }
      }
    ];

    return this.warning(message, {
      duration: 0,
      dismissible: false,
      actions
    });
  }

  // Show notification for API responses
  handleApiResponse(response, successMessage, errorMessage) {
    if (response.success) {
      this.success(successMessage || 'Operation completed successfully');
    } else {
      this.error(errorMessage || response.error || 'An error occurred');
    }
  }

  // Show loading notification that can be updated
  loading(message = 'Loading...') {
    const id = this.info(message, {
      duration: 0,
      dismissible: false
    });

    return {
      id,
      update: (newMessage) => {
        const notification = this.notifications.get(id);
        if (notification) {
          const messageEl = notification.element.querySelector('.notification-message');
          if (messageEl) {
            messageEl.textContent = newMessage;
          }
        }
      },
      success: (message = 'Completed!') => {
        this.dismiss(id);
        this.success(message);
      },
      error: (message = 'Failed!') => {
        this.dismiss(id);
        this.error(message);
      },
      dismiss: () => {
        this.dismiss(id);
      }
    };
  }
}

// Add CSS for notification animations
const notificationStyles = `
  .notification-enter {
    animation: slideInRight 0.3s ease-out;
  }
  
  .notification-exit {
    animation: slideOutRight 0.3s ease-in;
  }
  
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .notification-content {
    width: 100%;
  }
  
  .notification-header {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .notification-icon {
    flex-shrink: 0;
    font-size: 1.1em;
  }
  
  .notification-message {
    flex: 1;
    line-height: 1.4;
  }
  
  .notification-close {
    background: none;
    border: none;
    font-size: 1.2em;
    cursor: pointer;
    color: var(--text-light);
    padding: 0;
    margin-left: auto;
    flex-shrink: 0;
  }
  
  .notification-close:hover {
    color: var(--text-color);
  }
  
  .notification-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-md);
    justify-content: flex-end;
  }
  
  .notification-action {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
  }
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = notificationStyles;
document.head.appendChild(styleElement);

// Create global notification manager instance
const notifications = new NotificationManager();

// Export for global use
window.notifications = notifications;