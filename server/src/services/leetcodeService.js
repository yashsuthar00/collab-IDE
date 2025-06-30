const Directory = require('../models/Directory');
const logger = require('../utils/logger');

/**
 * Creates or gets the LeetCode directory for a user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The LeetCode directory
 */
const createLeetcodeDirectory = async (userId) => {
  try {
    // Look for root directory using the existing schema structure (with owner field)
    let rootDir = await Directory.findOne({ 
      owner: userId,
      parent: null
    });
    
    // Create root directory if it doesn't exist
    if (!rootDir) {
      rootDir = new Directory({
        name: 'My Files',
        owner: userId,
        parent: null,
        isPublic: false
      });
      await rootDir.save();
      logger.info(`Created root directory for user ${userId}`);
    }
    
    // Look for LeetCode directory using the existing schema structure
    let leetcodeDir = await Directory.findOne({
      owner: userId,
      name: 'LeetCode',
      parent: rootDir._id
    });
    
    // Create LeetCode directory if it doesn't exist
    if (!leetcodeDir) {
      leetcodeDir = new Directory({
        name: 'LeetCode',
        owner: userId,
        parent: rootDir._id,
        isPublic: false
      });
      await leetcodeDir.save();
      logger.info(`Created LeetCode directory for user ${userId}`);
    }
    
    return leetcodeDir;
  } catch (error) {
    logger.error('Error creating LeetCode directory:', error);
    throw new Error('Failed to create LeetCode directory: ' + error.message);
  }
};

/**
 * Gets a sanitized filename from a problem title
 * @param {string} title - The problem title
 * @param {string} language - The programming language
 * @returns {string} - Sanitized filename with extension
 */
const getSanitizedFilename = (title, language) => {
  // Remove special characters and spaces
  const sanitizedTitle = title
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  
  return `${sanitizedTitle}.${getFileExtension(language)}`;
};

/**
 * Gets the file extension for a language
 * @param {string} language - The programming language
 * @returns {string} - Appropriate file extension
 */
const getFileExtension = (language) => {
  const extensions = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    php: 'php',
    ruby: 'rb',
    go: 'go',
    rust: 'rs',
    swift: 'swift',
    kotlin: 'kt'
  };
  
  return extensions[language.toLowerCase()] || 'txt';
};

module.exports = {
  createLeetcodeDirectory,
  getSanitizedFilename,
  getFileExtension
};
