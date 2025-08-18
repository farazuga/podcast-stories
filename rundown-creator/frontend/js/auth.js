/**
 * Authentication Module for Rundown Creator
 * 
 * Handles authentication state management and
 * integration with main VidPOD auth system.
 */

class AuthManager {
  constructor() {
    this.user = null;
    this.token = null;
    this.init();
  }

  init() {
    // Load stored auth data
    this.loadStoredAuth();
    
    // Check if user is authenticated
    if (this.token && this.user) {
      this.verifyToken();
    } else {
      this.redirectToLogin();
    }
  }

  loadStoredAuth() {
    try {
      this.token = localStorage.getItem(CONFIG.STORAGE_KEYS.token);
      const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.user);
      this.user = userJson ? JSON.parse(userJson) : null;
      
      debugLog('Loaded auth data:', { 
        hasToken: !!this.token, 
        user: this.user?.email || 'none' 
      });
    } catch (error) {
      console.error('Error loading stored auth:', error);
      this.clearAuth();
    }
  }

  async verifyToken() {
    try {
      const response = await fetch(getVidPodApiUrl('/auth/verify'), {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.user = data.user;
        this.updateUserData(data.user);
        this.setupUI();
        debugLog('Token verification successful');
      } else {
        console.warn('Token verification failed');
        this.clearAuth();
        this.redirectToLogin();
      }
    } catch (error) {
      console.error('Token verification error:', error);
      // Don't redirect on network errors, might be temporary
      this.setupUI(); // Try to continue with stored user data
    }
  }

  updateUserData(userData) {
    this.user = userData;
    localStorage.setItem(CONFIG.STORAGE_KEYS.user, JSON.stringify(userData));
    debugLog('User data updated:', userData.email);
  }

  setupUI() {
    // Update user greeting
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting && this.user) {
      userGreeting.textContent = `Welcome, ${this.user.name || this.user.email}`;
    }

    // Set body class for role-based styling
    if (this.user?.role) {
      document.body.className = this.user.role;
    }

    // Show/hide role-specific elements
    this.updateRoleVisibility();

    // Set up logout handler
    this.setupLogoutHandler();

    debugLog('UI setup complete for role:', this.user?.role);
  }

  updateRoleVisibility() {
    const role = this.user?.role;
    
    // Show/hide navigation items based on role
    const analyticsNav = document.getElementById('navAnalytics');
    if (analyticsNav) {
      analyticsNav.style.display = (role === 'teacher' || role === 'amitrace_admin') ? 'block' : 'none';
    }

    // Show/hide content sections
    const teacherElements = document.querySelectorAll('.teacher-only');
    const adminElements = document.querySelectorAll('.admin-only');

    teacherElements.forEach(el => {
      el.style.display = (role === 'teacher' || role === 'amitrace_admin') ? 'block' : 'none';
    });

    adminElements.forEach(el => {
      el.style.display = (role === 'amitrace_admin') ? 'block' : 'none';
    });
  }

  setupLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  }

  logout() {
    debugLog('User logging out');
    this.clearAuth();
    this.redirectToLogin();
  }

  clearAuth() {
    this.user = null;
    this.token = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.token);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.user);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.filters);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.preferences);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.autosave);
    debugLog('Auth data cleared');
  }

  redirectToLogin() {
    // Redirect to main VidPOD login
    const loginUrl = CONFIG.VIDPOD_FRONTEND + '/index.html';
    debugLog('Redirecting to login:', loginUrl);
    window.location.href = loginUrl;
  }

  // Check if user has specific permission
  hasPermission(permission) {
    if (!this.user) return false;

    const role = this.user.role;

    switch (permission) {
      case 'create_rundown':
        return ['student', 'teacher', 'amitrace_admin'].includes(role);
      
      case 'view_analytics':
        return ['teacher', 'amitrace_admin'].includes(role);
      
      case 'approve_rundowns':
        return ['teacher', 'amitrace_admin'].includes(role);
      
      case 'manage_system':
        return role === 'amitrace_admin';
      
      default:
        return false;
    }
  }

  // Get user classes (for teachers and students)
  async getUserClasses() {
    try {
      const response = await fetch(getApiUrl('/integration/classes'), {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        return data.classes || [];
      } else {
        console.error('Failed to fetch user classes');
        return [];
      }
    } catch (error) {
      console.error('Error fetching user classes:', error);
      return [];
    }
  }

  // Check if user owns a rundown
  ownsRundown(rundown) {
    return this.user && rundown && rundown.created_by === this.user.id;
  }

  // Check if user can edit a rundown
  canEditRundown(rundown) {
    if (!this.user || !rundown) return false;
    
    // Owner can always edit (unless submitted/approved)
    if (this.ownsRundown(rundown)) {
      return rundown.status === 'draft' || rundown.status === 'rejected';
    }
    
    // Admins can edit any rundown
    if (this.user.role === 'amitrace_admin') {
      return true;
    }
    
    return false;
  }

  // Check if user can approve a rundown
  canApproveRundown(rundown) {
    if (!this.user || !rundown) return false;
    
    // Only teachers and admins can approve
    if (!['teacher', 'amitrace_admin'].includes(this.user.role)) {
      return false;
    }
    
    // Can't approve own rundowns
    if (this.ownsRundown(rundown)) {
      return false;
    }
    
    // Only submitted rundowns can be approved
    return rundown.status === 'submitted';
  }

  // Get API headers with authentication
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Make authenticated API request
  async apiRequest(url, options = {}) {
    const headers = {
      ...this.getHeaders(),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle auth errors
    if (response.status === 401) {
      debugLog('API request returned 401, clearing auth');
      this.clearAuth();
      this.redirectToLogin();
      throw new Error('Authentication expired');
    }

    return response;
  }
}

// Initialize auth manager
const authManager = new AuthManager();

// Export for global use
window.authManager = authManager;