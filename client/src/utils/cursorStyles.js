/**
 * Utilities for handling remote user cursors in the collaborative editor
 */

/**
 * Generate a unique color for a user based on their ID
 * @param {string} userId - The user's unique identifier
 * @returns {string} A CSS color string
 */
export const generateUserColor = (userId) => {
  // Predefined color palette for better readability and aesthetics
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F9C80E',
    '#FF8C42', '#A4036F', '#048BA8', '#16DB93', '#EFBCD5',
    '#3A86FF', '#FF006E', '#8338EC', '#FB5607', '#FFBE0B'
  ];
  
  // Create a consistent hash from the userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use the hash to select a color from the palette
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/**
 * Create a CSS style element for a user's cursor
 * @param {string} userId - The user's unique identifier
 * @param {string} color - The cursor color
 * @param {string} userName - The user's display name
 */
export const createCursorStyleElement = (userId, color, userName) => {
  const styleId = `cursor-style-${userId}`;
  let styleEl = document.getElementById(styleId);
  
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  
  styleEl.innerHTML = `
    .remote-cursor-${userId} {
      background-color: ${color} !important;
      width: 2px !important;
      height: 18px !important;
      position: absolute;
      z-index: 10000;
      animation: cursor-blink 1s infinite;
    }
    
    .remote-cursor-line-${userId} {
      position: relative;
    }
    
    .remote-cursor-name-${userId}::before {
      content: "${userName || 'User'}";
      position: absolute;
      top: -20px;
      background-color: ${color};
      color: white;
      font-size: 10px;
      padding: 2px 4px;
      border-radius: 2px;
      white-space: nowrap;
      z-index: 10001;
      pointer-events: none;
      text-shadow: 0px 0px 2px rgba(0, 0, 0, 0.5);
    }
    
    .remote-cursor-name-text-${userId} {
      background-color: ${color};
      color: white;
      font-size: 10px;
      padding: 2px 4px;
      border-radius: 2px;
      white-space: nowrap;
      z-index: 10001;
      text-shadow: 0px 0px 2px rgba(0, 0, 0, 0.5);
    }
    
    .remote-selection-${userId} {
      background-color: ${color}33;
      border: 1px solid ${color};
      border-radius: 2px;
    }
  `;
};

/**
 * Remove cursor style element for a user
 * @param {string} userId - The user's unique identifier
 */
export const removeCursorStyleElement = (userId) => {
  const styleId = `cursor-style-${userId}`;
  const styleEl = document.getElementById(styleId);
  
  if (styleEl) {
    styleEl.remove();
  }
};

/**
 * Create decorations for a user's cursor
 * @param {Object} monaco - The Monaco editor instance
 * @param {string} userId - The user's ID
 * @param {Object} position - The cursor position
 * @param {string} userName - The user's name
 * @returns {Array} Decoration options array
 */
export const createCursorDecorations = (monaco, userId, position, userName) => {
  return [
    {
      range: new monaco.Range(
        position.lineNumber,
        position.column,
        position.lineNumber,
        position.column
      ),
      options: {
        className: `remote-cursor-${userId}`,
        hoverMessage: { value: userName || 'User' },
        zIndex: 10
      }
    },
    {
      range: new monaco.Range(
        position.lineNumber,
        1,
        position.lineNumber,
        1
      ),
      options: {
        className: `remote-cursor-line-${userId}`,
        marginClassName: `remote-cursor-name-${userId}`
      }
    }
  ];
};
