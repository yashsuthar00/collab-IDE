import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import 'driver.js/dist/driver.css'
import './css/animations.css' // Import our custom animations

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

// Apply dark mode if saved in localStorage
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  document.body.dataset.theme = savedTheme;
  
  // Update theme color meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', savedTheme === 'dark' ? '#1a1b26' : '#ffffff');
  }
};

// Handle uncaught promise rejections related to Monaco editor and socket connection errors
window.addEventListener('unhandledrejection', event => {
  // Check if this is a Monaco editor cancelation - these are expected and can be ignored
  if (event.reason && event.reason.type === 'cancelation' && 
      event.reason.msg === 'operation is manually canceled') {
    event.preventDefault(); // Prevent the error from appearing in console
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

// Apply mobile fixes and theme immediately
fixViewportForMobile();
initializeTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
