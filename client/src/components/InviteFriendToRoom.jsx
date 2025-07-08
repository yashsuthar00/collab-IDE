import React, { useState, useEffect } from 'react';
import { Search, Users, UserPlus, Check, X } from 'lucide-react';
import { useRoom } from '../contexts/RoomContext';
import { findAllFriends } from '../utils/roomService';
import UserAvatar from './UserAvatar';

const InviteFriendToRoom = () => {
  const { currentUser, inviteUserToRoom } = useRoom();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [invitationStatus, setInvitationStatus] = useState({});

  useEffect(() => {
    const loadFriends = async () => {
      if (!currentUser.id) return;
      
      setLoading(true);
      try {
        const result = await findAllFriends(currentUser.id);
        if (result.success) {
          setFriends(result.friends);
        } else {
          setError('Could not load friends');
        }
      } catch (err) {
        console.error('Error loading friends:', err);
        setError('Error loading friends');
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [currentUser.id]);

  const handleInvite = async (friend) => {
    try {
      const result = await inviteUserToRoom(
        friend._id || friend.id, 
        friend.username, 
        friend.isPending
      );
      
      if (result.success) {
        setInvitationStatus(prev => ({
          ...prev,
          [friend._id || friend.id]: {
            status: 'sent',
            message: 'Invitation sent'
          }
        }));
        
        // Auto-reset status message after 3 seconds
        setTimeout(() => {
          setInvitationStatus(prev => {
            const newStatus = {...prev};
            delete newStatus[friend._id || friend.id];
            return newStatus;
          });
        }, 3000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error inviting friend:', err);
      setInvitationStatus(prev => ({
        ...prev,
        [friend._id || friend.id]: {
          status: 'error',
          message: 'Failed to send invitation'
        }
      }));
    }
  };

  // Filter friends based on search term
  const filteredFriends = searchTerm 
    ? friends.filter(friend => 
        friend.username.toLowerCase().includes(searchTerm.toLowerCase()))
    : friends;

  return (
    <div className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white flex items-center">
        <Users size={18} className="mr-2" />
        Invite Friends to Room
      </h3>
      
      <div className="relative mb-4">
        <input 
          type="text"
          placeholder="Search friends..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
      </div>
      
      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      )}
      
      {error && (
        <div className="text-center text-red-500 dark:text-red-400 py-2">
          {error}
        </div>
      )}
      
      {!loading && !error && filteredFriends.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          {searchTerm ? 'No friends match your search' : 'No friends found'}
        </div>
      )}
      
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {filteredFriends.map(friend => (
          <li 
            key={friend._id || friend.id} 
            className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center">
              <UserAvatar user={friend} size="sm" />
              <div className="ml-2">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {friend.username}
                </p>
                {friend.isPending && (
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
                    Pending
                  </span>
                )}
              </div>
            </div>
            
            <div>
              {invitationStatus[friend._id || friend.id] ? (
                <span className={`text-sm flex items-center ${
                  invitationStatus[friend._id || friend.id].status === 'sent' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {invitationStatus[friend._id || friend.id].status === 'sent' ? (
                    <Check size={16} className="mr-1" />
                  ) : (
                    <X size={16} className="mr-1" />
                  )}
                  {invitationStatus[friend._id || friend.id].message}
                </span>
              ) : (
                <button
                  onClick={() => handleInvite(friend)}
                  className="flex items-center px-2 py-1 text-sm bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50"
                >
                  <UserPlus size={14} className="mr-1" />
                  Invite
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InviteFriendToRoom;
