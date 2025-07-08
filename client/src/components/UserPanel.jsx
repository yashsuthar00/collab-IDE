import { useState, useEffect } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { Users, X, Settings, MessageSquare, Copy, UserPlus, Check, Mail, Eye, Edit, Play } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useFriends } from '../contexts/FriendsContext';
import { generateUserColor } from '../utils/cursorStyles';
import UserAvatar from './UserAvatar';

// Access level definitions - import from RoomContext if not already available
const ACCESS_LEVELS = {
  OWNER: 'owner',
  EDITOR: 'editor',
  RUNNER: 'runner',
  VIEWER: 'viewer',
};

const UserPanel = ({ isOpen, onClose }) => {
  const {
    users,
    currentUser,
    canManageUsers,
    updateUserAccess,
    slug
  } = useRoom();
  
  const { user: authUser } = useSelector(state => state.auth);
  const { friends, actions } = useFriends();
  
  const [activeTab, setActiveTab] = useState('users');
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [invitingFriend, setInvitingFriend] = useState(null);
  const [invitedFriends, setInvitedFriends] = useState({});
  
  // Sort users: owner first, then editors, then others, alphabetically within groups
  const sortedUsers = [...users].sort((a, b) => {
    // Owner always comes first
    if (a.isOwner) return -1;
    if (b.isOwner) return 1;
    
    // Then editors
    if (a.accessLevel === 'editor' && b.accessLevel !== 'editor') return -1;
    if (a.accessLevel !== 'editor' && b.accessLevel === 'editor') return 1;
    
    // Then runners
    if (a.accessLevel === 'runner' && b.accessLevel !== 'runner') return -1;
    if (a.accessLevel !== 'runner' && b.accessLevel === 'runner') return 1;
    
    // Alphabetical by name within groups
    return (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '');
  });
  
  // Check if a user is already a friend or if there's a pending request
  const getFriendStatus = (userId) => {
    if (!authUser || !userId) return 'self';
    
    // Convert string ID to string for comparison if needed
    const stringUserId = String(userId);
    const stringAuthId = String(authUser._id);
    
    // If this is the current user
    if (stringUserId === stringAuthId) return 'self';
    
    // Check if they are already a friend
    const isFriend = friends.some(friend => String(friend._id) === stringUserId);
    if (isFriend) return 'friend';
    
    return 'not_friend';
  };
  
  // Copy room link to clipboard
  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/room/${slug}`;
    navigator.clipboard.writeText(roomLink);
    setCopiedRoomId(true);
    setTimeout(() => setCopiedRoomId(false), 2000);
  };
  
  // Send invitation to a friend
  const inviteFriend = async (friendId) => {
    if (invitedFriends[friendId]) return;
    
    setInvitingFriend(friendId);
    
    try {
      const response = await actions.sendRoomInvitation({
        roomId: slug,
        userId: friendId
      });
      
      if (response.data.success) {
        setInvitedFriends(prev => ({
          ...prev,
          [friendId]: true
        }));
      }
    } catch (error) {
      console.error('Failed to invite friend:', error);
    } finally {
      setInvitingFriend(null);
    }
  };
  
  // Handle access level change for a user
  const handleAccessChange = (userId, newAccess) => {
    if (!canManageUsers) return;
    updateUserAccess(userId, newAccess);
  };
  
  // Add debug logging
  useEffect(() => {
    console.log("UserPanel users:", users);
  }, [users]);
  
  // Handle adding a friend from user list
  const handleAddFriend = async (userId) => {
    try {
      await actions.sendFriendRequest(userId);
      alert('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request. Please try again.');
    }
  };
  
  // Get the appropriate icon for each access level is not used in this component
  
  // User status and formatting helpers are not used in the current implementation
  
  if (!isOpen) return null;
  
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-medium flex items-center">
          {activeTab === 'users' && (
            <>
              <Users size={18} className="mr-2" />
              Users ({users.length})
            </>
          )}
          {activeTab === 'friends' && (
            <>
              <UserPlus size={18} className="mr-2" />
              Invite Friends
            </>
          )}
        </h3>
        
        <div className="flex items-center space-x-2">
          {onClose && (
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 px-4 text-sm font-medium text-center ${
            activeTab === 'users'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2 px-4 text-sm font-medium text-center ${
            activeTab === 'friends'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Invite
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'users' && (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sortedUsers.map(user => {
              const isCurrentUser = user.id === currentUser.id;
              const userColor = generateUserColor(user.id);
              
              return (
                <div 
                  key={user.id} 
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center"
                >
                  <UserAvatar 
                    user={user} 
                    size="sm" 
                    showStatus 
                    highlightColor={userColor}
                  />
                  
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">
                        {user.displayName || user.username || 'Anonymous'}
                        {isCurrentUser && (
                          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                            (you)
                          </span>
                        )}
                      </div>
                      
                      {user.isOwner && (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 rounded">
                          Owner
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center mt-1">
                      {canManageUsers && !user.isOwner && !isCurrentUser ? (
                        <select
                          value={user.accessLevel}
                          onChange={(e) => handleAccessChange(user.id, e.target.value)}
                          className="text-xs bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5"
                        >
                          <option value="editor">Editor</option>
                          <option value="runner">Runner</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className={`
                          text-xs px-1.5 py-0.5 rounded
                          ${user.accessLevel === 'editor' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : ''}
                          ${user.accessLevel === 'runner' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : ''}
                          ${user.accessLevel === 'viewer' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' : ''}
                        `}>
                          {user.accessLevel.charAt(0).toUpperCase() + user.accessLevel.slice(1)}
                        </span>
                      )}
                      
                      {!isCurrentUser && getFriendStatus(user.id) === 'not_friend' && (
                        <button
                          onClick={() => handleAddFriend(user.id)}
                          className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          title="Add as friend"
                        >
                          <UserPlus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {activeTab === 'friends' && (
          <div className="p-4">
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Share Room Link</h4>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/room/${slug}`}
                  className="flex-1 text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700"
                />
                <button
                  onClick={copyRoomLink}
                  className="px-3 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
                >
                  {copiedRoomId ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Anyone with this link can join the room
              </p>
            </div>
            
            {friends.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium mb-2">Invite Friends</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {friends.map(friend => (
                    <div
                      key={friend._id}
                      className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-md"
                    >
                      <div className="flex items-center">
                        <UserAvatar user={friend} size="xs" />
                        <span className="ml-2 text-sm font-medium">
                          {friend.displayName || friend.username}
                        </span>
                      </div>
                      <button
                        onClick={() => inviteFriend(friend._id)}
                        disabled={invitingFriend === friend._id || invitedFriends[friend._id]}
                        className={`px-2 py-1 text-xs rounded-md ${
                          invitedFriends[friend._id]
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50'
                        }`}
                      >
                        {invitedFriends[friend._id]
                          ? 'Invited'
                          : invitingFriend === friend._id
                            ? 'Inviting...'
                            : 'Invite'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <UserPlus size={40} className="mx-auto mb-2 opacity-50" />
                <p>You don't have any friends yet</p>
                <p className="text-sm mt-1">Add friends to invite them to your rooms</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPanel;
