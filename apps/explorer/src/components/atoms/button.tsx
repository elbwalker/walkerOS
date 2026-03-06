import React from 'react';

export interface ButtonProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Button - Button component for headers and controls
 *
 * Used in button groups or standalone in headers.
 * Follows atomic design principles as a base atom.
 */
export function Button({
  active = false,
  onClick,
  children,
  className = '',
}: ButtonProps) {
  return (
    <button
      className={`elb-explorer-btn ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
