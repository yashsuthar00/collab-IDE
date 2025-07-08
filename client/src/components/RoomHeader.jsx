import { Settings, MessageSquare, Copy, X, Check } from 'lucide-react';
import { useState } from 'react';
import LanguageIcon from './LanguageIcon';
import { useRoom } from '../contexts/RoomContext';

const RoomHeader = ({ roomName, isPublic, language, onSettingsClick, onChatClick }) => {
  const { leaveRoom } = useRoom();
  const [copiedLink, setCopiedLink] = useState(false);
  
  const copyRoomLink = () => {
    const roomLink = window.location.href;
    navigator.clipboard.writeText(roomLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };
  
  const handleLeaveRoom = () => {
    leaveRoom();
  };
  
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center space-x-4">
          <h1 className="font-semibold text-lg truncate">
            {roomName || 'Collaborative Room'}
          </h1>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <span className={`
              w-2 h-2 rounded-full 
              ${isPublic ? 'bg-green-500' : 'bg-yellow-500'}
            `}></span>
            <span>{isPublic ? 'Public' : 'Private'}</span>
          </div>
          
          <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300">
            <LanguageIcon language={language} size={16} />
            <span className="capitalize">{language}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={copyRoomLink}
            className="flex items-center px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            title="Copy room link"
          >
            {copiedLink ? (
              <>
                <Check size={16} className="mr-1" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} className="mr-1" />
                <span>Share</span>
              </>
            )}
          </button>
          
          <button
            onClick={onChatClick}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title="Chat"
          >
            <MessageSquare size={20} />
          </button>
          
          <button
            onClick={onSettingsClick}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title="Room settings"
          >
            <Settings size={20} />
          </button>
          
          <button
            onClick={handleLeaveRoom}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            title="Leave room"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default RoomHeader;
