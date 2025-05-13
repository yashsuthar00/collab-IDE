const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Enhanced logging utility for the server
 */
const logger = {
  /**
   * Log information messages
   * @param {string} message - The message to log
   * @param {any} data - Optional data to log
   */
  info: (message, data) => {
    console.log(`[INFO] ${message}`);
    if (data !== undefined && isDevelopment) {
      if (typeof data === 'object') {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(data);
      }
    }
  },
  
  /**
   * Log error messages
   * @param {string} message - The error message
   * @param {Error|any} error - The error object or data
   */
  error: (message, error) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(`${error.name}: ${error.message}`);
        console.error(error.stack);
      } else if (typeof error === 'object') {
        console.error(JSON.stringify(error, null, 2));
      } else {
        console.error(error);
      }
    }
  },
  
  /**
   * Log debug messages (only in development)
   * @param {string} message - The debug message
   * @param {any} data - Optional data to log
   */
  debug: (message, data) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`);
      if (data !== undefined) {
        if (typeof data === 'object') {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log(data);
        }
      }
    }
  },
  
  /**
   * Log warning messages
   * @param {string} message - The warning message
   * @param {any} data - Optional data to log
   */
  warn: (message, data) => {
    console.warn(`[WARNING] ${message}`);
    if (data !== undefined && isDevelopment) {
      if (typeof data === 'object') {
        console.warn(JSON.stringify(data, null, 2));
      } else {
        console.warn(data);
      }
    }
  }
};

module.exports = logger;
