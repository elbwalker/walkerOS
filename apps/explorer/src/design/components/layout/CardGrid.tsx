import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface CardGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** The minimum column width in px; columns auto-fit. */
  min: 280 | 300 | 420 | 440;
  /** `cards` gap space-5; `features` 44px rows and 48px columns. */
  gap?: 'cards' | 'features';
}

/** An auto-fit grid of cards or feature items. */
export function CardGrid({
  children,
  min,
  gap = 'cards',
  className,
  ...rest
}: CardGridProps) {
  return (
    <div
      {...rest}
      className={cx(
        'elb-card-grid',
        `elb-card-grid--min-${min}`,
        gap === 'features' && 'elb-card-grid--features',
        className,
      )}
    >
      {children}
    </div>
  );
}
