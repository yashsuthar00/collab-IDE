/**
 * Utility functions for working with localStorage
 */

// Check if localStorage is available
export const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error('localStorage not available:', e);
    return false;
  }
};

// Save data to localStorage with error handling
export const saveToStorage = (key, value) => {
  if (!isLocalStorageAvailable()) return false;
  
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
    return false;
  }
};

// Get data from localStorage with error handling
export const getFromStorage = (key, defaultValue = null) => {
  if (!isLocalStorageAvailable()) return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item !== null ? item : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

// Remove data from localStorage with error handling
export const removeFromStorage = (key) => {
  if (!isLocalStorageAvailable()) return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
};

// Clear all keys with a specific prefix
export const clearStorageWithPrefix = (prefix) => {
  if (!isLocalStorageAvailable()) return false;
  
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.error(`Error clearing localStorage with prefix (${prefix}):`, error);
    return false;
  }
};
