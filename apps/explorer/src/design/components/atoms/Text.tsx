import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  size?: 'body' | 'lg';
  tone?: 'muted' | 'fg';
}

/** A paragraph of supporting copy, `fg-2` unless `tone="fg"`. */
export function Text({
  children,
  size = 'body',
  tone = 'muted',
  className,
  ...rest
}: TextProps) {
  return (
    <p
      {...rest}
      className={cx(
        'elb-text',
        size === 'lg' && 'elb-text--lg',
        tone === 'fg' && 'elb-text--fg',
        className,
      )}
    >
      {children}
    </p>
  );
}
