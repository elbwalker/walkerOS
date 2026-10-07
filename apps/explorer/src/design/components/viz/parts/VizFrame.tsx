import React, { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../cx';

export interface VizFrameProps extends HTMLAttributes<HTMLDivElement> {
  variant: 'hero' | 'teaser' | 'mapping';
  children: ReactNode;
}

/**
 * A demo's dark island: viz colours in both themes, and the container its 640px
 * breakpoint queries (the body inside, since a container cannot query itself).
 */
export function VizFrame({
  variant,
  children,
  className,
  ...rest
}: VizFrameProps) {
  return (
    <div
      {...rest}
      data-theme="dark"
      className={cx('elb-viz', `elb-viz--${variant}`, className)}
    >
      <div className="elb-viz__body">{children}</div>
    </div>
  );
}
