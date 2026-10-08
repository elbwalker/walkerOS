import React from 'react';

export interface TypographyProps {
  variant?:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'body1'
    | 'body2'
    | 'caption';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Each variant is one of the website type styles of the design system.
const variantClasses = {
  h1: 'text-heading-lg',
  h2: 'text-kicker-lg',
  h3: 'text-title-plan',
  h4: 'text-title-card',
  h5: 'text-title-item',
  h6: 'text-ui',
  body1: 'text-body',
  body2: 'text-ui',
  caption: 'text-small',
};

const colorClasses = {
  primary: 'text-fg',
  secondary: 'text-fg-2',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
  success: 'text-success',
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export const Typography = ({
  variant = 'body1',
  color = 'primary',
  align = 'left',
  children,
  className,
  style,
  ...props
}: TypographyProps) => {
  const tag = variant.startsWith('h') ? variant : 'p';

  return React.createElement(
    tag,
    {
      className: [
        'm-0',
        variantClasses[variant],
        colorClasses[color],
        alignClasses[align],
        className,
      ]
        .filter(Boolean)
        .join(' '),
      style,
      ...props,
    },
    children,
  );
};
