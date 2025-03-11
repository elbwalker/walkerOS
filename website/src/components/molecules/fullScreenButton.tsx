import React, { useState } from 'react';

interface FullScreenButtonProps {
  onClick: () => void;
}

const FullScreenButton: React.FC<FullScreenButtonProps> = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors border-none bg-transparent"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        className="w-4 h-4 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
        />
      </svg>
      Full screen
      {isHovered && (
        <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs py-1 px-1 rounded shadow-sm border border-gray-200 dark:border-gray-600 whitespace-nowrap">
          Toggle full screen
        </div>
      )}
    </button>
  );
};

export default FullScreenButton; 