import React from 'react';

export interface HeaderButtonProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * HeaderButton - Button component for panel headers
 *
 * Used in button groups or standalone in headers.
 * Follows atomic design principles as a base atom.
 */
export function HeaderButton({
  active = false,
  onClick,
  children,
  className = '',
}: HeaderButtonProps) {
  return (
    <button
      className={`elb-header-button ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
