import { useState, useEffect } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { Users, X, Settings, MessageSquare, Copy, Edit, Play, Eye } from 'lucide-react';
import { ACCESS_LEVELS } from '../utils/roomService';
import { hasTourBeenSeen, createUserPanelTour } from '../utils/tours';

const UserPanel = ({ isOpen, onClose }) => {
  const {
    users,
    currentUser,
    checkPermission,
    updateUserAccess,
    removeUser,
    roomId
  } = useRoom();
  
  const [activeTab, setActiveTab] = useState('users');
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  
  // Show tour for first-time users
  useEffect(() => {
    if (isOpen && !hasTourBeenSeen('user_panel')) {
      // Small delay to ensure the panel is fully rendered
      const timer = setTimeout(() => {
        const tour = createUserPanelTour();
        tour.drive();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
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
    // You can't change the access level of yourself or the owner
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
      <div className="flex justify-between items-center">
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
  
  // Users list component
  const UsersList = () => (
    <div id="users-list" className="p-2 overflow-y-auto flex-1">
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
              
              {/* Remove user button (only shown for non-owners and if user has permission) */}
              {user.accessLevel !== ACCESS_LEVELS.OWNER && checkPermission('MANAGE_USERS') && (
                <button
                  onClick={() => removeUser(user.id)}
                  className="text-red-500 hover:text-red-600 p-1"
                  aria-label="Remove user"
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
