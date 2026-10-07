import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** `sm` card-pad-sm (26px), `md` card-pad (28px), `lg` 32px. */
  padding?: 'sm' | 'md' | 'lg';
  radius?: 'lg' | 'xl';
  /** Tints the border toward primary on hover. */
  hover?: boolean;
  /** The one recommended item: primary border and the plan-highlight ring. */
  highlight?: boolean;
  /** A glow halo in the top right corner. */
  glow?: boolean;
}

/** The flat card frame: surface, 1px border, a column of children. */
export function Card({
  children,
  padding = 'md',
  radius = 'lg',
  hover = false,
  highlight = false,
  glow = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      className={cx(
        'elb-card',
        `elb-card--pad-${padding}`,
        radius === 'xl' && 'elb-card--radius-xl',
        hover && 'elb-card--hover',
        highlight && 'elb-card--highlight',
        glow && 'elb-card--glow',
        className,
      )}
    >
      {children}
    </div>
  );
}
