import { v4 as uuidv4 } from 'uuid';
import api from './api';
import { getSocket, initializeSocket } from './api';
import { saveToStorage, getFromStorage } from './storage';

// Access level definitions
export const ACCESS_LEVELS = {
  OWNER: 'owner',      // Can edit code, run code, manage users and room settings
  EDITOR: 'editor',    // Can edit code and run code
  RUNNER: 'runner',    // Can only run code, not edit
  VIEWER: 'viewer',    // Can only view code and output
};

// Create a new room
export const createRoom = async (userName, initialLanguage = 'javascript', initialCode = '') => {
  try {
    // Generate a room ID (or use server-generated one)
    const roomId = uuidv4().slice(0, 8);
    
    // Initialize socket connection
    const socket = initializeSocket();
    
    // Create room data structure
    const roomData = {
      id: roomId,
      createdAt: new Date().toISOString(),
      language: initialLanguage,
      code: initialCode,
      owner: userName,
      users: [{ 
        id: socket.id, 
        name: userName, 
        accessLevel: ACCESS_LEVELS.OWNER,
        isActive: true,
        joinedAt: new Date().toISOString()
      }]
    };

    console.log("Creating room with ID:", roomId);
    console.log("Room data:", roomData);

    // Store user details in local storage
    saveToStorage('user_name', userName);
    saveToStorage('current_room', roomId);
    
    // Create room on server
    await api.collaboration.createRoom(roomData);
    
    // Socket should handle joining after creation
    socket.emit('create-room', { 
      userName, 
      roomName: `${userName}'s Room` 
    });
    
    return { success: true, roomId, roomData };
  } catch (error) {
    console.error('Failed to create room:', error);
    return { success: false, error: error.message || 'Failed to create room' };
  }
};

// Join an existing room
export const joinRoom = async (roomId, userName, fromInvitation = false) => {
  try {
    console.log(`Attempting to join room ${roomId} as ${userName}${fromInvitation ? ' from invitation' : ''}`);
    
    // Initialize socket connection
    const socket = initializeSocket();
    
    // Fetch room data from server to check if room exists
    const response = await api.collaboration.getRoomDetails(roomId);
    console.log("Room check response:", response);
    
    if (!response.data || !response.data.roomExists) {
      console.error(`Room ${roomId} not found on server`);
      return { success: false, error: 'Room not found' };
    }
    
    // Store user details locally
    saveToStorage('user_name', userName);
    saveToStorage('current_room', roomId);
    
    // If joining from invitation, we might want to use a different default access level
    const accessLevel = fromInvitation ? ACCESS_LEVELS.EDITOR : ACCESS_LEVELS.VIEWER;
    
    // Join room socket
    socket.emit('join-room', { roomId, userName, accessLevel, fromInvitation });
    console.log(`Socket emit join-room: ${roomId}, ${userName}, ${accessLevel}, fromInvitation: ${fromInvitation}`);
    
    return { 
      success: true, 
      roomId,
      roomData: response.data
    };
  } catch (error) {
    console.error('Failed to join room:', error);
    return { success: false, error: error.message || 'Failed to join room' };
  }
};

// Update user access level
export const updateUserAccess = (roomId, userId, newAccessLevel) => {
  if (!Object.values(ACCESS_LEVELS).includes(newAccessLevel)) {
    return { success: false, error: 'Invalid access level' };
  }
  
  try {
    const socket = getSocket();
    socket.emit('update-access', { roomId, userId, accessLevel: newAccessLevel });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Leave room
export const leaveRoom = () => {
  try {
    const roomId = getFromStorage('current_room');
    const userName = getFromStorage('user_name');
    
    if (!roomId) {
      return { success: false, error: 'Not in a room' };
    }
    
    const socket = getSocket();
    socket.emit('leave-room', { roomId, userName });
    
    // Clear room data from local storage
    localStorage.removeItem('current_room');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Check if user can perform certain actions
export const canPerformAction = (accessLevel, action) => {
  switch (action) {
    case 'EDIT_CODE':
      return [ACCESS_LEVELS.OWNER, ACCESS_LEVELS.EDITOR].includes(accessLevel);
    case 'RUN_CODE':
      return [ACCESS_LEVELS.OWNER, ACCESS_LEVELS.EDITOR, ACCESS_LEVELS.RUNNER].includes(accessLevel);
    case 'MANAGE_USERS':
      return accessLevel === ACCESS_LEVELS.OWNER;
    case 'CHANGE_LANGUAGE':
      return accessLevel === ACCESS_LEVELS.OWNER;
    default:
      return false;
  }
};

// Generate a shareable room link
export const getRoomShareLink = (roomId) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/room/${roomId}`;
};

// Send a room invitation to a friend (updated to handle pending requests)
export const inviteToRoom = async (roomId, roomName, inviterId, inviterName, inviteeId, inviteeName, isPendingFriend = false) => {
  try {
    // Create the invitation through API
    const response = await api.friends.sendRoomInvitation({
      roomId,
      roomName,
      senderId: inviterId,
      senderName: inviterName,
      recipientId: inviteeId,
      recipientName: inviteeName,
      isPendingFriend
    });
    
    if (response.data && response.data.success) {
      return { 
        success: true, 
        invitationId: response.data.invitationId,
        message: isPendingFriend 
          ? 'Invitation sent to pending friend' 
          : 'Invitation sent successfully'
      };
    } else {
      return { 
        success: false, 
        error: response.data?.message || 'Failed to send invitation' 
      };
    }
  } catch (error) {
    console.error('Error sending room invitation:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send invitation' 
    };
  }
};

// New helper function to find friends including pending requests
export const findAllFriends = async (userId) => {
  try {
    // Get both confirmed and pending friends
    const confirmedResponse = await api.friends.getFriends(userId);
    const pendingResponse = await api.friends.getPendingFriends(userId);
    
    const confirmedFriends = confirmedResponse.data?.friends || [];
    const pendingFriends = pendingResponse.data?.pendingRequests || [];
    
    // Combine both lists, marking pending status
    const allFriends = [
      ...confirmedFriends.map(friend => ({ ...friend, isPending: false })),
      ...pendingFriends.map(friend => ({ ...friend, isPending: true }))
    ];
    
    return {
      success: true,
      friends: allFriends
    };
  } catch (error) {
    console.error('Error fetching all friends:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch friends'
    };
  }
};
