import { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { getSocket, initializeSocket } from '../utils/api';
import { ACCESS_LEVELS, canPerformAction } from '../utils/roomService';
import { getFromStorage, saveToStorage } from '../utils/storage';

// Initial state for room context
const initialState = {
  isInRoom: false,
  roomId: null,
  roomName: '',
  users: [],
  currentUser: {
    id: null,
    name: getFromStorage('user_name') || '',
    accessLevel: null,
  },
  chat: [],
  loading: false,
  error: null,
};

// Action types for reducer
const ACTION_TYPES = {
  JOIN_ROOM_START: 'JOIN_ROOM_START',
  JOIN_ROOM_SUCCESS: 'JOIN_ROOM_SUCCESS',
  JOIN_ROOM_ERROR: 'JOIN_ROOM_ERROR',
  LEAVE_ROOM: 'LEAVE_ROOM',
  UPDATE_USERS: 'UPDATE_USERS',
  UPDATE_ACCESS_LEVEL: 'UPDATE_ACCESS_LEVEL',
  ADD_CHAT_MESSAGE: 'ADD_CHAT_MESSAGE',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer function for room state
const roomReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.JOIN_ROOM_START:
      return { 
        ...state, 
        loading: true,
        error: null
      };
    
    case ACTION_TYPES.JOIN_ROOM_SUCCESS:
      return {
        ...state,
        isInRoom: true,
        roomId: action.payload.roomId,
        roomName: action.payload.roomName || `Room ${action.payload.roomId}`,
        users: action.payload.users,
        currentUser: {
          ...state.currentUser,
          id: action.payload.userId,
          name: action.payload.userName,
          accessLevel: action.payload.accessLevel,
        },
        loading: false,
        error: null,
      };
      
    case ACTION_TYPES.JOIN_ROOM_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
      
    case ACTION_TYPES.LEAVE_ROOM:
      return {
        ...initialState,
        currentUser: {
          ...initialState.currentUser,
          name: state.currentUser.name, // Preserve user name
        },
      };
      
    case ACTION_TYPES.UPDATE_USERS:
      return {
        ...state,
        users: action.payload,
      };
      
    case ACTION_TYPES.UPDATE_ACCESS_LEVEL:
      if (action.payload.userId === state.currentUser.id) {
        return {
          ...state,
          currentUser: {
            ...state.currentUser,
            accessLevel: action.payload.accessLevel,
          },
        };
      }
      return {
        ...state,
        users: state.users.map(user => 
          user.id === action.payload.userId 
            ? { ...user, accessLevel: action.payload.accessLevel }
            : user
        ),
      };
      
    case ACTION_TYPES.ADD_CHAT_MESSAGE:
      return {
        ...state,
        chat: [...state.chat, action.payload],
      };
      
    case ACTION_TYPES.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };
      
    case ACTION_TYPES.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
      
    default:
      return state;
  }
};

// Create room context
const RoomContext = createContext();

// Room provider component
export const RoomProvider = ({ children }) => {
  const [state, dispatch] = useReducer(roomReducer, initialState);
  const [socket, setSocket] = useState(null);
  
  // Initialize socket connection
  useEffect(() => {
    const socketInstance = initializeSocket();
    setSocket(socketInstance);
    
    // Socket event listeners for room management
    socketInstance.on('room-joined', (data) => {
      console.log("Room joined event received:", data);
      dispatch({
        type: ACTION_TYPES.JOIN_ROOM_SUCCESS,
        payload: {
          roomId: data.roomId,
          roomName: data.roomName,
          users: data.users,
          userId: data.userId,
          userName: data.userName,
          accessLevel: data.accessLevel,
        },
      });
      saveToStorage('current_room', data.roomId);
      
      // Handle initial code if provided
      if (data.code) {
        // We'll emit an event for the App component to capture in its own effect
        window.dispatchEvent(new CustomEvent('room-code-received', { 
          detail: { code: data.code }
        }));
      }
    });
    
    socketInstance.on('room-error', (error) => {
      console.error("Room error received:", error);
      dispatch({
        type: ACTION_TYPES.JOIN_ROOM_ERROR,
        payload: error.message,
      });
    });
    
    socketInstance.on('users-updated', (users) => {
      dispatch({
        type: ACTION_TYPES.UPDATE_USERS,
        payload: users,
      });
    });
    
    socketInstance.on('access-updated', (data) => {
      dispatch({
        type: ACTION_TYPES.UPDATE_ACCESS_LEVEL,
        payload: {
          userId: data.userId,
          accessLevel: data.accessLevel,
        },
      });
    });
    
    socketInstance.on('chat-message', (message) => {
      dispatch({
        type: ACTION_TYPES.ADD_CHAT_MESSAGE,
        payload: message,
      });
    });
    
    // Handle user being kicked from room
    socketInstance.on('user-removed', ({ userId }) => {
      if (userId === state.currentUser.id) {
        dispatch({
          type: ACTION_TYPES.LEAVE_ROOM,
        });
        dispatch({
          type: ACTION_TYPES.SET_ERROR,
          payload: 'You have been removed from the room',
        });
      }
    });
    
    // Handle room closure
    socketInstance.on('room-closed', ({ roomId, message }) => {
      if (roomId === state.roomId) {
        dispatch({
          type: ACTION_TYPES.LEAVE_ROOM,
        });
        dispatch({
          type: ACTION_TYPES.SET_ERROR,
          payload: message || 'The room has been closed',
        });
      }
    });
    
    // Clean up socket listeners on unmount
    return () => {
      socketInstance.off('room-joined');
      socketInstance.off('room-error');
      socketInstance.off('users-updated');
      socketInstance.off('access-updated');
      socketInstance.off('chat-message');
      socketInstance.off('user-removed');
      socketInstance.off('room-closed');
    };
  }, []);
  
  // Check if room already exists in local storage on mount
  useEffect(() => {
    const checkExistingRoom = async () => {
      const roomId = getFromStorage('current_room');
      const userName = getFromStorage('user_name');
      
      if (roomId && userName && socket) {
        console.log(`Attempting to rejoin existing room: ${roomId} as ${userName}`);
        dispatch({ type: ACTION_TYPES.JOIN_ROOM_START });
        socket.emit('rejoin-room', { roomId, userName });
      }
    };
    
    if (socket) {
      checkExistingRoom();
    }
  }, [socket]);
  
  // Room context actions
  const joinRoom = (roomId, userName) => {
    if (!socket) {
      console.error("Cannot join room: Socket not initialized");
      return;
    }
    
    console.log(`Joining room ${roomId} as ${userName}`);
    dispatch({ type: ACTION_TYPES.JOIN_ROOM_START });
    saveToStorage('user_name', userName);
    socket.emit('join-room', { roomId, userName });
  };
  
  const createRoom = (userName, roomName = '') => {
    if (!socket) {
      console.error("Cannot create room: Socket not initialized");
      return;
    }
    
    console.log(`Creating room as ${userName} with name ${roomName || '(untitled)'}`);
    dispatch({ type: ACTION_TYPES.JOIN_ROOM_START });
    saveToStorage('user_name', userName);
    socket.emit('create-room', { userName, roomName });
  };
  
  const leaveRoom = () => {
    if (!socket || !state.isInRoom) return;
    
    socket.emit('leave-room', { roomId: state.roomId, userId: state.currentUser.id });
    dispatch({ type: ACTION_TYPES.LEAVE_ROOM });
    localStorage.removeItem('current_room');
  };
  
  const updateUserAccess = (userId, accessLevel) => {
    if (!socket || !state.isInRoom || state.currentUser.accessLevel !== ACCESS_LEVELS.OWNER) return;
    
    socket.emit('update-access', {
      roomId: state.roomId,
      userId,
      accessLevel,
      updatedBy: state.currentUser.id,
    });
  };
  
  const removeUser = (userId) => {
    if (!socket || !state.isInRoom || state.currentUser.accessLevel !== ACCESS_LEVELS.OWNER) return;
    
    socket.emit('remove-user', {
      roomId: state.roomId,
      userId,
      removedBy: state.currentUser.id,
    });
  };
  
  const sendChatMessage = (message) => {
    if (!socket || !state.isInRoom) return;
    
    socket.emit('chat-message', {
      roomId: state.roomId,
      userId: state.currentUser.id,
      userName: state.currentUser.name,
      text: message,
      timestamp: new Date().toISOString(),
    });
  };
  
  const checkPermission = (action) => {
    return canPerformAction(state.currentUser.accessLevel, action);
  };
  
  const contextValue = {
    ...state,
    joinRoom,
    createRoom,
    leaveRoom,
    updateUserAccess,
    removeUser,
    sendChatMessage,
    checkPermission,
  };
  
  return (
    <RoomContext.Provider value={contextValue}>
      {children}
    </RoomContext.Provider>
  );
};

// Custom hook to use room context
export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};
