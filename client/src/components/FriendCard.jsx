import React, { useState } from 'react';
import { UserX, MessageSquare } from 'lucide-react';
import { useFriends } from '../contexts/FriendsContext';
import { useChat } from '../contexts/ChatContext';
import UserAvatar from './UserAvatar';
import { useNavigate } from 'react-router-dom';

const FriendCard = ({ friend }) => {
  const { actions } = useFriends();
  const { startChat } = useChat();
  const navigate = useNavigate();
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState(null);

  const handleRemoveFriend = async () => {
    if (isRemoving) return;
    
    if (!window.confirm(`Are you sure you want to remove ${friend.username} from your friends?`)) {
      return;
    }
    
    setIsRemoving(true);
    setError(null);
    
    try {
      const result = await actions.removeFriend(friend._id);
      
      if (!result.success) {
        setError(result.error || "Failed to remove friend");
        console.error("Failed to remove friend:", result.error);
      } else {
        console.log(`Friend ${friend.username} removed successfully`);
      }
    } catch (err) {
      setError("An error occurred");
      console.error("Error removing friend:", err);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleStartChat = () => {
    startChat(friend._id, friend.username);
    navigate('/chat');
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <UserAvatar user={friend} size="md" />
        <div className="ml-3">
          <p className="font-medium text-gray-900 dark:text-white">
            {friend.username}
          </p>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={handleStartChat}
          className="p-2 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Chat with friend"
        >
          <MessageSquare size={18} />
        </button>
        
        <button
          onClick={handleRemoveFriend}
          disabled={isRemoving}
          className={`p-2 rounded ${
            isRemoving
              ? 'text-gray-400 dark:text-gray-600'
              : 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          }`}
          aria-label="Remove friend"
        >
          <UserX size={18} className={isRemoving ? 'animate-pulse' : ''} />
        </button>
      </div>
    </div>
  );
};

export default FriendCard;
