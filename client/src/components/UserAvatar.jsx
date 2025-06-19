import React, { useState } from 'react';
import { UserCircle } from 'lucide-react';

/**
 * UserAvatar component that displays either the user's avatar image
 * or a fallback with their initial or a generic user icon
 */
function UserAvatar({ user, size = 'md', className = '' }) {
  const [imageError, setImageError] = useState(false);
  
  // Handle different size classes
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Get the user's first initial if available
  const getInitial = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };
  
  // If user has an avatar image and no error, show it
  if (user?.avatar && !imageError) {
    return (
      <img 
        src={user.avatar} 
        alt={user?.username || 'User'} 
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }
  
  // Otherwise show a fallback
  return (
    <div className={`${sizeClass} rounded-full bg-blue-600 flex items-center justify-center text-white ${className}`}>
      {getInitial()}
    </div>
  );
}

export default UserAvatar;
