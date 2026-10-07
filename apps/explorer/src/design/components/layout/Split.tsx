import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface SplitProps extends HTMLAttributes<HTMLDivElement> {
  start: ReactNode;
  end: ReactNode;
  /** `even`: two equal columns from 420px; `aside`: a narrow heading column beside a wide one. */
  variant?: 'even' | 'aside';
}

/** Two columns that stack when narrow. */
export function Split({
  start,
  end,
  variant = 'even',
  className,
  ...rest
}: SplitProps) {
  return (
    <div
      {...rest}
      className={cx(
        'elb-split',
        variant === 'aside' && 'elb-split--aside',
        className,
      )}
    >
      <div className="elb-split__start">{start}</div>
      <div className="elb-split__end">{end}</div>
    </div>
  );
}
