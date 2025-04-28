import axios from 'axios';
import { io } from 'socket.io-client';

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
      message: 'An error occurred while processing your request.',
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
  
  // For future collaboration features
  collaboration: {
    joinSession: (sessionId) => apiClient.get(`/api/sessions/${sessionId}`),
    createSession: (data) => apiClient.post('/api/sessions', data),
  },
};

// Socket.io integration (to be implemented in the future)
let socket = null;

export const initializeSocket = () => {
  const socketUrl = import.meta.env.PROD 
    ? import.meta.env.VITE_REACT_APP_SOCKET_URL || 'wss://api.collab-ide.com'
    : 'ws://localhost:5000';
    
  socket = io(socketUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export default api;
