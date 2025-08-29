import React from 'react';
import './Typography.css';

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
        'storybook-typography',
        `storybook-typography--${variant}`,
        `storybook-typography--${color}`,
        `storybook-typography--${align}`,
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
