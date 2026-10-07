import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  variant?: 'eyebrow' | 'label';
  tone?: 'link' | 'muted';
}

/** An uppercase line above a heading (`eyebrow`) or a card's tier label (`label`). */
export function Eyebrow({
  children,
  variant = 'eyebrow',
  tone = 'link',
  className,
  ...rest
}: EyebrowProps) {
  return (
    <p
      {...rest}
      className={cx(
        'elb-eyebrow',
        variant === 'label' && 'elb-eyebrow--label',
        tone === 'muted' && 'elb-eyebrow--muted',
        className,
      )}
    >
      {children}
    </p>
  );
}
