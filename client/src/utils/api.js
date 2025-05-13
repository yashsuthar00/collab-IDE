import axios from 'axios';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { getFromStorage } from './storage';

// Determine base URL based on environment with direct URLs
const getBaseUrl = () => {
  if (import.meta.env.PROD) {
    return 'https://collab-ide-ep5q.onrender.com'; // Direct production URL
  }
  return 'http://localhost:5000'; // Direct development URL
};

// Socket URL handling with direct URLs
export const getSocketUrl = () => {
  if (import.meta.env.PROD) {
    return 'wss://collab-ide-ep5q.onrender.com'; // Direct production socket URL
  }
  return 'ws://localhost:5000'; // Direct development socket URL
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
    // Add auth token to requests if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
      message: error.response?.data?.msg || error.response?.data?.message || 'An error occurred while processing your request.',
      status: error.response?.status || 500,
      details: error.response?.data || {},
    };
    
    // Special handling for 401 errors on file access
    if (error.response?.status === 401 && 
        (error.config?.url?.includes('/api/codefiles/') || 
         error.config?.url?.includes('/api/directories/'))) {
      console.warn('Access denied to resource:', error.config.url, error.response.data);
      errorResponse.isAccessError = true;
    }
    
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
    getMe: () => apiClient.get('/api/auth/me') // Add this method
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
  
  // Friends API
  friends: {
    // Get all friends
    getFriends: () => apiClient.get('/api/friends'),
    
    // Get pending friend requests
    getPendingRequests: () => apiClient.get('/api/friends/requests/pending'),
    
    // Get sent friend requests
    getSentRequests: () => apiClient.get('/api/friends/requests/sent'),
    
    // Search users to add as friends
    searchUsers: (query) => apiClient.get(`/api/friends/search?query=${query}`),
    
    // Send friend request
    sendFriendRequest: (recipientId) => apiClient.post('/api/friends/requests', { recipientId }),
    
    // Accept friend request
    acceptFriendRequest: (requestId) => apiClient.put(`/api/friends/requests/${requestId}/accept`),
    
    // Reject friend request
    rejectFriendRequest: (requestId) => apiClient.put(`/api/friends/requests/${requestId}/reject`),
    
    // Cancel friend request
    cancelFriendRequest: (requestId) => apiClient.delete(`/api/friends/requests/${requestId}`),
    
    // Enhanced removeFriend method with better error handling
    removeFriend: async (friendId) => {
      try {
        console.log(`API: Removing friend with ID: ${friendId}`);
        
        if (!friendId) {
          console.error('Invalid friendId provided');
          return { 
            data: { 
              success: false, 
              message: 'Invalid friend ID' 
            } 
          };
        }
        
        const response = await apiClient.delete(`/api/friends/${friendId}`);
        console.log('Friend removal response:', response.data);
        
        return response;
      } catch (error) {
        console.error('API Error removing friend:', error);
        return { 
          data: { 
            success: false, 
            message: error.message || 'Failed to remove friend' 
          } 
        };
      }
    },
    
    // Remove friend
    removeFriend: (friendId) => apiClient.delete(`/api/friends/${friendId}`)
  },
  
  // Room invitations API
  invitations: {
    // Get pending invitations
    getPendingInvitations: () => apiClient.get('/api/invitations/pending'),
    
    // Send invitation to a friend
    sendInvitation: (data) => apiClient.post('/api/invitations', data),
    
    // Accept room invitation
    acceptInvitation: (invitationId) => apiClient.put(`/api/invitations/${invitationId}/accept`),
    
    // Decline room invitation
    declineInvitation: (invitationId) => apiClient.put(`/api/invitations/${invitationId}/decline`),
    
    // Cancel room invitation (by sender)
    cancelInvitation: (invitationId) => apiClient.delete(`/api/invitations/${invitationId}`)
  },
  
  // Add code files API methods
  files: {
    // Get all files
    getFiles: (params) => apiClient.get('/api/codefiles', { params }),
    
    // Get a file by ID
    getFile: (fileId) => apiClient.get(`/api/codefiles/${fileId}`),
    
    // Create a new file
    createFile: (fileData) => apiClient.post('/api/codefiles', fileData),
    
    // Update a file
    updateFile: (fileId, fileData) => apiClient.put(`/api/codefiles/${fileId}`, fileData),
    
    // Delete a file
    deleteFile: (fileId) => apiClient.delete(`/api/codefiles/${fileId}`),
    
    // Save current code
    saveCurrentCode: (fileData) => apiClient.post('/api/codefiles/save-current', fileData),
    
    // Duplicate a file
    duplicateFile: (data) => apiClient.post('/api/codefiles/duplicate', data),
    
    // Get recent files
    getRecentFiles: (limit = 5) => apiClient.get(`/api/codefiles/recent?limit=${limit}`),
    
    // Get filter options for file search
    getFilterOptions: () => apiClient.get('/api/codefiles/filter-options'),
    
    // Fix the renaming functionality to use the updateFile endpoint
    renameFile: (fileId, newName) => {
      return apiClient.put(`/api/codefiles/${fileId}`, { name: newName });
    },
    
    // Fix the file moving functionality to use the updateFile endpoint
    moveFile: (fileId, newDirectoryId) => {
      return apiClient.put(`/api/codefiles/${fileId}`, { 
        directoryId: newDirectoryId 
      });
    }
  },
  
  // Add directories API methods
  directories: {
    // Get directories (with optional parent filter)
    getDirectories: (params) => apiClient.get('/api/directories', { params }),
    
    // Get directory tree
    getDirectoryTree: () => apiClient.get('/api/directories/tree'),
    
    // Get a directory by ID
    getDirectory: (dirId) => apiClient.get(`/api/directories/${dirId}`),
    
    // Create a new directory
    createDirectory: (dirData) => apiClient.post('/api/directories', dirData),
    
    // Update a directory
    updateDirectory: (dirId, dirData) => apiClient.put(`/api/directories/${dirId}`, dirData),
    
    // Delete a directory
    deleteDirectory: (dirId, deleteContents = false) => 
      apiClient.delete(`/api/directories/${dirId}${deleteContents ? '?deleteContents=true' : ''}`),
    
    // Fix directory renaming functionality to use the updateDirectory endpoint
    renameDirectory: (dirId, newName) => {
      return apiClient.put(`/api/directories/${dirId}`, { name: newName });
    },
    
    // Fix directory moving functionality to use the updateDirectory endpoint
    moveDirectory: (dirId, newParentId) => {
      return apiClient.put(`/api/directories/${dirId}`, { 
        parentId: newParentId 
      });
    }
  }
};

// Enhanced Socket.io integration for real-time collaboration
let socket = null;
let socketConnectionPromise = null;

export const initializeSocket = () => {
  if (socket && socket.connected) return socket;
  
  // If we already have a connection attempt in progress, return that promise
  if (socketConnectionPromise) return socket;
  
  const socketUrl = getSocketUrl();
  
  // Get username from localStorage or use anonymous ID
  const user = JSON.parse(localStorage.getItem('user'));
  const userName = user?.username || 
                  getFromStorage('user_name') || 
                  `User-${uuidv4().slice(0, 5)}`;
  
  // Create socket instance with configured options
  socket = io(socketUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    query: { userName },
    autoConnect: true
  });
  
  // Wait for socket to be fully connected before using it
  socketConnectionPromise = new Promise((resolve) => {
    // Listen for the connect event to know when socket is ready
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Reset the sync counter when we connect
      window._syncRequestCount = 0;
      socketConnectionPromise = null; // Clear the promise
      resolve(socket);
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
    socketConnectionPromise = null; // Clear the promise on disconnect
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    socketConnectionPromise = null; // Clear the promise on error
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

// New function to get socket and ensure it's connected
export const getConnectedSocket = async () => {
  const socketInstance = getSocket();
  
  if (!socketInstance.connected) {
    // If not connected, wait for connection
    await new Promise((resolve) => {
      if (socketInstance.connected) {
        resolve();
      } else {
        socketInstance.once('connect', () => {
          resolve();
        });
      }
    });
  }
  
  return socketInstance;
};

// Helper function to generate room invite link
export const generateRoomLink = (roomId) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/room/${roomId}`;
};

export default api;
