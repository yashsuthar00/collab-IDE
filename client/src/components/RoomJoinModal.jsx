import { useState, useEffect } from 'react';
import { Users, X, Plus, LogIn, AlertCircle } from 'lucide-react';
import { useRoom } from '../contexts/RoomContext';

const RoomJoinModal = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState('join'); // 'join' or 'create'
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [localError, setLocalError] = useState(null);
  
  const { joinRoom, createRoom, loading, error } = useRoom();
  
  // Reset local error when switching modes
  useEffect(() => {
    setLocalError(null);
  }, [mode]);
  
  // Load user name from localStorage if available
  useEffect(() => {
    const savedUserName = localStorage.getItem('user_name');
    if (savedUserName) {
      setUserName(savedUserName);
    }
  }, [isOpen]);
  
  // Handle form submission - this was causing the page refresh
  const handleSubmit = (e) => {
    // Explicitly prevent default behavior with high priority
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    setLocalError(null);
    
    // Validate form
    if (!userName.trim()) {
      setLocalError('Please enter your name');
      return;
    }
    
    if (mode === 'join') {
      if (!roomId.trim()) {
        setLocalError('Please enter a room ID');
        return;
      }
      console.log(`Submitting join request: ${roomId.trim()}, ${userName.trim()}`);
      joinRoom(roomId.trim(), userName.trim());
    } else if (mode === 'create') {
      console.log(`Submitting create request: ${userName.trim()}, ${roomName.trim()}`);
      createRoom(userName.trim(), roomName.trim());
    }
    
    // Prevent any potential default behavior that wasn't caught
    return false;
  };
  
  // Handle button click separately from form submission
  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit(e);
    return false;
  };
  
  // Close modal on successful join/create (when not loading and no error)
  useEffect(() => {
    if (!loading && !error && isOpen) {
      onClose();
    }
  }, [loading, error, isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'join' ? 'Join Room' : 'Create Room'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden mb-4">
            <button
              type="button"
              className={`flex-1 py-2 px-4 ${
                mode === 'join'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setMode('join')}
            >
              <div className="flex items-center justify-center">
                <LogIn className="w-4 h-4 mr-2" />
                Join Existing
              </div>
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-4 ${
                mode === 'create'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setMode('create')}
            >
              <div className="flex items-center justify-center">
                <Plus className="w-4 h-4 mr-2" />
                Create New
              </div>
            </button>
          </div>
          
          <div> {/* Changed from <form> to <div> to avoid any form submission */}
            {/* Display error message if any */}
            {(error || localError) && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md mb-4 text-sm flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>{error || localError}</div>
              </div>
            )}
            
            {/* User name field (always required) */}
            <div className="mb-4">
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            {mode === 'join' ? (
              <div className="mb-4">
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Room ID
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter room ID"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Room Name (Optional)
                </label>
                <input
                  type="text"
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}
            
            <div className="mt-6">
              <button
                type="button" // Explicitly set as button type
                onClick={handleButtonClick}
                disabled={loading}
                className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : mode === 'join' ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Join Room
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Room
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomJoinModal;
