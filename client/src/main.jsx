import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

// Silence React Router future flag warnings and socket warnings
const originalConsoleWarn = console.warn;
console.warn = function(message, ...args) {
  if (message && typeof message === 'string' && 
      (message.includes('React Router Future Flag Warning') || 
       message.includes('React Router will begin wrapping') ||
       message.includes('Socket connected but no ID assigned yet'))) {
    // For socket warnings, downgrade to debug
    if (message.includes('Socket connected but no ID assigned yet')) {
      console.debug('Socket initialization in progress - ID not yet assigned');
    }
    return;  // Suppress these specific warnings
  }
  originalConsoleWarn.apply(console, args ? [message, ...args] : [message]);
};

// Ensure mobile devices render correctly
const fixViewportForMobile = () => {
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  }
};

// Apply dark mode based on user preference or saved value
const initializeTheme = () => {
  // First check if user has a saved preference
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme) {
    // Use saved preference if available
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    document.body.dataset.theme = savedTheme;
  } else {
    // Otherwise use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
    document.body.dataset.theme = prefersDark ? 'dark' : 'light';
    // Save this preference for future visits
    localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
  }
  
  // Update theme color meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    metaThemeColor.setAttribute('content', currentTheme === 'dark' ? '#1a1b26' : '#ffffff');
  }
  
  // Apply some CSS overrides based on theme
  if (document.documentElement.classList.contains('dark')) {
    document.body.classList.add('dark-theme-applied');
  } else {
    document.body.classList.remove('dark-theme-applied');
  }
};

// Call initializeTheme immediately
initializeTheme();

// Initialize driver.js button fix script
const fixDriverButtons = () => {
  // Create a style element to ensure driver.js buttons are properly styled
  const styleEl = document.createElement('style');
  styleEl.id = 'driver-js-fixes';
  styleEl.innerHTML = `
    .driver-popover-footer button {
      pointer-events: auto !important;
      cursor: pointer !important;
    }
    .driver-close-btn, .driver-next-btn, .driver-prev-btn, .driver-done-btn {
      pointer-events: auto !important;
      cursor: pointer !important;
      user-select: auto !important;
    }
    .driver-overlay {
      pointer-events: auto !important;
      cursor: pointer !important;
    }
  `;
  document.head.appendChild(styleEl);
};

// Call this on load
fixDriverButtons();

// Also listen for theme changes
window.addEventListener('storage', (event) => {
  if (event.key === 'theme') {
    initializeTheme();
  }
});

// Handle uncaught promise rejections
window.addEventListener('unhandledrejection', event => {
  // Check if this is a Monaco editor cancelation - these are expected and can be ignored
  if (event.reason && event.reason.type === 'cancelation' && 
      event.reason.msg === 'operation is manually canceled') {
    event.preventDefault(); 
    return;
  }
  
  // Check if this is a socket connection error we can handle
  if (event.reason && event.reason.message && 
      (event.reason.message.includes('socket') || 
       event.reason.message.includes('WebSocket'))) {
    console.debug('Socket connection issue:', event.reason.message);
    event.preventDefault();
    return;
  }
  
  // Log other unhandled rejections
  console.error('Unhandled Promise Rejection:', event.reason);
});

// Handle OAuth callbacks in development
const handleDevelopmentOAuth = () => {
  // Check if we're on an OAuth callback route
  if (window.location.pathname === '/oauth-callback') {
    console.log('Processing OAuth callback in development mode...');
  }
};

// Apply mobile fixes immediately
fixViewportForMobile();
handleDevelopmentOAuth();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
      <Toaster position="top-right" />
    </Router>
  </React.StrictMode>
)
