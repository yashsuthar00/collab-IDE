const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'http';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      // Format object arguments for better readability
      let args = '';
      if (info.message && typeof info.message === 'object') {
        args = JSON.stringify(info.message, null, 2);
        info.message = '';
      }
      
      // Format additional metadata
      let meta = '';
      if (Object.keys(info).length > 3) { // timestamp, level, message are default
        const metaObj = { ...info };
        delete metaObj.timestamp;
        delete metaObj.level;
        delete metaObj.message;
        meta = JSON.stringify(metaObj, null, 2);
      }
      
      return `${info.timestamp} [${info.level}]: ${info.message} ${args} ${meta}`;
    },
  ),
);

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.json()
  ),
  transports: [
    // Console transport for all logs
    new winston.transports.Console({ format: consoleFormat }),
    
    // File transport for error logs
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
    }),
    
    // File transport for all logs
    new winston.transports.File({ filename: path.join('logs', 'combined.log') }),
  ],
});

// Export the logger
module.exports = logger;
