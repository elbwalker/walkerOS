import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** `actions` 12px apart; `links` 8px rows and 24px columns. */
  gap?: 'actions' | 'links';
  align?: 'start' | 'center';
}

/** A wrapping row of buttons or links. */
export function Cluster({
  children,
  gap = 'actions',
  align = 'start',
  className,
  ...rest
}: ClusterProps) {
  return (
    <div
      {...rest}
      className={cx(
        'elb-cluster',
        gap === 'links' && 'elb-cluster--links',
        align === 'center' && 'elb-cluster--center',
        className,
      )}
    >
      {children}
    </div>
  );
}
