import { useState, useEffect, useRef } from 'react';
import { UserPlus, X, Users, Search, Mail, Clock, Circle, Trash2, SendHorizontal, ExternalLink, UserCheck, AlertTriangle } from 'lucide-react';
import { useFriends } from '../contexts/FriendsContext';
import FriendRequestAlert from './FriendRequestAlert';
import RoomInvitationAlert from './RoomInvitationAlert';
import UserAvatar from './UserAvatar';

const FriendsPanel = ({ 
  isOpen, 
  onClose, 
  onInviteToRoom,
  roomId,
  isMobile = false,
  initialActiveTab = 'friends' // Add this prop with default value
}) => {
  const {
    friends,
    pendingRequests,
    sentRequests,
    roomInvitations,
    searchResults,
    loading,
    actions
  } = useFriends();
  
  // Change this to use the initialActiveTab
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  
  // Add confirmation dialog state
  const [confirmationDialog, setConfirmationDialog] = useState({
    show: false,
    friendId: '',
    friendName: '',
    action: null
  });
  
  // Update active tab when initialActiveTab changes
  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length >= 3) {
      actions.searchUsers(query);
    }
  };
  
  const handleSendRequest = async (userId) => {
    await actions.sendFriendRequest(userId);
  };
  
  // Modified to show confirmation dialog instead of directly removing
  const showRemoveFriendConfirmation = (friendId, friendName) => {
    setConfirmationDialog({
      show: true,
      friendId,
      friendName,
      action: 'remove'
    });
  };
  
  const handleConfirmAction = async () => {
    if (confirmationDialog.action === 'remove') {
      await actions.removeFriend(confirmationDialog.friendId);
    }
    // Close dialog
    setConfirmationDialog({
      show: false,
      friendId: '',
      friendName: '',
      action: null
    });
  };
  
  const handleCancelAction = () => {
    setConfirmationDialog({
      show: false,
      friendId: '',
      friendName: '',
      action: null
    });
  };
  
  const handleInviteToRoom = (friendId, friendName) => {
    if (onInviteToRoom && roomId) {
      onInviteToRoom(friendId, friendName);
    }
  };
  
  // Clear search on tab change
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);
  
  // Auto-focus search input when switching to add tab
  useEffect(() => {
    if (activeTab === 'add' && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [activeTab]);
  
  // Helper to determine if a friend is online
  const isOnline = (friend) => friend.status === 'online';
  
  // Sort friends by status (online first) and then by username
  const sortedFriends = [...friends].sort((a, b) => {
    if (isOnline(a) && !isOnline(b)) return -1;
    if (!isOnline(a) && isOnline(b)) return 1;
    return a.username.localeCompare(b.username);
  });
  
  if (!isOpen) return null;
  
  // Get friendly time since last active
  const getLastActiveTime = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const lastActive = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = (now - lastActive) / (1000 * 60);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)} min ago`;
    if (diffInMinutes < 24 * 60) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / (60 * 24))} days ago`;
  };
  
  // Render different content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'friends':
        return (
          <div className="flex-1 overflow-y-auto">
            {loading.friends ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : sortedFriends.length === 0 ? (
              <div className="text-center p-4">
                <Users className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">You don't have any friends yet.</p>
                <button 
                  onClick={() => setActiveTab('add')}
                  className="mt-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Find friends
                </button>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {sortedFriends.map(friend => (
                  <div 
                    key={friend._id} 
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center">
                      <div className="relative">
                        <UserAvatar user={friend} size="md" />
                        <span 
                          className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 ${
                            isOnline(friend) ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        ></span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {friend.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {isOnline(friend) ? 'Online' : `Last active ${getLastActiveTime(friend.lastActive)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {roomId && (
                        <button 
                          onClick={() => handleInviteToRoom(friend._id, friend.username)}
                          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                          title="Invite to current room"
                        >
                          <Mail size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => showRemoveFriendConfirmation(friend._id, friend.username)}
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Remove friend"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'add':
        return (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-2">
              <div className={`relative ${isSearchFocused ? 'ring-2 ring-blue-500 rounded-md' : ''}`}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search for users by name or email"
                  className="block w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md py-2 pl-10 pr-3 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                />
              </div>
              {searchQuery.length > 0 && searchQuery.length < 3 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pl-2">
                  Please enter at least 3 characters to search
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading.search ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : searchQuery.length >= 3 && searchResults.length === 0 ? (
                <div className="text-center p-4">
                  <p className="text-gray-500 dark:text-gray-400">No users found matching "{searchQuery}"</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="p-2 space-y-2">
                  {searchResults.map(user => (
                    <div 
                      key={user._id} 
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center">
                        <UserAvatar user={user} size="md" />
                        <div className="ml-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div>
                        {user.friendStatus === 'request_sent' ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </span>
                        ) : user.friendStatus === 'request_received' ? (
                          <span className="text-xs text-blue-500 dark:text-blue-400 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            Received
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleSendRequest(user._id)}
                            className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 flex items-center"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Search for users by username or email
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case 'requests':
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pending Requests
                </h3>
              </div>
              {loading.requests ? (
                <div className="flex justify-center items-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No pending friend requests</p>
                </div>
              ) : (
                <div>
                  {pendingRequests.map(request => (
                    <FriendRequestAlert key={request._id} request={request} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sent Requests
                </h3>
              </div>
              {loading.requests ? (
                <div className="flex justify-center items-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : sentRequests.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No sent friend requests</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {sentRequests.map(request => (
                    <div 
                      key={request._id} 
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center">
                        <UserAvatar user={request.recipient} size="md" />
                        <div className="ml-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {request.recipient.username}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => actions.cancelFriendRequest(request._id)}
                        className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Cancel request"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'invitations': // Change this from 'invites' to 'invitations'
        return (
          <div className="flex-1 overflow-y-auto">
            {loading.invitations ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              </div>
            ) : roomInvitations.length === 0 ? (
              <div className="text-center p-4">
                <Mail className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No room invitations</p>
              </div>
            ) : (
              <div>
                {roomInvitations.map(invitation => (
                  <RoomInvitationAlert key={invitation._id} invitation={invitation} />
                ))}
              </div>
            )}
          </div>
        );
      default:
        return <div className="p-4">Invalid tab</div>;
    }
  };
  
  return (
    <div className={`fixed inset-y-0 ${isMobile ? 'inset-x-0' : 'right-0 w-80'} bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl z-40 flex flex-col`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Friends
        </h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Close panel"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === 'friends'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === 'requests'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Requests
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === 'add'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Add
        </button>
        <button
          onClick={() => setActiveTab('invitations')} // Change this from 'invites' to 'invitations'
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === 'invitations' // Change this from 'invites' to 'invitations'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Invites
        </button>
      </div>
      
      {/* Tab Content */}
      {renderTabContent()}
      
      {/* Confirmation Dialog */}
      {confirmationDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center text-amber-500 mb-4">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Confirm Action
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {confirmationDialog.action === 'remove' 
                ? `Are you sure you want to remove ${confirmationDialog.friendName} from your friends list?` 
                : 'Are you sure you want to perform this action?'}
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelAction}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsPanel;
