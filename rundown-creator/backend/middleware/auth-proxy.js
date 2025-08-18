const axios = require('axios');

/**
 * Auth Proxy Middleware for Rundown Creator
 * 
 * This middleware validates JWT tokens against the main VidPOD API
 * without duplicating authentication logic. It provides seamless
 * integration while maintaining independence.
 */

const VIDPOD_API_URL = process.env.VIDPOD_API_URL || 'http://localhost:3000/api';

/**
 * Verify token with main VidPOD API
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'No authorization token provided',
        service: 'rundown-creator'
      });
    }

    // Forward token to main VidPOD auth service
    console.log(`[AUTH-PROXY] Verifying token with VidPOD API: ${VIDPOD_API_URL}/auth/verify`);
    
    const response = await axios.get(`${VIDPOD_API_URL}/auth/verify`, {
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'VidPOD-Rundown-Creator/1.0'
      },
      timeout: 5000 // 5 second timeout
    });

    if (response.status === 200 && response.data.user) {
      // Add user info to request object
      req.user = response.data.user;
      req.token = authHeader.split(' ')[1]; // Store clean token
      
      console.log(`[AUTH-PROXY] Authentication successful for user: ${req.user.username || req.user.email} (${req.user.role})`);
      next();
    } else {
      console.log(`[AUTH-PROXY] Invalid token response from VidPOD API`);
      return res.status(401).json({ 
        error: 'Invalid authentication token',
        service: 'rundown-creator'
      });
    }
  } catch (error) {
    console.error('[AUTH-PROXY] Authentication error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Main VidPOD service unavailable. Please ensure the main application is running.',
        service: 'rundown-creator',
        details: 'Cannot connect to VidPOD API for authentication'
      });
    }
    
    if (error.response && error.response.status === 401) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        service: 'rundown-creator',
        details: error.response.data?.error || 'Invalid token'
      });
    }
    
    return res.status(500).json({ 
      error: 'Authentication service error',
      service: 'rundown-creator',
      details: error.message
    });
  }
};

/**
 * Require specific role middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        service: 'rundown-creator'
      });
    }
    
    const userRole = req.user.role;
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!allowed.includes(userRole)) {
      console.log(`[AUTH-PROXY] Access denied. User role: ${userRole}, Required: ${allowed.join(', ')}`);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        service: 'rundown-creator',
        required_roles: allowed,
        user_role: userRole
      });
    }
    
    next();
  };
};

/**
 * Get user's classes from main VidPOD API
 */
const getUserClasses = async (token) => {
  try {
    const response = await axios.get(`${VIDPOD_API_URL}/classes`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'VidPOD-Rundown-Creator/1.0'
      },
      timeout: 5000
    });
    
    return response.data;
  } catch (error) {
    console.error('[AUTH-PROXY] Error fetching user classes:', error.message);
    return [];
  }
};

/**
 * Get available stories from main VidPOD API
 */
const getAvailableStories = async (token, filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters);
    const url = `${VIDPOD_API_URL}/stories${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'VidPOD-Rundown-Creator/1.0'
      },
      timeout: 10000 // Stories might take longer to load
    });
    
    return response.data;
  } catch (error) {
    console.error('[AUTH-PROXY] Error fetching stories:', error.message);
    return [];
  }
};

/**
 * Get specific story details from main VidPOD API
 */
const getStoryById = async (token, storyId) => {
  try {
    const response = await axios.get(`${VIDPOD_API_URL}/stories/${storyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'VidPOD-Rundown-Creator/1.0'
      },
      timeout: 5000
    });
    
    return response.data;
  } catch (error) {
    console.error(`[AUTH-PROXY] Error fetching story ${storyId}:`, error.message);
    return null;
  }
};

/**
 * Middleware to add VidPOD API helper functions to request
 */
const addVidPodHelpers = (req, res, next) => {
  req.vidpod = {
    getUserClasses: () => getUserClasses(req.token),
    getAvailableStories: (filters) => getAvailableStories(req.token, filters),
    getStoryById: (storyId) => getStoryById(req.token, storyId)
  };
  next();
};

module.exports = {
  verifyToken,
  requireRole,
  addVidPodHelpers,
  getUserClasses,
  getAvailableStories,
  getStoryById
};