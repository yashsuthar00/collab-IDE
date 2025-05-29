const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;
  
  // Check if token exists in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extract token from header
    token = req.headers.authorization.split(' ')[1];
  } 
  // Check if token exists in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource'
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user by id
    const user = await User.findById(decoded.id);
    
    if (!user) {
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
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    // Provide more specific error messages based on the error type
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        tokenExpired: true
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource'
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
      console.error('Optional auth middleware error:', error);
      // Don't return error - just continue without user
      req.user = null;
    }
  }

  next();
};
