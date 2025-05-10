import React, { useState } from 'react';
import { UserX, MessageSquare, Trash2, AlertCircle } from 'lucide-react';
import { useFriends } from '../contexts/FriendsContext';
import UserAvatar from './UserAvatar';

const FriendCard = ({ friend }) => {
  const { actions } = useFriends();
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Status indicator colors
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    idle: 'bg-amber-500',
    dnd: 'bg-red-500', // do not disturb
  };
  
  // Format timestamp for last active
  const formatLastActive = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const lastActive = new Date(timestamp);
    const now = new Date();
    const diffMs = now - lastActive;
    
    // Convert to minutes
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };
  
  const handleRemoveFriend = async () => {
    setIsRemoving(true);
    setError(null);
    
    try {
      console.log(`Removing friend: ${friend.username} (${friend._id})`);
      const result = await actions.removeFriend(friend._id);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove friend');
      }
      
      console.log('Friend removed successfully');
      // Don't need to update UI here as the context will handle that
    } catch (err) {
      console.error('Error removing friend:', err);
      setError(err.message || 'An error occurred');
      setShowConfirm(false);
    } finally {
      setIsRemoving(false);
    }
  };
  
  // User status display
  const userStatus = friend.status || 'offline';
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col">
      {/* Friend info section */}
      <div className="flex items-center mb-3">
        <div className="relative">
          <UserAvatar user={friend} size="md" />
          <span 
            className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[userStatus]} border-2 border-white dark:border-gray-800 rounded-full`}
          ></span>
        </div>
        <div className="ml-3">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {friend.username}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {userStatus === 'online' 
              ? 'Online now' 
              : `Last active ${formatLastActive(friend.lastActive)}`}
          </p>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="mt-auto pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
        <button
          className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm flex items-center"
          aria-label="Message friend"
        >
          <MessageSquare size={16} className="mr-1" />
          Message
        </button>
        
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-sm flex items-center"
            aria-label="Remove friend"
          >
            <UserX size={16} className="mr-1" />
            Remove
          </button>
        ) : (
          <div className="flex items-center">
            <button
              onClick={handleRemoveFriend}
              disabled={isRemoving}
              className={`text-red-600 dark:text-red-400 text-sm flex items-center ${
                isRemoving ? 'opacity-50 cursor-not-allowed' : 'hover:text-red-700'
              }`}
            >
              <Trash2 size={16} className="mr-1" />
              {isRemoving ? "Removing..." : "Confirm"}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
              disabled={isRemoving}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-md flex items-center">
          <AlertCircle size={12} className="mr-1 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FriendCard;
