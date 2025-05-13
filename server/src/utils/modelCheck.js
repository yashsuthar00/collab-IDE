const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Utility to check if a MongoDB model exists and is properly initialized
 * @param {string} modelName - The name of the model to check
 * @returns {boolean} - True if the model exists, false otherwise
 */
function modelExists(modelName) {
  try {
    return !!mongoose.model(modelName);
  } catch (error) {
    return false;
  }
}

/**
 * Get a model safely with error handling
 * @param {string} modelName - The name of the model to get
 * @returns {mongoose.Model|null} - The model or null if it doesn't exist
 */
function getModel(modelName) {
  try {
    return mongoose.model(modelName);
  } catch (error) {
    logger.error(`Failed to get model: ${modelName}`, error);
    return null;
  }
}

/**
 * Validate object ID
 * @param {string} id - The ID to validate
 * @param {string} name - Name for error messages
 * @returns {Object} - Object with isValid flag and error message if invalid
 */
function validateObjectId(id, name = 'ID') {
  if (!id) {
    return { isValid: false, error: `${name} is required` };
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { isValid: false, error: `Invalid ${name} format` };
  }
  
  return { isValid: true };
}

module.exports = {
  modelExists,
  getModel,
  validateObjectId
};
