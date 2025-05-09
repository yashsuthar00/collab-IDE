import React from 'react';
import { Check, X, Users } from 'lucide-react';
import { useFriends } from '../contexts/FriendsContext';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../contexts/RoomContext';
import UserAvatar from './UserAvatar';
import { getFromStorage } from '../utils/storage';

const RoomInvitationAlert = ({ invitation }) => {
  const { actions } = useFriends();
  const { joinRoom } = useRoom();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const result = await actions.acceptRoomInvitation(invitation._id);
      console.log('Accept invitation result:', result);
      
      if (result.success && result.roomId) {
        // Get username from storage
        const userName = getFromStorage('user_name') || invitation.recipient.username;
        
        // First update the API status
        console.log(`Accepted invitation to room ${result.roomId}, joining...`);
        
        // Join the room directly with the context method
        // This ensures proper socket connection
        joinRoom(result.roomId, userName, true);
        
        // After joining, navigate to the room page
        navigate(`/room/${result.roomId}`);
      } else {
        alert('Couldn\'t join the room. The invitation might be expired.');
      }
    } catch (error) {
      console.error('Error accepting room invitation:', error);
      alert('Error joining room. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      await actions.declineRoomInvitation(invitation._id);
    } catch (error) {
      console.error('Error declining room invitation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculate relative time for invitation
  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const inviteTime = new Date(timestamp);
    const diffInHours = (now - inviteTime) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.round(diffInHours * 60)} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      return `${Math.floor(diffInHours / 24)} days ago`;
    }
  };
  
  return (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        {invitation.sender.avatar ? (
          <UserAvatar user={invitation.sender} size="md" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <Users size={20} />
          </div>
        )}
        <div className="ml-3">
          <p className="font-medium text-gray-900 dark:text-white">
            {invitation.sender.username}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Invited you to room <span className="font-mono font-medium">{invitation.roomName}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {getRelativeTime(invitation.createdAt)}
          </p>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className={`px-2 py-1 rounded ${
            isProcessing
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              : 'bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/50'
          }`}
          aria-label="Accept room invitation"
        >
          <Check size={16} className="inline mr-1" />
          <span className="text-xs">Join</span>
        </button>
        <button
          onClick={handleDecline}
          disabled={isProcessing}
          className={`px-2 py-1 rounded ${
            isProcessing
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              : 'bg-red-100 dark:bg-red-800/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50'
          }`}
          aria-label="Decline room invitation"
        >
          <X size={16} className="inline mr-1" />
          <span className="text-xs">Decline</span>
        </button>
      </div>
    </div>
  );
};

export default RoomInvitationAlert;
