import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import 'driver.js/dist/driver.css'
import './css/animations.css' // Import our custom animations

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

// Handle uncaught promise rejections related to Monaco editor
window.addEventListener('unhandledrejection', event => {
  // Check if this is a Monaco editor cancelation - these are expected and can be ignored
  if (event.reason && event.reason.type === 'cancelation' && event.reason.msg === 'operation is manually canceled') {
    event.preventDefault(); // Prevent the error from appearing in console
    console.debug('Suppressed Monaco editor cancelation event');
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
