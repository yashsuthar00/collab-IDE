/**
 * Global error handler middleware
 */
module.exports = (err, req, res, next) => {
  // Log error details for debugging
  console.error('Error:', err.stack);
  
  // Determine HTTP status code
  const statusCode = err.statusCode || 500;
  
  // Create response object
  const response = {
    success: false,
    message: err.message || 'Internal server error',
  };
  
  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = err;
    response.stack = err.stack;
  }
  
  // Send response
  res.status(statusCode).json(response);
};
