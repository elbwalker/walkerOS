import React, { useState, useEffect } from 'react';
import FullScreenButton from '@site/src/components/molecules/fullScreenButton';

interface FullScreenModeProps {
  children: React.ReactNode;
  className?: string;
}

const FullScreenMode: React.FC<FullScreenModeProps> = ({ 
  children,
  className = ''
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    if (isFullScreen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isFullScreen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.currentTarget === e.target) {
      setIsFullScreen(false);
    }
  };

  return (
    <>
      {/* Inline view with fullscreen button */}
      <div className={`${className}`}>
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <FullScreenButton onClick={() => setIsFullScreen(true)} />
          </div>
          {children}
        </div>
      </div>
      
      {/* Fullscreen overlay */}
      {isFullScreen && (
        <div
          className="fixed inset-0 z-50 bg-base-100/90 backdrop-blur-sm flex items-center justify-center"
          onClick={handleOverlayClick}
        >
          <div className="w-full max-w-[90vw] max-h-[90vh] overflow-auto p-4">
            <div className="flex justify-end mb-4">
              <button 
                className="btn btn-circle btn-ghost"
                onClick={() => setIsFullScreen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className={className}>
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FullScreenMode; 