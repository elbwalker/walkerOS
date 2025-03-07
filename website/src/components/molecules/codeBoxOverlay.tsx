import React, { useEffect } from 'react';

interface FullScreenOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const FullScreenOverlay: React.FC<FullScreenOverlayProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div className="relative w-full h-full overflow-hidden">
        <button
          className="absolute top-6 right-6 z-10 text-gray-500 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors border-none bg-transparent"
          onClick={onClose}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="w-full h-full items-center justify-center p-16">
          {children}
        </div>
      </div>
    </div>
  );
};

export default FullScreenOverlay;
