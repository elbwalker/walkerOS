import { useState, useEffect, useRef } from 'react';

/**
 * Confirm Button - Transforms to confirmation state on click
 *
 * When clicked, transforms to show "Confirm?" text with visual emphasis.
 * Clicking again confirms the action. Clicking outside or ESC cancels.
 *
 * @example
 * <MappingConfirmButton
 *   icon={<TrashIcon />}
 *   confirmLabel="Delete?"
 *   onConfirm={() => deleteItem()}
 *   ariaLabel="Delete item"
 * />
 */
export interface MappingConfirmButtonProps {
  /** Icon to show in default state (SVG element) */
  icon: React.ReactNode;
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
  icon,
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
