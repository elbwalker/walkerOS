import React, { type ReactNode } from 'react';
import { cx } from '../../cx';
import type { CodeToken, EventPart } from './tokens';

/** Code runs in their colours; a marked run tints only while `active`. */
export function CodeTokens({
  tokens,
  active = false,
}: {
  tokens: readonly CodeToken[];
  active?: boolean;
}) {
  return (
    <>
      {tokens.map((token, index) => (
        <span
          key={index}
          className={cx(
            'elb-viz-tok',
            `elb-viz-tok--${token.kind}`,
            active && token.mark && `elb-viz-tok--mark-${token.mark}`,
          )}
        >
          {token.t}
        </span>
      ))}
    </>
  );
}

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
