// Enhanced Swipe detection utility for mobile devices
// This utility detects horizontal swipe gestures and calls the provided callback functions

const SWIPE_THRESHOLD = 50; // Minimum distance to consider a valid swipe
const SWIPE_TIMEOUT = 300; // Maximum time in milliseconds for a valid swipe gesture

// Store callbacks for external access
let switchToOutputCallback = null;
let switchToCodeCallback = null;

/**
 * Function to programmatically switch to output view - can be called from other components
 * @returns {boolean} - Whether the switch was successful
 */
export const switchToOutput = () => {
  if (switchToOutputCallback && window.innerWidth < 768) {
    const mobileView = document.body.getAttribute('data-mobile-view');
    // Only switch if we're in code view
    if (mobileView === 'code') {
      switchToOutputCallback();
      return true;
    }
  }
  return false;
};

/**
 * Function to programmatically switch to code view - can be called from other components
 * @returns {boolean} - Whether the switch was successful
 */
export const switchToCode = () => {
  if (switchToCodeCallback && window.innerWidth < 768) {
    const mobileView = document.body.getAttribute('data-mobile-view');
    // Only switch if we're in output view
    if (mobileView === 'output') {
      switchToCodeCallback();
      return true;
    }
  }
  return false;
};

/**
 * Initialize swipe detection for an element
 * @param {HTMLElement} element - The DOM element to attach swipe detection to
 * @param {Function} onSwipeLeft - Callback function when swiping left
 * @param {Function} onSwipeRight - Callback function when swiping right
 * @returns {Function} - Cleanup function to remove event listeners
 */
export const initSwipeDetection = (element, onSwipeLeft, onSwipeRight) => {
  if (!element) return () => {};

  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let touchStartTime = 0;
  let isTracking = false;
  
  // Check if user has swiped before
  const hasSwipedBefore = localStorage.getItem('user-has-swiped') === 'true';
  
  // Only show debug logs in development
  const isDebug = process.env.NODE_ENV === 'development';
  
  // Function to mark user as having swiped
  const markUserHasSwiped = () => {
    if (!hasSwipedBefore) {
      localStorage.setItem('user-has-swiped', 'true');
    }
  };

  const handleTouchStart = (event) => {
    isTracking = true;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchStartTime = Date.now();
    
    // Only log if in debug mode
    if (isDebug) {
      console.log(`Touch start on ${element.id || 'unknown element'}: ${touchStartX}, ${touchStartY}`);
    }
  };

  const handleTouchMove = (event) => {
    if (!isTracking) return;
    
    // Update current touch position
    touchEndX = event.touches[0].clientX;
    touchEndY = event.touches[0].clientY;
    
    // Calculate horizontal and vertical distances
    const xDiff = touchStartX - touchEndX;
    const yDiff = Math.abs(touchStartY - touchEndY);
    
    // Early check for swipe direction - don't process invalid swipe directions
    if ((xDiff > 0 && !onSwipeLeft) || (xDiff < 0 && !onSwipeRight)) {
      // This is a swipe in a direction we don't support for this element
      // Don't prevent default scrolling in this case
      return;
    }
    
    // Only log if in debug mode
    if (isDebug) {
      console.log(`Touch move: dx=${xDiff}, dy=${yDiff}`);
    }
    
    // If horizontal swipe is more significant than vertical, prevent default scrolling
    if (Math.abs(xDiff) > yDiff && Math.abs(xDiff) > 25) {
      event.preventDefault();
      // Visual feedback removed as requested
    }
  };

  const handleTouchEnd = (event) => {
    if (!isTracking) return;
    
    isTracking = false;
    touchEndX = event.changedTouches[0].clientX;
    touchEndY = event.changedTouches[0].clientY;
    
    // Remove any panel transition indicator
    const indicator = document.getElementById('panel-transition-indicator');
    if (indicator) {
      indicator.style.opacity = '0';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 150);
    }
    
    const touchElapsedTime = Date.now() - touchStartTime;
    
    // Only log if in debug mode
    if (isDebug) {
      console.log(`Touch end: dx=${touchStartX - touchEndX}, dy=${touchStartY - touchEndY}, time=${touchElapsedTime}ms`);
    }
    
    // Check if the swipe was fast enough and long enough
    if (touchElapsedTime <= SWIPE_TIMEOUT) {
      // Calculate horizontal and vertical distances
      const xDiff = touchStartX - touchEndX;
      const yDiff = Math.abs(touchStartY - touchEndY);
      
      // Early check for swipe direction - don't process invalid swipe directions
      if ((xDiff > 0 && !onSwipeLeft) || (xDiff < 0 && !onSwipeRight)) {
        // This is a swipe in a direction we don't support for this element
        return;
      }
      
      // Only trigger if horizontal swipe is more significant than vertical
      // and exceeds the threshold
      if (Math.abs(xDiff) > SWIPE_THRESHOLD && Math.abs(xDiff) > yDiff) {
        if (isDebug) {
          console.log(`Valid swipe detected: ${xDiff > 0 ? 'left' : 'right'}`);
        }
        
        // Mark that user has completed a swipe for future reference
        markUserHasSwiped();
        
        if (xDiff > 0) {
          // Swipe left - only call if callback exists
          if (onSwipeLeft) onSwipeLeft();
        } else {
          // Swipe right - only call if callback exists
          if (onSwipeRight) onSwipeRight();
        }
      }
    }
  };

  // Add event listeners with proper options
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  // Return a cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
  };
};

/**
 * Initialize swipe detection for code editor and output panel
 * @param {Function} onSwipeLeft - Callback function when swiping left
 * @param {Function} onSwipeRight - Callback function when swiping right
 * @returns {Function} - Cleanup function to remove event listeners
 */
export const initAppSwipeDetection = (onSwipeLeft, onSwipeRight) => {
  const isDebug = process.env.NODE_ENV === 'development';
  if (isDebug) {
    console.log('Initializing app swipe detection');
  }
  
  // Store callbacks for external access
  switchToOutputCallback = onSwipeLeft;
  switchToCodeCallback = onSwipeRight;
  
  // Check if user is on mobile
  const isMobile = window.innerWidth < 768;
  
  // Check if this is a new user to the swipe feature
  const hasSwipedBefore = localStorage.getItem('user-has-swiped') === 'true';
  
  // Show swipe tutorial only for mobile users who haven't swiped before
  // And only show it once per session
  const hasSeenTutorialThisSession = sessionStorage.getItem('swipe-tutorial-seen') === 'true';
  
  if (isMobile && !hasSwipedBefore && !hasSeenTutorialThisSession) {
    // Only show tutorial with 20% probability to avoid annoying users
    // or if they've never seen it and it's their first session
    const shouldShowTutorial = 
      !localStorage.getItem('swipe-tutorial-ever-seen') || 
      Math.random() < 0.2;
    
    if (shouldShowTutorial) {
      // Mark as seen this session
      sessionStorage.setItem('swipe-tutorial-seen', 'true');
      // Mark as seen ever
      localStorage.setItem('swipe-tutorial-ever-seen', 'true');
      
      // Show a subtle tutorial hint that disappears after 3 seconds
      const hint = document.createElement('div');
      hint.style.position = 'fixed';
      hint.style.bottom = '20px';
      hint.style.left = '50%';
      hint.style.transform = 'translateX(-50%)';
      hint.style.backgroundColor = 'rgba(59, 130, 246, 0.9)';
      hint.style.color = 'white';
      hint.style.padding = '8px 16px';
      hint.style.borderRadius = '20px';
      hint.style.fontSize = '14px';
      hint.style.fontWeight = '500';
      hint.style.zIndex = '9999';
      hint.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
      hint.style.transition = 'opacity 0.3s ease';
      hint.textContent = 'Swipe left for output, right for code';
      document.body.appendChild(hint);
      
      // Remove hint after 3 seconds
      setTimeout(() => {
        hint.style.opacity = '0';
        setTimeout(() => {
          if (hint.parentNode) {
            hint.parentNode.removeChild(hint);
          }
        }, 300);
      }, 3000);
    }
  }
  
  // Prevent browser back/forward gesture on iOS Safari
  document.body.style.overscrollBehaviorX = 'none';

  // Create touch detection zones that overlay the entire screen
  // when in mobile view (for more reliable detection)
  const codeSwipeZone = document.createElement('div');
  codeSwipeZone.id = 'code-swipe-zone';
  codeSwipeZone.style.position = 'fixed';
  codeSwipeZone.style.top = '0';
  codeSwipeZone.style.left = '0';
  codeSwipeZone.style.width = '100%';
  codeSwipeZone.style.height = '100%';
  codeSwipeZone.style.zIndex = '1000';
  codeSwipeZone.style.display = 'none'; // Initially hidden
  codeSwipeZone.style.touchAction = 'pan-y'; // Allow vertical scrolling but capture horizontal
  document.body.appendChild(codeSwipeZone);
  
  const outputSwipeZone = document.createElement('div');
  outputSwipeZone.id = 'output-swipe-zone';
  outputSwipeZone.style.position = 'fixed';
  outputSwipeZone.style.top = '0';
  outputSwipeZone.style.left = '0';
  outputSwipeZone.style.width = '100%';
  outputSwipeZone.style.height = '100%';
  outputSwipeZone.style.zIndex = '1000';
  outputSwipeZone.style.display = 'none'; // Initially hidden
  outputSwipeZone.style.touchAction = 'pan-y'; // Allow vertical scrolling but capture horizontal
  document.body.appendChild(outputSwipeZone);
  
  // Show the appropriate swipe zone based on which view is active
  const updateSwipeZones = () => {
    const mobileView = document.body.getAttribute('data-mobile-view');
    
    if (mobileView === 'code') {
      codeSwipeZone.style.display = 'block';
      outputSwipeZone.style.display = 'none';
    } else if (mobileView === 'output') {
      codeSwipeZone.style.display = 'none';
      outputSwipeZone.style.display = 'block';
    } else {
      codeSwipeZone.style.display = 'none';
      outputSwipeZone.style.display = 'none';
    }
  };
  
  // Update initially
  setTimeout(updateSwipeZones, 100);
  
  // Update when mobile view changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-mobile-view') {
        updateSwipeZones();
      }
    });
  });
  
  observer.observe(document.body, { attributes: true });
  
  // Set up directional swipe detection on the zones
  // For code view, only allow swiping left to go to output
  const codeCleanup = initSwipeDetection(codeSwipeZone, onSwipeLeft, null);
  // For output view, only allow swiping right to go back to code
  const outputCleanup = initSwipeDetection(outputSwipeZone, null, onSwipeRight);
  
  // Add direct detection on the panels as well for redundancy
  const panelCleanups = [];
  
  setTimeout(() => {
    const codeEditor = document.getElementById('code-editor');
    const outputPanel = document.getElementById('output-panel');
    
    if (codeEditor) {
      // For code editor, only detect swipe left to go to output
      panelCleanups.push(initSwipeDetection(codeEditor, onSwipeLeft, null));
    }
    
    if (outputPanel) {
      // For output panel, only detect swipe right to go back to code
      panelCleanups.push(initSwipeDetection(outputPanel, null, onSwipeRight));
    }
  }, 500);
  
  return () => {
    document.body.style.overscrollBehaviorX = '';
    codeCleanup();
    outputCleanup();
    panelCleanups.forEach(cleanup => cleanup());
    
    // Clear stored callbacks
    switchToOutputCallback = null;
    switchToCodeCallback = null;
    
    if (codeSwipeZone.parentNode) {
      codeSwipeZone.parentNode.removeChild(codeSwipeZone);
    }
    
    if (outputSwipeZone.parentNode) {
      outputSwipeZone.parentNode.removeChild(outputSwipeZone);
    }
    
    observer.disconnect();
  };
};

export default {
  initSwipeDetection,
  initAppSwipeDetection,
  switchToOutput,
  switchToCode
};
