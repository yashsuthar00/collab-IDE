const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Optional authentication middleware
 * Verifies JWT token if provided, but allows requests without token
 * Useful for routes that can be both public and private
 */
exports.optionalAuth = async function(req, res, next) {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // If no token, continue as unauthenticated user
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collab-ide-secret');
    
    // Get user ID from token
    const userId = decoded.id || decoded.user?.id; // Handle both token formats
    
    if (!userId) {
      req.user = null;
      return next();
    }

    // Fetch the full user object from DB
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      // If user not found but token valid, just continue as unauthenticated
      req.user = null;
    } else {
      // Set the full user object on the request
      req.user = user;
    }
    
    next();
  } catch (err) {
    // For optional auth, just proceed as unauthenticated on error
    logger.debug('Optional auth failed, continuing as unauthenticated:', err.message);
    req.user = null;
    next();
  }
};
