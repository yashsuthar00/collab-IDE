import React, { useState, useEffect } from 'react';

const UserAvatar = ({ user, size = 'md', className = '' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset loading state when user or avatar URL changes
  useEffect(() => {
    if (user?.avatar) {
      setIsLoading(true);
      setImageError(false);
      setImageLoaded(false);
    }
  }, [user?.avatar]);

  // Size classes mapping
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  // Get initials from username or email
  const getInitials = () => {
    if (!user) return '?';
    
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    } else if (user.email) {
      return user.email.charAt(0).toUpperCase();
    } else {
      return 'U';
    }
  };

  // Get a deterministic color based on the user ID or username
  const getBackgroundColor = () => {
    const colorOptions = [
      'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500',
      'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    
    if (!user) return colorOptions[0];
    
    // Create a simple hash function for the user ID or username
    const idString = user.id || user._id || user.username || user.email || '';
    let hash = 0;
    
    for (let i = 0; i < idString.length; i++) {
      hash = ((hash << 5) - hash) + idString.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use the hash to select a color
    const colorIndex = Math.abs(hash) % colorOptions.length;
    return colorOptions[colorIndex];
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setIsLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  // If we have a valid avatar URL and it loaded successfully, show the image
  if (user?.avatar && !imageError) {
    return (
      <div className={`relative rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}>
        {isLoading && (
          <div className={`absolute inset-0 flex items-center justify-center ${getBackgroundColor()} z-10`}>
            <div className="animate-pulse rounded-full bg-white bg-opacity-30 w-3/4 h-3/4"></div>
          </div>
        )}
        <img
          src={user.avatar}
          alt={user.username || 'User'}
          className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
    );
  }

  // Fallback to initials avatar
  return (
    <div className={`flex items-center justify-center rounded-full text-white ${getBackgroundColor()} ${sizeClasses[size]} ${className}`}>
      {getInitials()}
    </div>
  );
};

export default UserAvatar;
