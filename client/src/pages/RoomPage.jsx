import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useRoom } from '../contexts/RoomContext';
import CodeEditor from '../components/CodeEditor';
import LoadingSpinner from '../components/LoadingSpinner';
import UserPanel from '../components/UserPanel';
import Header from '../components/Header';
import RoomSettingsPanel from '../components/RoomSettingsPanel';
import ChatPanel from '../components/ChatPanel';
import ConnectionStatus from '../components/ConnectionStatus';

const RoomPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const auth = useSelector(state => state.auth);
  
  const { 
    isInRoom, joinRoom, loading, error, connected,
    room, currentUser, users, chat, sendChatMessage
  } = useRoom();
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Effect to join room when component mounts
  useEffect(() => {
    if (!slug) {
      navigate('/');
      return;
    }
    
    // If not logged in, redirect to login
    if (!auth.isAuthenticated) {
      navigate('/login', { state: { from: `/room/${slug}` } });
      return;
    }
    
    // If not in this room yet, join it
    if (!isInRoom && !loading) {
      joinRoom(slug);
    }
  }, [slug, auth.isAuthenticated, isInRoom, loading, joinRoom, navigate]);
  
  // Show loading state
  if (loading) {
    return <LoadingSpinner message="Joining room..." />;
  }
  
  // Show error message
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          <h3 className="font-bold mb-2">Error joining room</h3>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Go Home
        </button>
      </div>
    );
  }
  
  // Show room content when in room
  return (
    <div className="h-screen flex flex-col">
      <Header 
        roomName={room.name} 
        isPublic={room.isPublic}
        language={room.language}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onChatClick={() => setIsChatOpen(true)}
      />
      
      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <CodeEditor />
          
          {/* Connection status indicator */}
          <ConnectionStatus connected={connected} />
        </div>
        
        {/* Right sidebar for user list */}
        <UserPanel 
          users={users} 
          currentUser={currentUser} 
        />
      </div>
      
      {/* Settings panel */}
      {isSettingsOpen && (
        <RoomSettingsPanel 
          room={room}
          isOwner={currentUser.isOwner}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
      
      {/* Chat panel */}
      {isChatOpen && (
        <ChatPanel 
          messages={chat}
          sendMessage={sendChatMessage}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
};

export default RoomPage;
