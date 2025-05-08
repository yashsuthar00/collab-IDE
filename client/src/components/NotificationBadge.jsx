import React from 'react';

const NotificationBadge = ({ count, maxCount = 99, className = '' }) => {
  if (!count || count <= 0) return null;
  
  // Format the count display
  const displayCount = count > maxCount ? `${maxCount}+` : count;
  
  return (
    <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full ${className}`}>
      {displayCount}
    </span>
  );
};

export default NotificationBadge;
