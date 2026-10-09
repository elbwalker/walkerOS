import React, { type ReactNode } from 'react';
import { cx } from '../../cx';
import type { EventPart } from './tokens';

export interface PillProps {
  part: EventPart;
  /** `outline`: viz-bg ground, coloured border and text. */
  variant?: 'solid' | 'outline';
  className?: string;
  children: ReactNode;
}

/** A small label in an event part's colour. */
export function Pill({
  part,
  variant = 'solid',
  className,
  children,
}: PillProps) {
  return (
    <span
      className={cx(
        'elb-viz-pill',
        `elb-viz-pill--${part}`,
        variant === 'outline' && 'elb-viz-pill--outline',
        className,
      )}
    >
      {children}
    </span>
  );
}
