import React from 'react';

export interface SpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class */
  className?: string;
}

/**
 * Spinner - Loading indicator
 *
 * Pure UI component for showing loading state.
 * No internal state - controlled via parent.
 *
 * @example
 * <Spinner size="md" />
 */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      className={`elb-spinner elb-spinner--${size} ${className}`.trim()}
      role="status"
      aria-label="Loading"
    />
  );
}
