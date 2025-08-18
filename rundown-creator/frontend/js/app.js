/**
 * Main Application Module
 * 
 * Orchestrates all other modules and handles global app logic,
 * routing, and initialization.
 */

class RundownCreatorApp {
  constructor() {
    this.initialized = false;
    this.currentView = 'rundownsView';
    
    this.init();
  }

  async init() {
    debugLog('Initializing Rundown Creator App...');
    
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initializeApp());
      } else {
        this.initializeApp();
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      notifications.error('Failed to initialize application');
    }
  }

  async initializeApp() {
    try {
      // Check authentication first
      if (!isAuthenticated()) {
        debugLog('User not authenticated, redirecting to login');
        authManager.redirectToLogin();
        return;
      }

      // Set up global event listeners
      this.setupGlobalEventListeners();
      
      // Set up keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Set up auto-save
      this.setupAutoSave();
      
      // Initialize error handling
      this.setupErrorHandling();
      
      // Handle URL routing if needed
      this.handleInitialRoute();
      
      this.initialized = true;
      debugLog('Rundown Creator App initialized successfully');
      
      // Show welcome notification for new users
      this.showWelcomeMessage();
      
    } catch (error) {
      console.error('Error during app initialization:', error);
      notifications.error('Failed to initialize application');
    }
  }

  setupGlobalEventListeners() {
    // Handle beforeunload for unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
      notifications.success('Connection restored');
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      notifications.warning('You are now offline. Changes will be saved when connection is restored.');
    });

    // Handle visibility change for auto-save pause/resume
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAutoSave();
      } else {
        this.resumeAutoSave();
      }
    });

    // Global click handler for closing modals
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeActiveModal();
      }
    });

    // Global escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeActiveModal();
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Check if user is typing in an input field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return;
      }

      // Only handle shortcuts with Ctrl/Cmd key
      if (!(e.ctrlKey || e.metaKey)) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          if (this.currentView === 'rundownsView') {
            rundownManager.showCreateView();
          } else if (this.currentView === 'createView') {
            segmentManager.showSegmentModal();
          }
          break;
          
        case 's':
          e.preventDefault();
          if (this.currentView === 'createView') {
            rundownManager.saveRundown();
          }
          break;
          
        case 'e':
          e.preventDefault();
          if (this.currentView === 'createView') {
            storyManager.showStoryModal();
          }
          break;
          
        case 'backspace':
        case 'escape':
          e.preventDefault();
          if (this.currentView === 'createView') {
            rundownManager.showRundownsList();
          }
          break;
      }
    });
  }

  setupAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      if (this.shouldAutoSave()) {
        this.performAutoSave();
      }
    }, CONFIG.APP.autoSaveInterval);
  }

  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
      this.handleGlobalError(e.error);
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      this.handleGlobalError(e.reason);
    });
  }

  handleInitialRoute() {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    
    // Handle deep linking
    if (hash === '#create') {
      rundownManager.showCreateView();
    } else if (hash.startsWith('#edit/')) {
      const rundownId = hash.split('/')[1];
      if (rundownId) {
        rundownManager.showCreateView(rundownId);
      }
    } else if (params.get('rundown')) {
      const rundownId = params.get('rundown');
      rundownManager.showCreateView(rundownId);
    }
    // Default: show rundowns list (already handled by rundownManager)
  }

  showWelcomeMessage() {
    const hasSeenWelcome = Storage.get('rundown_welcome_shown', false);
    
    if (!hasSeenWelcome) {
      setTimeout(() => {
        notifications.info(
          'Welcome to VidPOD Rundown Creator! Create podcast rundowns, add segments, and collaborate with your teacher.',
          { duration: 8000 }
        );
        Storage.set('rundown_welcome_shown', true);
      }, 1000);
    }
  }

  hasUnsavedChanges() {
    // Check if there are unsaved changes in the current rundown
    if (this.currentView !== 'createView') return false;
    
    const form = DOM.get('rundownForm');
    if (!form) return false;
    
    // Simple check for form changes
    // In a more complex app, you might track specific changes
    const title = DOM.get('rundownTitle')?.value.trim();
    const description = DOM.get('rundownDescription')?.value.trim();
    
    // If there's content but no rundown ID, consider it unsaved
    if ((title || description) && !rundownManager.editingRundownId) {
      return true;
    }
    
    return false;
  }

  shouldAutoSave() {
    return this.currentView === 'createView' && 
           rundownManager.editingRundownId && 
           !document.hidden &&
           navigator.onLine;
  }

  async performAutoSave() {
    try {
      // Only auto-save if there are actual changes
      if (this.hasUnsavedChanges()) {
        debugLog('Performing auto-save...');
        await rundownManager.saveRundown();
        debugLog('Auto-save completed');
      }
    } catch (error) {
      debugLog('Auto-save failed:', error);
      // Don't show error notification for auto-save failures
    }
  }

  pauseAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  resumeAutoSave() {
    if (!this.autoSaveInterval) {
      this.setupAutoSave();
    }
  }

  async syncPendingChanges() {
    // Sync any pending changes when connection is restored
    // This would be used for offline functionality
    debugLog('Syncing pending changes...');
    
    try {
      // Check for any pending changes in local storage
      const pendingChanges = Storage.get('pending_changes', []);
      
      if (pendingChanges.length > 0) {
        notifications.info('Syncing offline changes...');
        
        // Process pending changes
        for (const change of pendingChanges) {
          await this.processPendingChange(change);
        }
        
        // Clear pending changes
        Storage.remove('pending_changes');
        notifications.success('Offline changes synced successfully');
      }
    } catch (error) {
      console.error('Error syncing pending changes:', error);
      notifications.error('Failed to sync offline changes');
    }
  }

  async processPendingChange(change) {
    // Process individual pending change
    // This would depend on the type of change
    debugLog('Processing pending change:', change);
    
    switch (change.type) {
      case 'rundown_save':
        // Re-attempt rundown save
        break;
      case 'segment_save':
        // Re-attempt segment save
        break;
      // Add more change types as needed
    }
  }

  closeActiveModal() {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
      activeModal.classList.remove('active');
    }
  }

  handleGlobalError(error) {
    if (isDevelopment()) {
      // In development, show detailed error
      notifications.error(`Development Error: ${error.message || error}`);
    } else {
      // In production, show generic error
      notifications.error('An unexpected error occurred. Please refresh the page.');
    }
  }

  // View management
  setCurrentView(viewId) {
    this.currentView = viewId;
    
    // Update URL hash for deep linking
    const hash = {
      'rundownsView': '',
      'createView': '#create',
      'analyticsView': '#analytics'
    }[viewId] || '';
    
    if (window.location.hash !== hash) {
      window.history.replaceState(null, null, hash);
    }
  }

  // Utility methods for other modules
  showNotification(message, type = 'info', options = {}) {
    return notifications.show(message, type, options);
  }

  confirmAction(message, onConfirm, onCancel) {
    return notifications.confirmAction(message, onConfirm, onCancel);
  }

  // Analytics tracking (for future implementation)
  trackEvent(category, action, label, value) {
    if (isDevelopment()) {
      debugLog('Analytics event:', { category, action, label, value });
    }
    
    // Here you would send to actual analytics service
    // e.g., Google Analytics, Mixpanel, etc.
  }

  // Performance monitoring
  measurePerformance(name, fn) {
    const startTime = performance.now();
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const endTime = performance.now();
          debugLog(`Performance: ${name} took ${endTime - startTime}ms`);
        });
      } else {
        const endTime = performance.now();
        debugLog(`Performance: ${name} took ${endTime - startTime}ms`);
        return result;
      }
    } catch (error) {
      const endTime = performance.now();
      debugLog(`Performance: ${name} failed after ${endTime - startTime}ms`);
      throw error;
    }
  }

  // Cleanup method
  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    // Remove event listeners
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('keydown', this.handleKeydown);
    
    this.initialized = false;
    debugLog('Rundown Creator App destroyed');
  }
}

// Initialize the application
const app = new RundownCreatorApp();

// Export for global use and debugging
window.app = app;

// Add some helpful development tools
if (isDevelopment()) {
  window.debugApp = {
    app,
    authManager,
    rundownManager,
    segmentManager,
    storyManager,
    notifications,
    CONFIG,
    // Helper functions for debugging
    clearStorage: () => {
      localStorage.clear();
      sessionStorage.clear();
      console.log('Storage cleared');
    },
    resetApp: () => {
      window.location.reload();
    },
    testNotifications: () => {
      notifications.success('Test success notification');
      notifications.error('Test error notification');
      notifications.warning('Test warning notification');
      notifications.info('Test info notification');
    }
  };
  
  console.log('🛠️ Development tools available via window.debugApp');
}