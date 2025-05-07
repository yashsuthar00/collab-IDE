import axios from 'axios';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { getFromStorage } from './storage';

// Determine base URL based on environment
const getBaseUrl = () => {
  if (import.meta.env.PROD || import.meta.env.VITE_NODE_ENV === 'production') {
    return import.meta.env.VITE_REACT_APP_API_URL || 'https://api.collab-ide.com'; // Replace with your production API URL
  }
  return 'http://localhost:5000'; // Default development URL
};

// Create axios instance with configuration
const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for authentication if needed
apiClient.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed in the future
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common error scenarios
    const errorResponse = {
      message: error.response?.data?.message || 'An error occurred while processing your request.',
      status: error.response?.status || 500,
      details: error.response?.data || {},
    };
    
    console.error('API Error:', errorResponse);
    return Promise.reject(errorResponse);
  }
);

// API endpoints
const api = {
  // Code execution endpoints
  execute: {
    runCode: (sessionId, { code, language, input }) => 
      apiClient.post(`/api/sessions/${sessionId}/execute`, { code, language, input }),
  },
  
  // Runtime information
  runtimes: {
    getAvailable: () => apiClient.get('/api/runtimes'),
  },
  
  // For future authentication endpoints
  auth: {
    login: (credentials) => apiClient.post('/api/auth/login', credentials),
    register: (userData) => apiClient.post('/api/auth/register', userData),
    logout: () => apiClient.post('/api/auth/logout'),
  },
  
  // Enhanced collaboration features
  collaboration: {
    // Get room details
    getRoomDetails: (roomId) => apiClient.get(`/api/rooms/${roomId}`),
    
    // Create a new room
    createRoom: (roomData) => apiClient.post('/api/rooms', roomData),
    
    // Update room settings
    updateRoomSettings: (roomId, settings) => apiClient.put(`/api/rooms/${roomId}/settings`, settings),
    
    // Get users in a room
    getRoomUsers: (roomId) => apiClient.get(`/api/rooms/${roomId}/users`),
    
    // Update user permissions
    updateUserAccess: (roomId, userId, accessLevel) => 
      apiClient.put(`/api/rooms/${roomId}/users/${userId}/access`, { accessLevel }),
      
    // Remove user from room
    removeUser: (roomId, userId) => apiClient.delete(`/api/rooms/${roomId}/users/${userId}`),
    
    // Join an existing room
    joinSession: (sessionId) => apiClient.get(`/api/sessions/${sessionId}`),
    createSession: (data) => apiClient.post('/api/sessions', data),
  },
};

// Enhanced Socket.io integration for real-time collaboration
let socket = null;

export const initializeSocket = () => {
  if (socket && socket.connected) return socket;
  
  const socketUrl = import.meta.env.PROD 
    ? import.meta.env.VITE_REACT_APP_SOCKET_URL || 'wss://api.collab-ide.com'
    : 'ws://localhost:5000';
  
  const userName = getFromStorage('user_name') || `User-${uuidv4().slice(0, 5)}`;
  
  socket = io(socketUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    query: { userName },
    autoConnect: true // Ensure this is true for proper connection
  });
  
  // Socket event handlers
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    // Reset the sync counter when we connect
    window._syncRequestCount = 0;
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  // Handle room errors without console spam
  socket.on('room-error', (error) => {
    // Only log actual errors from user interactions, not automatic reconnection attempts
    if (window.lastRoomAction === 'manual' || error.type !== 'silent') {
      console.error('Room error:', error);
    }
  });

  // Global variables to track sync frequency
  window._syncRequestCount = 0;
  window._lastSyncTime = 0;
  window._isSyncing = false;
  
  return socket;
};

// Helper to check if we should throttle sync requests
export const shouldThrottleSync = () => {
  const now = Date.now();
  const timeSinceLastSync = now - (window._lastSyncTime || 0);
  
  // If we're currently syncing or it's been less than 5 seconds since last sync
  if (window._isSyncing || timeSinceLastSync < 5000) {
    return true;
  }
  
  // If we've made more than 3 requests in the last minute
  if (window._syncRequestCount > 3 && timeSinceLastSync < 60000) {
    console.log('Throttling sync requests - too frequent');
    return true;
  }
  
  // Update tracking variables
  window._lastSyncTime = now;
  window._syncRequestCount = (window._syncRequestCount || 0) + 1;
  window._isSyncing = true;
  
  return false;
};

export const syncCompleted = () => {
  window._isSyncing = false;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

// Helper function to generate room invite link
export const generateRoomLink = (roomId) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/room/${roomId}`;
};

export default api;
