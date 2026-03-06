import React from 'react';

export interface ButtonLinkProps {
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function ButtonLink({
  variant = 'default',
  size = 'md',
  href,
  onClick,
  children,
  className = '',
  disabled = false,
}: ButtonLinkProps) {
  const baseClass = 'elb-button-link';
  const classes =
    `${baseClass} ${baseClass}-${variant} ${baseClass}-${size} ${className}`.trim();

  if (href && !disabled) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
