import React from 'react';
import type { CodeToken } from '../codeTokens';
import { cx } from '../cx';

/**
 * Code runs in their colours, for a dark ground: the demos and the code panes
 * of product UI. A marked run tints only while `active`.
 */
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
