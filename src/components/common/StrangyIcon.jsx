import React from 'react';

const StrangyIcon = ({ className = "w-6 h-6", size = "text-xl" }) => {
  return (
    <div className={`flex items-center justify-center font-black ${className} bg-gradient-to-br from-accent-pink to-accent-purple text-white rounded-lg shadow-lg overflow-hidden`}>
      <span className={`${size} leading-none select-none drop-shadow-sm`}>S</span>
    </div>
  );
};

export default StrangyIcon;
