const logger = require('../utils/logger');

/**
 * Global error handler middleware
 */
module.exports = function(err, req, res, next) {
  // Log the error
  logger.error('Unhandled error in request:', err);
  
  // Check if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Set status code
  const statusCode = err.statusCode || 500;
  
  // Send error response
  res.status(statusCode).json({
    msg: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    code: err.code || 'INTERNAL_ERROR'
  });
};
