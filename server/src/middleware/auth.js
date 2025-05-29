const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware
 * Verifies JWT token and adds user data to request
 */
module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collab-ide-secret');
    
    // Add user to request
    req.user = {
      id: decoded.id || decoded.user?.id // Handle both token formats
    };

    // If you need to fetch the full user object from DB (optional)
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }
    
    req.user.email = user.email;
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    // Provide more specific error messages based on the error type
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token has expired', tokenExpired: true });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Token is not valid' });
    }
    res.status(401).json({ msg: 'Authentication failed' });
  }
};
