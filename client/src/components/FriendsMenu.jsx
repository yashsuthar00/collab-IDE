import { useState, useEffect, useRef } from 'react';
import { Users, Bell, UserPlus } from 'lucide-react';
import { useFriends } from '../contexts/FriendsContext';
import { useSelector } from 'react-redux';
import NotificationBadge from './NotificationBadge';
import FriendsPanel from './FriendsPanel';
import UserAvatar from './UserAvatar';
import { useRoom } from '../contexts/RoomContext';
import { getConnectedSocket } from '../utils/api';

const FriendsMenu = ({ isMobile = false }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [isFriendsPanelOpen, setIsFriendsPanelOpen] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationDropdownRef = useRef(null);
  const notificationButtonRef = useRef(null);
  const [activePanelTab, setActivePanelTab] = useState('friends');

  const { totalNotifications, pendingRequests, roomInvitations, actions } = useFriends();
  const { isInRoom, roomId } = useRoom();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target)
      ) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle room invitation
  const handleSendRoomInvitation = async (friendId, friendName) => {
    if (!isInRoom || !roomId) return;

    try {
      const roomName = `Collaboration Room ${roomId.substring(0, 6)}`;

      const result = await actions.sendRoomInvitation(friendId, roomId, roomName);

      if (result.success) {
        const socket = await getConnectedSocket();
        socket.emit('send-room-invitation', {
          senderId: user.id,
          recipientId: friendId,
          roomId,
          roomName,
        });

        alert(`Invitation sent to ${friendName}`);
      } else {
        alert(`Failed to send invitation: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending room invitation:', error);
      alert('Failed to send invitation. Please try again.');
    }
  };

  // Handle notification click with type-specific redirect
  const handleNotificationClick = (notificationType) => {
    setShowNotificationDropdown(false);

    if (notificationType === 'friend-request') {
      setActivePanelTab('requests');
    } else if (notificationType === 'room-invitation') {
      setActivePanelTab('invitations');
    }

    setIsFriendsPanelOpen(true);
  };

  if (!isAuthenticated) return null;

  const NotificationItem = ({ notification }) => {
    return (
      <div
        className="p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 notification-item cursor-pointer"
        onClick={() => handleNotificationClick(notification.type)}
      >
        <div className="flex items-center mb-1">
          <UserAvatar user={notification.sender} size="sm" />
          <p className="ml-2 text-sm font-medium text-gray-900 dark:text-white notification-title">
            {notification.sender.username}
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 notification-desc">
          {notification.type === 'friend-request'
            ? 'Sent you a friend request'
            : `Invited you to room ${notification.roomName || ''}`}
        </p>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Friends button */}
        <button
          onClick={() => {
            setActivePanelTab('friends');
            setIsFriendsPanelOpen(true);
          }}
          className="p-2 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 relative"
          title="Friends"
          aria-label="Friends"
        >
          <Users className="w-5 h-5" />
        </button>

        {/* Notifications button */}
        <div className="relative">
          <button
            ref={notificationButtonRef}
            onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 relative"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {totalNotifications > 0 && (
              <NotificationBadge count={totalNotifications} className="absolute -top-1 -right-1" />
            )}
          </button>

          {/* Notification dropdown */}
          {showNotificationDropdown && (
            <div
              ref={notificationDropdownRef}
              className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 overflow-hidden border border-gray-200 dark:border-gray-700 dropdown-menu"
              style={{
                right: isMobile ? '-120px' : '0',
                width: isMobile ? '280px' : '320px',
              }}
            >
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
                  {totalNotifications}
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {/* Friend requests */}
                {pendingRequests.length > 0 && (
                  <div className="notifications-section">
                    {pendingRequests.slice(0, 3).map((request) => (
                      <NotificationItem
                        key={request._id}
                        notification={{
                          ...request,
                          type: 'friend-request',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Room invitations */}
                {roomInvitations.length > 0 && (
                  <div className="notifications-section">
                    {roomInvitations.slice(0, 3).map((invitation) => (
                      <NotificationItem
                        key={invitation._id}
                        notification={{
                          ...invitation,
                          type: 'room-invitation',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* No notifications message */}
                {totalNotifications === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                    <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3 mb-3">
                      <Bell size={20} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No notifications</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                      When you receive notifications, they'll appear here
                    </p>
                  </div>
                )}

                {/* View all link - only show when there are notifications */}
                {totalNotifications > 0 && (
                  <div className="p-2 text-center">
                    <button
                      onClick={() => {
                        setShowNotificationDropdown(false);
                        if (pendingRequests.length > 0) {
                          setActivePanelTab('requests');
                        } else if (roomInvitations.length > 0) {
                          setActivePanelTab('invitations');
                        }
                        setIsFriendsPanelOpen(true);
                      }}
                      className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      View all notifications
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Friends panel with initial active tab */}
      <FriendsPanel
        isOpen={isFriendsPanelOpen}
        onClose={() => setIsFriendsPanelOpen(false)}
        onInviteToRoom={isInRoom ? handleSendRoomInvitation : undefined}
        roomId={roomId}
        isMobile={isMobile}
        initialActiveTab={activePanelTab}
      />
    </>
  );
};

export default FriendsMenu;
