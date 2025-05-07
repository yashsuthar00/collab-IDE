/**
 * Format MongoDB/Mongoose errors into a standardized format
 * @param {Error} error - The error object from MongoDB/Mongoose
 * @returns {Object} Formatted error object
 */
exports.formatMongoDBError = (error) => {
  if (error.name === 'ValidationError') {
    // Handle validation errors
    const errors = Object.values(error.errors).map(err => err.message);
    return {
      message: 'Validation error',
      details: errors,
      statusCode: 400
    };
  } else if (error.code === 11000) {
    // Handle duplicate key errors
    const field = Object.keys(error.keyValue)[0];
    return {
      message: `Duplicate field: ${field} already exists`,
      details: [`${field} must be unique`],
      statusCode: 409
    };
  } else {
    // Default error format for other MongoDB errors
    return {
      message: error.message || 'Database error occurred',
      details: [],
      statusCode: 500
    };
  }
};

/**
 * Create a custom error with status code
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Error} Custom error
 */
exports.createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};
