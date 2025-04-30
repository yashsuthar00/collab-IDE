/**
 * Helper functions for various application needs
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param {Function} func The function to debounce
 * @param {number} wait The number of milliseconds to delay
 * @return {Function} The debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttles a function to execute at most once per specified time period
 * 
 * @param {Function} func The function to throttle
 * @param {number} limit The time limit in milliseconds
 * @return {Function} The throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle = false;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Generates a random ID
 * @param {number} length Length of the ID
 * @return {string} Random ID
 */
export const generateId = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length);
};

/**
 * Compare two text strings and generate diff operations
 * This is a very simple implementation - production code would use a proper diff algorithm
 *
 * @param {string} oldText - Original text
 * @param {string} newText - New text
 * @returns {Array} Array of operations (insert or delete)
 */
export const diffTexts = (oldText, newText) => {
  // This is a very naive implementation - real-world would use Myers diff or similar
  if (oldText === newText) return [];
  
  // Find common prefix
  let i = 0;
  while (i < oldText.length && i < newText.length && oldText[i] === newText[i]) {
    i++;
  }
  
  // Find common suffix
  let oldEnd = oldText.length - 1;
  let newEnd = newText.length - 1;
  while (oldEnd >= i && newEnd >= i && oldText[oldEnd] === newText[newEnd]) {
    oldEnd--;
    newEnd--;
  }
  
  const ops = [];
  
  // If there are characters to delete
  if (oldEnd >= i) {
    ops.push({
      type: 'delete',
      position: i,
      length: oldEnd - i + 1
    });
  }
  
  // If there are characters to insert
  if (newEnd >= i) {
    ops.push({
      type: 'insert',
      position: i,
      text: newText.substring(i, newEnd + 1)
    });
  }
  
  return ops;
};

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, deepClone(value)])
  );
};
