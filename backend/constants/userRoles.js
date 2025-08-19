/**
 * User Roles Constants
 * Centralized user role definitions and permissions
 */

const USER_ROLES = {
  // Role definitions
  AMITRACE_ADMIN: 'amitrace_admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
};

const ROLE_PERMISSIONS = {
  [USER_ROLES.AMITRACE_ADMIN]: {
    canManageSchools: true,
    canApproveTeachers: true,
    canDeleteAnyStory: true,
    canViewAllStories: true,
    canManageAllUsers: true,
    canAccessAdminPanel: true,
    canViewAnalytics: true,
    canManageTags: true,
    canImportCSV: true,
    canCreateStories: true,
    canEditOwnStories: true,
    canFavoriteStories: true
  },
  
  [USER_ROLES.TEACHER]: {
    canManageSchools: false,
    canApproveTeachers: false,
    canDeleteAnyStory: false,
    canViewAllStories: true,
    canManageAllUsers: false,
    canAccessAdminPanel: false,
    canViewAnalytics: true,
    canManageTags: false,
    canImportCSV: true,
    canCreateStories: true,
    canEditOwnStories: true,
    canFavoriteStories: true,
    canCreateClasses: true,
    canManageOwnClasses: true,
    canViewClassAnalytics: true
  },
  
  [USER_ROLES.STUDENT]: {
    canManageSchools: false,
    canApproveTeachers: false,
    canDeleteAnyStory: false,
    canViewAllStories: true,
    canManageAllUsers: false,
    canAccessAdminPanel: false,
    canViewAnalytics: false,
    canManageTags: false,
    canImportCSV: false,
    canCreateStories: true,
    canEditOwnStories: true,
    canFavoriteStories: true,
    canJoinClasses: true,
    canViewOwnClasses: true
  }
};

const ROLE_DISPLAY_NAMES = {
  [USER_ROLES.AMITRACE_ADMIN]: 'Administrator',
  [USER_ROLES.TEACHER]: 'Teacher',
  [USER_ROLES.STUDENT]: 'Student'
};

const ROLE_BADGES = {
  [USER_ROLES.AMITRACE_ADMIN]: {
    color: '#e74c3c',
    icon: '👑',
    text: 'Admin'
  },
  [USER_ROLES.TEACHER]: {
    color: '#3498db',
    icon: '👨‍🏫',
    text: 'Teacher'
  },
  [USER_ROLES.STUDENT]: {
    color: '#2ecc71',
    icon: '👨‍🎓',
    text: 'Student'
  }
};

const roleHelpers = {
  /**
   * Check if a role is valid
   * @param {string} role - Role to validate
   * @returns {boolean} True if valid role
   */
  isValidRole(role) {
    return Object.values(USER_ROLES).includes(role);
  },

  /**
   * Check if user has permission
   * @param {string} userRole - User's role
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   */
  hasPermission(userRole, permission) {
    return ROLE_PERMISSIONS[userRole]?.[permission] || false;
  },

  /**
   * Get all permissions for a role
   * @param {string} role - User role
   * @returns {object} Role permissions object
   */
  getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || {};
  },

  /**
   * Get display name for role
   * @param {string} role - User role
   * @returns {string} Display name
   */
  getRoleDisplayName(role) {
    return ROLE_DISPLAY_NAMES[role] || 'Unknown';
  },

  /**
   * Get badge info for role
   * @param {string} role - User role
   * @returns {object} Badge information
   */
  getRoleBadge(role) {
    return ROLE_BADGES[role] || { color: '#6c757d', icon: '👤', text: 'Unknown' };
  },

  /**
   * Get roles that can perform specific action
   * @param {string} permission - Permission to check
   * @returns {Array} Array of roles with permission
   */
  getRolesWithPermission(permission) {
    return Object.keys(ROLE_PERMISSIONS).filter(role => 
      ROLE_PERMISSIONS[role][permission]
    );
  }
};

module.exports = {
  USER_ROLES,
  ROLE_PERMISSIONS,
  ROLE_DISPLAY_NAMES,
  ROLE_BADGES,
  roleHelpers
};