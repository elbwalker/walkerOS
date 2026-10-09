import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../cx';

export interface ClusterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** `actions` 12px apart; `links` 8px rows and 24px columns. */
  gap?: 'actions' | 'links';
  align?: 'start' | 'center';
  /**
   * Set apart from the content above by an extra heading gap, for a call to
   * action below a section's content.
   */
  separated?: boolean;
}

/** A wrapping row of buttons or links. */
export function Cluster({
  children,
  gap = 'actions',
  align = 'start',
  separated = false,
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
        separated && 'elb-cluster--separated',
        className,
      )}
    >
      {children}
    </div>
  );
}
