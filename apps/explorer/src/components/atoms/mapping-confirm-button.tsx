import { useState, useEffect, useRef } from 'react';

// Default trash icon
const TrashIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.5 1.5V2.5H2V4H3V13.5C3 14.3284 3.67157 15 4.5 15H11.5C12.3284 15 13 14.3284 13 13.5V4H14V2.5H9.5V1.5H6.5ZM4.5 4H11.5V13.5H4.5V4ZM6 5.5V12H7.5V5.5H6ZM8.5 5.5V12H10V5.5H8.5Z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Confirm Button - Transforms to confirmation state on click
 *
 * When clicked, transforms to show "Confirm?" text with visual emphasis.
 * Clicking again confirms the action. Clicking outside or ESC cancels.
 *
 * By default, uses a trash icon. Can be overridden with custom icon.
 *
 * @example
 * <MappingConfirmButton
 *   confirmLabel="Delete?"
 *   onConfirm={() => deleteItem()}
 *   ariaLabel="Delete item"
 * />
 */
export interface MappingConfirmButtonProps {
  /** Icon to show in default state (defaults to trash icon) */
  icon?: React.ReactNode;
  /** Label to show in confirmation state */
  confirmLabel?: string;
  /** Callback when action is confirmed */
  onConfirm: () => void;
  /** Accessibility label */
  ariaLabel: string;
  /** Additional CSS class */
  className?: string;
}

export function MappingConfirmButton({
  icon = <TrashIcon />,
  confirmLabel = 'Confirm?',
  onConfirm,
  ariaLabel,
  className = '',
}: MappingConfirmButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to cancel
  useEffect(() => {
    if (!isConfirming) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsConfirming(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsConfirming(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isConfirming]);

  const handleClick = () => {
    if (isConfirming) {
      // Confirm action
      onConfirm();
      setIsConfirming(false);
    } else {
      // Enter confirmation state
      setIsConfirming(true);
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`elb-mapping-confirm-button ${isConfirming ? 'is-confirming' : ''} ${className}`}
      onClick={handleClick}
      aria-label={isConfirming ? confirmLabel : ariaLabel}
      title={isConfirming ? confirmLabel : ariaLabel}
    >
      {isConfirming ? confirmLabel : icon}
    </button>
  );
}
