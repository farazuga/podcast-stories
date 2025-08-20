/**
 * VidPOD Unified Navigation Component JavaScript
 * Handles navigation state, user display, and role-based visibility
 */

const VidPODNav = {
    currentUser: null,
    currentPage: null,
    onLogout: null,

    /**
     * Initialize the navigation component
     * @param {Object} config - Configuration object
     * @param {string} config.currentPage - Current page identifier
     * @param {Object} config.user - User object with name, username, role
     * @param {Function} config.onLogout - Logout callback function
     */
    init(config) {
        this.currentUser = config.user;
        this.currentPage = config.currentPage;
        this.onLogout = config.onLogout;

        this.setupEventListeners();
        this.updateUserDisplay();
        this.updateActiveState();
        this.updateRoleVisibility();
        this.loadBadgeCounts();
    },

    /**
     * Set up event listeners for navigation interactions
     */
    setupEventListeners() {
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileToggle');
        const mobileMenu = document.getElementById('mobileMenu');

        if (mobileToggle && mobileMenu) {
            mobileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                mobileMenu.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (mobileMenu && !e.target.closest('.vidpod-navbar')) {
                mobileMenu.classList.remove('active');
            }
        });

        // Close mobile menu when clicking nav links
        document.querySelectorAll('.mobile-nav .nav-item').forEach(link => {
            link.addEventListener('click', () => {
                if (mobileMenu) {
                    mobileMenu.classList.remove('active');
                }
            });
        });

        // Handle logout button clicks
        document.querySelectorAll('.logout-btn, [onclick*="logout"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        });

        // CSV import is now handled in admin browse stories page only
    },

    /**
     * Update user display information in the navigation
     */
    updateUserDisplay() {
        if (!this.currentUser) return;

        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userAvatar = document.getElementById('userAvatar');

        // Update user name
        if (userName) {
            const displayName = this.currentUser.name || this.currentUser.username || 'User';
            userName.textContent = displayName;
        }

        // Update user role
        if (userRole && this.currentUser.role) {
            userRole.textContent = this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1);
            userRole.className = `user-role ${this.currentUser.role}`;
        }

        // Update user avatar
        if (userAvatar) {
            const name = this.currentUser.name || this.currentUser.username || 'User';
            userAvatar.textContent = name.substring(0, 2).toUpperCase();
        }

        // Update all user info spans (for legacy compatibility)
        document.querySelectorAll('#userInfo').forEach(span => {
            const displayName = this.currentUser.name || this.currentUser.username || 'User';
            const role = this.currentUser.role ? this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1) : 'User';
            span.textContent = `${displayName} (${role})`;
        });
    },

    /**
     * Update active state for current page
     */
    updateActiveState() {
        if (!this.currentPage) return;

        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current page
        document.querySelectorAll(`[data-page="${this.currentPage}"]`).forEach(item => {
            item.classList.add('active');
        });

        // Handle legacy active class for links
        document.querySelectorAll('.nav-menu a, .mobile-nav a').forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && href.includes(this.currentPage)) {
                link.classList.add('active');
            }
        });
    },

    /**
     * Update role-based visibility of navigation elements
     */
    updateRoleVisibility() {
        if (!this.currentUser?.role) {
            console.warn('No user role found, hiding all role-specific elements');
            // Hide all role-specific elements if no role
            document.querySelectorAll('[data-role]').forEach(element => {
                element.style.display = 'none';
            });
            return;
        }

        const userRole = this.currentUser.role.toLowerCase().trim();
        console.log(`Updating navigation visibility for role: ${userRole}`);

        // Handle elements with data-role attribute
        document.querySelectorAll('[data-role]').forEach(element => {
            const allowedRoles = element.getAttribute('data-role')
                .toLowerCase()
                .split(',')
                .map(role => role.trim());
            
            const shouldShow = allowedRoles.includes(userRole);
            element.style.display = shouldShow ? '' : 'none';
            
            // Debug logging
            const elementDesc = element.textContent?.trim() || element.getAttribute('href') || 'unnamed element';
            console.log(`Element "${elementDesc}": roles=${allowedRoles.join(',')}, userRole=${userRole}, visible=${shouldShow}`);
        });

        // Handle legacy role-based visibility (for backward compatibility)
        const adminLinks = document.querySelectorAll('#adminLink, [href*="admin"]:not([data-role])');
        const teacherLinks = document.querySelectorAll('#teacherLink, [href*="teacher-dashboard"]:not([data-role])');

        adminLinks.forEach(link => {
            const shouldShow = ['admin', 'amitrace_admin'].includes(userRole);
            link.style.display = shouldShow ? '' : 'none';
            console.log(`Legacy admin link: visible=${shouldShow}`);
        });

        teacherLinks.forEach(link => {
            const shouldShow = ['teacher', 'admin', 'amitrace_admin'].includes(userRole);
            link.style.display = shouldShow ? '' : 'none';
            console.log(`Legacy teacher link: visible=${shouldShow}`);
        });

        // Specific role-based validation
        this.validateRoleBasedAccess(userRole);
    },

    /**
     * Validate that role-based access is working correctly
     * @param {string} userRole - Current user role
     */
    validateRoleBasedAccess(userRole) {
        const expectations = {
            'student': {
                visible: ['dashboard', 'stories', 'add-story'],
                hidden: ['teacher-dashboard', 'admin', 'admin-browse-stories']
            },
            'teacher': {
                visible: ['dashboard', 'stories', 'add-story', 'teacher-dashboard'],
                hidden: ['admin', 'admin-browse-stories']
            },
            'admin': {
                visible: ['dashboard', 'stories', 'add-story', 'teacher-dashboard', 'admin', 'admin-browse-stories'],
                hidden: []
            },
            'amitrace_admin': {
                visible: ['dashboard', 'stories', 'add-story', 'teacher-dashboard', 'admin', 'admin-browse-stories'],
                hidden: []
            }
        };

        const expected = expectations[userRole];
        if (!expected) {
            console.warn(`Unknown user role: ${userRole}`);
            return;
        }

        // Check visible items
        expected.visible.forEach(item => {
            const elements = document.querySelectorAll(`[data-page="${item}"], [data-role*="${userRole}"]`);
            elements.forEach(el => {
                if (el.style.display === 'none') {
                    console.error(`❌ ${item} should be visible for ${userRole} but is hidden`);
                }
            });
        });

        // Check hidden items
        expected.hidden.forEach(item => {
            const elements = document.querySelectorAll(`[data-page="${item}"]`);
            elements.forEach(el => {
                if (el.style.display !== 'none') {
                    console.error(`❌ ${item} should be hidden for ${userRole} but is visible`);
                }
            });
        });
    },

    /**
     * Set badge count for navigation items
     * @param {string} badgeId - ID of the badge element
     * @param {number} count - Count to display
     */
    setBadgeCount(badgeId, count) {
        const badge = document.getElementById(badgeId);
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    /**
     * Load and display badge counts from API or localStorage
     */
    async loadBadgeCounts() {
        try {
            // If user is teacher or admin, load class count
            if (['teacher', 'admin'].includes(this.currentUser?.role)) {
                const classCount = await this.getClassCount();
                this.setBadgeCount('classBadge', classCount);
            }

            // Load other badge counts as needed
            // const storyCount = await this.getStoryCount();
            // this.setBadgeCount('storyBadge', storyCount);
        } catch (error) {
            console.warn('Failed to load badge counts:', error);
        }
    },

    /**
     * Get class count for teacher/admin users
     * @returns {Promise<number>}
     */
    async getClassCount() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return 0;

            const response = await fetch('/api/classes', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const classes = await response.json();
                return Array.isArray(classes) ? classes.length : 0;
            }
        } catch (error) {
            console.warn('Failed to fetch class count:', error);
        }
        return 0;
    },

    /**
     * Handle logout action
     */
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            if (this.onLogout && typeof this.onLogout === 'function') {
                this.onLogout();
            } else {
                // Default logout behavior
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/index.html';
            }
        }
    },

    /**
     * Handle CSV import action - redirect to admin browse stories page
     */
    handleCSVImport() {
        // Check if user has permission (admin only)
        if (this.currentUser?.role !== 'amitrace_admin') {
            alert('You do not have permission to import CSV files. Admin access required.');
            return;
        }

        // Redirect to admin browse stories page where CSV import is now located
        window.location.href = '/admin-browse-stories.html';
    },

    /**
     * Update user information (for role switching or profile updates)
     * @param {Object} newUser - Updated user object
     */
    updateUser(newUser) {
        this.currentUser = newUser;
        this.updateUserDisplay();
        this.updateRoleVisibility();
        this.loadBadgeCounts();
    },

    /**
     * Set current page and update active states
     * @param {string} pageName - Current page identifier
     */
    setCurrentPage(pageName) {
        this.currentPage = pageName;
        this.updateActiveState();
    }
};

/**
 * Helper function to get user from localStorage
 * @returns {Object|null} User object or null if not found
 */
function getUserFromLocalStorage() {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch (error) {
        console.warn('Failed to parse user from localStorage:', error);
        return null;
    }
}

/**
 * Helper function to get current page from pathname
 * @returns {string} Current page identifier
 */
function getCurrentPageFromPath() {
    const path = window.location.pathname;
    
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('stories')) return 'stories';
    if (path.includes('add-story')) return 'add-story';
    if (path.includes('teacher-dashboard')) return 'teacher-dashboard';
    if (path.includes('admin')) return 'admin';
    
    return 'dashboard'; // Default fallback
}

/**
 * Auto-initialize navigation when DOM is loaded
 * This provides automatic setup for pages that don't manually initialize
 */
document.addEventListener('DOMContentLoaded', function() {
    // Only auto-initialize if VidPOD navbar exists and hasn't been manually initialized
    const navbar = document.getElementById('vidpodNavbar');
    if (navbar && !navbar.hasAttribute('data-initialized')) {
        const user = getUserFromLocalStorage();
        const currentPage = getCurrentPageFromPath();
        
        if (user) {
            VidPODNav.init({
                currentPage: currentPage,
                user: user,
                onLogout: function() {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/index.html';
                }
            });
            
            navbar.setAttribute('data-initialized', 'true');
        }
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VidPODNav;
}

// Make available globally
window.VidPODNav = VidPODNav;
window.VidPODNavigation = VidPODNav; // Backward compatibility

// DEPLOYMENT VERSION: 2025-08-20-16-15 - CRITICAL NAVIGATION FIXES
// This version includes:
// 1. Fixed amitrace_admin role recognition in validateRoleBasedAccess()
// 2. Fixed legacy adminLinks and teacherLinks to include amitrace_admin
// 3. Fixed token preservation in admin.js and dashboard.js
