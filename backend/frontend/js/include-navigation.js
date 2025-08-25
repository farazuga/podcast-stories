/**
 * VidPOD Navigation Include System
 * Dynamically loads the navigation component into pages
 */

const NavigationLoader = {
    /**
     * Load navigation component into a target element
     * @param {string} targetSelector - CSS selector for target element
     * @param {string} currentPage - Current page identifier
     */
    async loadNavigation(targetSelector = 'body', currentPage = null) {
        try {
            // Fetch the navigation HTML
            const response = await fetch('/includes/navigation.html');
            if (!response.ok) {
                throw new Error('Failed to load navigation component');
            }
            
            const navigationHTML = await response.text();
            
            // Insert navigation at the beginning of target element
            const targetElement = document.querySelector(targetSelector);
            if (targetElement) {
                targetElement.insertAdjacentHTML('afterbegin', navigationHTML);
            } else {
                console.error('Target element not found:', targetSelector);
                return;
            }
            
            // Auto-detect current page if not provided
            if (!currentPage) {
                currentPage = this.getCurrentPageFromPath();
            }
            
            // Initialize navigation after DOM insertion
            this.initializeNavigation(currentPage);
            
        } catch (error) {
            console.error('Failed to load navigation:', error);
            // Fallback: show basic navigation
            this.showFallbackNavigation(targetSelector);
        }
    },

    /**
     * Initialize navigation after loading
     * @param {string} currentPage - Current page identifier
     */
    initializeNavigation(currentPage) {
        // Wait for navigation JavaScript to be available
        if (typeof VidPODNav !== 'undefined') {
            this.setupNavigation(currentPage);
        } else {
            // Wait a bit for the script to load
            setTimeout(() => {
                if (typeof VidPODNav !== 'undefined') {
                    this.setupNavigation(currentPage);
                } else {
                    console.warn('VidPODNav not available, using basic initialization');
                    this.basicInitialization(currentPage);
                }
            }, 100);
        }
    },

    /**
     * Setup navigation with full functionality
     * @param {string} currentPage - Current page identifier
     */
    setupNavigation(currentPage) {
        const user = this.getUserFromLocalStorage();
        
        VidPODNav.init({
            currentPage: currentPage,
            user: user,
            onLogout: this.handleLogout.bind(this)
        });
    },

    /**
     * Basic navigation initialization without full VidPODNav
     * @param {string} currentPage - Current page identifier
     */
    basicInitialization(currentPage) {
        // Set active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === currentPage) {
                item.classList.add('active');
            }
        });

        // Setup mobile menu
        const mobileToggle = document.getElementById('mobileToggle');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (mobileToggle && mobileMenu) {
            mobileToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
            });
        }

        // Update user display
        this.updateBasicUserDisplay();
    },

    /**
     * Update user display with basic functionality
     */
    updateBasicUserDisplay() {
        const user = this.getUserFromLocalStorage();
        if (!user) return;

        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const userAvatar = document.getElementById('userAvatar');

        // Update user name
        if (userName) {
            const displayName = user.name || user.email || user.username || 'User';
            userName.textContent = displayName;
        }

        // Update user role with proper formatting and styling
        if (userRole && user.role) {
            let roleText = user.role;
            switch (user.role) {
                case 'amitrace_admin':
                case 'admin':
                    roleText = 'Admin';
                    break;
                case 'teacher':
                    roleText = 'Teacher';
                    break;
                case 'student':
                    roleText = 'Student';
                    break;
                default:
                    roleText = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            }
            userRole.textContent = roleText;
            userRole.className = `user-role ${user.role}`;
        }

        // Remove duplicate code - already handled above
        
        if (userAvatar && user.name) {
            userAvatar.textContent = user.name.substring(0, 2).toUpperCase();
        }

        // Handle role-based visibility
        if (user.role) {
            document.querySelectorAll('[data-role]').forEach(element => {
                const allowedRoles = element.getAttribute('data-role').split(',');
                element.style.display = allowedRoles.includes(user.role) ? '' : 'none';
            });
        }
    },

    /**
     * Get current page from URL path
     * @returns {string} Current page identifier
     */
    getCurrentPageFromPath() {
        const path = window.location.pathname;
        
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('stories')) return 'stories';
        if (path.includes('add-story')) return 'add-story';
        if (path.includes('teacher-dashboard')) return 'teacher-dashboard';
        if (path.includes('admin')) return 'admin';
        
        return 'dashboard'; // Default fallback
    },

    /**
     * Get user from localStorage
     * @returns {Object|null} User object or null
     */
    getUserFromLocalStorage() {
        try {
            const user = localStorage.getItem('user');
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.warn('Failed to parse user from localStorage:', error);
            return null;
        }
    },

    /**
     * Handle logout action
     */
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        }
    },

    /**
     * Show fallback navigation if loading fails
     * @param {string} targetSelector - CSS selector for target element
     */
    showFallbackNavigation(targetSelector) {
        const fallbackNav = `
            <nav style="background: #fff; padding: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100;">
                <div style="display: flex; align-items: center; max-width: 1400px; margin: 0 auto;">
                    <a href="/dashboard.html" style="color: #f79b5b; font-size: 1.5rem; font-weight: 700; text-decoration: none; margin-right: 2rem;">
                        📻 VidPOD
                    </a>
                    <div style="display: flex; gap: 1rem; flex: 1;">
                        <a href="/dashboard.html" style="padding: 0.5rem 1rem; color: #666; text-decoration: none;">Dashboard</a>
                        <a href="/stories.html" style="padding: 0.5rem 1rem; color: #666; text-decoration: none;">Browse Stories</a>
                        <a href="/add-story.html" style="padding: 0.5rem 1rem; color: #666; text-decoration: none;">Add Story</a>
                    </div>
                    <button onclick="NavigationLoader.handleLogout()" style="padding: 0.5rem 1rem; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer;">
                        Logout
                    </button>
                </div>
            </nav>
        `;
        
        const targetElement = document.querySelector(targetSelector);
        if (targetElement) {
            targetElement.insertAdjacentHTML('afterbegin', fallbackNav);
        }
    }
};

/**
 * Auto-load navigation when DOM is ready
 * Can be disabled by setting window.autoLoadNavigation = false before this script loads
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if auto-loading is disabled
    if (window.autoLoadNavigation === false) {
        return;
    }

    // Check if navigation already exists
    if (document.getElementById('vidpodNavbar')) {
        return;
    }

    // Auto-load navigation
    NavigationLoader.loadNavigation('body');
});

// Make available globally
window.NavigationLoader = NavigationLoader;