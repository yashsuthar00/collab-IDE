import React from 'react';
import { Check, X, User } from 'lucide-react';
import { useFriends } from '../contexts/FriendsContext';
import UserAvatar from './UserAvatar';

const FriendRequestAlert = ({ request }) => {
  const { actions } = useFriends();
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await actions.acceptFriendRequest(request._id);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await actions.rejectFriendRequest(request._id);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        {request.sender.avatar ? (
          <UserAvatar user={request.sender} size="md" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <User size={20} />
          </div>
        )}
        <div className="ml-3">
          <p className="font-medium text-gray-900 dark:text-white">
            {request.sender.username}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sent you a friend request
          </p>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className={`p-2 rounded-full ${
            isProcessing
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              : 'bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/50'
          }`}
          aria-label="Accept friend request"
        >
          <Check size={16} />
        </button>
        <button
          onClick={handleReject}
          disabled={isProcessing}
          className={`p-2 rounded-full ${
            isProcessing
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              : 'bg-red-100 dark:bg-red-800/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50'
          }`}
          aria-label="Reject friend request"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default FriendRequestAlert;
