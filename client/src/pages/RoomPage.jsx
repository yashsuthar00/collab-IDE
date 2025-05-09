import { useEffect, useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { useRoom } from '../contexts/RoomContext';
import { getFromStorage } from '../utils/storage';
import CodeEditor from '../components/CodeEditor';
import LoadingSpinner from '../components/LoadingSpinner';

const RoomPage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const { isInRoom, joinRoom, loading: roomLoading, error: roomError } = useRoom();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // When the page loads, check for invitation state
  useEffect(() => {
    const joinFromInvitation = async () => {
      if (location.state?.fromInvitation) {
        try {
          setLoading(true);
          // Use the username from state or storage
          const userName = location.state.userName || getFromStorage('user_name');
          
          if (userName) {
            console.log(`Joining room ${roomId} as ${userName} from invitation`);
            
            // Use the context join method which handles socket connection
            // The third parameter (true) indicates this is from an invitation
            joinRoom(roomId, userName, true);
          } else {
            setError('Username not found. Please try joining manually.');
          }
        } catch (err) {
          console.error('Error joining room from invitation:', err);
          setError(err.message || 'Failed to join room');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    joinFromInvitation();
  }, [roomId, location.state, joinRoom]);
  
  // Show loading state
  if (loading || roomLoading) {
    return <LoadingSpinner message="Joining room..." />;
  }
  
  // Show error message
  if (error || roomError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          <h3 className="font-bold mb-2">Error joining room</h3>
          <p>{error || roomError}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  // Redirect to join page if not in room
  if (!isInRoom && !loading && !roomLoading) {
    return <Navigate to={`/join/${roomId}`} />;
  }
  
  // Show room content when in room
  return (
    <div className="h-screen flex flex-col">
      <CodeEditor roomId={roomId} />
    </div>
  );
};

export default RoomPage;
