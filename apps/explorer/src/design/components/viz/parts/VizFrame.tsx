import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../cx';

export interface VizFrameProps extends HTMLAttributes<HTMLDivElement> {
  variant: 'tagging' | 'teaser' | 'mapping';
  children: ReactNode;
}

/**
 * A demo's dark island: viz colours in both themes, and the container its 640px
 * breakpoint queries (the body inside, since a container cannot query itself).
 */
export const VizFrame = forwardRef<HTMLDivElement, VizFrameProps>(
  function VizFrame({ variant, children, className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        data-theme="dark"
        className={cx('elb-viz', `elb-viz--${variant}`, className)}
      >
        <div className="elb-viz__body">{children}</div>
      </div>
    );
  },
);
