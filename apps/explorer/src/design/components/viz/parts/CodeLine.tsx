import React, { type ReactNode } from 'react';
import type { EventPart } from '../../codeTokens';
import { cx } from '../../cx';

export interface CodeLineProps {
  number?: number;
  /** Colours the left bar in an event part's colour. */
  bar?: EventPart;
  className?: string;
  children: ReactNode;
}

/** One code line: a bar, an optional line number, then the code. */
export function CodeLine({ number, bar, className, children }: CodeLineProps) {
  return (
    <div className={cx('elb-viz-line', className)}>
      <span
        className={cx('elb-viz-line__bar', bar && `elb-viz-line__bar--${bar}`)}
        aria-hidden="true"
      />
      {number !== undefined && (
        <span className="elb-viz-line__number">{number}</span>
      )}
      <span className="elb-viz-line__code">{children}</span>
    </div>
  );
}
