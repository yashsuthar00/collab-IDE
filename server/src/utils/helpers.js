const crypto = require('crypto');

/**
 * Generate a random slug for shared code URLs
 * @param {number} length - Length of the slug in bytes (default: 4)
 * @returns {string} - Hexadecimal string
 */
exports.generateSlug = (length = 4) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Calculate expiration date from now
 * @param {number} seconds - Seconds from now
 * @returns {Date} - Expiration date
 */
exports.calculateExpirationDate = (seconds) => {
  return new Date(Date.now() + seconds * 1000);
};
