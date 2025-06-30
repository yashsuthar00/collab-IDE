const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

exports.protect = async (req, res, next) => {
  let token;
  
  // Log the auth header for debugging
  logger.debug('Auth middleware processing request', {
    path: req.path,
    hasAuthHeader: !!req.headers.authorization,
    hasCookies: !!req.cookies
  });
  
  // Check if token exists in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extract token from header
    token = req.headers.authorization.split(' ')[1];
    logger.debug('Found token in Authorization header');
  } 
  // Check if token exists in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    logger.debug('Found token in cookies');
  }
  
  // Check if token exists
  if (!token) {
    logger.debug('No token found, authentication failed');
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource'
    });
  }
  
  try {
    // Verify token
    logger.debug(`Verifying token: ${token.substring(0, 10)}...`);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug('Token verified successfully', { userId: decoded.id });
    
    // Find the user by id
    const user = await User.findById(decoded.id);
    
    if (!user) {
      logger.debug('User not found with decoded token ID');
      return res.status(401).json({
        success: false,
        message: 'User not found with this token'
      });
    }
    
    // Update last active timestamp
    user.lastActive = Date.now();
    await user.save({ validateBeforeSave: false });
    
    // Add user to req object
    req.user = user;
    logger.debug('User authenticated successfully', { userId: user._id });
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    // Provide more specific error messages based on the error type
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        tokenExpired: true
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
        invalidToken: true
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource',
      error: error.message
    });
  }
};

// Middleware for optional authentication
exports.optionalAuth = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user from token
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      logger.error('Optional auth middleware error:', error);
      // Don't return error - just continue without user
      req.user = null;
    }
  }

  next();
};
