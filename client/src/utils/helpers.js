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
 * Creates a debounced function with immediate call option
 * @param {Function} func - The function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to invoke the function immediately
 * @returns {Function} - The debounced function
 */
export const enhancedDebounce = (func, wait, immediate = false) => {
  let timeout;
  
  return function(...args) {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
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
 * Merges multiple text operations more efficiently to reduce network traffic
 * @param {Array} operations - Array of text operations
 * @returns {Array} - Optimized array of operations
 */
export const optimizeOperations = (operations) => {
  if (!operations || operations.length <= 1) return operations;
  
  const result = [];
  let lastOp = null;
  
  // Sort operations by position to help with merging
  operations.sort((a, b) => {
    // First by timestamp
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    
    // Then by position
    return a.position - b.position;
  });
  
  for (const op of operations) {
    // If this is the first operation or different type from last one
    if (!lastOp || lastOp.type !== op.type) {
      lastOp = { ...op };
      result.push(lastOp);
      continue;
    }
    
    // Try to merge operations when possible
    if (op.type === 'insert' && lastOp.position + lastOp.text.length === op.position) {
      // Consecutive inserts can be merged
      lastOp.text += op.text;
    } else if (op.type === 'delete' && lastOp.position === op.position) {
      // Delete at same position can be merged
      lastOp.length += op.length;
    } else if (op.type === 'delete' && op.position + op.length === lastOp.position) {
      // Delete right before lastOp
      lastOp.position = op.position;
      lastOp.length += op.length;
    } else {
      // Cannot merge, add as new operation
      lastOp = { ...op };
      result.push(lastOp);
    }
  }
  
  return result;
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
