import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Clock, Check, X } from 'lucide-react';
import { useFriends } from '../contexts/FriendsContext';
import UserAvatar from './UserAvatar';

const FriendsSearch = () => {
  const { searchResults, loading, error, actions } = useFriends();
  const [searchTerm, setSearchTerm] = useState('');
  const [requestStatus, setRequestStatus] = useState({});
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    // Reset local error when global error changes
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  // Handle search term input
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // Clear local errors when user types
    if (localError) {
      setLocalError(null);
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim().length < 3) {
      setLocalError('Please enter at least 3 characters');
      return;
    }
    
    setLocalError(null);
    setSearchPerformed(true);
    actions.searchUsers(searchTerm);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Send friend request
  const sendRequest = async (userId) => {
    try {
      setRequestStatus(prev => ({ ...prev, [userId]: 'sending' }));
      const result = await actions.sendFriendRequest(userId);
      
      if (result.success) {
        setRequestStatus(prev => ({ ...prev, [userId]: 'sent' }));
        
        // Clear status after 3 seconds
        setTimeout(() => {
          setRequestStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[userId];
            return newStatus;
          });
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      setRequestStatus(prev => ({ ...prev, [userId]: 'error' }));
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Find Friends</h3>
        
        <div className="relative">
          <input 
            type="text"
            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Search by username..."
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyPress={handleKeyPress}
          />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <button
            onClick={handleSearch}
            disabled={loading.search || searchTerm.trim().length < 3}
            className={`absolute right-2 top-2 px-2 py-1 rounded text-xs font-medium ${
              loading.search || searchTerm.trim().length < 3
                ? 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-800/30 dark:text-blue-400 dark:hover:bg-blue-800/50'
            }`}
          >
            Search
          </button>
        </div>
        
        {localError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{localError}</p>
        )}
      </div>

      <div className="p-4">
        {loading.search && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Searching...</span>
          </div>
        )}

        {!loading.search && searchPerformed && searchResults.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">No users found matching "{searchTerm}"</p>
          </div>
        )}

        {!loading.search && searchResults.length > 0 && (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map(user => (
              <li 
                key={user._id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center">
                  <UserAvatar user={user} size="sm" />
                  <div className="ml-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {user.username}
                    </p>
                  </div>
                </div>
                
                <div>
                  {user.friendStatus === 'friend' ? (
                    <span className="text-sm bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-md flex items-center">
                      <Check size={14} className="mr-1" /> Friends
                    </span>
                  ) : user.friendStatus === 'request_sent' ? (
                    <span className="text-sm bg-yellow-100 dark:bg-yellow-800/30 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-md flex items-center">
                      <Clock size={14} className="mr-1" /> Request Sent
                    </span>
                  ) : user.friendStatus === 'request_received' ? (
                    <span className="text-sm bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md flex items-center">
                      <Clock size={14} className="mr-1" /> Pending Request
                    </span>
                  ) : requestStatus[user._id] === 'sending' ? (
                    <span className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded-md flex items-center">
                      <div className="animate-spin h-3 w-3 border border-gray-500 rounded-full border-t-transparent mr-1"></div>
                      Sending...
                    </span>
                  ) : requestStatus[user._id] === 'sent' ? (
                    <span className="text-sm bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-md flex items-center">
                      <Check size={14} className="mr-1" /> Request Sent
                    </span>
                  ) : requestStatus[user._id] === 'error' ? (
                    <span className="text-sm bg-red-100 dark:bg-red-800/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-md flex items-center">
                      <X size={14} className="mr-1" /> Failed
                    </span>
                  ) : (
                    <button
                      onClick={() => sendRequest(user._id)}
                      className="text-sm flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50"
                    >
                      <UserPlus size={14} className="mr-1" />
                      Add Friend
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FriendsSearch;
