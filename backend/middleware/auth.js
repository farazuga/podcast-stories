const jwt = require('jsonwebtoken');

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Check if user is admin (includes both admin and amitrace_admin)
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'amitrace_admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Check if user is Amitrace Admin (highest level)
const isAmitraceAdmin = (req, res, next) => {
  if (req.user.role !== 'amitrace_admin') {
    return res.status(403).json({ error: 'Access denied. Amitrace Admin privileges required.' });
  }
  next();
};

// Check if user is Teacher or above
const isTeacherOrAbove = (req, res, next) => {
  const allowedRoles = ['teacher', 'admin', 'amitrace_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Teacher privileges or above required.' });
  }
  next();
};

// Check if user is Student or above (essentially any authenticated user)
const isAuthenticated = (req, res, next) => {
  const allowedRoles = ['student', 'teacher', 'admin', 'amitrace_admin', 'user'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Valid user role required.' });
  }
  next();
};

// Check specific role
const hasRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: `Access denied. ${requiredRole} role required.` });
    }
    next();
  };
};

// Check multiple roles
const hasAnyRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. One of these roles required: ${allowedRoles.join(', ')}` });
    }
    next();
  };
};

// Optional authentication - sets user if token exists but doesn't require it
const optionalAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (token) {
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      req.user = verified;
    } catch (error) {
      // Invalid token, but we'll continue without user
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
};

module.exports = { 
  verifyToken, 
  isAdmin, 
  isAmitraceAdmin, 
  isTeacherOrAbove, 
  isAuthenticated, 
  hasRole, 
  hasAnyRole, 
  optionalAuth 
};