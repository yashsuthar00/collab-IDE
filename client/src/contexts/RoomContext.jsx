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
      // Check if the updated user is the current user
      if (action.payload.userId === state.currentUser.id) {
        console.log(`Updating my access level to ${action.payload.accessLevel}`);
        return {
          ...state,
          currentUser: {
            ...state.currentUser,
            accessLevel: action.payload.accessLevel,
          },
          // Also update in the users array to ensure consistency
          users: state.users.map(user => 
            user.id === action.payload.userId
              ? { ...user, accessLevel: action.payload.accessLevel }
              : user
          ),
        };
      }
      
      // If it's another user, update only in the users array
      console.log(`Updating access level for user ${action.payload.userId} to ${action.payload.accessLevel}`);
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

      // Dispatch custom event for tour to detect
      window.dispatchEvent(new CustomEvent('room-joined-event'));
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
      console.log("Access updated event received:", data);
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
  
  // Handle socket events for OT
  useEffect(() => {
    if (!state.isInRoom || !socket) return;

    const socketInstance = getSocket();

    // Listen for room joined event
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
        }
      });
      saveToStorage('current_room', data.roomId);

      // Handle initial code if provided
      if (data.code) {
        // We'll emit an event for the App component to capture in its own effect
        window.dispatchEvent(new CustomEvent('room-code-received', { 
          detail: { code: data.code }
        }));
      }

      // Dispatch custom event for tour to detect - with additional flag for "freshly joined"
      window.dispatchEvent(new CustomEvent('room-joined-event', {
        detail: {
          freshJoin: true,
          roomId: data.roomId
        }
      }));
    });
  }, [state.isInRoom, socket]);

  // Check if room already exists in local storage on mount
  useEffect(() => {
    const checkExistingRoom = async () => {
      const roomId = getFromStorage('current_room');
      const userName = getFromStorage('user_name');
      
      if (roomId && userName && socket) {
        // Only attempt to rejoin if we have both room ID and username
        // AND the page wasn't just refreshed (check URL parameters)
        const urlParams = new URLSearchParams(window.location.search);
        const isDirectNavigation = !urlParams.has('suppressRejoin');
        
        if (isDirectNavigation) {
          console.log(`Attempting to rejoin existing room: ${roomId} as ${userName}`);
          dispatch({ type: ACTION_TYPES.JOIN_ROOM_START });
          socket.emit('rejoin-room', { roomId, userName });
        } else {
          // Clear the stored room if we're not rejoining
          localStorage.removeItem('current_room');
        }
      }
    };
    
    // Don't attempt to rejoin immediately on page load
    // Instead, wait a short time to ensure the socket is properly connected
    // and the user has had time to view the initial page
    if (socket) {
      const timer = setTimeout(() => {
        checkExistingRoom();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [socket]);
  
  // Room context actions
  const joinRoom = (roomId, userName, fromInvitation = false) => {
    if (!socket) {
      console.error("Cannot join room: Socket not initialized");
      return;
    }
    
    console.log(`Joining room ${roomId} as ${userName}${fromInvitation ? ' from invitation' : ''}`);
    dispatch({ type: ACTION_TYPES.JOIN_ROOM_START });
    saveToStorage('user_name', userName);
    
    // If we're coming from an invitation, set window flag to help debug
    if (fromInvitation) {
      window._joinFromInvitation = true;
      
      // Dispatch a custom event that we can listen for to show an invitation success message
      window.dispatchEvent(new CustomEvent('room-invitation-accepted', { 
        detail: { roomId, userName }
      }));
    }
    
    socket.emit('join-room', { roomId, userName, fromInvitation });
    
    // Set a timeout to detect failures
    const joinTimeout = setTimeout(() => {
      if (!state.isInRoom) {
        dispatch({
          type: ACTION_TYPES.JOIN_ROOM_ERROR,
          payload: 'Failed to join room. Timeout exceeded.'
        });
      }
    }, 5000);
    
    // Clear the timeout if the component unmounts
    return () => clearTimeout(joinTimeout);
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

  // Updated method to invite a user to the room that handles pending requests
  const inviteUserToRoom = (userId, username, isPending = false) => {
    if (!socket || !state.isInRoom) return;
    
    console.log(`Inviting user ${username} (${userId}) to room ${state.roomId}, pending status: ${isPending}`);
    socket.emit('invite-to-room', {
      roomId: state.roomId,
      roomName: state.roomName,
      inviterId: state.currentUser.id,
      inviterName: state.currentUser.name,
      inviteeId: userId,
      inviteeName: username,
      isPendingFriend: isPending
    });
    
    return {
      success: true,
      message: `Invitation sent to ${username}`
    };
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
    inviteUserToRoom,  // Add the new method to the context value
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
