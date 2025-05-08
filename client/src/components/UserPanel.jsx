import { useState, useEffect } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { Users, X, Settings, MessageSquare, Copy, Edit, Play, Eye, UserPlus, UserPlus2, Mail, Check } from 'lucide-react';
import { ACCESS_LEVELS } from '../utils/roomService';
import { hasTourBeenSeen, createUserPanelTour } from '../utils/tours';
import { useSelector } from 'react-redux';
import { useFriends } from '../contexts/FriendsContext';
import { getConnectedSocket } from '../utils/api';

const UserPanel = ({ isOpen, onClose }) => {
  const {
    users,
    currentUser,
    checkPermission,
    updateUserAccess,
    removeUser,
    roomId
  } = useRoom();
  
  const { user: authUser } = useSelector(state => state.auth);
  const { friends, actions } = useFriends();
  
  const [activeTab, setActiveTab] = useState('users');
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [addingFriend, setAddingFriend] = useState(null);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [invitingFriend, setInvitingFriend] = useState(null);
  const [invitedFriends, setInvitedFriends] = useState({});
  
  // Show tour for first-time users
  useEffect(() => {
    if (isOpen && !hasTourBeenSeen('user_panel')) {
      const timer = setTimeout(() => {
        const tour = createUserPanelTour();
        tour.drive();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // Check if a user is already a friend or if there's a pending request
  const getFriendStatus = (userId) => {
    if (!authUser || userId === authUser.id) return 'self';
    
    const isFriend = friends.some(friend => friend._id === userId);
    if (isFriend) return 'friend';
    
    return 'not_friend';
  };
  
  // Handle adding a friend from user list
  const handleAddFriend = async (userId) => {
    setAddingFriend(userId);
    try {
      await actions.sendFriendRequest(userId);
      alert('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request. Please try again.');
    } finally {
      setAddingFriend(null);
    }
  };
  
  // Handle sending room invitation to a friend
  const handleSendRoomInvitation = async (friendId) => {
    setInvitingFriend(friendId);
    try {
      const roomName = `Collaboration Room ${roomId.substring(0, 6)}`;
      
      const result = await actions.sendRoomInvitation(friendId, roomId, roomName);
      
      if (result.success) {
        const socket = await getConnectedSocket();
        socket.emit('send-room-invitation', {
          senderId: authUser.id, 
          recipientId: friendId,
          roomId,
          roomName
        });
        
        // Instead of alert, mark this friend as invited
        setInvitedFriends(prev => ({
          ...prev,
          [friendId]: true
        }));
      } else {
        console.error(`Failed to send invitation: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending room invitation:', error);
    } finally {
      setInvitingFriend(null);
    }
  };
  
  // Get the appropriate icon for each access level
  const getAccessLevelIcon = (accessLevel) => {
    switch(accessLevel) {
      case ACCESS_LEVELS.OWNER:
        return <Settings className="w-4 h-4 text-yellow-500" />;
      case ACCESS_LEVELS.EDITOR:
        return <Edit className="w-4 h-4 text-blue-500" />;
      case ACCESS_LEVELS.RUNNER:
        return <Play className="w-4 h-4 text-green-500" />;
      case ACCESS_LEVELS.VIEWER:
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };
  
  // Get user status info
  const getUserStatus = (user) => {
    if (user.id === currentUser.id) return '(You)';
    return '';
  };
  
  // Format access level for display
  const formatAccessLevel = (level) => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };
  
  // Handler for copying room ID
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedRoomId(true);
    setTimeout(() => setCopiedRoomId(false), 2000);
  };
  
  // Render access level dropdown for a user
  const renderAccessLevelDropdown = (user) => {
    if (user.accessLevel === ACCESS_LEVELS.OWNER || user.id === currentUser.id) {
      return (
        <div className="flex items-center">
          {getAccessLevelIcon(user.accessLevel)}
          <span className="ml-2">{formatAccessLevel(user.accessLevel)}</span>
        </div>
      );
    }
    
    return (
      <select
        id="access-level-controls"
        className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-xs rounded-md p-1"
        value={user.accessLevel}
        onChange={(e) => updateUserAccess(user.id, e.target.value)}
        disabled={!checkPermission('MANAGE_USERS')}
      >
        {Object.values(ACCESS_LEVELS).map(level => (
          level !== ACCESS_LEVELS.OWNER && (
            <option key={level} value={level}>
              {formatAccessLevel(level)}
            </option>
          )
        ))}
      </select>
    );
  };
  
  // Panel header component
  const PanelHeader = () => (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <Users className="w-5 h-5 text-blue-500 mr-2" />
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Room Collaboration</h2>
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
        aria-label="Close panel"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
  
  // Room info component
  const RoomInfo = () => (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">Room ID:</p>
        <div className="flex items-center">
          <code id="room-id-display" className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
            {roomId}
          </code>
          <button 
            id="copy-room-id"
            onClick={handleCopyRoomId}
            className="ml-2 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
            aria-label="Copy room ID"
          >
            <Copy className="w-4 h-4" />
          </button>
          {copiedRoomId && (
            <span className="ml-2 text-xs text-green-500 dark:text-green-400">Copied!</span>
          )}
        </div>
      </div>
      
      <div className="flex justify-end">
        <button 
          onClick={() => setShowFriendsList(!showFriendsList)}
          className="flex items-center text-xs px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50"
        >
          <UserPlus2 className="w-3 h-3 mr-1" />
          Invite Friends
        </button>
      </div>
    </div>
  );
  
  // Tab navigation component
  const TabsNavigation = () => (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex">
        <button
          className={`flex items-center px-4 py-2 text-sm font-medium ${
            activeTab === 'users'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="w-4 h-4 mr-2" />
          Users
        </button>
        <button
          className={`flex items-center px-4 py-2 text-sm font-medium ${
            activeTab === 'chat'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat
        </button>
      </nav>
    </div>
  );
  
  // Friends list for invitations
  const FriendsList = () => (
    <div className="max-h-60 overflow-y-auto border border-blue-100 dark:border-blue-900 rounded-md p-2 mb-2 bg-blue-50 dark:bg-blue-900/10">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 pb-1 border-b border-blue-100 dark:border-blue-900 flex justify-between">
        <span>Select a friend to invite:</span>
        <button 
          onClick={() => setShowFriendsList(false)} 
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      
      {friends.length === 0 ? (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 p-2">
          You don't have any friends to invite yet.
        </p>
      ) : (
        <div className="space-y-1">
          {friends.map(friend => (
            <div 
              key={friend._id}
              className="flex items-center justify-between p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20"
            >
              <div className="flex items-center">
                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${friend.status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-xs text-gray-800 dark:text-gray-200">
                  {friend.username}
                </span>
              </div>
              
              {invitedFriends[friend._id] ? (
                <span className="text-xs text-green-600 dark:text-green-400 p-1 rounded-md flex items-center">
                  <Check className="h-3 w-3 mr-1" />
                  <span>Invited</span>
                </span>
              ) : (
                <button
                  onClick={() => handleSendRoomInvitation(friend._id, friend.username)}
                  disabled={invitingFriend === friend._id}
                  className="text-blue-500 hover:text-blue-600 p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/20 flex items-center"
                  title="Invite to room"
                >
                  {invitingFriend === friend._id ? (
                    <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <Mail className="h-3 w-3" />
                      <span className="text-xs ml-1">Invite</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  // Users list component with add friend button
  const UsersList = () => (
    <div id="users-list" className="p-2 overflow-y-auto flex-1">
      {showFriendsList && <FriendsList />}
      
      <div className="space-y-2">
        {users.map((user) => (
          <div 
            key={user.id} 
            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                {user.name} {getUserStatus(user)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {renderAccessLevelDropdown(user)}
              
              {getFriendStatus(user.id) === 'not_friend' && authUser && (
                <button
                  onClick={() => handleAddFriend(user.id)}
                  disabled={addingFriend === user.id}
                  className="text-blue-500 hover:text-blue-600 p-1"
                  aria-label="Add friend"
                  title="Add as friend"
                >
                  {addingFriend === user.id ? (
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </button>
              )}
              
              {user.accessLevel !== ACCESS_LEVELS.OWNER && checkPermission('MANAGE_USERS') && (
                <button
                  onClick={() => removeUser(user.id)}
                  className="text-red-500 hover:text-red-600 p-1"
                  aria-label="Remove user"
                  title="Remove from room"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  if (!isOpen) return null;
  
  return (
    <div 
      id="user-panel-content"
      className="fixed top-0 right-0 h-full w-64 md:w-72 bg-white dark:bg-gray-900 shadow-lg border-l border-gray-200 dark:border-gray-800 flex flex-col z-20 transform transition-transform duration-300 ease-in-out"
    >
      <PanelHeader />
      <RoomInfo />
      <TabsNavigation />
      
      {activeTab === 'users' ? (
        <UsersList />
      ) : (
        <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
          Chat feature coming soon
        </div>
      )}
    </div>
  );
};

export default UserPanel;
