import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import api, { getConnectedSocket } from '../utils/api';

// Create context
const FriendsContext = createContext();

// Friends Provider Component
export const FriendsProvider = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  // State for friends, requests and invitations
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [roomInvitations, setRoomInvitations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState({
    friends: false,
    requests: false,
    search: false,
    invitations: false
  });
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  
  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated) {
      const initSocket = async () => {
        try {
          const socketInstance = await getConnectedSocket();
          
          // Authenticate the socket with user ID
          if (user?.id) {
            socketInstance.emit('authenticate', { userId: user.id });
          }
          
          setSocket(socketInstance);
          
          return socketInstance;
        } catch (error) {
          console.error("Error initializing socket in FriendsContext:", error);
          return null;
        }
      };
      
      const socketPromise = initSocket();
      
      return () => {
        socketPromise.then(socket => {
          if (socket) {
            socket.off('friend-request-received');
            socket.off('friend-request-accepted');
            socket.off('friend-status-change');
            socket.off('room-invitation');
          }
        });
      };
    }
  }, [isAuthenticated, user?.id]);
  
  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isAuthenticated || !user?.id) return;
    
    // Listen for friend request events
    socket.on('friend-request-received', (data) => {
      console.log('Received friend request:', data);
      fetchPendingRequests();
    });
    
    socket.on('friend-request-accepted', (data) => {
      console.log('Friend request accepted:', data);
      fetchFriends();
      fetchSentRequests();
    });
    
    socket.on('friend-status-change', (data) => {
      console.log('Friend status changed:', data);
      setFriends(currentFriends => 
        currentFriends.map(friend => 
          friend._id === data.userId 
            ? { ...friend, status: data.status, lastActive: new Date() } 
            : friend
        )
      );
    });
    
    socket.on('room-invitation', (data) => {
      console.log('Room invitation received:', data);
      fetchRoomInvitations();
    });
    
    return () => {
      socket.off('friend-request-received');
      socket.off('friend-request-accepted');
      socket.off('friend-status-change');
      socket.off('room-invitation');
    };
  }, [socket, isAuthenticated, user?.id]);
  
  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(prev => ({ ...prev, friends: true }));
      const response = await api.friends.getFriends();
      setFriends(response.data.friends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setError('Failed to load friends');
    } finally {
      setLoading(prev => ({ ...prev, friends: false }));
    }
  }, [isAuthenticated]);
  
  // Fetch pending friend requests
  const fetchPendingRequests = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(prev => ({ ...prev, requests: true }));
      const response = await api.friends.getPendingRequests();
      setPendingRequests(response.data.pendingRequests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setError('Failed to load friend requests');
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  }, [isAuthenticated]);
  
  // Fetch sent friend requests
  const fetchSentRequests = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(prev => ({ ...prev, requests: true }));
      const response = await api.friends.getSentRequests();
      setSentRequests(response.data.sentRequests);
    } catch (error) {
      console.error('Error fetching sent requests:', error);
      setError('Failed to load sent friend requests');
    } finally {
      setLoading(prev => ({ ...prev, requests: false }));
    }
  }, [isAuthenticated]);
  
  // Fetch room invitations
  const fetchRoomInvitations = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(prev => ({ ...prev, invitations: true }));
      const response = await api.invitations.getPendingInvitations();
      setRoomInvitations(response.data.invitations);
    } catch (error) {
      console.error('Error fetching room invitations:', error);
      setError('Failed to load room invitations');
    } finally {
      setLoading(prev => ({ ...prev, invitations: false }));
    }
  }, [isAuthenticated]);
  
  // Search users to add as friends
  const searchUsers = useCallback(async (query) => {
    if (!isAuthenticated || !query || query.length < 3) {
      setSearchResults([]);
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, search: true }));
      const response = await api.friends.searchUsers(query);
      setSearchResults(response.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users');
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  }, [isAuthenticated]);
  
  // Send friend request
  const sendFriendRequest = useCallback(async (recipientId) => {
    if (!isAuthenticated) return;
    
    try {
      await api.friends.sendFriendRequest(recipientId);
      // Update sent requests list
      fetchSentRequests();
      // Update search results to reflect the sent request
      setSearchResults(prev => 
        prev.map(user => 
          user._id === recipientId 
            ? { ...user, friendStatus: 'request_sent' } 
            : user
        )
      );
      return { success: true };
    } catch (error) {
      console.error('Error sending friend request:', error);
      setError('Failed to send friend request');
      return { success: false, error };
    }
  }, [isAuthenticated, fetchSentRequests]);
  
  // Accept friend request
  const acceptFriendRequest = useCallback(async (requestId) => {
    if (!isAuthenticated) return;
    
    try {
      await api.friends.acceptFriendRequest(requestId);
      // Refresh friends and pending requests
      fetchFriends();
      fetchPendingRequests();
      return { success: true };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      setError('Failed to accept friend request');
      return { success: false, error };
    }
  }, [isAuthenticated, fetchFriends, fetchPendingRequests]);
  
  // Reject friend request
  const rejectFriendRequest = useCallback(async (requestId) => {
    if (!isAuthenticated) return;
    
    try {
      await api.friends.rejectFriendRequest(requestId);
      // Update pending requests list
      fetchPendingRequests();
      return { success: true };
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      setError('Failed to reject friend request');
      return { success: false, error };
    }
  }, [isAuthenticated, fetchPendingRequests]);
  
  // Cancel friend request
  const cancelFriendRequest = useCallback(async (requestId) => {
    if (!isAuthenticated) return;
    
    try {
      await api.friends.cancelFriendRequest(requestId);
      // Update sent requests list
      fetchSentRequests();
      return { success: true };
    } catch (error) {
      console.error('Error canceling friend request:', error);
      setError('Failed to cancel friend request');
      return { success: false, error };
    }
  }, [isAuthenticated, fetchSentRequests]);
  
  // Remove friend - Improved with better error handling and data consistency
  const removeFriend = useCallback(async (friendId) => {
    if (!isAuthenticated) return { success: false, error: 'Not authenticated' };
    
    try {
      setLoading(prev => ({ ...prev, friends: true }));
      
      // Make the API call with additional logging
      console.log(`Removing friend with ID: ${friendId}`);
      const response = await api.friends.removeFriend(friendId);
      
      if (response.data && response.data.success) {
        console.log('Friend removal successful, updating local state');
        
        // Update local state to remove the friend
        setFriends(prev => prev.filter(f => f._id !== friendId));
        
        // Also refresh other friend-related data to ensure consistency
        fetchPendingRequests();
        fetchSentRequests();
        
        return { success: true };
      } else {
        throw new Error(response.data?.message || "Failed to remove friend");
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      setError(`Failed to remove friend: ${error.message}`);
      return { success: false, error: error.message || "An unknown error occurred" };
    } finally {
      setLoading(prev => ({ ...prev, friends: false }));
    }
  }, [isAuthenticated, fetchPendingRequests, fetchSentRequests]);
  
  // Send room invitation - improved with error handling
  const sendRoomInvitation = useCallback(async (recipientId, roomId, roomName) => {
    if (!isAuthenticated) return { success: false };
    
    try {
      const response = await api.invitations.sendInvitation({ 
        recipientId, 
        roomId, 
        roomName 
      });
      
      console.log('Room invitation API response:', response.data);
      return { success: true };
    } catch (error) {
      console.error('Error sending room invitation:', error);
      setError('Failed to send room invitation');
      return { success: false, error };
    }
  }, [isAuthenticated]);
  
  // Accept room invitation - improved with roomId return
  const acceptRoomInvitation = useCallback(async (invitationId) => {
    if (!isAuthenticated) return { success: false };
    
    try {
      const response = await api.invitations.acceptInvitation(invitationId);
      // Update room invitations list
      fetchRoomInvitations();
      
      console.log('Accept invitation response:', response.data);
      return { 
        success: true, 
        roomId: response.data.roomId 
      };
    } catch (error) {
      console.error('Error accepting room invitation:', error);
      setError('Failed to accept room invitation');
      return { success: false, error };
    }
  }, [isAuthenticated, fetchRoomInvitations]);
  
  // Decline room invitation
  const declineRoomInvitation = useCallback(async (invitationId) => {
    if (!isAuthenticated) return;
    
    try {
      await api.invitations.declineInvitation(invitationId);
      // Update room invitations list
      fetchRoomInvitations();
      return { success: true };
    } catch (error) {
      console.error('Error declining room invitation:', error);
      setError('Failed to decline room invitation');
      return { success: false, error };
    }
  }, [isAuthenticated, fetchRoomInvitations]);
  
  // Load initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchFriends();
      fetchPendingRequests();
      fetchSentRequests();
      fetchRoomInvitations();
    } else {
      // Clear data when logged out
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      setRoomInvitations([]);
      setSearchResults([]);
    }
  }, [isAuthenticated, fetchFriends, fetchPendingRequests, fetchSentRequests, fetchRoomInvitations]);
  
  // Get total counts for notification badges
  const totalPendingRequests = pendingRequests.length;
  const totalRoomInvitations = roomInvitations.length;
  const totalNotifications = totalPendingRequests + totalRoomInvitations;
  
  // Context value
  const value = {
    friends,
    pendingRequests,
    sentRequests,
    roomInvitations,
    searchResults,
    loading,
    error,
    totalNotifications,
    totalPendingRequests,
    totalRoomInvitations,
    actions: {
      fetchFriends,
      fetchPendingRequests,
      fetchRoomInvitations,
      searchUsers,
      sendFriendRequest,
      acceptFriendRequest,
      rejectFriendRequest,
      cancelFriendRequest,
      removeFriend,
      sendRoomInvitation,
      acceptRoomInvitation,
      declineRoomInvitation,
      clearError: () => setError(null)
    }
  };
  
  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
};

// Custom hook to use friends context
export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (!context) {
    throw new Error('useFriends must be used within a FriendsProvider');
  }
  return context;
};
