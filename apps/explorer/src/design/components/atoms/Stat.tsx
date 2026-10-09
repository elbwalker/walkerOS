import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface StatProps extends HTMLAttributes<HTMLDivElement> {
  value: ReactNode;
  children: ReactNode;
}

/** One figure and its label, as a tile inside a case card. */
export function Stat({ value, children, className, ...rest }: StatProps) {
  return (
    <div {...rest} className={cx('elb-stat', className)}>
      <span className="elb-stat__value">{value}</span>
      <p className="elb-stat__label">{children}</p>
    </div>
  );
}
