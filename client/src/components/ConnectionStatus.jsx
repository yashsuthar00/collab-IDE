import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const ConnectionStatus = ({ connected }) => {
  const [visible, setVisible] = useState(!connected);
  
  // Show/hide status based on connection state
  useEffect(() => {
    if (connected) {
      // When connected, show "Connected" message briefly, then hide
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    } else {
      // When disconnected, always show status
      setVisible(true);
    }
  }, [connected]);
  
  if (!visible) return null;
  
  return (
    <div className={`
      fixed bottom-4 right-4 
      flex items-center px-3 py-2 rounded-full
      transition-opacity duration-300
      ${connected 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}
    `}>
      {connected ? (
        <>
          <Wifi size={16} className="mr-2" />
          <span className="text-sm font-medium">Connected</span>
        </>
      ) : (
        <>
          <WifiOff size={16} className="mr-2" />
          <span className="text-sm font-medium">Reconnecting...</span>
        </>
      )}
    </div>
  );
};

export default ConnectionStatus;
